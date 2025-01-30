const express = require('express');
const router = express.Router();
const { Post, User } = require('../models/index');
const authenticateJWT = require('../middleware/authenticateJWT');


router.post('/', authenticateJWT, async (req, res) => {
    try {
        const {title, content} = req.body;
        const creatorAccount = await User.findOne({where: {id: req.user.id}});
        if (!creatorAccount) {
            return res.status(400).json({"message": "Creator account not found"});
        }
        if (!title || title.length < 3 || title.length > 64) {
            return res.status(400).json({"message": "At least title is required"});
        }
        if (content && content.length > 500) {
            return res.status(400).json({"message": "Content length must be less than 500 characters"});
        }
        const post = await Post.create({title, content, creator: creatorAccount.username});
        res.status(201).json({"message": "Post created successfully", "postId": post.id});
    } catch (error) {
        console.log(error);
        res.status(500).json({"message": "Something went wrong"});
    }
});

router.get('/list', async (req, res) => {
    const {offSet, limit, username} = req.query;
    try {
        if (!username) {
            return res.status(400).json({"message": "Username is required"});
        }
        const user = await User.findOne({where: {username}});
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        }
        const posts = await Post.findAll({
            attributes: ['id', 'creator', 'title', 'content', 'createdAt'],
            where: { creator: username },
            offset: !offSet ? 0 : parseInt(offSet),
            limit: !limit ? 10 : parseInt(limit),
            order: [['createdAt', 'DESC']] // Order by createdAt in descending order
        });
        res.status(200).json(posts);
    } catch (error) {
        console.log(error);
        res.status(500).json({"message": "Something went wrong"});
    }
});


router.patch('/:postId', authenticateJWT, async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.postId);
        if (!post) {
            return res.status(400).json({"message": "Post not found"});
        }
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        }
        if (post.creator !== user.username) {
            return res.status(400).json({"message": "You can only update your own posts"});
        }
        const {title, content} = req.body;
        if (title && (title.length < 3 || title.length > 64)) {
            return res.status(400).json({"message": "Title must be between 3 and 64 characters long"});
        }
        if (content && content.length > 500) {
            return res.status(400).json({"message": "Content length must be less than 500 characters"});
        }
        if (title) {
            post.title = title;
        }
        if (content) {
            post.content = content;
        }
        await post.save();
        res.status(200).json({"message": "Post updated successfully"});
    } catch (error) {
        console.log(error);
        res.status(500).json({"message": "Something went wrong"});
    }
});

router.get('/:postId', async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.postId);
        if (!post) {
            return res.status(400).json({"message": "Post not found"});
        }
        res.status(200).json({id: post.id, creator: post.creator, title: post.title, content: post.content});
    } catch (error) {
        console.log(error);
        res.status(500).json({"message": "Something went wrong"});
    }
});

router.delete('/:postId', authenticateJWT, async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.postId);
        if (!post) {
            return res.status(400).json({"message": "Post not found"});
        }
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        }
        if (post.creator !== user.username) {
            return res.status(400).json({"message": "You can only delete your own posts"});
        }
        await post.destroy();
        res.status(200).json({"message": "Post deleted successfully"});
    } catch (error) {
        console.log(error);
        res.status(500).json({"message": "Something went wrong"});
    }
});


module.exports = router;