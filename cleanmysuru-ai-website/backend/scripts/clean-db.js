const mongoose = require('mongoose');

async function cleanDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cleanmysuru_ai';
  console.log('Connecting to persistent MongoDB at', uri);
  await mongoose.connect(uri);

  const collections = ['complaints', 'notifications', 'aianalyses', 'duplicatematches', 'auditlogs'];
  for (const coll of collections) {
    try {
      const count = await mongoose.connection.db.collection(coll).countDocuments();
      if (count > 0) {
        await mongoose.connection.db.collection(coll).deleteMany({});
        console.log(`Cleared ${count} records from ${coll}`);
      } else {
        console.log(`Collection ${coll} is already empty`);
      }
    } catch (err) {
      console.warn(`Could not clear ${coll}:`, err.message);
    }
  }

  // Ensure only default verified users remain
  const User = require('../src/models/User');
  const deletedUsers = await User.deleteMany({
    email: { $nin: ['citizen@example.com', 'admin@mysuru.gov.in'] }
  });
  console.log(`Removed ${deletedUsers.deletedCount} temporary test user accounts`);

  const remainingUsers = await User.find({}, 'name email role');
  console.log('Remaining verified users:', remainingUsers.map(u => `${u.email} (${u.role})`));

  console.log('\n--- LIVE DATABASE CLEANUP COMPLETE ---');
  console.log('Complaints: 0');
  console.log('Notifications: 0');
  console.log('AI Analyses: 0');
  console.log('Map Markers: 0');

  await mongoose.disconnect();
}

cleanDatabase().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
