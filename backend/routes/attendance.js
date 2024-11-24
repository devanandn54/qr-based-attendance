const express = require('express');
const Attendance = require("../models/Attendance");
// const QRCode = require("../models/QRCode");
const AttendanceSession = require("../models/AttendanceSession");
const auth = require("../middleware/auth");

const router = express.Router();


function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; //Earth's radius in miles 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) + 
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 

}

router.post('/mark', auth, async(req, res) => {
    try {
        const { code, location } = req.body;

        if (!code || !/^\d{6}$/.test(code)) {
            return res.status(400).json({ 
                error: 'Invalid attendance code format. Please enter a 6-digit code.' 
            });
        }

        if (!location?.latitude || !location?.longitude) {
            return res.status(400).json({ 
                error: 'Location data is required' 
            });
        }

        
        // Find active session by code
        const session = await AttendanceSession.findOne({
            code: code,
            status: 'active',
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(400).send({ error: 'Invalid or expired session code' });
        }

        const sessionLat = session.location.coordinates[1];
        const sessionLon = session.location.coordinates[0];
        const distance = calculateDistance(
            location.latitude,
            location.longitude,
            sessionLat,
            sessionLon
        );

        if(distance > 0.3) {
            return res.status(400).send({
                error: 'You are too far away from the session location. Must be within 0.3 miles.',
                distance: distance.toFixed(2)
            })
        }

        // Check if student already marked attendance
        const existingAttendance = await Attendance.findOne({
            studentId: req.userId,
            sessionId: session._id
        });

        if (existingAttendance) {
            return res.status(400).send({ error: 'Attendance already marked for this session' });
        }

        const attendance = new Attendance({
            studentId: req.userId,
            sessionId: session._id,
            location: {
                type: 'Point',
                coordinates: [location.longitude, location.latitude]
            },
            timeStamp: new Date()
        });

        await attendance.save();
        res.status(201).send({ message: 'Attendance marked successfully', distance: distance.toFixed(2) });
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