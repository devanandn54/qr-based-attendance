const express = require('express');
const AttendanceSession = require('../models/AttendanceSession');
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');
const router = express.Router();

// Generate a random 6-digit code
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
const refreshSessionCode = async (session) => {
  const newCode = generateCode();
  session.code = newCode;
  session.codeUpdatedAt = new Date();
  await session.save();
  return session;
};

// Create a new session
router.post('/sessions', auth, async (req, res) => {
    try {
      // Verify user is a teacher
      if (req.userRole !== 'teacher') {
        return res.status(403).send({ error: 'Only teachers can create sessions' });
      }

      const { location } = req.body;
      if(!location?.latitude || !location?.longitude) {
        return res.status(400).json({
            error: 'Location data is required'
        });
      }
  
      const code = generateCode();
    //   console.log("my data....", req.user);
      const session = new AttendanceSession({
        teacherId: req.userId,
        code,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
        location: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude]
        }
      });
  
      await session.save();
  
      res.status(201).send(session);
    } catch (error) {
        console.error('Create session error:', error)
      res.status(400).send({ error: error.message });
    }
  });

  router.get('/check-active', auth, async (req, res) => {
    try {
      const now = new Date();
      const activeSession = await AttendanceSession.findOne({
        status: 'active',
        expiresAt: { $gt: now }
      });
      
      res.json({ hasActive: !!activeSession });
    } catch (error) {
      console.error('Check active sessions error:', error);
      res.status(500).send({ error: 'Failed to check active sessions' });
    }
  });

  // Get all sessions for a teacher
router.get('/sessions', auth, async (req, res) => {
    
    try {
      if (req.userRole !== 'teacher') {
        return res.status(403).send({ error: 'Only teachers can view sessions' });
    }
        
      const sessions = await AttendanceSession.find({ 
        teacherId: req.userId 
      }).sort({ createdAt: -1 });
      
      res.send(sessions);
    } catch (error) {
        console.error('Fetch sessions error:', error);
      res.status(500).send({ error: error.message });
    }
  });
  router.get('/sessions/:id/code', auth, async (req, res) => {
    try {
        if (req.userRole !== 'teacher') {
            return res.status(403).send({ error: 'Only teachers can access session codes' });
        }

        const session = await AttendanceSession.findOne({
            _id: req.params.id,
            teacherId: req.userId,
            status: 'active'
        });

        if (!session) {
            return res.status(404).send({ error: 'Session not found' });
        }

        // Check if code needs refresh (older than 3 minutes)
        const codeAge = Date.now() - new Date(session.codeUpdatedAt).getTime();
        if (codeAge >= 3 * 60 * 1000) { // 3 minutes
            const updatedSession = await refreshSessionCode(session);
            return res.send({
                code: updatedSession.code,
                codeUpdatedAt: updatedSession.codeUpdatedAt,
                expiresAt: updatedSession.expiresAt
            });
        }

        res.send({
            code: session.code,
            codeUpdatedAt: session.codeUpdatedAt,
            expiresAt: session.expiresAt
        });
    } catch (error) {
        console.error('Fetch session code error:', error);
        res.status(500).send({ error: error.message });
    }
});

  // Update session status (e.g., expire a session)
router.patch('/sessions/:id', auth, async (req, res) => {
    try {
      if (req.userRole !== 'teacher') {
        return res.status(403).send({ error: 'Only teachers can update sessions' });
    }
      const session = await AttendanceSession.findOne({
        _id: req.params.id,
        teacherId: req.userId
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
      if (req.userRole !== 'teacher') {
        return res.status(403).send({ error: 'Only teachers can view attendance records' });
    }
      
      const session = await AttendanceSession.findOne({
        _id: req.params.id,
        teacherId: req.userId
      });

      console.log("session.....", session);
  
      if (!session) {
        return res.status(404).send({ error: 'Session not found' });
      }
  
    //   const attendance = await Attendance.find({ sessionId: session._id })
    //     .populate('studentId', 'username');

    const attendance = await Attendance.find({ sessionId: session._id })
            .populate({
                path: 'studentId',
                select: 'username', // Add any other user fields you want to include
                match: { role: 'Student' } // Only populate if the user is a student
            })
            .lean(); 
            console.log("attendances...", attendance)
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