const fetch = require("node-fetch");
const dotenv = require("dotenv");
dotenv.config();

const urls = process.env.URLS?.split(",") || [];
if (urls.length === 0) {
    console.error("No URLs provided in the .env file. Please set the URLS variable.");
    process.exit(1);
}
async function pingAll() {
    console.log(`[${new Date().toLocaleString()}] Pinging ${urls.length} URLs...`);

    for (const url of urls) {
        try {
            const response = await fetch(url.trim());
            console.log(`✅ ${url.trim()} - ${response.status}`);
        } catch (error) {
            console.error(`❌ Failed to ping ${url.trim()}:`, error.message);
        }
    }

    console.log("Ping round completed.\n");
}

// Ping
pingAll();

// get seconds from env
const seconds = process.env.SECONDS || 600;
setInterval(pingAll, seconds * 1000);