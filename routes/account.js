const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/authenticateJWT');
const { User, ChatTable, Chat } = require('../models');
const dotenv = require('dotenv');
const { Op, where } = require('sequelize'); 
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


router.get('/list', authenticateJWT, async (req, res, next) => {
    try {
        const offSet = req.query.offSet || 0;
        const limit = req.query.limit || 10;
        const startsWith = req.query.startsWith || "";

        let itemTypes = req.query.itemTypes;
        if (!itemTypes) {
            itemTypes = []
        } else if (!Array.isArray(itemTypes)) {
            itemTypes = [itemTypes]
        }
        
        if (itemTypes.length == 0) {
            let relations = await User.findAll({
                attributes: ['id'],
                where: {
                    [Op.not]:[{id: req.user.id}]
                },
                include: {
                    model: User,
                    attributes: [],
                    as: 'contacts',
                    required: true,
                    through: {
                        where: {
                            [Op.or]:[{senderId: req.user.id}, {receiverId: req.user.id}]
                        }
                    }
                }
            });
            let relationsRevers = await User.findAll({
                attributes: ['id'],
                where: {
                    [Op.not]:[{id: req.user.id}]
                },
                include: {
                    model: User,
                    attributes: [],
                    as: 'contactsRevers',
                    required: true,
                    through: {
                        where: {
                            [Op.or]:[{senderId: req.user.id}, {receiverId: req.user.id}]
                        }
                    }
                }
            });
            for (let i = 0; i < relations.length; i++) {
                relations[i] = relations[i].dataValues.id
            }
            for (let i = 0; i < relationsRevers.length; i++) {
                relationsRevers[i] = relationsRevers[i].dataValues.id
            }
            const users = await User.findAll({
                attributes: ['id', 'username', 'avatarImage', 'name'],
                offset: parseInt(offSet),
                limit: parseInt(limit),
                where: {
                    id: {[Op.and]:[{[Op.notIn]:relations}, {[Op.notIn]:relationsRevers}]},
                    [Op.not]:[{id: req.user.id}],
                    username: {
                        [Op.startsWith]: startsWith
                    }
                }
            })
            res.status(200).json(users);

        } else {
            let orCondition = [];
            if (itemTypes.includes('sent')) {
                orCondition.push({senderId: req.user.id, isAccepted: false});
            }
            if (itemTypes.includes('received')) {
                orCondition.push({receiverId: req.user.id, isAccepted: false});
            }
            if (itemTypes.includes('accepted')) {
                orCondition.push({senderId: req.user.id, isAccepted: true});
                orCondition.push({receiverId: req.user.id, isAccepted: true});
            }
            let answer = [];
            const users = await User.findAll({
                attributes: ['id', 'username', 'avatarImage', 'name'],
                where: {
                    username: {
                        [Op.startsWith]: startsWith
                    },
                    id: {
                        [Op.not]: req.user.id
                    }
                },
                offset: parseInt(offSet),
                limit: parseInt(limit),
                subQuery: false,
                include: [
                    {
                        model: User,
                        required: true,
                        as: 'contacts',
                        attributes: ['id', 'username', 'avatarImage', 'name'],
                        through: {
                            where: {
                                [Op.or]: orCondition
                            }
                        }
                    }
                ]
            });
            answer.push(...users);
            const usersRevers = await User.findAll({
                attributes: ['id', 'username', 'avatarImage', 'name'],
                where: {
                    username: {
                        [Op.startsWith]: startsWith
                    },
                    id: {
                        [Op.not]: req.user.id
                    }
                },
                offset: parseInt(offSet),
                limit: parseInt(limit),
                subQuery: false,
                include: [
                    {
                        model: User,
                        required: true,
                        as: 'contactsRevers',
                        attributes: ['id', 'username', 'avatarImage', 'name'],
                        through: {
                            where: {
                                [Op.or]: orCondition
                            }
                        }
                    }
                ]
            });
            answer.push(...usersRevers);
            res.status(200).json(answer);
        }
        
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