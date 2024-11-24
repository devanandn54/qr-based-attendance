const mongoose = require('mongoose');

// const attendanceSessionSchema = new mongoose.Schema({
//   teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   code: { type: String, required: true, unique: true },
//   status: { type: String, enum: ['active', 'expired'], default: 'active' },
//   createdAt: { type: Date, default: Date.now },
//   expiresAt: { type: Date, required: true }
// });

const attendanceSessionSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, required: true, unique: true },
    codeUpdatedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'expired'], default: 'active' },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    location: {
        type: { type: String, enum: ['Point'], required: true },
        coordinates: { type: [Number], required: true } // [longitude, latitude]
    }
});

attendanceSessionSchema.index({ location: '2dsphere' });
attendanceSessionSchema.index({ code: 1, status: 1 });
module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);