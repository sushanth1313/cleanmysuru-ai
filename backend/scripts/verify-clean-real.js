const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return { status: res.status, ok: res.ok, data: JSON.parse(text) };
  } catch {
    return { status: res.status, ok: res.ok, text };
  }
}

async function runRealEndToEnd() {
  console.log('=== STARTING REAL-WORLD LIVE END-TO-END VERIFICATION ===\n');

  // STEP A: Register NEW Citizen
  const citizenEmail = `citizen_${Date.now()}@cleanmysuru.org`;
  const citizenPassword = 'RealCitizenPass123!';
  console.log(`[STEP A] Registering new citizen: ${citizenEmail}...`);
  const regRes = await request('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ramesh Kumar',
      email: citizenEmail,
      password: citizenPassword,
      phone: '+91 98450 12345',
      role: 'CITIZEN',
    }),
  });
  if (!regRes.ok) throw new Error(`Registration failed: ${JSON.stringify(regRes)}`);
  console.log('  -> Citizen registered successfully. Token received:', !!regRes.data.token);
  const citizenToken = regRes.data.token;
  const citizenHeaders = { Authorization: `Bearer ${citizenToken}` };

  // STEP B & C & D: Verify fresh Citizen state
  console.log('\n[STEP B, C, D] Verifying fresh citizen state (Complaints & Notifications)...');
  const myComplaintsRes = await request('/complaints/my', { headers: citizenHeaders });
  console.log(`  -> My Complaints count: ${myComplaintsRes.data?.data?.length ?? 0}`);
  if ((myComplaintsRes.data?.data?.length ?? 0) !== 0) {
    throw new Error('Fresh citizen should have 0 complaints!');
  }

  const notifRes = await request('/notifications', { headers: citizenHeaders });
  console.log(`  -> Notifications count: ${notifRes.data?.data?.length ?? 0}`);
  if ((notifRes.data?.data?.length ?? 0) !== 0) {
    throw new Error('Fresh citizen should have 0 notifications!');
  }

  // Verify Admin initial complaints & map count
  console.log('\n[STEP I - PRECHECK] Verifying Admin initial state...');
  const adminLoginRes = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@mysuru.gov.in',
      password: 'AdminPass123!',
    }),
  });
  if (!adminLoginRes.ok) throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes)}`);
  const adminToken = adminLoginRes.data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const adminComplaintsRes = await request('/complaints', { headers: adminHeaders });
  console.log(`  -> Admin total complaints: ${adminComplaintsRes.data?.data?.length ?? 0}`);
  if ((adminComplaintsRes.data?.data?.length ?? 0) !== 0) {
    throw new Error('Initial database must have 0 complaints!');
  }

  const mapRes = await request('/map/markers', { headers: adminHeaders });
  const initialMapCount = mapRes.data?.pins?.length ?? mapRes.data?.markers?.length ?? mapRes.data?.count ?? 0;
  console.log(`  -> Map markers count: ${initialMapCount}`);
  if (initialMapCount !== 0) {
    throw new Error('Initial map must have 0 markers!');
  }

  // STEP E, F, G, H: Submit ONE real garbage photo with real Gemini AI analysis
  console.log('\n[STEP E, F, G, H] Submitting real garbage photo with REAL Gemini AI analysis...');
  const imagePath = path.resolve(__dirname, '../test-assets/waste_dump.jpg');
  if (!fs.existsSync(imagePath)) throw new Error('Test asset waste_dump.jpg not found!');

  const form = new FormData();
  form.append('evidence', new Blob([fs.readFileSync(imagePath)], { type: 'image/jpeg' }), 'mysuru_roadside_garbage.jpg');
  form.append('latitude', '12.3051');
  form.append('longitude', '76.6551');
  form.append('description', 'Large pile of roadside garbage and plastic waste on Sayyaji Rao Road near Devaraja Market.');

  const uploadStart = Date.now();
  const uploadRes = await fetch(`${BASE_URL}/complaints`, {
    method: 'POST',
    headers: { ...citizenHeaders },
    body: form,
  });
  const uploadText = await uploadRes.text();
  const uploadJson = JSON.parse(uploadText);
  console.log(`  -> Complaint submission HTTP status: ${uploadRes.status} (took ${Date.now() - uploadStart}ms)`);
  if (!uploadRes.ok) throw new Error(`Complaint submission failed: ${uploadText}`);

  const complaint = uploadJson.data;
  console.log(`  -> Complaint Created: ${complaint.complaintNumber}`);
  console.log(`  -> Status: ${complaint.status}`);
  console.log(`  -> AI Incident Type: ${complaint.incidentType}`);
  console.log(`  -> AI Confidence: ${complaint.confidence}%`);
  console.log(`  -> AI Severity: ${complaint.severity}`);
  console.log(`  -> AI Description: ${complaint.description}`);
  console.log(`  -> AI Reasoning: ${complaint.reasoning}`);
  console.log(`  -> AI Model: ${complaint.aiResult?.modelName || 'Gemini'}`);
  console.log(`  -> Location:`, complaint.location);

  if (complaint.incidentType === 'AI_ANALYSIS_FAILED') {
    throw new Error('AI analysis FAILED! Real Gemini vision analysis was expected!');
  }

  // STEP J, K, L, M, N: Admin views complaints and opens detail
  console.log('\n[STEP J, K, L, M, N] Verifying Admin portal & Complaint detail...');
  const adminComplaintsAfter = await request('/complaints', { headers: adminHeaders });
  console.log(`  -> Admin complaint list count: ${adminComplaintsAfter.data?.data?.length}`);
  if (adminComplaintsAfter.data?.data?.length !== 1) {
    throw new Error(`Expected exactly 1 complaint in Admin portal, got ${adminComplaintsAfter.data?.data?.length}`);
  }

  // Open detail
  const detailRes = await request(`/complaints/${complaint.complaintNumber}`, { headers: adminHeaders });
  if (!detailRes.ok) throw new Error(`Failed to get complaint detail: ${JSON.stringify(detailRes)}`);
  const detail = detailRes.data.data;
  console.log(`  -> Detail ID: ${detail.complaintNumber}`);
  console.log(`  -> Detail Evidence: ${detail.evidence?.filePath}`);
  console.log(`  -> Detail Location GeoJSON:`, detail.location);
  console.log(`  -> Detail AI Analysis: Type=${detail.aiAnalysis?.incidentType}, Confidence=${detail.aiAnalysis?.confidence}%`);

  // Verify map marker exists
  const mapAfter = await request('/map/markers', { headers: adminHeaders });
  const afterMapCount = mapAfter.data?.pins?.length ?? mapAfter.data?.markers?.length ?? mapAfter.data?.count ?? 0;
  console.log(`  -> Map markers after creation: ${afterMapCount}`);
  if (afterMapCount !== 1) {
    throw new Error(`Expected 1 map marker, got ${afterMapCount}`);
  }

  // STEP O: Admin accepts complaint
  console.log('\n[STEP O] Admin accepts complaint...');
  const acceptRes = await request(`/complaints/${complaint.complaintNumber}/status`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'ACCEPTED',
      notes: 'MCC Sanitation team assigned to Sayyaji Rao Road sector.',
    }),
  });
  if (!acceptRes.ok) throw new Error(`Admin accept failed: ${JSON.stringify(acceptRes)}`);
  console.log(`  -> Status updated to: ${acceptRes.data.data.status}`);

  // STEP P: Admin marks IN_PROGRESS
  console.log('\n[STEP P] Admin marks IN_PROGRESS...');
  const progressRes = await request(`/complaints/${complaint.complaintNumber}/status`, {
    method: 'PATCH',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'IN_PROGRESS',
      notes: 'Sanitation truck and 4 personnel dispatched to site.',
    }),
  });
  if (!progressRes.ok) throw new Error(`Admin IN_PROGRESS failed: ${JSON.stringify(progressRes)}`);
  console.log(`  -> Status updated to: ${progressRes.data.data.status}`);

  // STEP Q & R: Upload REAL completion evidence and mark WORK_DONE
  console.log('\n[STEP Q & R] Admin uploads REAL completion evidence (waste_cleaned.jpg) & marks WORK_DONE...');
  const cleanedImagePath = path.resolve(__dirname, '../test-assets/waste_cleaned.jpg');
  const cleanForm = new FormData();
  cleanForm.append('evidence', new Blob([fs.readFileSync(cleanedImagePath)], { type: 'image/jpeg' }), 'roadside_cleaned_evidence.jpg');
  cleanForm.append('notes', 'Roadside cleared of all waste, area sanitized and disinfected with lime powder.');

  const workDoneRes = await fetch(`${BASE_URL}/complaints/${complaint.complaintNumber}/work-done`, {
    method: 'POST',
    headers: {
      ...adminHeaders,
    },
    body: cleanForm,
  });
  const workDoneJson = JSON.parse(await workDoneRes.text());
  if (!workDoneRes.ok) throw new Error(`Work done submission failed: ${JSON.stringify(workDoneJson)}`);
  console.log(`  -> Status updated to: ${workDoneJson.data.status}`);
  console.log(`  -> Citizen Confirmation state: ${workDoneJson.data.citizenConfirmation}`);
  console.log(`  -> Completion Evidence path: ${workDoneJson.data.completionEvidence}`);

  // STEP S & T & U: Citizen logs in, receives notification, views completion evidence
  console.log('\n[STEP S, T, U] Citizen checks notifications & completion evidence...');
  const citizenNotifsAfter = await request('/notifications', { headers: citizenHeaders });
  const citizenNotifList = citizenNotifsAfter.data?.notifications || citizenNotifsAfter.data?.data || [];
  console.log(`  -> Citizen received notifications count: ${citizenNotifList.length}`);
  citizenNotifList.forEach((n, idx) => {
    console.log(`     #${idx + 1}: [${n.type}] ${n.title} - ${n.message}`);
  });
  if (citizenNotifList.length === 0) {
    throw new Error('Citizen should have received lifecycle notifications!');
  }

  // STEP V & W: Citizen inspects cleaned area & confirms RESOLVED
  console.log('\n[STEP V, W] Citizen inspects cleaned area & confirms RESOLVED...');
  const confirmRes = await request(`/complaints/${complaint.complaintNumber}/confirm`, {
    method: 'POST',
    headers: { ...citizenHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      confirmation: 'CONFIRMED',
      notes: 'Verified in person. Area is completely clean. Thank you MCC team!',
    }),
  });
  if (!confirmRes.ok) throw new Error(`Citizen confirm failed: ${JSON.stringify(confirmRes)}`);
  console.log(`  -> Status updated to: ${confirmRes.data.data.status}`);
  console.log(`  -> Resolved At: ${confirmRes.data.data.resolvedAt}`);
  if (confirmRes.data.data.status !== 'RESOLVED') {
    throw new Error(`Expected status to be RESOLVED, got ${confirmRes.data.data.status}`);
  }

  // STEP X & Y: Citizen reopens complaint flow
  console.log('\n[STEP X, Y] Testing Citizen Reopen flow...');
  const reopenRes = await request(`/complaints/${complaint.complaintNumber}/reopen`, {
    method: 'POST',
    headers: { ...citizenHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reason: 'Waste reappeared within 2 hours from local shops dumping again.',
    }),
  });
  if (!reopenRes.ok) throw new Error(`Citizen reopen failed: ${JSON.stringify(reopenRes)}`);
  console.log(`  -> Status updated to: ${reopenRes.data.data.status}`);
  console.log(`  -> Reopened At: ${reopenRes.data.data.reopenedAt}`);
  if (reopenRes.data.data.status !== 'REOPENED') {
    throw new Error(`Expected status to be REOPENED, got ${reopenRes.data.data.status}`);
  }

  // Verify Admin received reopen alert notification
  const adminNotifs = await request('/notifications', { headers: adminHeaders });
  const adminNotifList = adminNotifs.data?.notifications || adminNotifs.data?.data || [];
  console.log(`  -> Admin notifications count: ${adminNotifList.length}`);
  const reopenNotif = adminNotifList.find(n => n.type === 'COMPLAINT_REOPENED' || n.title?.includes('Reopened'));
  console.log(`  -> Admin reopen notification found:`, !!reopenNotif, reopenNotif?.title);
  if (!reopenNotif) {
    throw new Error('Admin should have received reopen notification!');
  }

  console.log('\n======================================================');
  console.log('>>> ALL REAL-WORLD WORKFLOW REQUIREMENTS VERIFIED! <<<');
  console.log('======================================================\n');
}

runRealEndToEnd().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
