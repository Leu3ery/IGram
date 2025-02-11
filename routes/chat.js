const express = require('express');
const router = express.Router();
const { Chat, ChatTable, User, Contact } = require('../models/index');
const { Op } = require('sequelize');
const authenticateJWT = require('../middleware/authenticateJWT');

async function checkChatMembership(chatId, userId, adminRequired = false) {
    const membership = await ChatTable.findOne({ where: { chatId, userId } });
    if (!membership) {
      throw new Error('You are not user of this chat');
    }
    if (adminRequired && !membership.dataValues.isAdmin) {
      throw new Error('You are not admin of this chat');
    }
    
    return membership;
  }


router.get('/list', authenticateJWT, async (req, res, next) => {
    try {
        const {startsWith} = req.query;
        const whereClause = startsWith
            ? { name: { [Op.startsWith]: startsWith } }
            : {};

        const user = await User.findByPk(req.user.id, {
            attributes: [],
            include: [
                {
                model: Chat,
                where: whereClause,
                attributes: ['id', 'name'],
                through: { attributes: [] }
                }
            ]
        });
        res.status(200).json(user ? user.Chats : []);
    } catch (error) {
        next(error);
    }
});

router.patch('/admin/:chatId', authenticateJWT, async (req, res, next) => {
    try {
        const {chatId} = req.params;
        if (!chatId) {
            return res.status(400).json({"message": "Chat ID is required"});
        }
        const chat = await Chat.findByPk(chatId);
        if (!chat) {
            return res.status(400).json({"message": "Chat not found"});
        };
        const {username} = req.query;
        if (!username) {
            return res.status(400).json({"message": "Username is required"});
        }
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        };
        const userId = user.id;
        if (req.user.id === userId) {
            return res.status(400).json({"message": "You cannot set yourself as admin of this chat"});
        };
        if (!await ChatTable.findOne({ where: { chatId, userId } })) {
            return res.status(400).json({"message": "User you want to set as admin is not in this chat"});
        };
        await checkChatMembership(chatId, req.user.id, true);
        if (await ChatTable.findOne({ where: { chatId, userId, isAdmin: true } })) {
            return res.status(400).json({"message": "User is already admin of this chat"});
        }
        await ChatTable.update({ isAdmin: true }, { where: { chatId, userId } });
        res.status(200).json({"message": "User set as admin of this chat"});
    } catch (error) {
        switch (error.message) {
            case "You are not user of this chat":
                return res.status(400).json({"message": error.message});
            case "You are not admin of this chat":
                return res.status(400).json({"message": error.message});
            default:
                next(error);
        }
    }
});

router.post('/user/:chatId', authenticateJWT, async (req, res, next) => {
    try {
        const {chatId} = req.params;
        if (!chatId) {
            return res.status(400).json({"message": "Chat ID is required"});
        }
        const chat = await Chat.findByPk(chatId);
        if (!chat) {
            return res.status(400).json({"message": "Chat not found"});
        };
        const {username} = req.query;
        if (!username) {
            return res.status(400).json({"message": "Username is required"});
        }
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        };
        const userId = user.id;
        await checkChatMembership(chatId, req.user.id, true);
        if (req.user.id === userId) {
            return res.status(400).json({"message": "You cannot add yourself to the chat"});
        }
        if (await ChatTable.findOne({ where: { chatId, userId } })) {
            return res.status(400).json({"message": "User is already in this chat"});
        }
        if (!await Contact.findOne({
            where: { [Op.or]: [{ senderId: req.user.id, receiverId: userId }, { senderId: userId, receiverId: req.user.id }] }
        })) {
            return res.status(400).json({"message": "You are not friends with this user"});
        };
        const chatTable = await ChatTable.create({ chatId, userId });
        res.status(201).json({"message": "User was added to the chat"});
    } catch (error) {
        switch (error.message) {
            case "You are not user of this chat":
                return res.status(400).json({"message": error.message});
            case "You are not admin of this chat":
                return res.status(400).json({"message": error.message});
            default:
                next(error);
        }
    }
});

router.get('/user/:chatId', authenticateJWT, async (req, res, next) => {
    try {
        const {chatId} = req.params;
        if (!chatId) {
            return res.status(400).json({"message": "Chat ID is required"});
        }
        const membership = await checkChatMembership(chatId, req.user.id);
        const chat = await Chat.findOne({
            where: { id: chatId },
            attributes: [],
            include: [{
                model: User,
                attributes: ['id', 'username', 'name'],
                through: { attributes: ['isAdmin'] } // Get 'isAdmin' from ChatTable
            }]
        });
        if (!chat) {
            return res.status(400).json({"message": "Chat not found"});
        };
        return res.status(200).json(chat.Users.map(user => ({id: user.id, username: user.username, name: user.name, isAdmin: user.ChatTable.isAdmin})));
    } catch (error) {
        switch (error.message) {
            case "You are not user of this chat":
                return res.status(400).json({"message": error.message});
            case "You are not admin of this chat":
                return res.status(400).json({"message": error.message});
            default:
                next(error);
        }
    }
});

router.delete('/user/:chatId', authenticateJWT, async (req, res, next) => {
    try {
        const {chatId} = req.params;
        if (!chatId) {
            return res.status(400).json({"message": "Chat ID is required"});
        }
        const chat = await Chat.findByPk(chatId);
        if (!chat) {
            return res.status(400).json({"message": "Chat not found"});
        };
        const {username} = req.query;
        if (!username) {
            return res.status(400).json({"message": "Username is required"});
        }
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(400).json({"message": "User not found"});
        };
        const userId = user.id;
        if (userId != req.user.id) {
            await checkChatMembership(chatId, req.user.id, true);
        };
        await checkChatMembership(chatId, userId);
        
        if (!await ChatTable.findOne({ where: { chatId, userId } })) {
            return res.status(400).json({"message": "User not found in this chat"});
        };
        if ((await ChatTable.findOne({ where: { chatId, userId } })).dataValues.isAdmin && req.user.id != userId) {
            return res.status(400).json({"message": "You can't remove an admin from the chat"});
        };
        if ((await ChatTable.findOne({ where: { chatId, userId } })).dataValues.isAdmin 
            && req.user.id == userId 
            && (await ChatTable.findAll({where: {
                chatId,
                isAdmin: true
            }})).length == 1) {
            return res.status(400).json({"message": "You can't leave if you are the only admin"});
        }
        await ChatTable.destroy({ where: { chatId, userId } });
        res.status(200).json({"message": "User was removed from the chat"});
    } catch (error) {
        switch (error.message) {
            case "You are not user of this chat":
                return res.status(400).json({"message": error.message});
            case "You are not admin of this chat":
                return res.status(400).json({"message": error.message});
            default:
                next(error);
        }
    }
});

router.post('/', authenticateJWT, async (req, res, next) => {
    try {
        const {name} = req.body;
        if (!name) {
            return res.status(400).json({"message": "Name is required"});
        }
        if (name.length < 3 || name.length > 32) {
            return res.status(400).json({"message": "Name length must be between 3 and 32 characters"});
        }
        const chat = await Chat.create({name});
        await ChatTable.create({chatId: chat.id, userId: req.user.id, isAdmin: true});
        res.status(201).json({"message": "Chat created successfully"});
    } catch (error) {
        next(error);
    }
});

router.get('/:chatId', authenticateJWT, async (req, res, next) => {
    try {
        const {chatId} = req.params;
        if (!chatId) {
            return res.status(400).json({"message": "Chat ID is required"});
        };
        const chat = await Chat.findByPk(chatId, {
            attributes: ['name']
        });
        if (!chat) {
            return res.status(404).json({"message": "Chat not found"});
        };
        await checkChatMembership(chatId, req.user.id);
        res.status(200).json(chat);
    } catch (error) {
        switch (error.message) {
            case "You are not user of this chat":
                return res.status(400).json({"message": error.message});
            case "You are not admin of this chat":
                return res.status(400).json({"message": error.message});
            default:
                next(error);
        }
    }
});

router.patch('/:chatId', authenticateJWT, async (req, res, next) => {
    try {
        const {chatId} = req.params;
        if (!chatId) {
            return res.status(400).json({"message": "Chat ID is required"});
        }
        const chat = await Chat.findByPk(chatId);
        if (!chat) {
            return res.status(404).json({"message": "Chat not found"});
        };
        await checkChatMembership(chatId, req.user.id, true);
        const {name} = req.body;
        if (!name) {
            return res.status(400).json({"message": "Name is required"});
        }
        if (name.length < 3 || name.length > 32) {
            return res.status(400).json({"message": "Name length must be between 3 and 32 characters"});
        }
        chat.name = name;
        await chat.save();
        res.status(200).json({"message": "Chat updated successfully"});
    } catch (error) {
        switch (error.message) {
            case "You are not user of this chat":
                return res.status(400).json({"message": error.message});
            case "You are not admin of this chat":
                return res.status(400).json({"message": error.message});
            default:
                next(error);
        }
    }
}); 


router.delete('/:chatId', authenticateJWT, async (req, res, next) => {
    try {
        const {chatId} = req.params;
        if (!chatId) {
            return res.status(400).json({"message": "Chat ID is required"});
        }
        const chat = await Chat.findByPk(chatId);
        if (!chat) {
            return res.status(404).json({"message": "Chat not found"});
        };
        await checkChatMembership(chatId, req.user.id, true);
        await chat.destroy();
        res.status(200).json({"message": "Chat deleted successfully"});
    } catch (error) {
        switch (error.message) {
            case "You are not user of this chat":
                return res.status(400).json({"message": error.message});
            case "You are not admin of this chat":
                return res.status(400).json({"message": error.message});
            default:
                next(error);
        }
    }
});

module.exports = router;