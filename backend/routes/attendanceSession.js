const express = require('express');
const AttendanceSession = require('../models/AttendanceSession');
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');
const router = express.Router();

// Generate a random 6-digit code
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create a new session
router.post('/sessions', auth, async (req, res) => {
    try {
      // Verify user is a teacher
      if (req.user.role !== 'teacher') {
        return res.status(403).send({ error: 'Only teachers can create sessions' });
      }
  
      const code = generateCode();
    //   console.log("my data....", req.user);
      const session = new AttendanceSession({
        teacherId: req.user._id,
        code,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
      });
  
      await session.save();
  
      res.status(201).send(session);
    } catch (error) {
        console.error('Create session error:', error)
      res.status(400).send({ error: error.message });
    }
  });

  // Get all sessions for a teacher
router.get('/sessions', auth, async (req, res) => {
    
    try {
        console.log("user:", req.user);
      const sessions = await AttendanceSession.find({ 
        teacherId: req.user._id 
      }).sort({ createdAt: -1 });
      
      res.send(sessions);
    } catch (error) {
        console.error('Fetch sessions error:', error);
      res.status(500).send({ error: error.message });
    }
  });

  // Update session status (e.g., expire a session)
router.patch('/sessions/:id', auth, async (req, res) => {
    try {
      const session = await AttendanceSession.findOne({
        _id: req.params.id,
        teacherId: req.user._id
      });
  
      if (!session) {
        return res.status(404).send({ error: 'Session not found' });
      }
  
      session.status = req.body.status;
      if (req.body.status === 'expired') {
        session.expiresAt = new Date();
      }
  
      await session.save();
      res.send(session);
    } catch (error) {
        console.error('Update session error:', error);
      res.status(400).send({ error: error.message });
    }
  });

  // Get attendance records for a session (for teachers)
router.get('/sessions/:id/attendance', auth, async (req, res) => {
    try {
      const session = await AttendanceSession.findOne({
        _id: req.params.id,
        teacherId: req.user._id
      });
  
      if (!session) {
        return res.status(404).send({ error: 'Session not found' });
      }
  
    //   const attendance = await Attendance.find({ sessionId: session._id })
    //     .populate('studentId', 'username');

    const attendance = await Attendance.find({ sessionId: session._id })
            .populate({
                path: 'studentId',
                select: 'username email', // Add any other user fields you want to include
                match: { role: 'student' } // Only populate if the user is a student
            })
            .lean(); 
            const validAttendance = attendance.filter(record => record.studentId !== null);

            const formattedAttendance = validAttendance.map(record => ({
                _id: record._id,
                sessionId: record.sessionId,
                studentId: {
                    _id: record.studentId._id,
                    username: record.studentId.username,
                    email: record.studentId.email
                },
                timestamp: record.timeStamp,
                location: {
                    latitude: record.location.coordinates[1],  // MongoDB stores as [longitude, latitude]
                    longitude: record.location.coordinates[0]
                }
            }));

      
      res.send(formattedAttendance);
    } catch (error) {
        console.error('Fetch attendance error:', error);
      res.status(500).send({ error: error.message });
    }
  });
  
  module.exports = router;