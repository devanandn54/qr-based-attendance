const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require("../models/User");
const auth = require("../middleware/auth")

const router = express.Router();


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
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
        res.send({token, role: user.role});
    } catch (error) {
        res.status(400).send(error)
    }
});


router.get('/validate',  auth, (req, res) => {
    // const token = req.headers.authorization?.split(' ')[1]; // Extract token from 'Bearer token'
    // if (!token) {
    //     return res.status(401).send({ error: "Token missing" });
    // }

    // try {
    //     const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //     res.status(200).send({ userId: decoded.userId, role: decoded.role });
    // } catch (error) {
    //     res.status(401).send({ error: "Invalid token" });
    // }
    res.status(200).send({ userId: req.userId, message: "User authenticated successfully" });

});

module.exports = router;

//working fine in postman
module.exports = router;