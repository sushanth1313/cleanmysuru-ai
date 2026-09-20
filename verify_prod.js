const fs = require('fs');
const http = require('http');

const API_BASE = 'http://localhost:5000/api';

async function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING PRODUCTION VERIFICATION ---');

  // 1. RBAC Tests
  console.log('\n[1] RBAC TESTING');
  const cLogin = await request('POST', '/auth/login', { email: 'citizen@example.com', password: 'CitizenPass123!' });
  const aLogin = await request('POST', '/auth/login', { email: 'admin@mysuru.gov.in', password: 'AdminPass123!' });
  
  console.log('Citizen Login:', cLogin);
  console.log('Admin Login:', aLogin);

  const cToken = cLogin.data?.token;
  const aToken = aLogin.data?.token;
  
  if (!cToken || !aToken) {
    console.error('Failed to get tokens for RBAC tests.');
    return;
  }

  // Create an incident as Citizen
  const incRes = await request('POST', '/incidents', {
    title: 'RBAC Test',
    description: 'Test',
    location: { type: 'Point', coordinates: [76.6394, 12.2958] },
    evidence: 'test.jpg'
  }, cToken);
  
  console.log('Incident Creation Response:', JSON.stringify(incRes, null, 2));

  const incId = incRes.data?._id || incRes.data?.complaintId;
  if (!incId) {
    throw new Error('Failed to create incident');
  }
  console.log(`Created Incident: ${incId}`);

  // Citizen tries to review (Admin only)
  let res = await request('PATCH', `/incidents/${incId}/review`, { action: 'ACCEPT' }, cToken);
  console.log(`Citizen reviewing (Expect 403/401): ${res.status}`);
  if (res.status === 200) throw new Error("RBAC Failed: Citizen could review!");

  // Admin reviews (Success)
  res = await request('PATCH', `/incidents/${incId}/review`, { action: 'ACCEPT' }, aToken);
  console.log(`Admin reviewing (Expect 200): ${res.status}`);

  // Admin marks cleaned
  res = await request('POST', `/incidents/${incId}/clean`, { evidenceUrl: 'clean.jpg', notes: 'Done' }, aToken);
  console.log(`Admin cleaning (Expect 200): ${res.status}`);
  if (res.status !== 200) console.log(JSON.stringify(res.data));

  // Admin tries to confirm resolution (Citizen only)
  res = await request('PATCH', `/incidents/${incId}/confirm`, { status: 'RESOLVED', feedback: 'Good' }, aToken);
  console.log(`Admin confirming (Expect 403/401): ${res.status}`);
  if (res.status === 200) throw new Error("RBAC Failed: Admin could confirm resolution!");

  // Citizen confirms resolution
  res = await request('PATCH', `/incidents/${incId}/confirm`, { status: 'RESOLVED', feedback: 'Good' }, cToken);
  console.log(`Citizen confirming (Expect 200): ${res.status}`);
  if (res.status !== 200) console.log(JSON.stringify(res.data));

  // 2. Location Mismatch Testing
  console.log('\n[2] LOCATION MISMATCH TESTING');
  const farRes = await request('POST', '/incidents', {
    title: 'Far Test',
    description: 'Far Test',
    location: { type: 'Point', coordinates: [-122.4194, 37.7749] }, // San Francisco
    evidence: 'test2.jpg'
  }, cToken);
  console.log(`Far submission (Expect 400 for out of bounds): ${farRes.status}`);
  if (farRes.status !== 400) console.log(JSON.stringify(farRes.data));

  // 3. Persistence Testing
  console.log('\n[3] PERSISTENCE TESTING');
  console.log(`Incident ${incId} created. Please restart the backend server manually or wait if script does it.`);
  console.log('Fetching incident...');
  res = await request('GET', `/incidents/${incId}`, null, cToken);
  console.log(`Incident exists: ${!!res.data._id || !!res.data.data?._id}`);

  console.log('\n--- TESTS COMPLETED ---');
}

runTests().catch(console.error);
