const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());


app.get('/', (req, res) => {
    res.status(404).send('Page not found');
})


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});