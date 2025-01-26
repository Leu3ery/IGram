const express = require('express');
const router = express.Router();
const upload = require('../middleware/multerMiddleware');
const authenticateJWT = require('../middleware/authenticateJWT');
const {User} = require('../models');
const path = require('path');
const fs = require('fs');


router.post(
    '/account/photo',
    authenticateJWT,
    (req, res, next) => {
        upload.single('file')(req, res, (err) => {
            if (err) {
                return next(err);
            }
            next();
        });
    },
    async (req, res, next) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            const user = await User.findByPk(req.user.id);
            if (!user) {
                return res.status(400).json({ message: 'User not found' });
            }
            try {
                if (user.avatarImage) {
                    const photoPath = path.join(__dirname, '..', 'uploads', user.avatarImage);
                    fs.unlinkSync(photoPath);
                }
            } catch (error) {
                console.error("Error deleting photo:", error);
            }
            user.avatarImage = req.file.filename;
            await user.save();

            res.status(200).json({ message: 'Photo uploaded successfully' });
        } catch (error) {
            next(error);
        }
    }
);

router.get('/account/photo/:username', async (req, res) => {
    const user = await User.findOne({ where: { username: req.params.username } });
    if (!user) {
        return res.status(400).json({ message: 'User not found' });
    }

    if (!user.avatarImage) {
        return res.status(404).json({ message: 'Photo not found' });
    }
    const photoPath = path.join(__dirname, '..', 'uploads', user.avatarImage);
    res.sendFile(photoPath);
});

module.exports = router;
