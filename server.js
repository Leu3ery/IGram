const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const app = express();
app.use(express.json());
app.use(cors());


app.get('/', (req, res) => {
    res.status(404).send('Page not found');
})

app.use('/api/v1/account', require('./routes/account'));


const PORT = 3000;
sequelize.sync().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port http://localhost:${PORT}`);
    });
});