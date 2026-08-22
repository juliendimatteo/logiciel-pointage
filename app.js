/* ═══════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const fmt = (d, opts) => new Date(d).toLocaleString('fr-BE', opts);
const fmtDate = d => fmt(d, {day:'2-digit',month:'long',year:'numeric'});
const fmtDateShort = d => fmt(d, {day:'2-digit',month:'2-digit',year:'numeric'});
const fmtTime = d => fmt(d, {hour:'2-digit',minute:'2-digit',second:'2-digit'});
const fmtTimeShort = d => fmt(d, {hour:'2-digit',minute:'2-digit'});
const todayStr = () => new Date().toISOString().slice(0,10);
const uid = () => Math.random().toString(36).slice(2,10);

function geoDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function geoBearing(lat1, lon1, lat2, lon2) {
  const toRad = d => d * Math.PI / 180;
  const dLon = toRad(lon2-lon1);
  const y = Math.sin(dLon)*Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1))*Math.sin(toRad(lat2)) - Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(dLon);
  return (Math.atan2(y,x)*180/Math.PI + 360) % 360;
}
function formatDuration(ms) {
  if (ms < 0) return '—';
  const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000);
  return h > 0 ? `${h}h${m.toString().padStart(2,'0')}` : `${m}min`;
}
function formatDistM(m) {
  return m >= 1000 ? `${(m/1000).toFixed(1)} km` : `${Math.round(m)} m`;
}
function initials(name) {
  return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
}
const AVATAR_COLORS = ['#1D4ED8','#7C3AED','#DB2777','#D97706','#15803D','#0F766E','#B91C1C','#6D28D9'];
function avatarColor(name) {
  let h = 0; for (const c of name) h = (h*31+c.charCodeAt(0)) & 0xFFFFFF;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function isDarkMode() {
  const t = document.documentElement.dataset.theme;
  if (t === 'dark') return true; if (t === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/* ═══════════════════════════════════════════════════════════
   DATA STORE
═══════════════════════════════════════════════════════════ */
const Store = {
  KEY: 'pointagepro_v2',
  data: { workers: [], zones: [], punches: [] },
  load() {
    try { const d = localStorage.getItem(this.KEY); if (d) this.data = JSON.parse(d); } catch(e) {}
  },
  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch(e) {}
  },
  seed() {
    const now = new Date();
    const t = (h,m) => { const d=new Date(now); d.setHours(h,m,0,0); return d.toISOString(); };

    this.data.workers = [
      { id:'w1', name:'Jean Dupont',    role:'Maçon' },
      { id:'w2', name:'Marc Laurent',   role:'Électricien' },
      { id:'w3', name:'Sophie Renard',  role:'Chef de chantier' },
      { id:'w4', name:'Pierre Lecomte', role:'Peintre' },
      { id:'w5', name:'Nadia Bouchard', role:'Plombier' },
    ];
    this.data.zones = [
      { id:'z1', name:'Chantier Bruxelles Centre', lat:50.8503, lng:4.3517, radius:150 },
      { id:'z2', name:'Dépôt Anderlecht',          lat:50.8366, lng:4.3142, radius:200 },
    ];
    // Punches for today
    const today = todayStr();
    this.data.punches = [
      { id:uid(), workerId:'w1', type:'entree', lat:50.8505, lng:4.3520, timestamp:t(7,35), zoneId:'z1', inZone:true },
      { id:uid(), workerId:'w2', type:'entree', lat:50.8501, lng:4.3515, timestamp:t(7,50), zoneId:'z1', inZone:true },
      { id:uid(), workerId:'w2', type:'sortie', lat:50.8503, lng:4.3518, timestamp:t(12,5),  zoneId:'z1', inZone:true },
      { id:uid(), workerId:'w2', type:'entree', lat:50.8502, lng:4.3516, timestamp:t(12,45), zoneId:'z1', inZone:true },
      { id:uid(), workerId:'w3', type:'entree', lat:50.8365, lng:4.3140, timestamp:t(8,10), zoneId:'z2', inZone:true },
      { id:uid(), workerId:'w4', type:'entree', lat:50.8490, lng:4.3600, timestamp:t(9,0),  zoneId:null,  inZone:false },
      { id:uid(), workerId:'w4', type:'sortie', lat:50.8490, lng:4.3600, timestamp:t(11,30),zoneId:null,  inZone:false },
    ];
    this.save();
  }
};

/* ═══════════════════════════════════════════════════════════
   GPS
═══════════════════════════════════════════════════════════ */
const GPS = {
  position: null,
  watchId: null,
  onUpdate: null,
  start() {
    if (!navigator.geolocation) return;
    this.watchId = navigator.geolocation.watchPosition(
      pos => {
        this.position = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
        if (this.onUpdate) this.onUpdate(this.position);
      },
      err => { console.warn('GPS error:', err.message); },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  },
  stop() {
    if (this.watchId !== null) { navigator.geolocation.clearWatch(this.watchId); this.watchId = null; }
  },
  getClosestZone(lat, lng) {
    let best = null, bestDist = Infinity;
    for (const z of Store.data.zones) {
      const d = geoDistance(lat, lng, z.lat, z.lng);
      if (d < bestDist) { bestDist = d; best = z; }
    }
    return best ? { zone: best, dist: bestDist, inZone: bestDist <= best.radius } : null;
  }
};

/* ═══════════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════════ */
let currentUser = null;
function saveSession(u) { try { localStorage.setItem('pp_session', JSON.stringify(u)); } catch(e){} }
function loadSession() { try { const s=localStorage.getItem('pp_session'); return s?JSON.parse(s):null; } catch(e){return null;} }
function clearSession() { try { localStorage.removeItem('pp_session'); } catch(e){} }

/* ═══════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════ */
let toastTimer = null;
function showToast(msg, type='info') {
  const icons = { success:'✅', error:'❌', warn:'⚠️', info:'ℹ️' };
  $('toast-icon').textContent = icons[type] || '';
  $('toast-msg').textContent = msg;
  const t = $('toast');
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 3200);
}

/* ═══════════════════════════════════════════════════════════
   CONFIRM DIALOG
═══════════════════════════════════════════════════════════ */
let dialogCb = null;
function openDialog(title, body, onConfirm) {
  $('dialog-title').textContent = title;
  $('dialog-body').textContent = body;
  dialogCb = onConfirm;
  $('dialog').classList.add('open');
}
function closeDialog() { $('dialog').classList.remove('open'); dialogCb = null; }
$('dialog-confirm').onclick = () => { closeDialog(); if (dialogCb) dialogCb(); };
$('dialog').addEventListener('click', e => { if (e.target === $('dialog')) closeDialog(); });

/* ═══════════════════════════════════════════════════════════
   LOGIN
═══════════════════════════════════════════════════════════ */
let selectedRole = null;
function selectRole(role) {
  selectedRole = role;
  $('role-manager').classList.toggle('selected', role==='manager');
  $('role-worker').classList.toggle('selected', role==='worker');

  if (role === 'worker') {
    $('worker-select-section').style.display = 'block';
    const sel = $('worker-select');
    sel.innerHTML = '<option value="">-- Choisir votre nom --</option>';
    Store.data.workers.forEach(w => {
      const o = document.createElement('option');
      o.value = w.id; o.textContent = `${w.name} — ${w.role}`;
      sel.appendChild(o);
    });
    sel.onchange = () => updateLoginBtn();
    updateLoginBtn();
  } else {
    $('worker-select-section').style.display = 'none';
    updateLoginBtn();
  }
}

function updateLoginBtn() {
  const btn = $('login-btn');
  if (!selectedRole) { btn.disabled = true; return; }
  if (selectedRole === 'worker' && !$('worker-select').value) { btn.disabled = true; return; }
  btn.disabled = false;
}

function doLogin() {
  if (!selectedRole) return;
  if (selectedRole === 'manager') {
    currentUser = { role: 'manager', name: 'Gestionnaire' };
    saveSession(currentUser);
    showManagerView();
  } else {
    const wid = $('worker-select').value;
    if (!wid) return;
    const w = Store.data.workers.find(x=>x.id===wid);
    currentUser = { role: 'worker', id: wid, name: w.name, workerRole: w.role };
    saveSession(currentUser);
    showWorkerView();
  }
}

function logout() {
  GPS.stop(); clearSession(); currentUser = null;
  clearInterval(clockInterval);
  showView('login');
  selectedRole = null;
  $('role-manager').classList.remove('selected');
  $('role-worker').classList.remove('selected');
  $('worker-select-section').style.display = 'none';
  $('login-btn').disabled = true;
}

/* ═══════════════════════════════════════════════════════════
   VIEW MANAGEMENT
═══════════════════════════════════════════════════════════ */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const v = $(`view-${name}`);
  if (v) v.classList.add('active');
}

/* ═══════════════════════════════════════════════════════════
   WORKER VIEW
═══════════════════════════════════════════════════════════ */
let clockInterval = null;

function showWorkerView() {
  showView('worker');
  const u = currentUser;
  $('w-header-name').textContent = u.name;
  $('w-header-avatar').textContent = initials(u.name);
  $('w-header-avatar').style.background = avatarColor(u.name);

  // Live clock
  clearInterval(clockInterval);
  function tick() {
    const now = new Date();
    $('w-time').textContent = now.toLocaleTimeString('fr-BE', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    $('w-date').textContent = now.toLocaleDateString('fr-BE', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  }
  tick(); clockInterval = setInterval(tick, 1000);

  updateWorkerStatus();
  renderWorkerHistory();

  // GPS
  GPS.onUpdate = pos => updateGPSDisplay(pos);
  GPS.start();
  updateGPSDisplay(GPS.position);
  if (!GPS.position) { $('w-gps-status').textContent = 'Demande de permission GPS…'; }
}

function updateWorkerStatus() {
  const today = todayStr();
  const punches = Store.data.punches.filter(p=>p.workerId===currentUser.id && p.timestamp.startsWith(today));
  punches.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));

  const last = punches[punches.length-1];
  const isPresent = last && last.type === 'entree';

  if (isPresent) {
    $('w-status-text').textContent = 'Présent';
    $('w-status-badge').innerHTML = '<span class="badge badge-green"><span class="dot dot-green dot-pulse"></span>En chantier</span>';
    const since = new Date(last.timestamp);
    $('w-status-since').textContent = `Depuis ${fmtTimeShort(since)} · ${formatDuration(Date.now()-since)}`;
    // Punch button → sortie (red)
    const btn = $('punch-btn');
    btn.style.background = 'linear-gradient(135deg, #B91C1C, #991B1B)';
    btn.style.boxShadow = '0 8px 32px rgba(185,28,28,.35)';
    $('punch-label').textContent = 'Pointer la sortie';
    $('punch-sub').textContent = 'Appuyer pour quitter';
    $('punch-icon').innerHTML = '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>';
    $('punch-ring').style.borderColor = '#FCA5A5';
    $('punch-ring').classList.add('active');
  } else {
    $('w-status-text').textContent = 'Absent';
    $('w-status-badge').innerHTML = '<span class="badge badge-grey">Non pointé</span>';
    if (last && last.type === 'sortie') {
      $('w-status-since').textContent = `Sorti à ${fmtTimeShort(new Date(last.timestamp))}`;
    } else {
      $('w-status-since').textContent = 'Pas encore pointé aujourd\'hui';
    }
    const btn = $('punch-btn');
    btn.style.background = 'linear-gradient(135deg, #15803D, #166534)';
    btn.style.boxShadow = '0 8px 32px rgba(21,128,61,.35)';
    $('punch-label').textContent = 'Pointer l\'entrée';
    $('punch-sub').textContent = 'Appuyer pour pointer';
    $('punch-icon').innerHTML = '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>';
    $('punch-ring').style.borderColor = '#86EFAC';
    $('punch-ring').classList.add('active');
  }
}

function updateGPSDisplay(pos) {
  if (!pos) {
    $('w-gps-badge').innerHTML = '<span class="badge badge-grey">Recherche…</span>';
    drawRadarNoGPS();
    return;
  }
  $('w-gps-status').textContent = `Position obtenue (±${Math.round(pos.acc)}m)`;
  $('w-gps-coords').textContent = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
  $('w-gps-badge').innerHTML = '<span class="badge badge-green">✓ GPS</span>';

  const result = GPS.getClosestZone(pos.lat, pos.lng);
  if (result) {
    const { zone, dist, inZone } = result;
    $('w-zone-dot').className = `dot ${inZone?'dot-green dot-pulse':'dot-amber'}`;
    $('w-zone-text').textContent = inZone
      ? `✓ Dans la zone : ${zone.name}`
      : `Hors zone — ${formatDistM(dist)} de « ${zone.name} »`;
    $('w-zone-text').style.color = inZone ? 'var(--green)' : 'var(--amber)';
    $('w-radar-dist').textContent = `${formatDistM(dist)} du centre`;
    drawRadar(pos, result);
  } else {
    $('w-zone-dot').className = 'dot dot-grey';
    $('w-zone-text').textContent = 'Aucune zone configurée';
    $('w-zone-text').style.color = 'var(--txt-2)';
    drawRadarNoGPS();
  }
}

function doPunch() {
  if (!GPS.position) {
    // Demo mode: allow punch without GPS
    const pos = { lat: 50.8503 + (Math.random()-.5)*0.002, lng: 4.3517 + (Math.random()-.5)*0.002, acc: 15 };
    GPS.position = pos;
    updateGPSDisplay(pos);
  }
  const pos = GPS.position;
  const today = todayStr();
  const punches = Store.data.punches.filter(p=>p.workerId===currentUser.id && p.timestamp.startsWith(today));
  punches.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
  const last = punches[punches.length-1];
  const type = (!last || last.type==='sortie') ? 'entree' : 'sortie';

  const result = GPS.getClosestZone(pos.lat, pos.lng);
  const punch = {
    id: uid(),
    workerId: currentUser.id,
    type, lat: pos.lat, lng: pos.lng,
    timestamp: new Date().toISOString(),
    zoneId: result?.zone?.id || null,
    inZone: result?.inZone || false
  };
  Store.data.punches.push(punch);
  Store.save();

  const label = type==='entree' ? 'Entrée pointée' : 'Sortie pointée';
  const warn = !punch.inZone && Store.data.zones.length > 0 ? ' (hors zone)' : '';
  showToast(`${label} à ${fmtTimeShort(new Date())}${warn}`, punch.inZone||!Store.data.zones.length?'success':'warn');

  updateWorkerStatus();
  renderWorkerHistory();
}

function renderWorkerHistory() {
  const today = todayStr();
  const punches = Store.data.punches
    .filter(p=>p.workerId===currentUser.id && p.timestamp.startsWith(today))
    .sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));

  const el = $('w-history-list');
  if (!punches.length) {
    el.innerHTML = '<div class="no-history">Aucun pointage aujourd\'hui</div>';
    return;
  }
  el.innerHTML = punches.map(p => {
    const zone = p.zoneId ? Store.data.zones.find(z=>z.id===p.zoneId) : null;
    const isIn = p.type==='entree';
    return `<div class="history-item">
      <div class="history-type-icon" style="background:${isIn?'var(--green-lt)':'var(--red-lt)'};">
        ${isIn?'⬆️':'⬇️'}
      </div>
      <div class="history-info">
        <div class="history-type" style="color:${isIn?'var(--green)':'var(--red)'};">${isIn?'Entrée':'Sortie'}</div>
        <div class="history-meta">${zone?zone.name:'Hors zone'}${!p.inZone&&Store.data.zones.length?' · ⚠️ Hors périmètre':''}</div>
      </div>
      <div class="history-time">${fmtTimeShort(new Date(p.timestamp))}</div>
    </div>`;
  }).join('');
}

/* ─── RADAR CANVAS ─── */
function drawRadar(workerPos, zoneResult) {
  const canvas = $('w-radar');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2;
  const dark = isDarkMode();
  const { zone, dist, inZone } = zoneResult;

  ctx.clearRect(0,0,W,H);

  // Background (clipped to circle)
  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,cx,0,Math.PI*2); ctx.clip();
  ctx.fillStyle = dark ? '#1C2333' : '#F8FAFC';
  ctx.fillRect(0,0,W,H);

  // Grid rings
  for (let i=1; i<=3; i++) {
    ctx.beginPath(); ctx.arc(cx,cy,(cx-12)*i/3,0,Math.PI*2);
    ctx.strokeStyle = dark?'#30363D':'#E2E8F0';
    ctx.lineWidth = 1; ctx.stroke();
  }
  // Crosshairs
  ctx.beginPath(); ctx.moveTo(cx,12); ctx.lineTo(cx,H-12);
  ctx.moveTo(12,cy); ctx.lineTo(W-12,cy);
  ctx.strokeStyle = dark?'#30363D':'#E2E8F0'; ctx.lineWidth=1; ctx.stroke();

  // Scale: zone radius maps to half the canvas radius
  const maxDisp = cx - 16;
  const scale = maxDisp / (zone.radius * 2.5);

  // Zone circle
  const zoneDispR = zone.radius * scale;
  ctx.beginPath(); ctx.arc(cx,cy,zoneDispR,0,Math.PI*2);
  ctx.fillStyle = inZone ? 'rgba(21,128,61,.12)' : 'rgba(29,78,216,.08)';
  ctx.fill();
  ctx.strokeStyle = inZone ? '#15803D' : '#1D4ED8';
  ctx.lineWidth = 2; ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);

  // Worker position
  const bearing = geoBearing(zone.lat, zone.lng, workerPos.lat, workerPos.lng);
  const dispDist = Math.min(dist * scale, maxDisp - 8);
  const rad = bearing * Math.PI / 180;
  const wx = cx + dispDist * Math.sin(rad);
  const wy = cy - dispDist * Math.cos(rad);

  // Line from center to worker
  ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(wx,wy);
  ctx.strokeStyle = dark?'#484F58':'#CBD5E1'; ctx.lineWidth=1; ctx.stroke();

  // Zone center dot
  ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2);
  ctx.fillStyle = '#1D4ED8'; ctx.fill();

  // Worker dot
  ctx.beginPath(); ctx.arc(wx,wy,9,0,Math.PI*2);
  ctx.fillStyle = inZone ? '#15803D' : '#B91C1C'; ctx.fill();
  ctx.strokeStyle = dark?'#1C2333':'#fff'; ctx.lineWidth=2.5; ctx.stroke();

  // "Vous" label
  ctx.fillStyle = dark?'#E6EDF3':'#0F172A';
  ctx.font = 'bold 10px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('Vous', wx, wy - 15);

  ctx.restore();

  // Outer ring
  ctx.beginPath(); ctx.arc(cx,cy,cx-1,0,Math.PI*2);
  ctx.strokeStyle = dark?'#30363D':'#E2E8F0'; ctx.lineWidth=2; ctx.stroke();
}

function drawRadarNoGPS() {
  const canvas = $('w-radar');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2;
  const dark = isDarkMode();
  ctx.clearRect(0,0,W,H);
  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,cx,0,Math.PI*2); ctx.clip();
  ctx.fillStyle = dark?'#1C2333':'#F8FAFC'; ctx.fillRect(0,0,W,H);
  for (let i=1;i<=3;i++){
    ctx.beginPath();ctx.arc(cx,cy,(cx-12)*i/3,0,Math.PI*2);
    ctx.strokeStyle=dark?'#30363D':'#E2E8F0';ctx.lineWidth=1;ctx.stroke();
  }
  ctx.fillStyle = dark?'#484F58':'#94A3B8';
  ctx.font = '12px system-ui'; ctx.textAlign='center';
  ctx.fillText('GPS non disponible', cx, cy);
  ctx.restore();
  ctx.beginPath();ctx.arc(cx,cy,cx-1,0,Math.PI*2);
  ctx.strokeStyle=dark?'#30363D':'#E2E8F0';ctx.lineWidth=2;ctx.stroke();
}

/* ═══════════════════════════════════════════════════════════
   MANAGER VIEW
═══════════════════════════════════════════════════════════ */
function showManagerView() {
  showView('manager');
  refreshManager();
  renderZones();
  initReportDates();
  populateReportWorkers();
}

function switchTab(name, btn) {
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  $(`tab-${name}`).classList.add('active');
}

function refreshManager() {
  const today = todayStr();
  const workers = Store.data.workers;

  let present=0, absent=0, outside=0;
  const cards = workers.map(w => {
    const todayPunches = Store.data.punches
      .filter(p=>p.workerId===w.id && p.timestamp.startsWith(today))
      .sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
    const last = todayPunches[todayPunches.length-1];
    const isPresent = last && last.type==='entree';
    const isOutside = isPresent && !last.inZone && Store.data.zones.length>0;

    if (isPresent) { present++; if (isOutside) outside++; }
    else absent++;

    const firstIn = todayPunches.find(p=>p.type==='entree');
    const totalMs = calcTotalTime(todayPunches);
    const zone = last?.zoneId ? Store.data.zones.find(z=>z.id===last.zoneId) : null;
    const color = avatarColor(w.name);

    return `<div class="card worker-card">
      <div class="worker-card-top">
        <div class="worker-card-id">
          <div class="worker-card-avatar" style="background:${color};">${initials(w.name)}</div>
          <div>
            <div class="worker-card-name">${w.name}</div>
            <div class="worker-card-role">${w.role}</div>
          </div>
        </div>
        ${isPresent
          ? isOutside
            ? '<span class="badge badge-amber"><span class="dot dot-amber dot-pulse"></span>Hors zone</span>'
            : '<span class="badge badge-green"><span class="dot dot-green dot-pulse"></span>Présent</span>'
          : '<span class="badge badge-grey">Absent</span>'
        }
      </div>
      <div class="worker-card-stats">
        <div class="worker-stat-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          <span class="worker-stat-label">Entrée :</span>
          <span class="worker-stat-val">${firstIn?fmtTimeShort(new Date(firstIn.timestamp)):'—'}</span>
        </div>
        <div class="worker-stat-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 18 0A9 9 0 0 0 3 12"/><path d="M12 7v5l3 3"/></svg>
          <span class="worker-stat-label">Temps travaillé :</span>
          <span class="worker-stat-val">${totalMs>0?formatDuration(totalMs):'—'}</span>
        </div>
        <div class="worker-stat-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          <span class="worker-stat-label">Zone :</span>
          <span class="worker-stat-val">${zone?zone.name:isPresent?'Hors zone':'—'}</span>
        </div>
      </div>
    </div>`;
  });

  $('stat-present').textContent = present;
  $('stat-absent').textContent = absent;
  $('stat-outside').textContent = outside;
  $('mgr-worker-grid').innerHTML = cards.join('');
}

function calcTotalTime(punches) {
  let total = 0;
  for (let i=0; i<punches.length-1; i++) {
    if (punches[i].type==='entree' && punches[i+1].type==='sortie') {
      total += new Date(punches[i+1].timestamp) - new Date(punches[i].timestamp);
    }
  }
  // If last punch is 'entree', count time until now
  const last = punches[punches.length-1];
  if (last && last.type==='entree') total += Date.now() - new Date(last.timestamp);
  return total;
}

/* ─── ZONES ─── */
function renderZones() {
  const el = $('zones-list');
  if (!Store.data.zones.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📍</div><div class="empty-state-text">Aucune zone définie. Ajoutez votre premier chantier.</div></div>';
    return;
  }
  el.innerHTML = Store.data.zones.map(z => {
    const today = todayStr();
    const presentWorkers = Store.data.workers.filter(w => {
      const punches = Store.data.punches
        .filter(p=>p.workerId===w.id && p.timestamp.startsWith(today))
        .sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
      const last = punches[punches.length-1];
      return last && last.type==='entree' && last.zoneId===z.id;
    });
    const chips = presentWorkers.length
      ? presentWorkers.map(w=>`<span class="zone-worker-chip" style="border-color:${avatarColor(w.name)}33;">${w.name}</span>`).join('')
      : '<span style="font-size:12px;color:var(--txt-3);">Personne en ce moment</span>';
    return `<div class="card zone-card">
      <div class="zone-card-top">
        <div>
          <div class="zone-name">📍 ${z.name}</div>
          <div class="zone-meta">Rayon ${z.radius}m · ${z.lat.toFixed(4)}°N, ${z.lng.toFixed(4)}°E</div>
        </div>
        <button class="btn btn-ghost btn-sm" style="color:var(--red);flex-shrink:0;" onclick="deleteZone('${z.id}')">Supprimer</button>
      </div>
      <div class="zone-workers">${chips}</div>
    </div>`;
  }).join('');
}

function addZone() {
  const name = $('zone-name').value.trim();
  const lat = parseFloat($('zone-lat').value);
  const lng = parseFloat($('zone-lng').value);
  const radius = parseInt($('zone-radius').value);
  if (!name||isNaN(lat)||isNaN(lng)||isNaN(radius)||radius<10) {
    showToast('Veuillez remplir tous les champs correctement', 'error');
    return;
  }
  if (lat<-90||lat>90||lng<-180||lng>180) {
    showToast('Coordonnées GPS invalides', 'error');
    return;
  }
  Store.data.zones.push({ id:uid(), name, lat, lng, radius });
  Store.save();
  $('zone-name').value=''; $('zone-lat').value=''; $('zone-lng').value=''; $('zone-radius').value='';
  renderZones();
  showToast(`Zone « ${name} » ajoutée`, 'success');
}

function deleteZone(id) {
  const z = Store.data.zones.find(x=>x.id===id);
  openDialog('Supprimer la zone', `Supprimer « ${z?.name} » ? Les pointages existants ne seront pas affectés.`, () => {
    Store.data.zones = Store.data.zones.filter(x=>x.id!==id);
    Store.save();
    renderZones();
    showToast('Zone supprimée', 'info');
  });
}

function useCurrentLocation() {
  if (!navigator.geolocation) { showToast('GPS non disponible', 'error'); return; }
  showToast('Récupération de la position…', 'info');
  navigator.geolocation.getCurrentPosition(pos => {
    $('zone-lat').value = pos.coords.latitude.toFixed(6);
    $('zone-lng').value = pos.coords.longitude.toFixed(6);
    showToast('Position récupérée', 'success');
  }, () => {
    // Fallback: Brussels center
    $('zone-lat').value = '50.8503';
    $('zone-lng').value = '4.3517';
    showToast('GPS indisponible — position par défaut (Bruxelles)', 'warn');
  });
}

/* ─── REPORTS ─── */
let reportData = [];

function initReportDates() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  $('report-from').value = from.toISOString().slice(0,10);
  $('report-to').value = todayStr();
}

function populateReportWorkers() {
  const sel = $('report-worker');
  sel.innerHTML = '<option value="">Tous les ouvriers</option>';
  Store.data.workers.forEach(w => {
    const o = document.createElement('option');
    o.value = w.id; o.textContent = w.name;
    sel.appendChild(o);
  });
}

function generateReport() {
  const from = $('report-from').value;
  const to = $('report-to').value;
  const wid = $('report-worker').value;

  if (!from||!to||from>to) { showToast('Sélectionnez une période valide', 'error'); return; }

  // Build per-worker per-day summary
  const days = [];
  const d = new Date(from);
  while (d.toISOString().slice(0,10) <= to) { days.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+1); }

  const workers = wid ? Store.data.workers.filter(w=>w.id===wid) : Store.data.workers;
  reportData = [];

  for (const w of workers) {
    for (const day of days) {
      const punches = Store.data.punches
        .filter(p=>p.workerId===w.id && p.timestamp.startsWith(day))
        .sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
      if (!punches.length) continue;
      const firstIn = punches.find(p=>p.type==='entree');
      const lastOut = [...punches].reverse().find(p=>p.type==='sortie');
      const totalMs = calcTotalTime(punches);
      const zone = firstIn?.zoneId ? Store.data.zones.find(z=>z.id===firstIn.zoneId) : null;
      const outOfZone = punches.some(p=>!p.inZone && Store.data.zones.length>0);
      reportData.push({ worker: w, day, firstIn, lastOut, totalMs, zone, outOfZone });
    }
  }

  const tbody = $('report-body');
  if (!reportData.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--txt-3);">Aucun pointage pour cette période</td></tr>';
    $('export-btn').style.display='none';
    return;
  }

  tbody.innerHTML = reportData.map(r => `
    <tr>
      <td><div style="display:flex;align-items:center;gap:8px;">
        <div style="width:24px;height:24px;border-radius:50%;background:${avatarColor(r.worker.name)};display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;font-family:var(--f-head);flex-shrink:0;">${initials(r.worker.name)}</div>
        <span style="font-weight:500;">${r.worker.name}</span>
      </div></td>
      <td>${fmtDateShort(new Date(r.day))}</td>
      <td>${r.firstIn?fmtTimeShort(new Date(r.firstIn.timestamp)):'—'}</td>
      <td>${r.lastOut?fmtTimeShort(new Date(r.lastOut.timestamp)):'<span style="color:var(--green);font-size:11px;">En cours</span>'}</td>
      <td><span style="font-weight:600;">${r.totalMs>0?formatDuration(r.totalMs):'—'}</span></td>
      <td>${r.zone?r.zone.name:'<span style="color:var(--txt-3);">—</span>'}</td>
      <td>${r.outOfZone
        ? '<span class="badge badge-amber">⚠️ Hors zone</span>'
        : '<span class="badge badge-green">✓ OK</span>'}</td>
    </tr>
  `).join('');
  $('export-btn').style.display='';
  showToast(`${reportData.length} ligne(s) générée(s)`, 'success');
}

function exportCSV() {
  if (!reportData.length) return;
  const headers = ['Ouvrier','Métier','Date','Entrée','Sortie','Durée (min)','Zone','Statut'];
  const rows = reportData.map(r=>[
    r.worker.name, r.worker.role,
    fmtDateShort(new Date(r.day)),
    r.firstIn?fmtTimeShort(new Date(r.firstIn.timestamp)):'',
    r.lastOut?fmtTimeShort(new Date(r.lastOut.timestamp)):'En cours',
    r.totalMs>0?Math.round(r.totalMs/60000):'',
    r.zone?r.zone.name:'',
    r.outOfZone?'Hors zone':'OK'
  ]);
  const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const bom = '﻿';
  const blob = new Blob([bom+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=`pointages_${$('report-from').value}_${$('report-to').value}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('Export CSV téléchargé', 'success');
}

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
Store.load();
if (!Store.data.workers.length) Store.seed();

const session = loadSession();
if (session) {
  currentUser = session;
  if (currentUser.role==='manager') showManagerView();
  else showWorkerView();
} else {
  showView('login');
}

// Redraw radar on theme change
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ()=>{
  if (currentUser?.role==='worker' && GPS.position) {
    const result = GPS.getClosestZone(GPS.position.lat, GPS.position.lng);
    if (result) drawRadar(GPS.position, result); else drawRadarNoGPS();
  }
});
