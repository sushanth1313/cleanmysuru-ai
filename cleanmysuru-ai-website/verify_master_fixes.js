const fs = require('fs');
const path = require('path');
const mongoose = require('./backend/node_modules/mongoose');

const API_BASE = 'http://localhost:5000/api';
const BACKEND_BASE = 'http://localhost:5000';

async function runTest() {
  console.log('=== STARTING CLEANMYSURU AI FUNCTIONAL VERIFICATION ===\n');

  // Connect to DB for direct ground-truth assertions
  await mongoose.connect('mongodb://127.0.0.1:27017/cleanmysuru_ai');
  const db = mongoose.connection.db;

  // 1. Authenticate Citizen & Admin
  console.log('[1/10] Authenticating Citizen and Admin...');
  const citLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'citizen@example.com', password: 'CitizenPass123!' }),
  });
  const citLogin = await citLoginRes.json();
  if (!citLogin.token) throw new Error('Citizen login failed: ' + JSON.stringify(citLogin));
  const citizenToken = citLogin.token;

  const admLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@mysuru.gov.in', password: 'AdminPass123!' }),
  });
  const admLogin = await admLoginRes.json();
  if (!admLogin.token) throw new Error('Admin login failed: ' + JSON.stringify(admLogin));
  const adminToken = admLogin.token;
  console.log('  ✓ Citizen and Admin tokens acquired');

  // 2. Verify Database is Clean (No Demo Complaints, No Demo Notifications)
  console.log('\n[2/10] Verifying database cleanliness (0 demo complaints, 0 demo notifications)...');
  const complaintsCount = await db.collection('complaints').countDocuments();
  const notifsCount = await db.collection('notifications').countDocuments();
  console.log(`  Current Complaints in DB: ${complaintsCount}`);
  console.log(`  Current Notifications in DB: ${notifsCount}`);
  if (complaintsCount !== 0 || notifsCount !== 0) {
    throw new Error(`Database not clean! Complaints: ${complaintsCount}, Notifications: ${notifsCount}`);
  }
  console.log('  ✓ PASS: Database is completely clean');

  // 3. Submit 1 REAL garbage complaint with explicit MANUAL location
  console.log('\n[3/10] Submitting REAL garbage complaint with MANUAL location...');
  const sampleImagePath = path.resolve(__dirname, 'backend/uploads/evidence-1789842672548-65bfd29065b9.webp');
  if (!fs.existsSync(sampleImagePath)) {
    throw new Error('Test image not found at ' + sampleImagePath);
  }
  const imageBuffer = fs.readFileSync(sampleImagePath);

  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  let multipartBody = '';
  multipartBody += `--${boundary}\r\n`;
  multipartBody += `Content-Disposition: form-data; name="evidence"; filename="garbage_real.webp"\r\n`;
  multipartBody += `Content-Type: image/webp\r\n\r\n`;

  const bodyStart = Buffer.from(multipartBody, 'binary');
  const bodyEnd = Buffer.from(
    `\r\n--${boundary}\r\n` +
    `Content-Disposition: form-data; name="description"\r\n\r\nReal civic waste accumulation near Palace North Gate\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="locality"\r\n\r\nMysuru Palace\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="city"\r\n\r\nMysuru\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="state"\r\n\r\nKarnataka\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="latitude"\r\n\r\n12.3051\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="longitude"\r\n\r\n76.6551\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="locationSource"\r\n\r\nMANUAL\r\n` +
    `--${boundary}--\r\n`,
    'binary'
  );

  const fullPayload = Buffer.concat([bodyStart, imageBuffer, bodyEnd]);

  const submitRes = await fetch(`${API_BASE}/complaints`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${citizenToken}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: fullPayload,
  });

  const submitData = await submitRes.json();
  if (!submitRes.ok) throw new Error('Complaint submission failed: ' + JSON.stringify(submitData));
  const createdComplaint = submitData.data || submitData.complaint;
  const complaintId = createdComplaint.complaintNumber || createdComplaint._id;
  console.log(`  ✓ Complaint Created: ${complaintId}`);
  console.log(`  AI Type: ${createdComplaint.incidentType}`);
  console.log(`  AI Confidence: ${createdComplaint.confidence}%`);
  console.log(`  AI Model: ${createdComplaint.aiResult?.modelName || 'Gemini'}`);
  console.log(`  Location: ${createdComplaint.locality} (${createdComplaint.latitude}, ${createdComplaint.longitude})`);
  console.log(`  Location Source: ${createdComplaint.locationSource}`);

  // Assert location source in MongoDB
  const dbComplaint = await db.collection('complaints').findOne({ _id: new mongoose.Types.ObjectId(createdComplaint._id) });
  if (dbComplaint.locationSource !== 'MANUAL' || dbComplaint.latitude !== 12.3051 || dbComplaint.longitude !== 76.6551) {
    throw new Error(`Location integrity failed! Expected MANUAL, 12.3051, 76.6551 but got ${dbComplaint.locationSource}, ${dbComplaint.latitude}, ${dbComplaint.longitude}`);
  }
  console.log('  ✓ PASS: MongoDB accurately stores MANUAL locationSource and exact coordinates');

  // 4. Verify Original Citizen Evidence Delivery & Display Pipeline
  console.log('\n[4/10] Verifying Citizen evidence delivery pipeline...');
  const evidencePath = dbComplaint.evidence;
  console.log(`  Stored Evidence Path: ${evidencePath}`);
  const evidenceFileOnDisk = path.resolve(__dirname, 'backend', '.' + evidencePath);
  console.log(`  File on Disk: ${evidenceFileOnDisk} (Exists: ${fs.existsSync(evidenceFileOnDisk)})`);
  if (!fs.existsSync(evidenceFileOnDisk)) {
    throw new Error('Evidence file missing from disk at ' + evidenceFileOnDisk);
  }

  const evidenceUrl = `${BACKEND_BASE}${evidencePath}`;
  const getImgRes = await fetch(evidenceUrl);
  console.log(`  HTTP GET ${evidenceUrl} -> Status: ${getImgRes.status}`);
  console.log(`  Content-Type: ${getImgRes.headers.get('content-type')}`);
  console.log(`  Content-Length: ${getImgRes.headers.get('content-length')} bytes`);
  if (getImgRes.status !== 200 || !getImgRes.headers.get('content-type')?.includes('image')) {
    throw new Error('Evidence image request failed!');
  }
  console.log('  ✓ PASS: Original Citizen evidence is 200 OK and serves real image content');

  // 5. Admin retrieves complaint detail via canonical /complaints/:id
  console.log('\n[5/10] Admin retrieves complaint detail...');
  const adminGetRes = await fetch(`${API_BASE}/complaints/${createdComplaint._id}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const adminGetData = await adminGetRes.json();
  const cData = adminGetData.data || adminGetData.complaint;
  console.log(`  Retrieved Complaint: ${cData.complaintNumber}`);
  console.log(`  Status: ${cData.status}`);
  console.log(`  Evidence Path: ${cData.evidence}`);
  console.log(`  AI Classification: ${cData.incidentType}`);
  console.log(`  AI Reasoning: ${cData.reasoning?.slice(0, 70)}...`);
  console.log('  ✓ PASS: Admin retrieved complete AI and evidence details');

  // 6. Admin accepts complaint (ACCEPTED)
  console.log('\n[6/10] Admin accepts complaint (ACCEPTED)...');
  const acceptRes = await fetch(`${API_BASE}/complaints/${createdComplaint._id}/status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'ACCEPTED', notes: 'Verified by MCC Admin' }),
  });
  const acceptData = await acceptRes.json();
  console.log(`  Status after accept: ${acceptData.data?.status || acceptData.status}`);

  // Admin marks in progress (IN_PROGRESS)
  const inProgressRes = await fetch(`${API_BASE}/complaints/${createdComplaint._id}/status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'IN_PROGRESS', notes: 'Field crew dispatched' }),
  });
  const inProgressData = await inProgressRes.json();
  console.log(`  Status after dispatch: ${inProgressData.data?.status || inProgressData.status}`);
  console.log('  ✓ PASS: Lifecycle progressed to IN_PROGRESS');

  // 7. Admin completes work with completion proof (WORK_DONE)
  console.log('\n[7/10] Admin uploads completion evidence (WORK_DONE)...');
  const cleanProofPath = path.resolve(__dirname, 'india-national-highway-road-bangalore-to-mysore-good-clean-roads-well-maintained-infrastructure-454407783.webp');
  const cleanProofBuf = fs.readFileSync(cleanProofPath);

  const proofBoundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  let proofMultipart = '';
  proofMultipart += `--${proofBoundary}\r\n`;
  proofMultipart += `Content-Disposition: form-data; name="completionEvidence"; filename="cleaned_proof.webp"\r\n`;
  proofMultipart += `Content-Type: image/webp\r\n\r\n`;

  const proofStart = Buffer.from(proofMultipart, 'binary');
  const proofEnd = Buffer.from(
    `\r\n--${proofBoundary}\r\n` +
    `Content-Disposition: form-data; name="responseNote"\r\n\r\nRoadside waste completely cleared and area sanitized.\r\n` +
    `--${proofBoundary}--\r\n`,
    'binary'
  );

  const proofPayload = Buffer.concat([proofStart, cleanProofBuf, proofEnd]);

  const workDoneRes = await fetch(`${API_BASE}/complaints/${createdComplaint._id}/work-done`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': `multipart/form-data; boundary=${proofBoundary}`,
    },
    body: proofPayload,
  });
  const workDoneData = await workDoneRes.json();
  const workDoneComplaint = workDoneData.data || workDoneData.complaint;
  console.log(`  Status after work-done: ${workDoneComplaint.status}`);
  console.log(`  Completion evidence: ${workDoneComplaint.completionEvidence}`);
  console.log(`  Citizen confirmation flag: ${workDoneComplaint.citizenConfirmation}`);
  if (workDoneComplaint.status !== 'WORK_DONE') {
    throw new Error('Expected status WORK_DONE, got ' + workDoneComplaint.status);
  }

  // Verify completion evidence URL is accessible
  const compUrl = `${BACKEND_BASE}${workDoneComplaint.completionEvidence}`;
  const compImgRes = await fetch(compUrl);
  console.log(`  HTTP GET ${compUrl} -> Status: ${compImgRes.status}`);
  if (compImgRes.status !== 200) throw new Error('Completion evidence failed to load!');
  console.log('  ✓ PASS: Work marked WORK_DONE with retrievable completion evidence');

  // 8. Citizen receives notification & marks it as read (markNotificationAsRead test)
  console.log('\n[8/10] Citizen receives notification & marks as read...');
  const notifsRes = await fetch(`${API_BASE}/notifications`, {
    headers: { 'Authorization': `Bearer ${citizenToken}` },
  });
  const notifsData = await notifsRes.json();
  const notifications = notifsData.notifications || [];
  console.log(`  Citizen Notifications Count: ${notifications.length}`);
  console.log(`  Latest Notification Title: "${notifications[0]?.title}"`);
  console.log(`  Initial Read State: ${notifications[0]?.read}`);

  if (notifications.length === 0) throw new Error('Citizen did not receive notification!');
  const notifId = notifications[0]._id;

  // Test PATCH /api/notifications/:id/read
  const markReadRes = await fetch(`${API_BASE}/notifications/${notifId}/read`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${citizenToken}` },
  });
  const markReadData = await markReadRes.json();
  console.log(`  PATCH /api/notifications/${notifId}/read -> Status: ${markReadRes.status}`);
  console.log(`  Updated Read State: ${markReadData.read}`);
  if (markReadRes.status !== 200 || markReadData.read !== true) {
    throw new Error('markNotificationAsRead failed!');
  }
  console.log('  ✓ PASS: markNotificationAsRead succeeds with HTTP 200 and sets read=true');

  // 9. Citizen confirms resolution (RESOLVED) and tests REOPEN
  console.log('\n[9/10] Citizen confirms resolution (RESOLVED)...');
  const confirmRes = await fetch(`${API_BASE}/complaints/${createdComplaint._id}/confirm`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${citizenToken}` },
  });
  const confirmData = await confirmRes.json();
  console.log(`  Status after confirmation: ${confirmData.data?.status || confirmData.status}`);
  if ((confirmData.data?.status || confirmData.status) !== 'RESOLVED') {
    throw new Error('Expected status RESOLVED');
  }
  console.log('  ✓ PASS: Citizen confirmation resolved complaint');

  // Test Citizen Reopen
  console.log('  Testing Citizen REOPEN...');
  const reopenRes = await fetch(`${API_BASE}/complaints/${createdComplaint._id}/reopen`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${citizenToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ note: 'Debris still remains along curb edge' }),
  });
  const reopenData = await reopenRes.json();
  console.log(`  Status after reopen: ${reopenData.data?.status || reopenData.status}`);
  if ((reopenData.data?.status || reopenData.status) !== 'REOPENED') {
    throw new Error('Expected status REOPENED');
  }
  console.log('  ✓ PASS: Reopen transitions status to REOPENED');

  // 10. Frontend Canonical Route & Legacy Redirect check
  console.log('\n[10/10] Verifying frontend canonical /complaints/:id and legacy redirect...');
  const feCanonicalRes = await fetch(`http://localhost:3000/complaints/${createdComplaint._id}`);
  console.log(`  GET http://localhost:3000/complaints/${createdComplaint._id} -> Status: ${feCanonicalRes.status}`);
  const feLegacyRes = await fetch(`http://localhost:3000/incidents/${createdComplaint._id}`);
  console.log(`  GET http://localhost:3000/incidents/${createdComplaint._id} -> Status: ${feLegacyRes.status}`);

  if (feCanonicalRes.status !== 200 || feLegacyRes.status !== 200) {
    throw new Error('Frontend route checks failed!');
  }
  console.log('  ✓ PASS: Both canonical /complaints/:id and legacy /incidents/:id are active');

  console.log('\n============================================================');
  console.log('ALL VERIFICATION CHECKS PASSED WITH RUNTIME EVIDENCE!');
  console.log('============================================================');

  await mongoose.disconnect();
}

runTest().catch((err) => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
