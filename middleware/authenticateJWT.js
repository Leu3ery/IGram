const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_ACCESS, (err, id) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = id;
            next();
        });
    } else {
        res.sendStatus(403);
    }
};

module.exports = authenticateJWT;