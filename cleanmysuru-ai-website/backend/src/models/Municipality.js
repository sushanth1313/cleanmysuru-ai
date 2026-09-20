const mongoose = require('mongoose');

const municipalitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  departmentInfo: {
    type: String,
  },
  jurisdictionArea: {
    type: String, // e.g. 'MCC Ward 42'
  },
  isDemo: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true,
});

const Municipality = mongoose.model('Municipality', municipalitySchema);
module.exports = Municipality;
