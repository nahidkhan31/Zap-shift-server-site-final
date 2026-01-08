const express = require('express')
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;


// middleware
app.use(express.json());
app.use(cors());

// sample route
app.get('/', (req, res)=>{
    res.send('Parcel Server is running');
})

//Start the server 
app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
})