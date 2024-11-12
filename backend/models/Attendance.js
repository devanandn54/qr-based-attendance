const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSession', required: true }, // Updated to reference AttendanceSession
    timeStamp: { type: Date, default: Date.now },
    location: {
        type: { type: String, enum: ['Point'], required: true },
        coordinates: { type: [Number], required: true }
    }
}, {
    timestamps: true, // Add timestamps for created and updated
    toJSON: { 
        transform: function(doc, ret) {
            // Transform the document when converting to JSON
            return {
                _id: ret._id,
                sessionId: ret.sessionId,
                studentId: ret.studentId,
                timestamp: ret.timeStamp,
                location: {
                    latitude: ret.location.coordinates[1],
                    longitude: ret.location.coordinates[0]
                }
            };
        }
    }
});

// Add index for better query performance
attendanceSchema.index({ studentId: 1, sessionId: 1 }, { unique: true });
attendanceSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Attendance', attendanceSchema);