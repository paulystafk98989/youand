// server.js
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const basicAuth = require('express-basic-auth');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const cron = require('node-cron');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// --- auth do painel ---
app.use(basicAuth({
  users: { [process.env.PANEL_USER || 'admin']: process.env.PANEL_PASS || '123' },
  challenge: true
}));

// --- config persistente ---
const CONFIG_PATH = path.join(__dirname, 'config.json');
const loadConfig = () => fs.existsSync(CONFIG_PATH)
  ? JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  : {
      THEME: 'Curiosidades sobre o mar',
      LANGUAGE_VID: 'Brazilian Portuguese',
      VOICE_NAME: 'Kore',
      ASPECT_RATIO: '9:16',
      DURATION_TYPE: 'curto',
      YOUTUBE_VISIBILITY: 'private',
      CRON: '',
      POST_TIME: '18:00'
    };
const saveConfig = (cfg) => fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));

let sseClients = [];
app.get('/logs', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();
  res.write(`event: ping\ndata: connected\n\n`);
  sseClients.push(res);
  req.on('close', () => { sseClients = sseClients.filter(c => c !== res); });
});
const pushLog = (line) => sseClients.forEach(c => c.write(`data: ${line}\n\n`));

// --- página do painel ---
app.get('/', (req, res) => {
  res.render('index', { cfg: loadConfig() });
});

// --- salvar configurações ---
app.post('/save', (req, res) => {
  const cfg = loadConfig();
  const next = { ...cfg, ...req.body };
  saveConfig(next);
  res.redirect('/');
});

function runStep(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { env: { ...process.env, ...env }, shell: true });
    p.stdout.on('data', d => pushLog(d.toString().trim()));
    p.stderr.on('data', d => pushLog(d.toString().trim()));
    p.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)));
  });
}

async function runPipeline({ uploadAfter = true } = {}) {
  const cfg = loadConfig();
  const env = {
    THEME: cfg.THEME,
    LANGUAGE_VID: cfg.LANGUAGE_VID,
    VOICE_NAME: cfg.VOICE_NAME,
    ASPECT_RATIO: cfg.ASPECT_RATIO,
    DURATION_TYPE: cfg.DURATION_TYPE,
    YOUTUBE_VISIBILITY: cfg.YOUTUBE_VISIBILITY,
  };
  await runStep('node', ['puppeteer-script.js'], env);
  if (uploadAfter) await runStep('node', ['youtube-uploader.js'], env);
}

app.post('/generate', (req, res) => {
  pushLog('--- Iniciando geração ---');
  runPipeline({ uploadAfter: false })
    .then(() => pushLog('✔ Geração finalizada. Vídeo: ./output/final-video.mp4'))
    .catch(err => pushLog('✖ Erro: ' + err.message));
  res.json({ ok: true });
});

app.post('/upload', (req, res) => {
  pushLog('--- Iniciando upload ---');
  runStep('node', ['youtube-uploader.js'], loadConfig())
    .then(() => pushLog('✔ Upload concluído!'))
    .catch(err => pushLog('✖ Erro: ' + err.message));
  res.json({ ok: true });
});

app.post('/generate-and-upload', (req, res) => {
  pushLog('--- Iniciando geração + upload ---');
  runPipeline()
    .then(() => pushLog('✔ Tudo pronto!'))
    .catch(err => pushLog('✖ Erro: ' + err.message));
  res.json({ ok: true });
});

let cronTask = null;
function applyCron() {
  const cfg = loadConfig();
  if (cronTask) cronTask.stop();
  if (cfg.CRON && cfg.CRON.trim()) {
    cronTask = cron.schedule(cfg.CRON, () => {
      pushLog(`⏰ CRON disparado: ${cfg.CRON}`);
      runPipeline().catch(e => pushLog(`✖ CRON erro: ${e.message}`));
    });
  }
}
applyCron();

app.post('/apply-cron', (req, res) => { applyCron(); res.json({ ok: true }); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Painel online na porta', PORT));
