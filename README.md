# WhatsApp Web Tracker Bot

Tracks incoming WhatsApp messages via WhatsApp Web and detects unreplied messages after 48 hours. Sends stale messages to Make.com webhook.

## 🛠 Setup

1. Clone repo or upload to Railway.
2. Set `MAKE_WEBHOOK` in Railway environment variables.
3. Open logs to scan the WhatsApp QR code.
4. Messages will be scanned every 30 minutes.

## 🚀 Deployment (Railway)

- Click "Deploy from GitHub" on [Railway](https://railway.app)
- Link this repo
- Set environment variable: `MAKE_WEBHOOK`
- Done!

