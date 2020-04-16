'use strict';

// Dependencies
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const yelp = require('yelp-fusion');
const winston = require('winston');
const app = express();

// Yelp API key
const apiKey = '5qJTjID7Tr6ZRBlzJK-gTwcQnsvRWeqThXx9KBMIcpEksSUGVm8IaRzK8SXEgqWRx_qDNNgHcZ5jz4E_ItC0j9iY0ffesKxcr1xBr0g7R48HzMIxWl8pj1FHumqWXnYx';
const client = yelp.client(apiKey);

// Load index.html
app.get('/index.html', function (req, res) {
    res.sendFile(__dirname + "/" + "index.html");
})
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.File({ filename: 'error.log', level: 'error' })
    ]
});

// Connect to MongoDB - localhost
mongoose.connect('mongodb://localhost/yelp', { useUnifiedTopology: true, useNewUrlParser: true });

// Connect to MongoDB - docker
// mongoose.connect('mongodb://mongo/yelp', { useUnifiedTopology: true, useNewUrlParser: true });

let db = mongoose.connection;

db.on('connected', function () {
    logger.info("connection opened");
});

db.on('error', function (err) {
    logger.error('connect error: ', err)
});

db.once('open', function () {
    // Get category from Yelp Categories API and insert category to db 
    app.post('/app/post_categories', function (req, res) {
        let params = {
            categoryAlias: req.body.categoryAlias,
            locale: req.body.locale
        };
        logger.info('post_categories');
        client.categoriesSearch(params.categoryAlias, params.locale).then(response => {
            let data = response.jsonBody;
            db.collection('categories').insertOne(data, function (err) {
                if (err) throw err;
                res.send('Record inserted: \n' + JSON.stringify(data));
            });
        }).catch((err) => {
            logger.error('post_categories: ', err);
            res.send('Error inserting record: \n' + JSON.stringify(err));
        });
    });

    // Get all categories that have been added to mongodb
    app.post('/app/get_categories', async function (_, res) {
        logger.info('get_categories');
        try {
            if (res.statusCode === 200) {
                db.collection('categories').find({}).toArray(function (err, response) {
                    if (err) throw err;
                    res.send(response);
                })
            }
        } catch (err) {
            logger.error('Error retrieving categories: \n' + JSON.stringify(err));
        }
    });

    // Find category in db and update the whitelist/blacklist countries if exist
    app.post('/app/update_categories', async function (req, res) {
        let params = {
            categoryAlias: req.body.categoryAlias,
            country_whitelist: req.body.country_whitelist,
            country_blacklist: req.body.country_blacklist,
        };
        logger.info('update_categories');
        try {
            if (params.country_blacklist === (null || undefined || '')) {
                db.collection('categories').findOneAndUpdate({ 'category.alias': params.categoryAlias }, { $push: { 'category.country_whitelist': params.country_whitelist } },
                    { returnOriginal: false, upsert: true }, function (err, response) {
                        if (err) throw err;
                        res.send('Record updated: \n' + JSON.stringify(response));
                    })
            }
            else if (params.country_whitelist === (null || undefined || '')) {
                db.collection('categories').findOneAndUpdate({ 'category.alias': params.categoryAlias }, { $push: { 'category.country_blacklist': params.country_blacklist } },
                    { returnOriginal: false, upsert: true }, function (err, response) {
                        if (err) throw err;
                        res.send('Record updated: \n' + JSON.stringify(response));
                    })
            }
            else {
                db.collection('categories').findOneAndUpdate({ 'category.alias': params.categoryAlias }, { $push: { 'category.country_whitelist': params.country_whitelist, 'category.country_blacklist': params.country_blacklist } },
                    { returnOriginal: false, upsert: true }, function (err, response) {
                        if (err) throw err;
                        res.send('Record updated: \n' + JSON.stringify(response));
                    })
            }
        }
        catch (err) {
            logger.error('Error updating category: \n' + JSON.stringify(err));
        };
    });

    app.listen(3000);
});