const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/authenticateJWT');
const { User } = require('../models');
const dotenv = require('dotenv');
const { Op } = require('sequelize'); 
dotenv.config();


router.patch('/', authenticateJWT, async (req, res, next) => {
    try {
        const { name, description } = req.body; 

        if (!name && !description) {
            return res.status(400).json({"message": "At least one field (name or description) must be provided."});
        }

        const user = await User.findOne({ where: { id: req.user.id } });
        if (!user) {
            return res.status(404).json({"message": "User not found"});
        }

        await user.update({ name, description });
        res.status(200).json({"message": "User updated successfully"});
    } catch (error) {
        next(error);
    }
});

router.get('/', authenticateJWT, async (req, res, next) => {
    try {
        const user = await User.findOne({ where: { id: req.user.id } });
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        }
        res.status(200).json({username: user.username, name: user.name, description: user.description});
    } catch (error) {
        next(error)
    }
});

router.delete('/', authenticateJWT, async (req, res, next) => {
    try {
        const user = await User.findOne({ where: { id: req.user.id } });
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        }
        await user.destroy();
        res.status(200).json({"message": "User deleted successfully"});
    } catch (error) {
        next(error)
    }
});


router.get('/list', async (req, res, next) => {
    try {
        const offSet = req.query.offSet || 0;
        const limit = req.query.limit || 10;
        const startsWith = req.query.startsWith || "";
        const users = await User.findAll({
            attributes: ['username', 'name', 'description'],
            where: {
                username: {
                    [Op.startsWith]: startsWith
                }
            },
            offset: parseInt(offSet),
            limit: parseInt(limit)
        });
        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
})

router.get('/:username', async (req, res, next) => {
    try {
        const username = req.params.username;
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        }
        res.status(200).json({username: user.username, name: user.name, description: user.description});
    } catch (error) {
        next(error);
    }
});

router.delete('/:username', authenticateJWT, async (req, res, next) => {
    try {
        const adminUser = await User.findOne({ where: {id: req.user.id} });
        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(400).json({"message": "You must be an admin to delete a user."});
        }
        const user = await User.findOne({ where: { username: req.params.username } });
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        }
        await user.destroy();
        res.status(200).json({"message": "User deleted successfully"});
    } catch (error) {
        next(error);
    }
});


module.exports = router;