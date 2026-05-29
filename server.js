const express = require('express');
const cors = require('cors');
const fs = require('fs');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const KEYS_FILE = './keys.json';
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || '';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const DISCORD_INVITE = 'https://discord.gg/Vv8NCCUHch';
const ADMIN_PASSWORD = 'sttaralbiola';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function loadKeys() {
    try {
        if (!fs.existsSync(KEYS_FILE)) fs.writeFileSync(KEYS_FILE, JSON.stringify([]));
        return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
    } catch (e) {
        console.error('loadKeys error:', e);
        return [];
    }
}

function saveKeys(keys) {
    try {
        fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
    } catch (e) {
        console.error('saveKeys error:', e);
    }
}

function generateKey() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let r = 'sttar_';
    for (let i = 0; i < 16; i++) r += chars[Math.floor(Math.random() * chars.length)];
    return r;
}

function cleanExpiredKeys() {
    try {
        const now = Date.now();
        const keys = loadKeys().filter(k => k.expires > now);
        saveKeys(keys);
    } catch (e) {
        console.error('cleanExpiredKeys error:', e);
    }
}

// Use node https instead of fetch for compatibility
function httpsGet(options) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { resolve(data); }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function checkDiscordMember(username) {
    try {
        if (!DISCORD_GUILD_ID || !DISCORD_BOT_TOKEN) {
            console.log('Discord env vars not set, skipping check');
            return true; // allow all if not configured
        }
        const options = {
            hostname: 'discord.com',
            path: `/api/v10/guilds/${DISCORD_GUILD_ID}/members/search?query=${encodeURIComponent(username)}&limit=5`,
            method: 'GET',
            headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` }
        };
        const members = await httpsGet(options);
        if (!Array.isArray(members)) return false;
        return members.some(m =>
            m.user.username.toLowerCase() === username.toLowerCase() ||
            (m.user.global_name && m.user.global_name.toLowerCase() === username.toLowerCase())
        );
    } catch (e) {
        console.error('Discord check error:', e);
        return false;
    }
}

// ─── GET-KEY PAGE ─────────────────────────────────────────────────────────────

app.get('/get-key', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sttar Hub — Key System</title>
    <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root{--bg:#07070f;--surface:#0e0e1e;--surface2:#13132a;--border:rgba(120,100,255,0.15);--accent:#7c5cfc;--accent2:#c45cfc;--gold:#ffd166;--green:#06d6a0;--red:#ff4d6d;--text:#e8e6ff;--muted:#6b6890;}
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:var(--bg);color:var(--text);font-family:'Syne',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow-x:hidden;}
        .bg-grid{position:fixed;inset:0;background-image:linear-gradient(rgba(124,92,252,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(124,92,252,0.04) 1px,transparent 1px);background-size:40px 40px;z-index:0;}
        .bg-orb{position:fixed;border-radius:50%;filter:blur(100px);z-index:0;animation:orbFloat 8s ease-in-out infinite;}
        .orb1{width:500px;height:500px;background:rgba(124,92,252,0.12);top:-150px;left:-100px;}
        .orb2{width:400px;height:400px;background:rgba(196,92,252,0.08);bottom:-100px;right:-100px;animation-delay:3s;}
        .orb3{width:300px;height:300px;background:rgba(6,214,160,0.06);top:50%;left:50%;transform:translate(-50%,-50%);animation-delay:6s;}
        @keyframes orbFloat{0%,100%{transform:translateY(0)scale(1)}50%{transform:translateY(-30px)scale(1.05)}}
        .particles{position:fixed;inset:0;z-index:0;overflow:hidden;}
        .particle{position:absolute;width:2px;height:2px;background:var(--accent);border-radius:50%;animation:particleDrift linear infinite;opacity:0;}
        @keyframes particleDrift{0%{transform:translateY(100vh);opacity:0}10%{opacity:0.6}90%{opacity:0.3}100%{transform:translateY(-100px) translateX(40px);opacity:0}}
        .container{position:relative;z-index:10;width:100%;max-width:460px;padding:20px;animation:containerIn 0.8s cubic-bezier(0.16,1,0.3,1) forwards;}
        @keyframes containerIn{from{opacity:0;transform:translateY(40px)scale(0.96)}to{opacity:1;transform:translateY(0)scale(1)}}
        .card{background:var(--surface);border:1px solid var(--border);border-radius:24px;padding:40px 36px;position:relative;overflow:hidden;backdrop-filter:blur(20px);box-shadow:0 0 0 1px rgba(124,92,252,0.1),0 40px 80px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.05);}
        .card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--accent),var(--accent2),transparent);animation:shimmer 3s ease-in-out infinite;}
        @keyframes shimmer{0%,100%{opacity:0.4}50%{opacity:1}}
        .header{text-align:center;margin-bottom:36px;}
        .logo-ring{width:64px;height:64px;border-radius:50%;border:2px solid transparent;background:linear-gradient(var(--surface),var(--surface)) padding-box,linear-gradient(135deg,var(--accent),var(--accent2)) border-box;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 16px;position:relative;}
        .logo-ring::after{content:'';position:absolute;inset:-4px;border-radius:50%;background:conic-gradient(from 0deg,var(--accent),var(--accent2),transparent,transparent);z-index:-1;animation:logoSpin 3s linear infinite;opacity:0.3;filter:blur(4px);}
        @keyframes logoSpin{to{filter:hue-rotate(360deg)}}
        .title{font-size:28px;font-weight:800;letter-spacing:-0.5px;background:linear-gradient(135deg,#fff 30%,var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .subtitle{color:var(--muted);font-size:14px;margin-top:6px;font-family:'Space Mono',monospace;letter-spacing:0.5px;}
        .steps{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:32px;}
        .step-dot{width:8px;height:8px;border-radius:50%;background:var(--surface2);border:1px solid var(--border);transition:all 0.4s ease;}
        .step-dot.active{background:var(--accent);box-shadow:0 0 12px var(--accent);width:24px;border-radius:4px;}
        .step-dot.done{background:var(--green);box-shadow:0 0 8px var(--green);}
        .field{margin-bottom:16px;}
        .field label{display:block;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;}
        .input-wrap{position:relative;}
        .input-wrap .icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;pointer-events:none;}
        input[type="text"]{width:100%;padding:14px 14px 14px 42px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;color:var(--text);font-size:15px;font-family:'Space Mono',monospace;outline:none;transition:all 0.3s ease;}
        input[type="text"]:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(124,92,252,0.15);}
        input[type="text"]::placeholder{color:var(--muted);font-size:13px;}
        .btn{width:100%;padding:15px;border:none;border-radius:12px;font-size:15px;font-weight:700;font-family:'Syne',sans-serif;cursor:pointer;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);display:flex;align-items:center;justify-content:center;gap:8px;position:relative;overflow:hidden;letter-spacing:0.3px;}
        .btn:hover{transform:translateY(-2px);}
        .btn:active{transform:translateY(0) scale(0.98);}
        .btn-discord{background:linear-gradient(135deg,#5865f2,#7b89ff);color:white;box-shadow:0 8px 24px rgba(88,101,242,0.35);margin-bottom:12px;}
        .btn-generate{background:linear-gradient(135deg,var(--green),#04a87f);color:#07070f;box-shadow:0 8px 24px rgba(6,214,160,0.3);margin-bottom:12px;display:none;}
        .btn-submit{background:linear-gradient(135deg,var(--accent),var(--accent2));color:white;box-shadow:0 8px 24px rgba(124,92,252,0.35);display:none;}
        .status{text-align:center;font-size:13px;font-family:'Space Mono',monospace;min-height:20px;margin:12px 0;transition:all 0.3s ease;}
        .key-box{background:var(--surface2);border:1px solid rgba(255,209,102,0.3);border-radius:16px;padding:24px;text-align:center;display:none;animation:keyBoxIn 0.6s cubic-bezier(0.16,1,0.3,1) forwards;margin-top:16px;}
        @keyframes keyBoxIn{from{opacity:0;transform:scale(0.9)translateY(10px)}to{opacity:1;transform:scale(1)translateY(0)}}
        .key-label{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;}
        .key-value{font-family:'Space Mono',monospace;font-size:17px;font-weight:700;color:var(--gold);letter-spacing:1px;word-break:break-all;text-shadow:0 0 20px rgba(255,209,102,0.4);padding:12px;background:rgba(255,209,102,0.05);border-radius:8px;border:1px solid rgba(255,209,102,0.15);}
        .key-expires{font-size:12px;color:var(--muted);margin-top:10px;font-family:'Space Mono',monospace;}
        .key-expires span{color:var(--green);}
        .btn-copy{background:rgba(255,209,102,0.1);color:var(--gold);border:1px solid rgba(255,209,102,0.3);border-radius:10px;padding:10px 20px;font-size:13px;font-weight:700;font-family:'Syne',sans-serif;cursor:pointer;margin-top:14px;transition:all 0.3s ease;display:inline-flex;align-items:center;gap:6px;}
        .btn-copy:hover{background:rgba(255,209,102,0.2);transform:translateY(-2px);}
        .divider{display:flex;align-items:center;gap:12px;margin:20px 0;}
        .divider-line{flex:1;height:1px;background:var(--border);}
        .divider-text{font-size:11px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;font-family:'Space Mono',monospace;}
        .spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,0.2);border-top-color:white;border-radius:50%;animation:spin 0.6s linear infinite;display:none;}
        @keyframes spin{to{transform:rotate(360deg)}}
        .btn.loading .btn-text{display:none;}
        .btn.loading .spinner{display:block;}
        .footer{text-align:center;margin-top:24px;font-size:12px;color:var(--muted);font-family:'Space Mono',monospace;}
        .footer a{color:var(--accent);text-decoration:none;}
        .key-input-section{display:none;}
        .verified-badge{display:none;align-items:center;gap:6px;background:rgba(6,214,160,0.1);border:1px solid rgba(6,214,160,0.3);border-radius:20px;padding:6px 14px;font-size:13px;color:var(--green);font-weight:600;margin:0 auto 12px;width:fit-content;}
        .toast{position:fixed;top:24px;right:24px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 20px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:10px;z-index:1000;transform:translateX(120%);transition:transform 0.4s cubic-bezier(0.16,1,0.3,1);box-shadow:0 20px 40px rgba(0,0,0,0.4);}
        .toast.show{transform:translateX(0);}
    </style>
</head>
<body>
<div class="bg-grid"></div>
<div class="bg-orb orb1"></div>
<div class="bg-orb orb2"></div>
<div class="bg-orb orb3"></div>
<div class="particles" id="particles"></div>
<div class="toast" id="toast"><span id="toastIcon">✅</span><span id="toastMsg">Done!</span></div>
<div class="container">
    <div class="card">
        <div class="header">
            <div class="logo-ring">🔑</div>
            <div class="title">Sttar Hub</div>
            <div class="subtitle">// key access system</div>
        </div>
        <div class="steps">
            <div class="step-dot active" id="step1"></div>
            <div class="step-dot" id="step2"></div>
            <div class="step-dot" id="step3"></div>
        </div>
        <div id="discordSection">
            <div class="field">
                <label>Discord Username</label>
                <div class="input-wrap">
                    <span class="icon">👤</span>
                    <input type="text" id="discordUser" placeholder="yourname or yourname#0000" autocomplete="off" />
                </div>
            </div>
            <button class="btn btn-discord" onclick="checkDiscord()" id="discordBtn">
                <span class="btn-text">🎮 &nbsp;Join & Verify Discord</span>
                <div class="spinner"></div>
            </button>
        </div>
        <div class="verified-badge" id="verifiedBadge">✅ Discord Verified</div>
        <button class="btn btn-generate" onclick="generateKey()" id="genBtn">
            <span class="btn-text">⚡ &nbsp;Generate My Key</span>
            <div class="spinner"></div>
        </button>
        <div class="status" id="status"></div>
        <div class="key-box" id="keyBox">
            <div class="key-label">🔑 Your Access Key</div>
            <div class="key-value" id="keyValue"></div>
            <div class="key-expires" id="keyExpires"></div>
            <button class="btn-copy" onclick="copyKey()">📋 Copy Key</button>
        </div>
        <div class="key-input-section" id="keyInputSection">
            <div class="divider"><div class="divider-line"></div><div class="divider-text">or enter key</div><div class="divider-line"></div></div>
            <div class="field">
                <label>Access Key</label>
                <div class="input-wrap">
                    <span class="icon">🗝️</span>
                    <input type="text" id="keyInput" placeholder="sttar_xxxxxxxxxxxxxxxx" />
                </div>
            </div>
            <button class="btn btn-submit" id="submitBtn" onclick="submitKey()">
                <span class="btn-text">✨ &nbsp;Activate Key</span>
                <div class="spinner"></div>
            </button>
        </div>
        <div class="footer">Need help? <a href="https://discord.gg/Vv8NCCUHch" target="_blank">Join our Discord</a></div>
    </div>
</div>
<script>
    const pc = document.getElementById('particles');
    for(let i=0;i<20;i++){const p=document.createElement('div');p.className='particle';p.style.left=Math.random()*100+'vw';p.style.animationDuration=(8+Math.random()*12)+'s';p.style.animationDelay=(Math.random()*10)+'s';p.style.width=p.style.height=(1+Math.random()*2)+'px';pc.appendChild(p);}
    let verified=false;
    function setStatus(msg,color='#6b6890'){const el=document.getElementById('status');el.style.color=color;el.textContent=msg;}
    function showToast(msg,icon='✅'){const t=document.getElementById('toast');document.getElementById('toastMsg').textContent=msg;document.getElementById('toastIcon').textContent=icon;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000);}
    function setLoading(id,v){const b=document.getElementById(id);v?b.classList.add('loading'):b.classList.remove('loading');b.disabled=v;}
    function updateSteps(s){for(let i=1;i<=3;i++){const d=document.getElementById('step'+i);d.className='step-dot';if(i<s)d.classList.add('done');else if(i===s)d.classList.add('active');}}
    async function checkDiscord(){
        const u=document.getElementById('discordUser').value.trim();
        if(!u){setStatus('⚠️ Enter your Discord username first!','#ff4d6d');return;}
        setLoading('discordBtn',true);setStatus('🔄 Checking Discord membership...','#ffd166');
        try{
            const res=await fetch('/check-discord',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u})});
            const data=await res.json();
            if(data.inServer){verified=true;setStatus('','');document.getElementById('verifiedBadge').style.display='flex';document.getElementById('genBtn').style.display='flex';document.getElementById('keyInputSection').style.display='block';document.getElementById('submitBtn').style.display='flex';updateSteps(2);showToast('Discord verified!','✅');}
            else{setStatus('❌ Not in server! Redirecting...','#ff4d6d');setTimeout(()=>window.open('https://discord.gg/Vv8NCCUHch','_blank'),1000);}
        }catch(e){setStatus('❌ Server error. Try again.','#ff4d6d');}
        setLoading('discordBtn',false);
    }
    async function generateKey(){
        if(!verified)return;
        const u=document.getElementById('discordUser').value.trim();
        setLoading('genBtn',true);setStatus('⚡ Generating your key...','#ffd166');
        try{
            const res=await fetch('/generate-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u})});
            const data=await res.json();
            if(data.key){document.getElementById('keyValue').textContent=data.key;const exp=new Date(data.expires);document.getElementById('keyExpires').innerHTML='Expires: <span>'+exp.toLocaleString()+'</span>';document.getElementById('keyBox').style.display='block';document.getElementById('keyInput').value=data.key;setStatus('');updateSteps(3);showToast('Key generated!','🔑');}
            else{setStatus('❌ '+(data.error||'Failed'),'#ff4d6d');}
        }catch(e){setStatus('❌ Server error.','#ff4d6d');}
        setLoading('genBtn',false);
    }
    async function submitKey(){
        const k=document.getElementById('keyInput').value.trim();
        if(!k){setStatus('⚠️ Enter your key first!','#ff4d6d');return;}
        setLoading('submitBtn',true);setStatus('🔄 Validating key...','#ffd166');
        try{
            const res=await fetch('/validate-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:k})});
            const data=await res.json();
            if(data.valid){setStatus("✅ Key valid! You're all set.",'#06d6a0');showToast('Key activated!','🚀');}
            else{setStatus('❌ Invalid or expired key!','#ff4d6d');}
        }catch(e){setStatus('❌ Server error.','#ff4d6d');}
        setLoading('submitBtn',false);
    }
    function copyKey(){navigator.clipboard.writeText(document.getElementById('keyValue').textContent).then(()=>showToast('Key copied!','📋'));}
    document.getElementById('discordUser').addEventListener('keydown',e=>{if(e.key==='Enter')checkDiscord();});
</script>
</body>
</html>`);
});

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────

app.get('/admin', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sttar Hub — Admin</title>
    <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root{--bg:#07070f;--surface:#0e0e1e;--surface2:#13132a;--border:rgba(120,100,255,0.15);--accent:#7c5cfc;--accent2:#c45cfc;--gold:#ffd166;--green:#06d6a0;--red:#ff4d6d;--text:#e8e6ff;--muted:#6b6890;}
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:var(--bg);color:var(--text);font-family:'Syne',sans-serif;min-height:100vh;}
        .bg-grid{position:fixed;inset:0;background-image:linear-gradient(rgba(124,92,252,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(124,92,252,0.03) 1px,transparent 1px);background-size:40px 40px;z-index:0;}
        .login-wrap{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:100;background:var(--bg);}
        .login-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:40px;width:360px;text-align:center;box-shadow:0 40px 80px rgba(0,0,0,0.6);animation:fadeUp 0.6s ease forwards;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .login-title{font-size:22px;font-weight:800;margin-bottom:6px;}
        .login-sub{color:var(--muted);font-size:13px;font-family:'Space Mono',monospace;margin-bottom:28px;}
        .login-input{width:100%;padding:13px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:14px;font-family:'Space Mono',monospace;outline:none;margin-bottom:14px;transition:all 0.3s;}
        .login-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(124,92,252,0.15);}
        .login-btn{width:100%;padding:13px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:white;border:none;border-radius:10px;font-size:15px;font-weight:700;font-family:'Syne',sans-serif;cursor:pointer;transition:all 0.3s;}
        .login-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(124,92,252,0.4);}
        .login-err{color:var(--red);font-size:13px;margin-top:10px;display:none;font-family:'Space Mono',monospace;}
        .admin-wrap{display:none;position:relative;z-index:10;}
        .topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:16px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50;}
        .topbar-title{font-size:20px;font-weight:800;background:linear-gradient(135deg,#fff,var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .topbar-right{display:flex;align-items:center;gap:12px;}
        .badge{background:rgba(6,214,160,0.1);border:1px solid rgba(6,214,160,0.3);color:var(--green);border-radius:20px;padding:4px 12px;font-size:12px;font-family:'Space Mono',monospace;}
        .logout-btn{background:rgba(255,77,109,0.1);border:1px solid rgba(255,77,109,0.3);color:var(--red);border-radius:8px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Syne',sans-serif;transition:all 0.2s;}
        .logout-btn:hover{background:rgba(255,77,109,0.2);}
        .content{padding:32px;max-width:1100px;margin:0 auto;}
        .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:32px;}
        .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;position:relative;overflow:hidden;}
        .stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--grad);}
        .stat-card.s1{--grad:linear-gradient(90deg,var(--accent),var(--accent2));}
        .stat-card.s2{--grad:linear-gradient(90deg,var(--green),#04a87f);}
        .stat-card.s3{--grad:linear-gradient(90deg,var(--gold),#ffaa00);}
        .stat-card.s4{--grad:linear-gradient(90deg,var(--red),#ff7090);}
        .stat-icon{font-size:28px;margin-bottom:10px;}
        .stat-val{font-size:32px;font-weight:800;font-family:'Space Mono',monospace;}
        .stat-label{color:var(--muted);font-size:13px;margin-top:4px;}
        .toolbar{display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap;}
        .search-wrap{position:relative;flex:1;min-width:200px;}
        .search-wrap input{width:100%;padding:10px 14px 10px 38px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:14px;font-family:'Space Mono',monospace;outline:none;transition:all 0.3s;}
        .search-wrap input:focus{border-color:var(--accent);}
        .search-wrap .sicon{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:15px;}
        .tb-btn{padding:10px 18px;border:none;border-radius:10px;font-size:13px;font-weight:700;font-family:'Syne',sans-serif;cursor:pointer;transition:all 0.3s;display:flex;align-items:center;gap:6px;}
        .tb-btn:hover{transform:translateY(-1px);}
        .tb-add{background:linear-gradient(135deg,var(--green),#04a87f);color:#07070f;}
        .tb-del-all{background:rgba(255,77,109,0.1);color:var(--red);border:1px solid rgba(255,77,109,0.3);}
        .tb-refresh{background:rgba(124,92,252,0.1);color:var(--accent);border:1px solid rgba(124,92,252,0.3);}
        .table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;}
        .table-head{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
        .table-title{font-size:15px;font-weight:700;}
        .table-count{font-size:13px;color:var(--muted);font-family:'Space Mono',monospace;}
        table{width:100%;border-collapse:collapse;}
        th{padding:12px 16px;text-align:left;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border);background:var(--surface2);}
        td{padding:14px 16px;font-size:14px;border-bottom:1px solid rgba(120,100,255,0.06);vertical-align:middle;}
        tr:last-child td{border-bottom:none;}
        tr:hover td{background:rgba(124,92,252,0.03);}
        .key-cell{font-family:'Space Mono',monospace;font-size:13px;color:var(--gold);font-weight:700;}
        .user-cell{font-family:'Space Mono',monospace;font-size:13px;}
        .time-cell{font-family:'Space Mono',monospace;font-size:12px;color:var(--muted);}
        .exp-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;font-family:'Space Mono',monospace;}
        .exp-ok{background:rgba(6,214,160,0.1);color:var(--green);border:1px solid rgba(6,214,160,0.2);}
        .exp-soon{background:rgba(255,209,102,0.1);color:var(--gold);border:1px solid rgba(255,209,102,0.2);}
        .del-btn{background:rgba(255,77,109,0.1);color:var(--red);border:1px solid rgba(255,77,109,0.2);border-radius:8px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Syne',sans-serif;transition:all 0.2s;}
        .del-btn:hover{background:rgba(255,77,109,0.25);}
        .copy-cell-btn{background:rgba(255,209,102,0.08);color:var(--gold);border:1px solid rgba(255,209,102,0.2);border-radius:6px;padding:3px 10px;font-size:11px;cursor:pointer;font-family:'Space Mono',monospace;transition:all 0.2s;margin-left:8px;}
        .empty-state{text-align:center;padding:60px 20px;color:var(--muted);font-family:'Space Mono',monospace;font-size:14px;}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:200;display:none;align-items:center;justify-content:center;backdrop-filter:blur(4px);}
        .modal-overlay.show{display:flex;}
        .modal{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:36px;width:380px;box-shadow:0 40px 80px rgba(0,0,0,0.6);animation:fadeUp 0.3s ease;}
        .modal h3{font-size:18px;font-weight:800;margin-bottom:6px;}
        .modal p{color:var(--muted);font-size:14px;margin-bottom:24px;}
        .modal-btns{display:flex;gap:10px;}
        .m-cancel{flex:1;padding:12px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:14px;font-weight:600;font-family:'Syne',sans-serif;cursor:pointer;}
        .m-confirm{flex:1;padding:12px;background:linear-gradient(135deg,var(--red),#ff7090);border:none;border-radius:10px;color:white;font-size:14px;font-weight:700;font-family:'Syne',sans-serif;cursor:pointer;}
        .toast{position:fixed;top:20px;right:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 20px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;z-index:1000;transform:translateX(120%);transition:transform 0.4s cubic-bezier(0.16,1,0.3,1);box-shadow:0 20px 40px rgba(0,0,0,0.4);}
        .toast.show{transform:translateX(0);}
    </style>
</head>
<body>
<div class="bg-grid"></div>
<div class="login-wrap" id="loginWrap">
    <div class="login-card">
        <div style="font-size:36px;margin-bottom:12px;">🛡️</div>
        <div class="login-title">Admin Panel</div>
        <div class="login-sub">// sttar hub dashboard</div>
        <input type="password" class="login-input" id="pwInput" placeholder="Enter password" />
        <button class="login-btn" onclick="doLogin()">Access Dashboard</button>
        <div class="login-err" id="loginErr">❌ Wrong password!</div>
    </div>
</div>
<div class="admin-wrap" id="adminWrap">
    <div class="topbar">
        <div class="topbar-title">🛡️ Sttar Hub Admin</div>
        <div class="topbar-right">
            <div class="badge" id="liveBadge">● 0 Active Keys</div>
            <button class="logout-btn" onclick="doLogout()">Logout</button>
        </div>
    </div>
    <div class="content">
        <div class="stats">
            <div class="stat-card s1"><div class="stat-icon">🔑</div><div class="stat-val" id="statTotal">0</div><div class="stat-label">Total Keys</div></div>
            <div class="stat-card s2"><div class="stat-icon">✅</div><div class="stat-val" id="statActive">0</div><div class="stat-label">Active Keys</div></div>
            <div class="stat-card s3"><div class="stat-icon">⏳</div><div class="stat-val" id="statSoon">0</div><div class="stat-label">Expiring Soon</div></div>
            <div class="stat-card s4"><div class="stat-icon">💀</div><div class="stat-val" id="statExpired">0</div><div class="stat-label">Expired (cleaned)</div></div>
        </div>
        <div class="toolbar">
            <div class="search-wrap"><span class="sicon">🔍</span><input type="text" id="searchInput" placeholder="Search key or username..." oninput="filterKeys()" /></div>
            <button class="tb-btn tb-refresh" onclick="loadKeys()">🔄 Refresh</button>
            <button class="tb-btn tb-add" onclick="adminGenKey()">⚡ Generate Key</button>
            <button class="tb-btn tb-del-all" onclick="showDeleteAll()">🗑️ Delete Expired</button>
        </div>
        <div class="table-wrap">
            <div class="table-head"><div class="table-title">Active Keys</div><div class="table-count" id="tableCount">0 keys</div></div>
            <table><thead><tr><th>#</th><th>Key</th><th>Discord Username</th><th>Created</th><th>Expires</th><th>Status</th><th>Action</th></tr></thead><tbody id="keysTable"></tbody></table>
            <div class="empty-state" id="emptyState" style="display:none;">No keys found.</div>
        </div>
    </div>
</div>
<div class="modal-overlay" id="deleteModal">
    <div class="modal"><h3>🗑️ Delete Key?</h3><p id="deleteModalMsg">Are you sure?</p><div class="modal-btns"><button class="m-cancel" onclick="closeModal()">Cancel</button><button class="m-confirm" onclick="confirmDelete()">Delete</button></div></div>
</div>
<div class="toast" id="toast"><span id="toastIcon">✅</span> <span id="toastMsg">Done!</span></div>
<script>
    let allKeys=[],deleteTarget=null,adminToken=null;
    function doLogin(){
        const pw=document.getElementById('pwInput').value;
        fetch('/admin-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})})
        .then(r=>r.json()).then(d=>{
            if(d.ok){adminToken=pw;document.getElementById('loginWrap').style.display='none';document.getElementById('adminWrap').style.display='block';loadKeys();}
            else{document.getElementById('loginErr').style.display='block';}
        });
    }
    function doLogout(){adminToken=null;document.getElementById('loginWrap').style.display='flex';document.getElementById('adminWrap').style.display='none';document.getElementById('pwInput').value='';}
    document.getElementById('pwInput').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
    async function loadKeys(){
        const res=await fetch('/admin-keys',{headers:{'x-admin-token':adminToken}});
        const data=await res.json();allKeys=data.keys||[];renderKeys(allKeys);updateStats(allKeys);
    }
    function updateStats(keys){
        const now=Date.now();const active=keys.filter(k=>k.expires>now);const soon=active.filter(k=>k.expires-now<3*60*60*1000);
        document.getElementById('statTotal').textContent=keys.length;document.getElementById('statActive').textContent=active.length;document.getElementById('statSoon').textContent=soon.length;document.getElementById('statExpired').textContent=0;
        document.getElementById('liveBadge').textContent='● '+active.length+' Active Keys';
    }
    function renderKeys(keys){
        const tbody=document.getElementById('keysTable');const empty=document.getElementById('emptyState');const now=Date.now();
        tbody.innerHTML='';if(!keys.length){empty.style.display='block';document.getElementById('tableCount').textContent='0 keys';return;}
        empty.style.display='none';document.getElementById('tableCount').textContent=keys.length+' keys';
        keys.forEach((k,i)=>{
            const soon=k.expires-now<3*60*60*1000;
            const tr=document.createElement('tr');
            tr.innerHTML='<td style="color:var(--muted);font-family:Space Mono,monospace;font-size:12px">'+(i+1)+'</td><td class="key-cell">'+k.key+'<button class="copy-cell-btn" onclick="copyText(\''+k.key+'\')">copy</button></td><td class="user-cell">'+(k.username||'—')+'</td><td class="time-cell">'+new Date(k.created).toLocaleString()+'</td><td class="time-cell">'+new Date(k.expires).toLocaleString()+'</td><td><span class="exp-badge '+(soon?'exp-soon':'exp-ok')+'">'+(soon?'⚠️ Expiring':'✅ Active')+'</span></td><td><button class="del-btn" onclick="showDelete(\''+k.key+'\')">🗑️ Delete</button></td>';
            tbody.appendChild(tr);
        });
    }
    function filterKeys(){const q=document.getElementById('searchInput').value.toLowerCase();renderKeys(allKeys.filter(k=>k.key.toLowerCase().includes(q)||(k.username||'').toLowerCase().includes(q)));}
    function showDelete(key){deleteTarget=key;document.getElementById('deleteModalMsg').textContent='Delete key: '+key+'?';document.getElementById('deleteModal').classList.add('show');}
    function showDeleteAll(){deleteTarget='__expired__';document.getElementById('deleteModalMsg').textContent='Delete all expired keys?';document.getElementById('deleteModal').classList.add('show');}
    function closeModal(){document.getElementById('deleteModal').classList.remove('show');deleteTarget=null;}
    async function confirmDelete(){
        closeModal();
        if(deleteTarget==='__expired__'){await fetch('/admin-delete-expired',{method:'DELETE',headers:{'x-admin-token':adminToken}});showToast('Expired keys deleted!','🗑️');}
        else{await fetch('/admin-delete-key',{method:'DELETE',headers:{'Content-Type':'application/json','x-admin-token':adminToken},body:JSON.stringify({key:deleteTarget})});showToast('Key deleted!','🗑️');}
        loadKeys();
    }
    async function adminGenKey(){
        const username=prompt('Discord username (optional):')||'admin';
        const res=await fetch('/admin-generate',{method:'POST',headers:{'Content-Type':'application/json','x-admin-token':adminToken},body:JSON.stringify({username})});
        const data=await res.json();if(data.key){copyText(data.key);showToast('Generated & copied: '+data.key,'🔑');loadKeys();}
    }
    function copyText(t){navigator.clipboard.writeText(t);}
    function showToast(msg,icon='✅'){const t=document.getElementById('toast');document.getElementById('toastMsg').textContent=msg;document.getElementById('toastIcon').textContent=icon;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500);}
    setInterval(()=>{if(adminToken)loadKeys();},30000);
</script>
</body>
</html>`);
});

// ─── API ROUTES ───────────────────────────────────────────────────────────────

app.post('/admin-auth', (req, res) => {
    res.json({ ok: req.body.password === ADMIN_PASSWORD });
});

function requireAdmin(req, res, next) {
    if (req.headers['x-admin-token'] !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
    next();
}

app.get('/admin-keys', requireAdmin, (req, res) => {
    cleanExpiredKeys();
    res.json({ keys: loadKeys() });
});

app.delete('/admin-delete-key', requireAdmin, (req, res) => {
    saveKeys(loadKeys().filter(k => k.key !== req.body.key));
    res.json({ ok: true });
});

app.delete('/admin-delete-expired', requireAdmin, (req, res) => {
    cleanExpiredKeys();
    res.json({ ok: true });
});

app.post('/admin-generate', requireAdmin, (req, res) => {
    const newKey = { key: generateKey(), username: req.body.username || 'admin', created: Date.now(), expires: Date.now() + 86400000 };
    const keys = loadKeys();
    keys.push(newKey);
    saveKeys(keys);
    res.json({ key: newKey.key, expires: newKey.expires });
});

app.post('/check-discord', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.json({ inServer: false });
    const inServer = await checkDiscordMember(username);
    res.json({ inServer });
});

app.post('/generate-key', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.json({ error: 'No username' });
    const inServer = await checkDiscordMember(username);
    if (!inServer) return res.json({ error: 'Not in Discord server' });
    cleanExpiredKeys();
    const keys = loadKeys();
    const existing = keys.find(k => k.username.toLowerCase() === username.toLowerCase() && k.expires > Date.now());
    if (existing) return res.json({ key: existing.key, expires: existing.expires });
    const newKey = { key: generateKey(), username, created: Date.now(), expires: Date.now() + 86400000 };
    keys.push(newKey);
    saveKeys(keys);
    res.json({ key: newKey.key, expires: newKey.expires });
});

app.post('/validate-key', (req, res) => {
    cleanExpiredKeys();
    res.json({ valid: loadKeys().some(k => k.key === req.body.key && k.expires > Date.now()) });
});

app.get('/keylist', (req, res) => {
    cleanExpiredKeys();
    res.setHeader('Content-Type', 'text/plain');
    res.send(loadKeys().map(k => k.key).join('\n'));
});

// ─── GLOBAL ERROR HANDLERS ────────────────────────────────────────────────────

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});

// ─── START ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('Sttar Hub running on port ' + PORT);
});
