const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { sequelize } = require('./models');

const app = express();
app.use(express.json());
app.use(cors());

app.use('/api/v1/account', require('./routes/account'));
app.use('/api/v1/', require('./routes/uploads'));

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message });
    }

    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});


const PORT = 3000;
sequelize.sync().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port http://localhost:${PORT}`);
    });
});