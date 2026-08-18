const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const mongoose = require('mongoose');
const config = require('./config/config');

console.log('Testing connection to MongoDB with Google/Cloudflare DNS...');
console.log('URI configured:', config.MONGODB.URI.replace(/:([^@]+)@/, ':****@'));

mongoose.set('strictQuery', false);

mongoose.connect(config.MONGODB.URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000
}).then((conn) => {
    console.log('✅ Connected successfully to MongoDB Atlas!');
    console.log('Host:', conn.connection.host);
    console.log('Database:', conn.connection.name);
    process.exit(0);
}).catch((err) => {
    console.error('❌ Connection Failed:');
    console.error(err.message);
    if (err.name === 'MongooseServerSelectionError') {
        console.error('\nPossible reasons:');
        console.error('1. IP Address Not Whitelisted: In MongoDB Atlas (https://cloud.mongodb.com), go to Security -> Network Access -> Add IP Address -> Select "Allow Access from Anywhere" (0.0.0.0/0).');
        console.error('2. Database User credentials: Check if user "RayandNova" exists with readWrite permission in Database Access.');
    }
    process.exit(1);
});
