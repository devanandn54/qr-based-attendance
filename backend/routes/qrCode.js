const express = require('express');
const QRCode = require("../models/QRCode");
const auth = require("../middleware/auth");

const router = express.Router();

router.post('/generate', auth, async(req, res) => {
    try {
        const qrCode = new QRCode({
            teacherId: req.userId,
            sessionId: Math.random().toString(36).substring(7),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });
        await qrCode.save();
        res.status(201).send({ sessionId: qrCode.sessionId });
    } catch (error) {
        res.status(400).send(error)
    }
});
//working fine and session id is being generated

module.exports = router;