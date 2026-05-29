const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const KEYS_FILE = './keys.json';
const DISCORD_GUILD_ID = 'YOUR_SERVER_ID'; // Discord Server ID mo
const DISCORD_BOT_TOKEN = 'YOUR_BOT_TOKEN'; // Bot token mo

// Load keys
function loadKeys() {
    if (!fs.existsSync(KEYS_FILE)) {
        fs.writeFileSync(KEYS_FILE, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(KEYS_FILE));
}

// Save keys
function saveKeys(keys) {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
}

// Generate key format: sttar_randomletters
function generateKey() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let random = '';
    for (let i = 0; i < 16; i++) {
        random += chars[Math.floor(Math.random() * chars.length)];
    }
    return `sttar_${random}`;
}

// Clean expired keys
function cleanExpiredKeys() {
    let keys = loadKeys();
    const now = Date.now();
    keys = keys.filter(k => k.expires > now);
    saveKeys(keys);
}

// Check if user is in Discord server
async function checkDiscordMember(username) {
    try {
        // Search members by username
        const res = await fetch(
            `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/search?query=${encodeURIComponent(username)}&limit=5`,
            {
                headers: {
                    Authorization: `Bot ${DISCORD_BOT_TOKEN}`
                }
            }
        );
        const members = await res.json();
        if (!Array.isArray(members)) return false;

        // Check kung may match
        return members.some(m =>
            m.user.username.toLowerCase() === username.toLowerCase() ||
            (m.user.global_name && m.user.global_name.toLowerCase() === username.toLowerCase())
        );
    } catch (e) {
        console.error('Discord check error:', e);
        return false;
    }
}

// ─── ROUTES ───────────────────────────────────────

// Homepage - Get Key Page
app.get('/get-key', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Get Key - Sttar Hub</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: #0f0f19;
            color: white;
            font-family: 'Segoe UI', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .card {
            background: #1a1a2e;
            border-radius: 16px;
            padding: 40px;
            width: 100%;
            max-width: 420px;
            border: 1px solid #2a2a4a;
            box-shadow: 0 0 40px rgba(88,101,242,0.2);
        }
        h1 { text-align: center; margin-bottom: 8px; font-size: 28px; }
        .subtitle { text-align: center; color: #888; margin-bottom: 30px; font-size: 14px; }
        label { display: block; margin-bottom: 6px; color: #aaa; font-size: 14px; }
        input {
            width: 100%;
            padding: 12px 16px;
            background: #0f0f19;
            border: 1px solid #2a2a4a;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            margin-bottom: 16px;
            outline: none;
        }
        input:focus { border-color: #5865f2; }
        button {
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            margin-bottom: 12px;
            transition: opacity 0.2s;
        }
        button:hover { opacity: 0.85; }
        .btn-discord { background: #5865f2; color: white; }
        .btn-generate { background: #00b464; color: white; display: none; }
        .status {
            text-align: center;
            margin-top: 12px;
            font-size: 14px;
            min-height: 20px;
        }
        .key-result {
            background: #0f0f19;
            border: 1px solid #ffd700;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
            margin-top: 16px;
            display: none;
        }
        .key-result .key-text {
            color: #ffd700;
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 1px;
            word-break: break-all;
        }
        .key-result .expires {
            color: #888;
            font-size: 12px;
            margin-top: 8px;
        }
        .copy-btn {
            background: #ffd700;
            color: #0f0f19;
            margin-top: 12px;
            font-size: 14px;
            padding: 10px;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>🔑 Sttar Hub</h1>
        <p class="subtitle">Get your access key below</p>

        <label>Discord Username</label>
        <input type="text" id="discordUser" placeholder="yourname or yourname#0000" />

        <button class="btn-discord" onclick="checkDiscord()">
            Join & Verify Discord
        </button>

        <button class="btn-generate" id="genBtn" onclick="generateKey()">
            ✅ Generate Key
        </button>

        <div class="status" id="status"></div>

        <div class="key-result" id="keyResult">
            <div>Your Key:</div>
            <div class="key-text" id="keyText"></div>
            <div class="expires" id="keyExpires"></div>
            <button class="copy-btn" onclick="copyKey()">📋 Copy Key</button>
        </div>
    </div>

    <script>
        let verified = false;

        async function checkDiscord() {
            const username = document.getElementById('discordUser').value.trim();
            if (!username) {
                setStatus('⚠️ Enter your Discord username first!', 'orange');
                return;
            }
            setStatus('🔄 Checking Discord membership...', 'yellow');

            const res = await fetch('/check-discord', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const data = await res.json();

            if (data.inServer) {
                verified = true;
                setStatus('✅ Verified! Now generate your key.', '#00ff88');
                document.getElementById('genBtn').style.display = 'block';
            } else {
                setStatus('❌ Not in server! Join first: discord.gg/YOURINVITE', 'red');
                window.open('https://discord.gg/YOURINVITE', '_blank');
            }
        }

        async function generateKey() {
            if (!verified) return;
            const username = document.getElementById('discordUser').value.trim();
            setStatus('🔄 Generating key...', 'yellow');

            const res = await fetch('/generate-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const data = await res.json();

            if (data.key) {
                document.getElementById('keyText').textContent = data.key;
                document.getElementById('keyExpires').textContent = 'Expires: ' + new Date(data.expires).toLocaleString();
                document.getElementById('keyResult').style.display = 'block';
                setStatus('', '');
            } else {
                setStatus('❌ ' + (data.error || 'Failed to generate key'), 'red');
            }
        }

        function copyKey() {
            const key = document.getElementById('keyText').textContent;
            navigator.clipboard.writeText(key);
            setStatus('📋 Key copied!', '#00ff88');
        }

        function setStatus(msg, color) {
            const el = document.getElementById('status');
            el.textContent = msg;
            el.style.color = color;
        }
    </script>
</body>
</html>
    `);
});

// Check Discord membership
app.post('/check-discord', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.json({ inServer: false });

    const inServer = await checkDiscordMember(username);
    res.json({ inServer });
});

// Generate key
app.post('/generate-key', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.json({ error: 'No username' });

    // Check if in server
    const inServer = await checkDiscordMember(username);
    if (!inServer) return res.json({ error: 'Not in Discord server' });

    cleanExpiredKeys();
    let keys = loadKeys();

    // Check if may existing valid key ang user
    const existing = keys.find(k => k.username.toLowerCase() === username.toLowerCase() && k.expires > Date.now());
    if (existing) {
        return res.json({ key: existing.key, expires: existing.expires });
    }

    // Generate new key
    const newKey = {
        key: generateKey(),
        username: username,
        created: Date.now(),
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };

    keys.push(newKey);
    saveKeys(keys);

    res.json({ key: newKey.key, expires: newKey.expires });
});

// Check key validity (for Lua script)
app.get('/keylist', (req, res) => {
    cleanExpiredKeys();
    const keys = loadKeys();
    // Return all valid keys as plain text (one per line)
    const keyStrings = keys.map(k => k.key).join('\n');
    res.setHeader('Content-Type', 'text/plain');
    res.send(keyStrings);
});

// ─── START ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Key system running on port ${PORT}`);
});
