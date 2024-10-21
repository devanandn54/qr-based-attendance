const mongoose = require('mongoose');
const qrCodeSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true }
});

module.exports = mongoose.model('QRCode', qrCodeSchema);