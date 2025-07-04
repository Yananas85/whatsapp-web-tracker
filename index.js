const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fetch = require('node-fetch');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node'); // <- Correct location
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Setup database
let db;

async function initDB() {
  db = new Low(new JSONFile('db.json'), { messages: [] });
  await db.read();
  db.data ||= { messages: [] };
  await db.write();
}
initDB();

// Init WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox'],
    }
});

const fs = require('fs');
const path = require('path');

client.on('qr', async qr => {
  console.log("Scan QR at: https://your-app-url.onrender.com/qr");

  const qrImage = await QRCode.toDataURL(qr);

  const qrDir = path.join(__dirname, 'public');
  if (!fs.existsSync(qrDir)) {
    fs.mkdirSync(qrDir);
  }

  fs.writeFileSync(path.join(qrDir, 'qr.html'), `<html><body><img src="${qrImage}" /></body></html>`);
});

client.on('ready', () => {
    console.log('WhatsApp client is ready!');
});

// Save new messages
client.on('message', async msg => {
    await db.read();
    const chat = await msg.getChat();
    const contact = await msg.getContact();
    if (!msg.fromMe) {
        db.data.messages.push({
            id: msg.id._serialized,
            from: contact.pushname || msg.from,
            body: msg.body,
            timestamp: Date.now(),
            replied: false
        });
        await db.write();
    } else {
        // Mark previous message as replied
        const thread = db.data.messages.reverse().find(m => !m.replied && m.from === msg.to);
        if (thread) thread.replied = true;
        db.data.messages.reverse();
        await db.write();
    }
});

// Periodic check for stale messages
setInterval(async () => {
    await db.read();
    const now = Date.now();
    const threshold = 1000 * 60 * 60 * 48; // 48h
    const webhook = process.env.MAKE_WEBHOOK;

    const staleMessages = db.data.messages.filter(m => !m.replied && (now - m.timestamp > threshold));
    for (const msg of staleMessages) {
        console.log("Sending stale message to Make:", msg.body);
        await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                platform: "WhatsApp",
                type: "Reply",
                message: msg.body,
                sender: msg.from,
                timestamp: new Date(msg.timestamp).toISOString()
            })
        });
        msg.replied = true;
    }
    await db.write();
}, 1000 * 60 * 30); // Every 30 minutes

client.initialize();

app.get("/", (req, res) => res.send("WhatsApp Tracker is running"));
app.use('/qr', express.static(path.join(__dirname, 'public')));
app.listen(port, () => console.log(`Web server listening on port ${port}`));
