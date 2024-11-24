const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require("../models/User");
const auth = require("../middleware/auth")

const router = express.Router();

const generateToken = (userId, role) => {
    return jwt.sign(
        { 
            userId, 
            role,
            // Add a unique identifier for each login session
            sessionId: Math.random().toString(36).substring(2)
        }, 
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};
router.post('/register', async(req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).send({message: "User registered successfully" });
    } catch (error) {
        res.status(400).send(error)
        
    }
});
//working fine in postman

router.post('/login', async(req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if(!user || !(await bcrypt.compare(req.body.password, user.password))) {
            return res.status(401).send({error: " Invalid login credentials "});
        }
        const token = generateToken(user._id, user.role);
        res.send({token, role: user.role, userId: user._id, username: user.username});
    } catch (error) {
        res.status(400).send(error)
    }
});


router.get('/validate',  auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if(!user) {
            return res.status(401).send({ error: 'User not found'});
        }

        if(req.userRole !== user.role) {
            return res.status(401).send({ error: 'Role mismatch'})
        }
        res.status(200).send({
            userId: user._id,
            username: user.username,
            role: user.role
        });

    } catch (error) {
        res.status(401).send({ error: "Authentication failed" });
    }
    // res.status(200).send({ userId: req.userId, message: "User authenticated successfully" });

});

module.exports = router;

//working fine in postman