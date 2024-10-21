const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();



const app = express();


app.use(cors());
app.use(express.json());

//Routes
const authRoutes = require("./routes/auth");
const qrCodeRoutes = require("./routes/qrCode");
const attendanceRoutes = require("./routes/attendance");

app.use('/api/auth', authRoutes);
app.use('/api/qrcode', qrCodeRoutes);
app.use('/api/attendance', attendanceRoutes);

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to db...'))
    .catch(err => console.error("Couldn't connect to db", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));