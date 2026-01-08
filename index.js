const express = require('express')
const cors = require('cors');
const dotenv= require('dotenv').config();

// Load environmental variables from .env file
dotenv.config();
const app = express();
const port = process.env.PORT || 5000;