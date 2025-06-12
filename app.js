const fetch = require("node-fetch");
const dotenv = require("dotenv");
const express = require("express");
dotenv.config();

const urls = process.env.URLS?.split(",") || [];
if (urls.length === 0) {
    console.error("No URLs provided in the .env file. Please set the URLS variable.");
    process.exit(1);
}

// Track the last ping time to prevent too frequent pings
let lastPingTime = 0;
const MINIMUM_PING_INTERVAL = 60; // minimum 60 seconds between manual pings

async function pingAll() {
    const currentTime = new Date().toLocaleString();
    console.log(`[${currentTime}] Pinging ${urls.length} URLs...`);

    for (const url of urls) {
        try {
            const response = await fetch(url.trim());
            console.log(`✅ ${url.trim()} - ${response.status}`);
        } catch (error) {
            console.error(`❌ Failed to ping ${url.trim()}:`, error.message);
        }
    }

    console.log("Ping round completed.\n");
    lastPingTime = Date.now();
}

// Get interval from env (default 10 minutes = 600 seconds)
const intervalSeconds = parseInt(process.env.SECONDS) || 600;
console.log(`Automatic ping interval set to ${intervalSeconds} seconds`);

// Start the automatic pinger
console.log(`Starting automatic pinger - will ping every ${intervalSeconds} seconds`);
const intervalId = setInterval(pingAll, intervalSeconds * 1000);

// Setup Express server
const app = express();

// Add a route to show ping status and trigger manual ping
app.get("/", (req, res) => {
    const now = Date.now();
    const secondsSinceLastPing = Math.floor((now - lastPingTime) / 1000);
    
    // If trying to ping too frequently, return status instead
    if (secondsSinceLastPing < MINIMUM_PING_INTERVAL) {
        return res.json({
            message: `Please wait ${MINIMUM_PING_INTERVAL - secondsSinceLastPing} seconds before next manual ping`,
            lastPingTime: new Date(lastPingTime).toLocaleString(),
            nextAutomaticPing: new Date(lastPingTime + intervalSeconds * 1000).toLocaleString()
        });
    }

    // Trigger a new ping
    pingAll();
    res.json({
        message: "Manual ping triggered",
        urls: urls,
        nextAutomaticPing: new Date(Date.now() + intervalSeconds * 1000).toLocaleString()
    });
});

// Add status endpoint
app.get("/status", (req, res) => {
    res.json({
        lastPingTime: lastPingTime ? new Date(lastPingTime).toLocaleString() : "Never",
        nextAutomaticPing: lastPingTime ? new Date(lastPingTime + intervalSeconds * 1000).toLocaleString() : "Soon",
        pingInterval: `${intervalSeconds} seconds`,
        urls: urls
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // Do initial ping
    console.log("Performing initial ping...");
    pingAll();
});