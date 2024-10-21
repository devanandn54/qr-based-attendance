const express = require('express');
const Attendance = require("../models/Attendance");
const QRCode = require("../models/QRCode");
const auth = require("../middleware/auth");

const router = express.Router();

router.post('/record', auth, async(req, res) => {
    try {
        const { sessionId, location } = req.body;
        const qrCode = await QRCode.findOne({ sessionId });

        if(!qrCode || qrCode.expiresAt < new Date()) {
            return res.status(400).send({error: "Invalid or expired QR code"});
        }

        const attendance = new Attendance({
            studentId: req.userId,
            sessionId,
            location: {
                type: 'Point',
                coordinates: [location.longitude, location.latitude]
            }
        });
        await attendance.save()
        res.status(201).send({ message: "Attendance recorded successfully" });
    } catch (error) {
        res.status(400).send(error)
    }
});

module.exports = router;