const express = require('express');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse URLs from environment variable
const getUrlsFromEnv = () => {
    const urlsString = process.env.PING_URLS || '';
    return urlsString
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
};

// Parse webhook URLs from environment variable
const getWebhooksFromEnv = () => {
    const webhooksString = process.env.WEBHOOK_URLS || '';
    return webhooksString
        .split(',')
        .map(webhook => webhook.trim())
        .filter(webhook => webhook.length > 0);
};

// Send webhook notification
const sendWebhookNotification = async (webhookUrl, data) => {
    try {
        const payload = {
            timestamp: new Date().toISOString(),
            service: 'OnRender Pinger',
            ...data
        };

        // Discord webhook format
        if (webhookUrl.includes('discord.com')) {
            const discordPayload = {
                embeds: [{
                    title: data.type === 'error' ? '🚨 App Down Alert' : '✅ Apps Status Update',
                    description: data.message,
                    color: data.type === 'error' ? 15158332 : 3066993, // Red or Green
                    timestamp: new Date().toISOString(),
                    fields: data.details ? data.details.map(detail => ({
                        name: detail.url,
                        value: `Status: ${detail.status}\n${detail.error || `Response: ${detail.responseTime}ms`}`,
                        inline: true
                    })) : []
                }]
            };
            await axios.post(webhookUrl, discordPayload);
        }
        // Slack webhook format
        else if (webhookUrl.includes('slack.com')) {
            const slackPayload = {
                text: data.message,
                attachments: [{
                    color: data.type === 'error' ? 'danger' : 'good',
                    fields: data.details ? data.details.map(detail => ({
                        title: detail.url,
                        value: detail.error || `✅ ${detail.responseTime}ms`,
                        short: true
                    })) : [],
                    ts: Math.floor(Date.now() / 1000)
                }]
            };
            await axios.post(webhookUrl, slackPayload);
        }
        // Generic webhook format
        else {
            await axios.post(webhookUrl, payload);
        }

        console.log(`📡 Webhook sent to ${webhookUrl.substring(0, 50)}...`);
    } catch (error) {
        console.log(`❌ Webhook failed for ${webhookUrl.substring(0, 50)}...: ${error.message}`);
    }
};

// Send notifications to all webhooks
const notifyWebhooks = async (data) => {
    const webhooks = getWebhooksFromEnv();
    if (webhooks.length === 0) return;

    await Promise.allSettled(
        webhooks.map(webhook => sendWebhookNotification(webhook, data))
    );
};

// Validate URL format
const isValidUrl = (string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

// Ping a single URL
const pingUrl = async (url) => {
    try {
        const startTime = Date.now();
        const response = await axios.get(url, {
            timeout: 30000, // 30 second timeout
            headers: {
                'User-Agent': 'OnRender-Pinger/1.0'
            }
        });
        const responseTime = Date.now() - startTime;

        console.log(`✅ ${url} - Status: ${response.status} - Response Time: ${responseTime}ms`);
        return {
            url,
            status: 'success',
            statusCode: response.status,
            responseTime,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.log(`❌ ${url} - Error: ${error.message}`);
        return {
            url,
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

// Ping all URLs
const pingAllUrls = async () => {
    const urls = getUrlsFromEnv();

    if (urls.length === 0) {
        console.log('⚠️  No URLs found in PING_URLS environment variable');
        return;
    }

    console.log(`🚀 Starting ping cycle for ${urls.length} URLs at ${new Date().toISOString()}`);

    const validUrls = urls.filter(url => {
        if (!isValidUrl(url)) {
            console.log(`⚠️  Invalid URL skipped: ${url}`);
            return false;
        }
        return true;
    });

    if (validUrls.length === 0) {
        console.log('❌ No valid URLs found');
        return;
    }

    const results = await Promise.allSettled(
        validUrls.map(url => pingUrl(url))
    );

    const successful = results.filter(result =>
        result.status === 'fulfilled' && result.value.status === 'success'
    ).length;

    const failed = results.filter(result =>
        result.status === 'fulfilled' && result.value.status === 'error'
    );

    console.log(`📊 Ping cycle completed: ${successful}/${validUrls.length} successful\n`);

    // Send webhook notifications for failures
    if (failed.length > 0) {
        const failedDetails = failed.map(result => result.value);
        await notifyWebhooks({
            type: 'error',
            message: `🚨 ${failed.length} app(s) are down!`,
            details: failedDetails,
            summary: `${successful}/${validUrls.length} apps responding`
        });
    }

    // Send success summary (optional, only if NOTIFY_SUCCESS is enabled)
    if (process.env.NOTIFY_SUCCESS === 'true' && failed.length === 0) {
        const successDetails = results
            .filter(result => result.status === 'fulfilled' && result.value.status === 'success')
            .map(result => result.value);

        await notifyWebhooks({
            type: 'success',
            message: `✅ All ${successful} apps are healthy!`,
            details: successDetails,
            summary: `All apps responding normally`
        });
    }
};

// Schedule pings every 15 minutes
cron.schedule('*/15 * * * *', () => {
    pingAllUrls();
});

// Health check endpoint
app.get('/', (req, res) => {
    const urls = getUrlsFromEnv();
    const webhooks = getWebhooksFromEnv();
    res.json({
        message: 'OnRender Pinger is running!',
        status: 'active',
        monitoredUrls: urls.length,
        urls: urls,
        webhooks: webhooks.length,
        webhookUrls: webhooks.map(w => w.substring(0, 50) + '...'),
        nextPing: 'Every 15 minutes',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Manual ping endpoint
app.get('/ping-now', async (req, res) => {
    try {
        await pingAllUrls();
        res.json({
            message: 'Manual ping completed',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to complete manual ping',
            message: error.message
        });
    }
});

// Test webhook endpoint
app.get('/test-webhook', async (req, res) => {
    try {
        await notifyWebhooks({
            type: 'test',
            message: '🧪 Test notification from OnRender Pinger',
            details: [{
                url: 'https://test-example.com',
                status: 'success',
                responseTime: 150
            }],
            summary: 'This is a test webhook notification'
        });

        res.json({
            message: 'Test webhook notifications sent',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to send test webhook',
            message: error.message
        });
    }
});

// Add URLs endpoint (for testing)
app.get('/urls', (req, res) => {
    const urls = getUrlsFromEnv();
    const webhooks = getWebhooksFromEnv();
    res.json({
        urls: urls,
        urlCount: urls.length,
        webhooks: webhooks.length,
        webhookUrls: webhooks.map(w => w.substring(0, 50) + '...')
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🌐 OnRender Pinger server running on port ${PORT}`);
    console.log(`📱 Health check: http://localhost:${PORT}`);
    console.log(`🔧 Manual ping: http://localhost:${PORT}/ping-now`);

    // Initial ping on startup
    setTimeout(() => {
        console.log('🚀 Performing initial ping...');
        pingAllUrls();
    }, 5000); // Wait 5 seconds after startup
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 Received SIGINT, shutting down gracefully');
    process.exit(0);
});