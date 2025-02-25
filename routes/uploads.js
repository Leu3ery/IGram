const express = require('express');
const router = express.Router();
const upload = require('../middleware/multerMiddleware');
const authenticateJWT = require('../middleware/authenticateJWT');
const {User, Post} = require('../models');
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
                    await fs.promises.unlink(photoPath);
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

router.get('/account/photo/:username', async (req, res, next) => {
    try {
        const user = await User.findOne({ where: { username: req.params.username } });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        if (!user.avatarImage) {
            return res.status(400).json({ message: 'Photo not found' });
        }
        const photoPath = 'uploads/' + user.avatarImage;
        res.status(200).json({photoPath});
    } catch (error) {
        next(error);
    }
});

router.post('/post/:postId/image', 
    authenticateJWT, 
    async (req, res, next) => {
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
            if (!req.params.postId) {
                return res.status(400).json({ message: 'Post id param is required' });
            }
            const post = await Post.findByPk(req.params.postId);
            if (!post) {
                return res.status(400).json({ message: 'Post not found' });
            }
            const user = await User.findByPk(req.user.id);
            if (!user) {
                return res.status(400).json({ message: 'User not found' });
            }
            if (post.creator !== user.username) {
                return res.status(400).json({ message: 'You can only update your own posts' });
            }
            try {
                if (post.image) {
                    const imagePath = path.join(__dirname, '..', 'uploads', post.image);
                    await fs.promises.unlink(imagePath);
                }
            } catch (error) {
                console.error("Error deleting image:", error);
            }
            post.image = req.file.filename;
            await post.save();
            res.status(200).json({ message: 'Image uploaded successfully' });
        } catch (error) {
            next(error);
        }
});

router.get('/post/:postId/image', async (req, res, next) => {
    try {
        if (!req.params.postId) {
            return res.status(400).json({ message: 'Post id param is required' });
        }
        const post = await Post.findByPk(req.params.postId);
        if (!post) {
            return res.status(400).json({ message: 'Post not found' });
        }
        if (!post.image) {
            return res.status(400).json({ message: 'Image not found' });
        }
        const imagePath = 'uploads/' + post.image;
        res.status(200).json({imagePath});
    } catch (error) {
        next(error);
    }
});


module.exports = router;
