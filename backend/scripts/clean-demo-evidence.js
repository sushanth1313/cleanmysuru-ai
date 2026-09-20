const mongoose = require('mongoose');

async function cleanDemoEvidence() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/cleanmysuru_ai');
    console.log('Connected to MongoDB');

    // Clean completion evidence from test complaints
    const result = await mongoose.connection.collection('complaints').updateMany(
      { completionEvidence: { $exists: true, $ne: null } },
      {
        $unset: {
          completionEvidence: '',
          municipalityResponse: '',
          resolvedAt: '',
          reopenedAt: ''
        },
        $set: {
          status: 'IN_PROGRESS'
        }
      }
    );

    console.log(`Cleaned completion evidence from ${result.modifiedCount} complaints.`);

    // Delete any test/demo records if marked as isDemo: true
    const demoDelete = await mongoose.connection.collection('complaints').deleteMany({ isDemo: true });
    console.log(`Deleted ${demoDelete.deletedCount} demo complaints.`);

    const complaints = await mongoose.connection.collection('complaints').find({}).toArray();
    console.log('Current real complaints:');
    complaints.forEach(c => {
      console.log(`- ${c.complaintNumber}: status=${c.status}, locality=${c.locality}, completionEvidence=${c.completionEvidence || 'NONE'}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error cleaning demo evidence:', err);
    process.exit(1);
  }
}

cleanDemoEvidence();
