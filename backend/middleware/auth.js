const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        if(!token) {
            throw new Error('No authentication token provided');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // console.log("my decoded.....", decoded);

        // const user = await User.findById(decoded.userId);
        // if(!user) {
        //     throw new Error('User not found');
        // }
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        req.sessionId = decoded.sessionId;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Please authenticate' });
        
    }
};