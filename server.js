const express = require('express');
const rateLimit = require('express-rate-limit');
const http = require('http');
const {Server} = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const { sequelize } = require('./models');

const app = express();
const server = http.createServer(app);
const io = new Server(server);


const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100,
    message: {message: 'Too many requests, please try again later'},
    headers: true
});

app.use(cors());
app.use(express.json());
// app.use(limiter);

app.use('/', express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/api/v1/auth/', require('./routes/auth'));
app.use('/api/v1/account/', require('./routes/account'));
app.use('/api/v1/post/', require('./routes/post'));
app.use('/api/v1/contact/', require('./routes/contact'));
app.use('/api/v1/chat/', require('./routes/chat'));
app.use('/api/v1/', require('./routes/uploads'));


io.use(require('./websocket/JWTMiddleware'));


require('./websocket/websocetMessages')(io);


app.use((err, req, res, next) => {
    console.log(err);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message });
    }
    
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({ message: err.errors[0].message });
    }
    
    res.status(500).json({ 
        message: err.message 
    });
});


const PORT = 3000;
sequelize.sync({force: false}).then(() => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on port http://localhost:${PORT}`);
    });
});