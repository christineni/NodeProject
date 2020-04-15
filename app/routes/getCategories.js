// Dependencies
const express = require('express');
const router = express.Router();

// Category Model
const Category = require('../models/category');

// Routes
Category.methods(['get', 'put', 'post', 'delete']);
Category.register(router, '/get_categories');

// Return router
module.exports = router;