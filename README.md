# OnRender Pinger 🚀

A Node.js service that keeps your Render.com applications alive by pinging them every 15 minutes to prevent them from going idle.

## Features

- ⏰ Automatically pings your apps every 15 minutes
- 🔧 Configurable via environment variables
- 📊 Health check and monitoring endpoints
- 🌐 Manual ping trigger endpoint
- 📝 Detailed logging with timestamps
- ✅ URL validation and error handling
- 🚀 Optimized for Render.com deployment
- 🔔 **NEW**: Webhook notifications (Discord, Slack, Custom)
- 📱 **NEW**: Real-time alerts when apps go down

## Quick Start

### 1. Clone or Create the Project

Create these files in your project directory:
- `index.js` (main application)
- `package.json` (dependencies)
- `.env` (environment variables)

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file with your URLs:

```env
# Your 3 apps to monitor
PING_URLS=https://your-app-1.onrender.com,https://your-app-2.onrender.com,https://your-app-3.onrender.com

# Optional: Webhook notifications
WEBHOOK_URLS=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN
```

### 4. Run Locally (Optional)

```bash
npm start
```

Visit `http://localhost:3000` to see the status.

## Deployment on Render.com (FREE)

### Step 1: Prepare Your Repository

1. Create a new GitHub repository
2. Upload all the project files
3. Push to GitHub

### Step 2: Create Web Service on Render

1. Go to [Render.com](https://render.com)
2. Sign up/Login with GitHub
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Configure the service:
   - **Name**: `onrender-pinger` (or your preferred name)
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Select "Free" ($0/month)

### Step 3: Add Environment Variables

In Render dashboard:
1. Go to your service → "Environment"
2. Add environment variable:
   - **Key**: `PING_URLS`
   - **Value**: `https://app1.onrender.com,https://app2.onrender.com`
   - Replace with your actual Render app URLs

### Step 4: Deploy

1. Click "Create Web Service"
2. Wait for deployment to complete
3. Your pinger will be live at `https://your-pinger-name.onrender.com`

## Keeping the Pinger Alive

**Important**: The pinger itself needs to stay alive too! Here are strategies:

### Option 1: Self-Ping (Recommended)
Add your pinger's own URL to the PING_URLS:
```env
PING_URLS=https://your-pinger.onrender.com,https://app1.onrender.com,https://app2.onrender.com
```

### Option 2: External Monitoring
Use services like:
- UptimeRobot (free tier)
- Pingdom
- StatusCake

### Option 3: Multiple Pingers
Deploy 2-3 pinger instances that ping each other and your apps.

## API Endpoints

### Health Check
```
GET /
```
Returns service status and configuration.

### Manual Ping
```
GET /ping-now
```
Triggers immediate ping of all URLs.

### View URLs
```
GET /urls
```
Shows configured URLs and count.

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port (auto-set by Render) | `3000` |
| `PING_URLS` | Comma-separated URLs to ping | `https://app1.onrender.com,https://app2.onrender.com` |

## How It Works

1. **Startup**: Loads URLs from environment variables
2. **Validation**: Checks URL format and filters invalid ones
3. **Scheduling**: Uses node-cron to ping every 15 minutes
4. **Pinging**: Makes HTTP GET requests to all URLs
5. **Logging**: Logs success/failure with timestamps
6. **Monitoring**: Provides status endpoints

## Render.com Free Tier Limits

- **Sleep after 15 minutes** of inactivity (this is what we're preventing)
- **750 hours/month** of runtime (enough for 24/7 operation)
- **No custom domains** on free tier
- **Automatic sleep** if no requests for 15 minutes

## Troubleshooting

### Common Issues

1. **URLs not being pinged**
   - Check PING_URLS environment variable
   - Ensure URLs are comma-separated
   - Verify URLs are accessible

2. **Pinger going to sleep**
   - Add pinger's own URL to PING_URLS
   - Use external monitoring service

3. **Deployment fails**
   - Check Node.js version compatibility
   - Verify package.json is correct
   - Ensure all dependencies are listed

### Logs

Check Render logs for debugging:
1. Go to your service dashboard
2. Click "Logs" tab
3. Look for ping status messages

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use and modify as needed.

---

**Note**: This service is designed for Render.com's free tier limitations. For production applications, consider using paid monitoring services.