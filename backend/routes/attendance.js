const express = require('express');
const Attendance = require("../models/Attendance");
// const QRCode = require("../models/QRCode");
const AttendanceSession = require("../models/AttendanceSession");
const auth = require("../middleware/auth");

const router = express.Router();

// router.post('/record', auth, async(req, res) => {
//     try {
//         const { sessionId, location } = req.body;
//         const qrCode = await QRCode.findOne({ sessionId });

//         if(!qrCode || qrCode.expiresAt < new Date()) {
//             return res.status(400).send({error: "Invalid or expired QR code"});
//         }

//         const attendance = new Attendance({
//             studentId: req.userId,
//             sessionId,
//             location: {
//                 type: 'Point',
//                 coordinates: [location.longitude, location.latitude]
//             }
//         });
//         await attendance.save()
//         res.status(201).send({ message: "Attendance recorded successfully" });
//     } catch (error) {
//         res.status(400).send(error)
//     }
// });
// //working fine
router.post('/mark', auth, async(req, res) => {
    try {
        const { sessionId, location } = req.body;
        
        // Find active session by code
        const session = await AttendanceSession.findOne({
            code: sessionId,
            status: 'active',
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(400).send({ error: 'Invalid or expired session code' });
        }

        // Check if student already marked attendance
        const existingAttendance = await Attendance.findOne({
            studentId: req.user._id,
            sessionId: session._id
        });

        if (existingAttendance) {
            return res.status(400).send({ error: 'Attendance already marked for this session' });
        }

        const attendance = new Attendance({
            studentId: req.user._id,
            sessionId: session._id,
            location: {
                type: 'Point',
                coordinates: [location.longitude, location.latitude]
            }
        });

        await attendance.save();
        res.status(201).send({ message: 'Attendance marked successfully' });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

// Optional: Add a route to get attendance history for a student
router.get('/history', auth, async(req, res) => {
    try {
        const attendance = await Attendance.find({ studentId: req.user._id })
            .populate('sessionId')
            .sort({ timeStamp: -1 });
        res.send(attendance);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

module.exports = router;