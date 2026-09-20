require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const res = await mongoose.connection.collection('complaints').deleteMany({ isDemo: true });
  console.log('Deleted demo', res);
  
  const res2 = await mongoose.connection.collection('complaints').deleteMany({ 
    complaintNumber: { $in: ['CM-2026-0010', 'CM-2026-0009', 'CM-2026-0008', 'CM-2026-0007', 'CM-2026-0006', 'CM-2026-0005'] }
  });
  console.log('Deleted explicit', res2);
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
