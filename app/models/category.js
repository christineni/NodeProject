// Dependencies
const category = require('node-restful');
const mongoose = category.mongoose;

// Create Schema for Category
var categorySchema = new mongoose.Schema({
    alias: String,
    title: String,
    parent_aliases: [String],
    country_whitelist: [String],
    country_blacklist: [String]
});

// Return model
module.exports = category.model('categories', categorySchema);