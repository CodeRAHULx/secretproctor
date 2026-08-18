const dns = require('dns');

// Configure reliable DNS servers to resolve MongoDB SRV records reliably across environments
try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
    // Keep system defaults if custom DNS fails
}

const mongoose = require('mongoose');
const config = require('./config');

let isConnected = false;

async function connectDB() {
    if (isConnected) return mongoose.connection;
    const uri = config.MONGODB.URI;
    if (!uri) {
        console.warn('⚠️ [MongoDB] MONGODB_URI is not set.');
        return null;
    }

    try {
        mongoose.set('strictQuery', false);
        const maskedUri = uri.replace(/:([^@]+)@/, ':****@');
        console.log(`🔄 [MongoDB] Connecting to ${maskedUri}...`);
        
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000
        });
        
        isConnected = true;
        console.log(`✅ [MongoDB] Connected successfully (Host: ${conn.connection.host}, DB: ${conn.connection.name})`);
        
        mongoose.connection.on('disconnected', () => {
            isConnected = false;
            console.warn('⚠️ [MongoDB] Connection lost.');
        });

        mongoose.connection.on('reconnected', () => {
            isConnected = true;
            console.log('🔄 [MongoDB] Reconnected successfully.');
        });

        return conn;
    } catch (err) {
        console.error('❌ [MongoDB] Connection error:', err.message);
        return null;
    }
}

module.exports = {
    connectDB,
    mongoose,
    isConnected: () => isConnected
};
