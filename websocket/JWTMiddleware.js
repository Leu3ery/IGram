const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

module.exports = (socket, next) => {
    try {
        const token = socket.handshake.headers.authorization.split(' ')[1];
        if (!token) {
            return next(new Error('Authentication error'));
        }
        const decoded = jwt.verify(token, process.env.JWT_ACCESS);
        socket.user = decoded;
        next();
    } catch (error) {
        console.log(error);
        next(new Error('Authentication error'));
    }
}