// ====== 配置 ======
const API_KEY = 'sk_aODZCHX9jhJGPuDmlk-cEkQHO71CWc5JDMfmk_n2450';
const T2I_URL = 'https://api.ppio.com/v3/gpt-image-2-text-to-image';
const EDIT_URL = 'https://api.ppio.com/v3/gpt-image-2-edit';
const HISTORY_KEY = 'gpt_image2_history';
const STYLE_KEY = 'gpt_image2_style';
const STYLE_PRESETS = {
  dish: {
    name: 'label.preset_dish',
    logo: '采用#F3B9D9、#FFEE3D、#00E57F这三个颜色构成背景与柔和自然棚拍光线，高品质餐厅菜单摄影，简约无杂乱构图，专业美食摄影，主体居中，将该logo居中置顶，维持logo样式。',
    default: '采用#F3B9D9、#FFEE3D、#00E57F这三个颜色构成背景与柔和自然棚拍光线，高品质餐厅菜单摄影，简约无杂乱构图，主体居中，专业美食摄影，',
  },
  poster: {
    name: 'label.preset_poster',
    logo: '采用#F3B9D9、#FFEE3D、#00E57F这三个颜色构成背景与柔和自然棚拍光线，高品质海报设计，简约无杂乱构图，主体居中，专业平面设计，将该logo居中置顶，维持logo样式。',
    default: '采用#F3B9D9、#FFEE3D、#00E57F这三个颜色构成背景与柔和自然棚拍光线，高品质海报设计，简约无杂乱构图，主体居中，专业平面设计，',
  },
};

function getStylePresetDefault(presetKey, panelId) {
  const preset = STYLE_PRESETS[presetKey];
  if (!preset) return '';
  return panelId === 'style-logo' ? preset.logo : preset.default;
}

function loadStylePrompts() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(STYLE_KEY)); } catch {}
  const ids = ['style-logo', 'style-t2i', 'style-i2i', 'style-inpaint'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    const select = document.getElementById(id + '-preset');
    if (el) {
      const savedPreset = (saved && saved[id + '_preset']) || 'dish';
      if (select) select.value = savedPreset;
      el.value = (saved && saved[id]) || getStylePresetDefault(savedPreset, id);
      el.addEventListener('input', saveStylePrompts);
    }
  });
}

function saveStylePrompts() {
  const data = {};
  ['style-logo', 'style-t2i', 'style-i2i', 'style-inpaint'].forEach(id => {
    const el = document.getElementById(id);
    const select = document.getElementById(id + '-preset');
    if (el) data[id] = el.value;
    if (select) data[id + '_preset'] = select.value;
  });
  localStorage.setItem(STYLE_KEY, JSON.stringify(data));
}

function initStylePresetSelects() {
  const ids = ['style-logo', 'style-t2i', 'style-i2i', 'style-inpaint'];
  ids.forEach(id => {
    const select = document.getElementById(id + '-preset');
    if (!select) return;
    select.addEventListener('change', () => {
      const textarea = document.getElementById(id);
      if (textarea) {
        textarea.value = getStylePresetDefault(select.value, id);
        saveStylePrompts();
      }
    });
  });
}

function getActiveStylePrompt() {
  const activePanel = document.querySelector('.panel.active');
  if (!activePanel) return STYLE_PRESETS.dish.default;
  const textarea = activePanel.querySelector('.style-preset');
  return textarea ? textarea.value : STYLE_PRESETS.dish.default;
}

// ====== 日志 ======
const LOG_KEY = 'gpt_image2_logs';
let activeLogPanel = null;

function log(level, msg, detail) {
  const ts = new Date().toISOString();
  const entry = { ts, level, msg, detail: detail || '' };
  let logs = [];
  try { logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch {}
  logs.push(entry);
  if (logs.length > 500) logs = logs.slice(-500);
  localStorage.setItem(LOG_KEY, JSON.stringify(logs));

  if (activeLogPanel) {
    const el = document.getElementById(activeLogPanel);
    if (el) {
      const t = ts.replace(/^.*T/, '').replace(/\..*$/, '');
      const line = document.createElement('div');
      line.className = `ll-line ll-${level}`;
      const text = detail ? `${msg} | ${detail}` : msg;
      line.innerHTML = `<span class="ll-time">${t}</span>${escHtml(text)}`;
      el.appendChild(line);
      el.scrollTop = el.scrollHeight;
    }
  }
}

function showLiveLog(prefix) {
  activeLogPanel = prefix + '-log';
  const el = document.getElementById(activeLogPanel);
  if (el) { el.innerHTML = ''; el.classList.add('visible'); }
}
function hideLiveLog(prefix) {
  if (activeLogPanel === prefix + '-log') activeLogPanel = null;
  const el = document.getElementById(prefix + '-log');
  if (el) { setTimeout(() => el.classList.remove('visible'), 2000); }
}
function downloadLog() {
  let logs = [];
  try { logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch {}
  const text = logs.map(l => `[${l.ts}] [${l.level}] ${l.msg}${l.detail ? ' | ' + l.detail : ''}`).join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'log.txt';
  a.click();
  URL.revokeObjectURL(a.href);
}
document.getElementById('download-log').addEventListener('click', downloadLog);

// ====== Tab 切换 ======
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// ====== 尺寸选择 ======
document.querySelectorAll('.size-grid').forEach(grid => {
  grid.addEventListener('click', e => {
    const btn = e.target.closest('.size-btn');
    if (!btn) return;
    grid.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const prefix = grid.id.replace('-sizes', '');
    const customRow = document.getElementById(prefix + '-custom');
    if (btn.dataset.custom) {
      customRow.classList.add('visible');
    } else {
      customRow.classList.remove('visible');
    }
  });
});

function getSize(gridId) {
  const grid = document.getElementById(gridId);
  const active = grid.querySelector('.size-btn.active');
  if (active && active.dataset.custom) {
    const prefix = gridId.replace('-sizes', '');
    const w = Math.max(256, Math.min(4096, +document.getElementById(prefix + '-cw').value || 1024));
    const h = Math.max(256, Math.min(4096, +document.getElementById(prefix + '-ch').value || 1536));
    return { w, h };
  }
  return active ? { w: +active.dataset.w, h: +active.dataset.h } : { w: 1024, h: 1536 };
}

// ====== 文件上传 → base64 ======
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setupUpload(zoneId, fileId, previewCallback) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(fileId);
  input.addEventListener('change', async () => {
    if (!input.files[0]) return;
    const b64 = await fileToBase64(input.files[0]);
    const old = zone.querySelector('.preview');
    if (old) old.remove();
    const img = document.createElement('img');
    img.className = 'preview';
    img.src = b64;
    zone.insertBefore(img, zone.firstChild);
    zone.querySelector('.label').textContent = input.files[0].name;
    if (previewCallback) previewCallback(b64, input.files[0]);
  });
  return () => input.files[0] ? fileToBase64(input.files[0]) : Promise.resolve(null);
}

// ====== Inpaint 画布 ======
let inpaintImg = null;
let drawing = false;

setupUpload('inpaint-upload', 'inpaint-file', (b64) => {
  const wrap = document.getElementById('inpaint-canvas-wrap');
  const canvas = document.getElementById('inpaint-canvas');
  const img = new Image();
  img.onload = () => {
    inpaintImg = img;
    const maxW = wrap.parentElement.clientWidth - 42;
    const scale = Math.min(1, maxW / img.width);
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    wrap.style.display = 'block';
  };
  img.src = b64;
});

function getMaskCanvas() {
  if (!inpaintImg) return null;
  let mc = document.getElementById('offscreen-mask');
  if (!mc) {
    mc = document.createElement('canvas');
    mc.id = 'offscreen-mask';
    mc.width = inpaintImg.width;
    mc.height = inpaintImg.height;
    mc.style.display = 'none';
    document.body.appendChild(mc);
  }
  return mc;
}

const inpaintCanvas = document.getElementById('inpaint-canvas');

function getBrushSize() {
  return +document.getElementById('brush-range').value;
}

function canvasToImageCoords(e) {
  const rect = inpaintCanvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const scaleX = inpaintImg.width / inpaintCanvas.width;
  const scaleY = inpaintImg.height / inpaintCanvas.height;
  return { x: cx * scaleX, y: cy * scaleY, cx, cy };
}

function drawMaskDot(cx, cy, isImageCoords) {
  if (!inpaintImg) return;
  const canvas = inpaintCanvas;
  const ctx = canvas.getContext('2d');
  const mc = getMaskCanvas();
  const mctx = mc.getContext('2d');
  const brush = getBrushSize();

  const dispBrush = isImageCoords ? brush / (inpaintImg.width / canvas.width) : brush;
  const dx = isImageCoords ? cx / (inpaintImg.width / canvas.width) : cx;
  const dy = isImageCoords ? cy / (inpaintImg.height / canvas.height) : cy;

  ctx.fillStyle = 'rgba(255,50,50,0.45)';
  ctx.beginPath();
  ctx.arc(dx, dy, dispBrush / 2, 0, Math.PI * 2);
  ctx.fill();

  const imgBrush = isImageCoords ? brush : brush * (inpaintImg.width / canvas.width);
  const ix = isImageCoords ? cx : cx * (inpaintImg.width / canvas.width);
  const iy = isImageCoords ? cy : cy * (inpaintImg.height / canvas.height);

  mctx.fillStyle = '#ffffff';
  mctx.beginPath();
  mctx.arc(ix, iy, imgBrush / 2, 0, Math.PI * 2);
  mctx.fill();
}

let lastPos = null;

inpaintCanvas.addEventListener('mousedown', e => {
  drawing = true;
  lastPos = canvasToImageCoords(e);
  drawMaskDot(lastPos.x, lastPos.y, true);
});

inpaintCanvas.addEventListener('mousemove', e => {
  if (!drawing) return;
  const pos = canvasToImageCoords(e);
  const steps = Math.max(1, Math.ceil(Math.hypot(pos.x - lastPos.x, pos.y - lastPos.y) / 4));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    drawMaskDot(lastPos.x + (pos.x - lastPos.x) * t, lastPos.y + (pos.y - lastPos.y) * t, true);
  }
  lastPos = pos;
});

window.addEventListener('mouseup', () => { drawing = false; lastPos = null; });

document.getElementById('mask-clear').addEventListener('click', () => {
  if (!inpaintImg) return;
  const canvas = inpaintCanvas;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(inpaintImg, 0, 0, canvas.width, canvas.height);
  const mc = getMaskCanvas();
  if (mc) mc.getContext('2d').clearRect(0, 0, mc.width, mc.height);
});

// ====== 图生图上传 ======
const getI2IImage = setupUpload('i2i-upload', 'i2i-file');

// ====== API 调用 ======
async function callAPI(url, body) {
  log('INFO', 'API请求', `${url} prompt=${body.prompt?.slice(0,60)} size=${body.size} quality=${body.quality}`);
  const startTime = Date.now();
  const TIMEOUT = 5 * 60 * 1000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') {
      log('ERROR', 'API超时', '超过5分钟未响应');
      throw new Error('生成超时（5分钟），请重试');
    }
    if (e.message && e.message.includes('Failed to fetch')) {
      log('ERROR', '网络错误', '无法连接到API服务器');
      if (location.protocol === 'file:') {
        throw new Error('请通过 http:// 访问（非 file://），或检查网络连接');
      }
      throw new Error('网络连接失败，请检查网络或API服务是否可用');
    }
    throw e;
  }
  clearTimeout(timer);
  const data = await res.json();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
  if (data.code && data.code !== 200 && data.code !== 0) {
    log('ERROR', 'API错误', `${elapsed} ${JSON.stringify(data).slice(0,200)}`);
    throw new Error(data.message || data.error || JSON.stringify(data));
  }
  if (!data.images || !data.images.length) {
    log('ERROR', '无图片返回', `${elapsed} ${JSON.stringify(data).slice(0,200)}`);
    throw new Error('响应中没有图片: ' + JSON.stringify(data).slice(0, 300));
  }
  log('INFO', 'API成功', `${elapsed} url=${data.images[0]?.slice(0,80)}`);
  return data.images[0];
}

function basePayload(prompt, size, quality) {
  return {
    prompt,
    size: `${size.w}x${size.h}`,
    n: 1,
    quality,
    moderation: 'low',
    output_format: 'png',
    output_compression: 100,
    background: 'opaque',
  };
}

// ====== 虚拟进度条 ======
const progressTimers = {};
function startProgress(prefix) {
  const wrap = document.getElementById(prefix + '-progress');
  const fill = document.getElementById(prefix + '-fill');
  const pct = document.getElementById(prefix + '-pct');
  wrap.classList.add('visible');
  fill.style.width = '1%';
  pct.textContent = '1%';
  let cur = 1;
  let phase = 1;
  function tick() {
    if (phase === 1) { cur += 0.33; if (cur >= 50) { cur = 50; phase = 2; } }
    else if (phase === 2) { cur += 0.125; if (cur >= 75) { cur = 75; phase = 3; } }
    else { cur += 0.02; if (cur >= 99) { cur = 99; } }
    fill.style.width = cur.toFixed(1) + '%';
    pct.textContent = Math.floor(cur) + '%';
    if (cur < 99) {
      progressTimers[prefix] = setTimeout(tick, 100);
    }
  }
  progressTimers[prefix] = setTimeout(tick, 100);
}
function finishProgress(prefix) {
  clearTimeout(progressTimers[prefix]);
  const wrap = document.getElementById(prefix + '-progress');
  const fill = document.getElementById(prefix + '-fill');
  const pct = document.getElementById(prefix + '-pct');
  fill.style.width = '100%';
  pct.textContent = '100%';
  setTimeout(() => { wrap.classList.remove('visible'); fill.style.width = '0%'; pct.textContent = ''; }, 1200);
}
function resetProgress(prefix) {
  clearTimeout(progressTimers[prefix]);
  const wrap = document.getElementById(prefix + '-progress');
  const fill = document.getElementById(prefix + '-fill');
  const pct = document.getElementById(prefix + '-pct');
  wrap.classList.remove('visible');
  fill.style.width = '0%';
  pct.textContent = '';
  hideLiveLog(prefix);
}

// ====== Logo 生图 ======
let LOGO_PATH = 'assets/logo_1.png';
let SAMPLE_IMG = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败: ' + src.slice(0, 80)));
    img.src = src;
  });
}

function getLogoDataUrl(path) {
  return LOGO_DATA_URLS[path] || path;
}

function updateLogoPreview(path) {
  document.getElementById('logo-preview').src = getLogoDataUrl(path);
}

document.getElementById('logo-select').addEventListener('change', (e) => {
  const val = e.target.value;
  if (val === '__upload__') {
    document.getElementById('logo-upload').click();
    e.target.value = LOGO_PATH;
    return;
  }
  LOGO_PATH = val;
  updateLogoPreview(LOGO_PATH);
  log('INFO', 'Logo切换', LOGO_PATH);
});

document.getElementById('logo-upload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const b64 = await new Promise(r => {
    const reader = new FileReader();
    reader.onload = () => r(reader.result);
    reader.readAsDataURL(file);
  });
  const path = '__custom__';
  LOGO_DATA_URLS[path] = b64;
  LOGO_PATH = path;
  updateLogoPreview(path);
  log('INFO', '自定义Logo上传', `size=${file.size} type=${file.type}`);
});

const sampleInput = document.getElementById('sample-file');
sampleInput.addEventListener('change', async () => {
  if (!sampleInput.files[0]) return;
  const b64 = await new Promise(r => {
    const reader = new FileReader();
    reader.onload = () => r(reader.result);
    reader.readAsDataURL(sampleInput.files[0]);
  });
  SAMPLE_IMG = b64;
  const zone = document.getElementById('sample-upload');
  const old = zone.querySelector('.preview');
  if (old) old.remove();
  const img = document.createElement('img');
  img.className = 'preview';
  img.src = b64;
  zone.insertBefore(img, zone.firstChild);
  zone.querySelector('.label').textContent = sampleInput.files[0].name;
  log('INFO', '样品实拍上传', sampleInput.files[0].name);
});

document.getElementById('logo-go').addEventListener('click', async () => {
  const btn = document.getElementById('logo-go');
  const status = document.getElementById('logo-status');
  const userInput = document.getElementById('logo-prompt').value.trim();
  if (!userInput) { setStatus(status, I18N.t('status.dish_required'), true); return; }
  const prompt = getActiveStylePrompt() + userInput;

  const size = getSize('logo-sizes');
  const quality = document.getElementById('logo-quality').value;

  setLoading(btn, status, true, 'logo');
  log('INFO', 'Logo生图开始', `prompt=${prompt.slice(0,80)} size=${size.w}x${size.h} logo=${LOGO_PATH} sample=${SAMPLE_IMG ? 'yes' : 'no'}`);
  try {
    let refImage;
    const logoDataUrl = getLogoDataUrl(LOGO_PATH);
    if (SAMPLE_IMG) {
      const [sampleImg, logoImg] = await Promise.all([
        loadImage(SAMPLE_IMG),
        loadImage(logoDataUrl),
      ]);
      const canvas = document.createElement('canvas');
      canvas.width = sampleImg.naturalWidth;
      canvas.height = sampleImg.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(sampleImg, 0, 0);
      const logoW = canvas.width * 0.2;
      const logoH = logoW * (logoImg.naturalHeight / logoImg.naturalWidth);
      const x = (canvas.width - logoW) / 2;
      const y = canvas.height * 0.03;
      ctx.drawImage(logoImg, x, y, logoW, logoH);
      refImage = canvas.toDataURL('image/png');
      log('INFO', 'Logo+样品合成完成');
    } else {
      refImage = logoDataUrl;
    }
    const payload = { ...basePayload(prompt, size, quality), image: refImage };
    const url = await callAPI(EDIT_URL, payload);
    showResult(url, prompt, 'logo', size, quality);
    setStatus(status, I18N.t('status.success'), false);
    log('INFO', 'Logo生图成功');
  } catch (e) {
    setStatus(status, e.message, true);
    resetProgress('logo');
    log('ERROR', 'Logo生图失败', e.message);
  } finally {
    setLoading(btn, status, false, 'logo');
  }
});

// ====== 结果展示 ======
let currentResultUrl = null;

function showResult(url, prompt, mode, size, quality, skipHistory) {
  currentResultUrl = url;
  const area = document.getElementById('result-area');
  const ph = document.getElementById('result-placeholder');
  if (ph) ph.remove();

  area.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'result-wrap';

  const img = document.createElement('img');
  img.className = 'result-img';
  img.src = url;
  img.onclick = () => window.open(url, '_blank');
  img.title = '点击在新标签页查看';

  const dlBtn = document.createElement('button');
  dlBtn.className = 'dl-btn';
  dlBtn.title = '下载图片';
  dlBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  dlBtn.onclick = async (e) => {
    e.stopPropagation();
    dlBtn.disabled = true;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `gpt_image2_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
      log('INFO', '下载成功');
    } catch (err) {
      log('WARN', '下载失败', err.message);
    }
    dlBtn.disabled = false;
  };

  wrap.appendChild(img);
  wrap.appendChild(dlBtn);
  area.appendChild(wrap);

  if (!skipHistory) {
    saveHistory({ ts: new Date().toISOString(), mode, prompt, size: `${size.w}x${size.h}`, quality, url });
  }
}

// ====== 历史记录 ======
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

function saveHistory(record) {
  const h = loadHistory();
  h.unshift(record);
  if (h.length > 100) h.length = 100;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('history-list');
  const h = loadHistory();
  document.getElementById('history-count').textContent = h.length;

  if (!h.length) {
    list.innerHTML = '<div class="empty-state">暂无记录</div>';
    return;
  }

  list.innerHTML = h.map((r, i) => `
    <div class="history-item" data-idx="${i}">
      <img src="${r.url}" alt="" loading="lazy" onerror="this.style.display='none'">
      <div class="info">
        <div class="prompt">${escHtml(r.prompt)}</div>
        <div class="meta">${I18N.t('mode.' + r.mode)} · ${r.size} · ${r.quality}</div>
      </div>
      <span class="del" data-delidx="${i}">&times;</span>
    </div>
  `).join('');

  list.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.classList.contains('del')) {
        const idx = +e.target.dataset.delidx;
        const hist = loadHistory();
        hist.splice(idx, 1);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
        renderHistory();
        return;
      }
      const idx = +el.dataset.idx;
      const r = loadHistory()[idx];
      if (r) {
        const [w, h] = r.size.split('x').map(Number);
        showResult(r.url, r.prompt, r.mode, { w, h }, r.quality, true);
      }
    });
  });
}

document.getElementById('clear-history').addEventListener('click', () => {
  if (confirm(I18N.t('history.confirm_clear'))) {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
  }
});

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ====== 按钮 loading 状态 ======
function setLoading(btn, statusEl, loading, prefix) {
  btn.disabled = loading;
  if (loading) {
    btn.innerHTML = `<span class="loader"></span>${I18N.t('btn.generating')}`;
    statusEl.className = 'status';
    statusEl.textContent = '';
    startProgress(prefix);
    showLiveLog(prefix);
  } else {
    btn.textContent = I18N.t('btn.generate');
    finishProgress(prefix);
    hideLiveLog(prefix);
  }
}

function setStatus(el, msg, isError) {
  el.className = 'status ' + (isError ? 'error' : 'success');
  el.textContent = msg;
}

// ====== 文生图 ======
document.getElementById('t2i-go').addEventListener('click', async () => {
  const btn = document.getElementById('t2i-go');
  const status = document.getElementById('t2i-status');
  const userInput = document.getElementById('t2i-prompt').value.trim();
  if (!userInput) { setStatus(status, I18N.t('status.dish_required'), true); return; }
  const prompt = getActiveStylePrompt() + userInput;

  const size = getSize('t2i-sizes');
  const quality = document.getElementById('t2i-quality').value;

  setLoading(btn, status, true, 't2i');
  log('INFO', '文生图开始', `prompt=${prompt.slice(0,80)} size=${size.w}x${size.h} quality=${quality}`);
  try {
    const url = await callAPI(T2I_URL, basePayload(prompt, size, quality));
    showResult(url, prompt, 't2i', size, quality);
    setStatus(status, I18N.t('status.success'), false);
    log('INFO', '文生图成功');
  } catch (e) {
    setStatus(status, e.message, true);
    resetProgress('t2i');
    log('ERROR', '文生图失败', e.message);
  } finally {
    setLoading(btn, status, false, 't2i');
  }
});

// ====== 图生图 ======
document.getElementById('i2i-go').addEventListener('click', async () => {
  const btn = document.getElementById('i2i-go');
  const status = document.getElementById('i2i-status');
  const userInput = document.getElementById('i2i-prompt').value.trim();
  const imageB64 = await getI2IImage();

  if (!imageB64) { setStatus(status, I18N.t('status.image_required'), true); return; }
  if (!userInput) { setStatus(status, I18N.t('status.dish_required'), true); return; }
  const prompt = getActiveStylePrompt() + userInput;

  const size = getSize('i2i-sizes');
  const quality = document.getElementById('i2i-quality').value;

  setLoading(btn, status, true, 'i2i');
  log('INFO', '图生图开始', `prompt=${prompt.slice(0,80)} size=${size.w}x${size.h} quality=${quality}`);
  try {
    const payload = { ...basePayload(prompt, size, quality), image: imageB64 };
    const url = await callAPI(EDIT_URL, payload);
    showResult(url, prompt, 'i2i', size, quality);
    setStatus(status, I18N.t('status.success'), false);
    log('INFO', '图生图成功');
  } catch (e) {
    setStatus(status, e.message, true);
    resetProgress('i2i');
    log('ERROR', '图生图失败', e.message);
  } finally {
    setLoading(btn, status, false, 'i2i');
  }
});

// ====== Inpaint ======
document.getElementById('inpaint-go').addEventListener('click', async () => {
  const btn = document.getElementById('inpaint-go');
  const status = document.getElementById('inpaint-status');
  const userInput = document.getElementById('inpaint-prompt').value.trim();

  if (!inpaintImg) { setStatus(status, I18N.t('status.original_required'), true); return; }
  if (!userInput) { setStatus(status, I18N.t('status.dish_required'), true); return; }
  const prompt = getActiveStylePrompt() + userInput;

  const mc = getMaskCanvas();
  if (!mc) { setStatus(status, I18N.t('status.mask_error'), true); return; }

  const mctx = mc.getContext('2d');
  const maskData = mctx.getImageData(0, 0, mc.width, mc.height).data;
  let hasMask = false;
  for (let i = 3; i < maskData.length; i += 4) {
    if (maskData[i] > 0) { hasMask = true; break; }
  }
  if (!hasMask) { setStatus(status, I18N.t('status.mask_required'), true); return; }

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = mc.width;
  maskCanvas.height = mc.height;
  const mctx2 = maskCanvas.getContext('2d');
  const srcData = mctx.getImageData(0, 0, mc.width, mc.height);
  const dstData = mctx2.createImageData(mc.width, mc.height);
  for (let i = 0; i < srcData.data.length; i += 4) {
    const a = srcData.data[i + 3];
    const v = srcData.data[i];
    if (v > 128 && a > 0) {
      dstData.data[i] = 0;
      dstData.data[i+1] = 0;
      dstData.data[i+2] = 0;
      dstData.data[i+3] = 0;
    } else {
      dstData.data[i] = 0;
      dstData.data[i+1] = 0;
      dstData.data[i+2] = 0;
      dstData.data[i+3] = 255;
    }
  }
  mctx2.putImageData(dstData, 0, 0);
  const maskB64 = maskCanvas.toDataURL('image/png');

  const origCanvas = document.createElement('canvas');
  origCanvas.width = inpaintImg.width;
  origCanvas.height = inpaintImg.height;
  origCanvas.getContext('2d').drawImage(inpaintImg, 0, 0);
  const imgB64 = origCanvas.toDataURL('image/jpeg', 0.95);

  const size = getSize('inpaint-sizes');
  const quality = document.getElementById('inpaint-quality').value;

  setLoading(btn, status, true, 'inpaint');
  log('INFO', '修复开始', `prompt=${prompt.slice(0,80)} size=${size.w}x${size.h} quality=${quality}`);
  try {
    const payload = { ...basePayload(prompt, size, quality), image: imgB64, mask: maskB64 };
    const url = await callAPI(EDIT_URL, payload);
    showResult(url, prompt, 'edit', size, quality);
    setStatus(status, I18N.t('status.success'), false);
    log('INFO', '修复成功');
  } catch (e) {
    setStatus(status, e.message, true);
    resetProgress('inpaint');
    log('ERROR', '修复失败', e.message);
  } finally {
    setLoading(btn, status, false, 'inpaint');
  }
});

// ====== Enter 快捷键 ======
document.querySelectorAll('textarea').forEach(ta => {
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      const panel = ta.closest('.panel');
      panel.querySelector('.btn-primary').click();
    }
  });
});

// ====== 检查更新 ======
const APP_VERSION = '1.0.0';
const GITEE_API = 'https://gitee.com/api/v5/repos/echohaoran/GPT-image-generatehot/commits';
const GITEE_RAW = 'https://gitee.com/echohaoran/GPT-image-generatehot/raw/master/js/app.js';
const UPDATE_CHECK_KEY = 'gpt_image2_last_update_check';

async function checkUpdate(force) {
  const lastCheck = localStorage.getItem(UPDATE_CHECK_KEY);
  const now = Date.now();
  if (!force && lastCheck && now - parseInt(lastCheck) < 3600000) return;

  try {
    const res = await fetch(GITEE_API + '?access_token=&per_page=1');
    if (!res.ok) throw new Error('API request failed');
    const commits = await res.json();
    if (!commits.length) return;

    const latestMsg = commits[0].commit.message || '';
    const latestDate = commits[0].commit.author.date;
    const latestSha = commits[0].sha.slice(0, 7);

    const localRes = await fetch(GITEE_RAW + '?t=' + now);
    if (!localRes.ok) return;
    const remoteCode = await localRes.text();
    const versionMatch = remoteCode.match(/APP_VERSION\s*=\s*'([^']+)'/);
    const remoteVersion = versionMatch ? versionMatch[1] : '0.0.0';

    localStorage.setItem(UPDATE_CHECK_KEY, String(now));

    if (remoteVersion !== APP_VERSION) {
      const btn = document.getElementById('check-update');
      btn.classList.add('has-update');
      btn.dataset.remoteVersion = remoteVersion;
      btn.dataset.commitMsg = latestMsg.split('\n')[0];
      btn.dataset.commitSha = latestSha;
      btn.dataset.commitDate = latestDate;
      log('INFO', '发现新版本', `remote=${remoteVersion} local=${APP_VERSION}`);
    } else {
      document.getElementById('check-update').classList.remove('has-update');
      if (force) showUpdateModal(null);
    }
  } catch (e) {
    log('WARN', '检查更新失败', e.message);
    if (force) showUpdateModal(null, e.message);
  }
}

function showUpdateModal(btn, errorMsg) {
  const modal = document.getElementById('update-modal');
  const content = document.getElementById('update-content');
  const confirmBtn = document.getElementById('update-confirm');

  if (errorMsg) {
    content.innerHTML = `<p>检查更新失败：${errorMsg}</p>`;
    confirmBtn.style.display = 'none';
  } else if (btn && btn.dataset.remoteVersion) {
    content.innerHTML = `
      <p><strong>发现新版本：v${btn.dataset.remoteVersion}</strong></p>
      <p style="margin-top:8px">当前版本：v${APP_VERSION}</p>
      <p style="margin-top:8px">最新提交：${btn.dataset.commitMsg}</p>
      <p>提交 ID：${btn.dataset.commitSha}</p>
      <p>更新时间：${new Date(btn.dataset.commitDate).toLocaleString()}</p>
    `;
    confirmBtn.style.display = 'inline-block';
    confirmBtn.onclick = () => {
      window.open('https://gitee.com/echohaoran/GPT-image-generatehot', '_blank');
      modal.style.display = 'none';
    };
  } else {
    content.innerHTML = `<p>当前已是最新版本 v${APP_VERSION}</p>`;
    confirmBtn.style.display = 'none';
  }

  modal.style.display = 'flex';
}

document.getElementById('check-update').addEventListener('click', (e) => {
  showUpdateModal(e.currentTarget);
});

document.getElementById('update-ignore').addEventListener('click', () => {
  document.getElementById('update-modal').style.display = 'none';
});

document.getElementById('update-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
});

// ====== 初始化 ======
(async () => {
  loadStylePrompts();
  initStylePresetSelects();
  updateLogoPreview(LOGO_PATH);
  await I18N.init();
  const langSelect = document.getElementById('lang-select');
  if (langSelect) {
    langSelect.value = I18N.getLocale();
    langSelect.addEventListener('change', () => I18N.switchLocale(langSelect.value));
  }
  log('INFO', '应用启动', `version=${APP_VERSION} locale=${I18N.getLocale()}`);
  renderHistory();
  checkUpdate(false);
})();
