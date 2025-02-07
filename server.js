const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { sequelize } = require('./models');


const app = express();
app.use(express.json());
app.use(cors());

app.use('/api/v1/auth/', require('./routes/auth'));
app.use('/api/v1/account/', require('./routes/account'));
app.use('/api/v1/post/', require('./routes/post'));
app.use('/api/v1/contact/', require('./routes/contact'));
app.use('/api/v1/', require('./routes/uploads'));


app.use((err, req, res, next) => {
    logger.error(err);
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
    app.listen(PORT, () => {
        console.log(`Server is running on port http://localhost:${PORT}`);
    });
});