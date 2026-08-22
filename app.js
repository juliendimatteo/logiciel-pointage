/* ═══════════════════════════════════════════════════════════
   UTILITAIRES
═══════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const formater = (d, options) => new Date(d).toLocaleString('fr-BE', options);
const formaterDate = d => formater(d, {day:'2-digit',month:'long',year:'numeric'});
const formaterDateCourte = d => formater(d, {day:'2-digit',month:'2-digit',year:'numeric'});
const formaterHeure = d => formater(d, {hour:'2-digit',minute:'2-digit',second:'2-digit'});
const formaterHeureCourte = d => formater(d, {hour:'2-digit',minute:'2-digit'});
const dateAujourdhui = () => new Date().toISOString().slice(0,10);
const genererId = () => Math.random().toString(36).slice(2,10);

function distanceGeo(lat1, lon1, lat2, lon2) {
  const R = 6371000, versRad = d => d * Math.PI / 180;
  const dLat = versRad(lat2-lat1), dLon = versRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(versRad(lat1))*Math.cos(versRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function capGeo(lat1, lon1, lat2, lon2) {
  const versRad = d => d * Math.PI / 180;
  const dLon = versRad(lon2-lon1);
  const y = Math.sin(dLon)*Math.cos(versRad(lat2));
  const x = Math.cos(versRad(lat1))*Math.sin(versRad(lat2)) - Math.sin(versRad(lat1))*Math.cos(versRad(lat2))*Math.cos(dLon);
  return (Math.atan2(y,x)*180/Math.PI + 360) % 360;
}
function formaterDuree(ms) {
  if (ms < 0) return '—';
  const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000);
  return h > 0 ? `${h}h${m.toString().padStart(2,'0')}` : `${m}min`;
}
function formaterDistance(m) {
  return m >= 1000 ? `${(m/1000).toFixed(1)} km` : `${Math.round(m)} m`;
}
function initiales(nom) {
  return nom.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
}
const COULEURS_AVATAR = ['#1D4ED8','#7C3AED','#DB2777','#D97706','#15803D','#0F766E','#B91C1C','#6D28D9'];
function couleurAvatar(nom) {
  let h = 0; for (const c of nom) h = (h*31+c.charCodeAt(0)) & 0xFFFFFF;
  return COULEURS_AVATAR[Math.abs(h) % COULEURS_AVATAR.length];
}

function modeSombreActif() {
  const t = document.documentElement.dataset.theme;
  if (t === 'dark') return true; if (t === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/* ═══════════════════════════════════════════════════════════
   STOCKAGE DES DONNÉES
═══════════════════════════════════════════════════════════ */
const Stockage = {
  CLE: 'pointagepro_donnees',
  donnees: { ouvriers: [], zones: [], pointages: [] },
  charger() {
    try { const d = localStorage.getItem(this.CLE); if (d) this.donnees = JSON.parse(d); } catch(e) {}
  },
  enregistrer() {
    try { localStorage.setItem(this.CLE, JSON.stringify(this.donnees)); } catch(e) {}
  },
  initialiser() {
    const maintenant = new Date();
    const t = (h,m) => { const d=new Date(maintenant); d.setHours(h,m,0,0); return d.toISOString(); };

    this.donnees.ouvriers = [
      { id:'o1', nom:'Jean Dupont',    metier:'Maçon' },
      { id:'o2', nom:'Marc Laurent',   metier:'Électricien' },
      { id:'o3', nom:'Sophie Renard',  metier:'Chef de chantier' },
      { id:'o4', nom:'Pierre Lecomte', metier:'Peintre' },
      { id:'o5', nom:'Nadia Bouchard', metier:'Plombier' },
    ];
    this.donnees.zones = [
      { id:'z1', nom:'Chantier Bruxelles Centre', lat:50.8503, lng:4.3517, rayon:150 },
      { id:'z2', nom:'Dépôt Anderlecht',          lat:50.8366, lng:4.3142, rayon:200 },
    ];
    // Pointages du jour
    this.donnees.pointages = [
      { id:genererId(), idOuvrier:'o1', type:'entree', lat:50.8505, lng:4.3520, horodatage:t(7,35), idZone:'z1', dansZone:true },
      { id:genererId(), idOuvrier:'o2', type:'entree', lat:50.8501, lng:4.3515, horodatage:t(7,50), idZone:'z1', dansZone:true },
      { id:genererId(), idOuvrier:'o2', type:'sortie', lat:50.8503, lng:4.3518, horodatage:t(12,5),  idZone:'z1', dansZone:true },
      { id:genererId(), idOuvrier:'o2', type:'entree', lat:50.8502, lng:4.3516, horodatage:t(12,45), idZone:'z1', dansZone:true },
      { id:genererId(), idOuvrier:'o3', type:'entree', lat:50.8365, lng:4.3140, horodatage:t(8,10), idZone:'z2', dansZone:true },
      { id:genererId(), idOuvrier:'o4', type:'entree', lat:50.8490, lng:4.3600, horodatage:t(9,0),  idZone:null,  dansZone:false },
      { id:genererId(), idOuvrier:'o4', type:'sortie', lat:50.8490, lng:4.3600, horodatage:t(11,30),idZone:null,  dansZone:false },
    ];
    this.enregistrer();
  }
};

/* ═══════════════════════════════════════════════════════════
   GPS
═══════════════════════════════════════════════════════════ */
const GPS = {
  position: null,
  idSuivi: null,
  surMiseAJour: null,
  demarrer() {
    if (!navigator.geolocation) return;
    this.idSuivi = navigator.geolocation.watchPosition(
      pos => {
        this.position = { lat: pos.coords.latitude, lng: pos.coords.longitude, precision: pos.coords.accuracy };
        if (this.surMiseAJour) this.surMiseAJour(this.position);
      },
      err => { console.warn('Erreur GPS :', err.message); },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  },
  arreter() {
    if (this.idSuivi !== null) { navigator.geolocation.clearWatch(this.idSuivi); this.idSuivi = null; }
  },
  zoneLaPlusProche(lat, lng) {
    let meilleure = null, meilleureDist = Infinity;
    for (const z of Stockage.donnees.zones) {
      const d = distanceGeo(lat, lng, z.lat, z.lng);
      if (d < meilleureDist) { meilleureDist = d; meilleure = z; }
    }
    return meilleure ? { zone: meilleure, distance: meilleureDist, dansZone: meilleureDist <= meilleure.rayon } : null;
  }
};

/* ═══════════════════════════════════════════════════════════
   AUTHENTIFICATION
═══════════════════════════════════════════════════════════ */
let utilisateurActuel = null;
function enregistrerSession(u) { try { localStorage.setItem('pointagepro_session', JSON.stringify(u)); } catch(e){} }
function chargerSession() { try { const s=localStorage.getItem('pointagepro_session'); return s?JSON.parse(s):null; } catch(e){return null;} }
function effacerSession() { try { localStorage.removeItem('pointagepro_session'); } catch(e){} }

/* ═══════════════════════════════════════════════════════════
   NOTIFICATION
═══════════════════════════════════════════════════════════ */
let minuteurNotification = null;
function afficherNotification(msg, type='info') {
  const icones = { succes:'✅', erreur:'❌', alerte:'⚠️', info:'ℹ️' };
  $('icone-notification').textContent = icones[type] || '';
  $('message-notification').textContent = msg;
  const n = $('notification');
  n.classList.add('visible');
  clearTimeout(minuteurNotification);
  minuteurNotification = setTimeout(()=>n.classList.remove('visible'), 3200);
}

/* ═══════════════════════════════════════════════════════════
   BOÎTE DE DIALOGUE
═══════════════════════════════════════════════════════════ */
let rappelDialogue = null;
function ouvrirDialogue(titre, corps, surConfirmation) {
  $('titre-dialogue').textContent = titre;
  $('corps-dialogue').textContent = corps;
  rappelDialogue = surConfirmation;
  $('dialogue').classList.add('ouvert');
}
function fermerDialogue() { $('dialogue').classList.remove('ouvert'); rappelDialogue = null; }
$('confirmer-dialogue').onclick = () => {
  const rappel = rappelDialogue;
  fermerDialogue();
  if (rappel) rappel();
};
$('dialogue').addEventListener('click', e => { if (e.target === $('dialogue')) fermerDialogue(); });

/* ═══════════════════════════════════════════════════════════
   CONNEXION
═══════════════════════════════════════════════════════════ */
let roleSelectionne = null;
function selectionnerRole(role) {
  roleSelectionne = role;
  $('role-gestionnaire').classList.toggle('selectionne', role==='gestionnaire');
  $('role-ouvrier').classList.toggle('selectionne', role==='ouvrier');

  if (role === 'ouvrier') {
    $('section-selection-ouvrier').style.display = 'block';
    const sel = $('selection-ouvrier');
    sel.innerHTML = '<option value="">-- Choisir votre nom --</option>';
    Stockage.donnees.ouvriers.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.id; opt.textContent = `${o.nom} — ${o.metier}`;
      sel.appendChild(opt);
    });
    sel.onchange = () => mettreAJourBoutonConnexion();
    mettreAJourBoutonConnexion();
  } else {
    $('section-selection-ouvrier').style.display = 'none';
    mettreAJourBoutonConnexion();
  }
}

function mettreAJourBoutonConnexion() {
  const btn = $('bouton-connexion');
  if (!roleSelectionne) { btn.disabled = true; return; }
  if (roleSelectionne === 'ouvrier' && !$('selection-ouvrier').value) { btn.disabled = true; return; }
  btn.disabled = false;
}

function seConnecter() {
  if (!roleSelectionne) return;
  if (roleSelectionne === 'gestionnaire') {
    utilisateurActuel = { role: 'gestionnaire', nom: 'Gestionnaire' };
    enregistrerSession(utilisateurActuel);
    afficherVueGestionnaire();
  } else {
    const idOuvrier = $('selection-ouvrier').value;
    if (!idOuvrier) return;
    const o = Stockage.donnees.ouvriers.find(x=>x.id===idOuvrier);
    utilisateurActuel = { role: 'ouvrier', id: idOuvrier, nom: o.nom, metier: o.metier };
    enregistrerSession(utilisateurActuel);
    afficherVueOuvrier();
  }
}

function seDeconnecter() {
  GPS.arreter(); effacerSession(); utilisateurActuel = null;
  clearInterval(intervalleHorloge);
  afficherVue('connexion');
  roleSelectionne = null;
  $('role-gestionnaire').classList.remove('selectionne');
  $('role-ouvrier').classList.remove('selectionne');
  $('section-selection-ouvrier').style.display = 'none';
  $('bouton-connexion').disabled = true;
}

/* ═══════════════════════════════════════════════════════════
   GESTION DES VUES
═══════════════════════════════════════════════════════════ */
function afficherVue(nom) {
  document.querySelectorAll('.vue').forEach(v => v.classList.remove('actif'));
  const v = $(`vue-${nom}`);
  if (v) v.classList.add('actif');
}

/* ═══════════════════════════════════════════════════════════
   VUE OUVRIER
═══════════════════════════════════════════════════════════ */
let intervalleHorloge = null;

function afficherVueOuvrier() {
  afficherVue('ouvrier');
  const u = utilisateurActuel;
  $('nom-entete-ouvrier').textContent = u.nom;
  $('avatar-entete-ouvrier').textContent = initiales(u.nom);
  $('avatar-entete-ouvrier').style.background = couleurAvatar(u.nom);

  // Horloge en direct
  clearInterval(intervalleHorloge);
  function actualiserHorloge() {
    const maintenant = new Date();
    $('heure-ouvrier').textContent = maintenant.toLocaleTimeString('fr-BE', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    $('date-ouvrier').textContent = maintenant.toLocaleDateString('fr-BE', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  }
  actualiserHorloge(); intervalleHorloge = setInterval(actualiserHorloge, 1000);

  mettreAJourStatutOuvrier();
  afficherHistoriqueOuvrier();

  // GPS
  GPS.surMiseAJour = pos => mettreAJourAffichageGPS(pos);
  GPS.demarrer();
  mettreAJourAffichageGPS(GPS.position);
  if (!GPS.position) { $('statut-gps-ouvrier').textContent = 'Demande de permission GPS…'; }
}

function mettreAJourStatutOuvrier() {
  const aujourdhui = dateAujourdhui();
  const pointages = Stockage.donnees.pointages.filter(p=>p.idOuvrier===utilisateurActuel.id && p.horodatage.startsWith(aujourdhui));
  pointages.sort((a,b)=>new Date(a.horodatage)-new Date(b.horodatage));

  const dernier = pointages[pointages.length-1];
  const estPresent = dernier && dernier.type === 'entree';

  if (estPresent) {
    $('texte-statut-ouvrier').textContent = 'Présent';
    $('badge-statut-ouvrier').innerHTML = '<span class="badge badge-vert"><span class="point point-vert point-pulsation"></span>En chantier</span>';
    const depuis = new Date(dernier.horodatage);
    $('depuis-statut-ouvrier').textContent = `Depuis ${formaterHeureCourte(depuis)} · ${formaterDuree(Date.now()-depuis)}`;
    // Bouton de pointage → sortie (rouge)
    const btn = $('bouton-pointage');
    btn.style.background = 'linear-gradient(135deg, #B91C1C, #991B1B)';
    btn.style.boxShadow = '0 8px 32px rgba(185,28,28,.35)';
    $('libelle-pointage').textContent = 'Pointer la sortie';
    $('sous-libelle-pointage').textContent = 'Appuyer pour quitter';
    $('icone-pointage').innerHTML = '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>';
    $('anneau-pointage').style.borderColor = '#FCA5A5';
    $('anneau-pointage').classList.add('actif');
  } else {
    $('texte-statut-ouvrier').textContent = 'Absent';
    $('badge-statut-ouvrier').innerHTML = '<span class="badge badge-gris">Non pointé</span>';
    if (dernier && dernier.type === 'sortie') {
      $('depuis-statut-ouvrier').textContent = `Sorti à ${formaterHeureCourte(new Date(dernier.horodatage))}`;
    } else {
      $('depuis-statut-ouvrier').textContent = 'Pas encore pointé aujourd\'hui';
    }
    const btn = $('bouton-pointage');
    btn.style.background = 'linear-gradient(135deg, #15803D, #166534)';
    btn.style.boxShadow = '0 8px 32px rgba(21,128,61,.35)';
    $('libelle-pointage').textContent = 'Pointer l\'entrée';
    $('sous-libelle-pointage').textContent = 'Appuyer pour pointer';
    $('icone-pointage').innerHTML = '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>';
    $('anneau-pointage').style.borderColor = '#86EFAC';
    $('anneau-pointage').classList.add('actif');
  }
}

function mettreAJourAffichageGPS(pos) {
  if (!pos) {
    $('badge-gps-ouvrier').innerHTML = '<span class="badge badge-gris">Recherche…</span>';
    dessinerRadarSansGPS();
    return;
  }
  $('statut-gps-ouvrier').textContent = `Position obtenue (±${Math.round(pos.precision)}m)`;
  $('coordonnees-gps-ouvrier').textContent = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
  $('badge-gps-ouvrier').innerHTML = '<span class="badge badge-vert">✓ GPS</span>';

  const resultat = GPS.zoneLaPlusProche(pos.lat, pos.lng);
  if (resultat) {
    const { zone, distance, dansZone } = resultat;
    $('point-zone-ouvrier').className = `point ${dansZone?'point-vert point-pulsation':'point-ambre'}`;
    $('texte-zone-ouvrier').textContent = dansZone
      ? `✓ Dans la zone : ${zone.nom}`
      : `Hors zone — ${formaterDistance(distance)} de « ${zone.nom} »`;
    $('texte-zone-ouvrier').style.color = dansZone ? 'var(--vert)' : 'var(--ambre)';
    $('distance-radar-ouvrier').textContent = `${formaterDistance(distance)} du centre`;
    dessinerRadar(pos, resultat);
  } else {
    $('point-zone-ouvrier').className = 'point point-gris';
    $('texte-zone-ouvrier').textContent = 'Aucune zone configurée';
    $('texte-zone-ouvrier').style.color = 'var(--texte-2)';
    dessinerRadarSansGPS();
  }
}

function pointer() {
  if (!GPS.position) {
    // Mode démo : permet de pointer sans GPS
    const pos = { lat: 50.8503 + (Math.random()-.5)*0.002, lng: 4.3517 + (Math.random()-.5)*0.002, precision: 15 };
    GPS.position = pos;
    mettreAJourAffichageGPS(pos);
  }
  const pos = GPS.position;
  const aujourdhui = dateAujourdhui();
  const pointages = Stockage.donnees.pointages.filter(p=>p.idOuvrier===utilisateurActuel.id && p.horodatage.startsWith(aujourdhui));
  pointages.sort((a,b)=>new Date(a.horodatage)-new Date(b.horodatage));
  const dernier = pointages[pointages.length-1];
  const type = (!dernier || dernier.type==='sortie') ? 'entree' : 'sortie';

  const resultat = GPS.zoneLaPlusProche(pos.lat, pos.lng);
  const pointage = {
    id: genererId(),
    idOuvrier: utilisateurActuel.id,
    type, lat: pos.lat, lng: pos.lng,
    horodatage: new Date().toISOString(),
    idZone: resultat?.zone?.id || null,
    dansZone: resultat?.dansZone || false
  };
  Stockage.donnees.pointages.push(pointage);
  Stockage.enregistrer();

  const libelle = type==='entree' ? 'Entrée pointée' : 'Sortie pointée';
  const alerte = !pointage.dansZone && Stockage.donnees.zones.length > 0 ? ' (hors zone)' : '';
  afficherNotification(`${libelle} à ${formaterHeureCourte(new Date())}${alerte}`, pointage.dansZone||!Stockage.donnees.zones.length?'succes':'alerte');

  mettreAJourStatutOuvrier();
  afficherHistoriqueOuvrier();
}

function afficherHistoriqueOuvrier() {
  const aujourdhui = dateAujourdhui();
  const pointages = Stockage.donnees.pointages
    .filter(p=>p.idOuvrier===utilisateurActuel.id && p.horodatage.startsWith(aujourdhui))
    .sort((a,b)=>new Date(a.horodatage)-new Date(b.horodatage));

  const el = $('liste-historique-ouvrier');
  if (!pointages.length) {
    el.innerHTML = '<div class="aucun-historique">Aucun pointage aujourd\'hui</div>';
    return;
  }
  el.innerHTML = pointages.map(p => {
    const zone = p.idZone ? Stockage.donnees.zones.find(z=>z.id===p.idZone) : null;
    const estEntree = p.type==='entree';
    return `<div class="element-historique">
      <div class="icone-type-historique" style="background:${estEntree?'var(--vert-clair)':'var(--rouge-clair)'};">
        ${estEntree?'⬆️':'⬇️'}
      </div>
      <div class="info-historique">
        <div class="type-historique" style="color:${estEntree?'var(--vert)':'var(--rouge)'};">${estEntree?'Entrée':'Sortie'}</div>
        <div class="meta-historique">${zone?zone.nom:'Hors zone'}${!p.dansZone&&Stockage.donnees.zones.length?' · ⚠️ Hors périmètre':''}</div>
      </div>
      <div class="heure-historique">${formaterHeureCourte(new Date(p.horodatage))}</div>
    </div>`;
  }).join('');
}

/* ─── CANEVAS RADAR ─── */
function dessinerRadar(positionOuvrier, resultatZone) {
  const canevas = $('radar-ouvrier');
  const ctx = canevas.getContext('2d');
  const L = canevas.width, H = canevas.height;
  const cx = L/2, cy = H/2;
  const sombre = modeSombreActif();
  const { zone, distance, dansZone } = resultatZone;

  ctx.clearRect(0,0,L,H);

  // Fond (découpé en cercle)
  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,cx,0,Math.PI*2); ctx.clip();
  ctx.fillStyle = sombre ? '#1C2333' : '#F8FAFC';
  ctx.fillRect(0,0,L,H);

  // Anneaux de la grille
  for (let i=1; i<=3; i++) {
    ctx.beginPath(); ctx.arc(cx,cy,(cx-12)*i/3,0,Math.PI*2);
    ctx.strokeStyle = sombre?'#30363D':'#E2E8F0';
    ctx.lineWidth = 1; ctx.stroke();
  }
  // Réticule
  ctx.beginPath(); ctx.moveTo(cx,12); ctx.lineTo(cx,H-12);
  ctx.moveTo(12,cy); ctx.lineTo(L-12,cy);
  ctx.strokeStyle = sombre?'#30363D':'#E2E8F0'; ctx.lineWidth=1; ctx.stroke();

  // Échelle : le rayon de la zone correspond à la moitié du rayon du canevas
  const dispMax = cx - 16;
  const echelle = dispMax / (zone.rayon * 2.5);

  // Cercle de la zone
  const rayonAffiche = zone.rayon * echelle;
  ctx.beginPath(); ctx.arc(cx,cy,rayonAffiche,0,Math.PI*2);
  ctx.fillStyle = dansZone ? 'rgba(21,128,61,.12)' : 'rgba(29,78,216,.08)';
  ctx.fill();
  ctx.strokeStyle = dansZone ? '#15803D' : '#1D4ED8';
  ctx.lineWidth = 2; ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);

  // Position de l'ouvrier
  const cap = capGeo(zone.lat, zone.lng, positionOuvrier.lat, positionOuvrier.lng);
  const distAffichee = Math.min(distance * echelle, dispMax - 8);
  const rad = cap * Math.PI / 180;
  const ox = cx + distAffichee * Math.sin(rad);
  const oy = cy - distAffichee * Math.cos(rad);

  // Ligne du centre vers l'ouvrier
  ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(ox,oy);
  ctx.strokeStyle = sombre?'#484F58':'#CBD5E1'; ctx.lineWidth=1; ctx.stroke();

  // Point central de la zone
  ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2);
  ctx.fillStyle = '#1D4ED8'; ctx.fill();

  // Point de l'ouvrier
  ctx.beginPath(); ctx.arc(ox,oy,9,0,Math.PI*2);
  ctx.fillStyle = dansZone ? '#15803D' : '#B91C1C'; ctx.fill();
  ctx.strokeStyle = sombre?'#1C2333':'#fff'; ctx.lineWidth=2.5; ctx.stroke();

  // Étiquette « Vous »
  ctx.fillStyle = sombre?'#E6EDF3':'#0F172A';
  ctx.font = 'bold 10px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('Vous', ox, oy - 15);

  ctx.restore();

  // Anneau extérieur
  ctx.beginPath(); ctx.arc(cx,cy,cx-1,0,Math.PI*2);
  ctx.strokeStyle = sombre?'#30363D':'#E2E8F0'; ctx.lineWidth=2; ctx.stroke();
}

function dessinerRadarSansGPS() {
  const canevas = $('radar-ouvrier');
  const ctx = canevas.getContext('2d');
  const L = canevas.width, H = canevas.height;
  const cx = L/2, cy = H/2;
  const sombre = modeSombreActif();
  ctx.clearRect(0,0,L,H);
  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,cx,0,Math.PI*2); ctx.clip();
  ctx.fillStyle = sombre?'#1C2333':'#F8FAFC'; ctx.fillRect(0,0,L,H);
  for (let i=1;i<=3;i++){
    ctx.beginPath();ctx.arc(cx,cy,(cx-12)*i/3,0,Math.PI*2);
    ctx.strokeStyle=sombre?'#30363D':'#E2E8F0';ctx.lineWidth=1;ctx.stroke();
  }
  ctx.fillStyle = sombre?'#484F58':'#94A3B8';
  ctx.font = '12px system-ui'; ctx.textAlign='center';
  ctx.fillText('GPS non disponible', cx, cy);
  ctx.restore();
  ctx.beginPath();ctx.arc(cx,cy,cx-1,0,Math.PI*2);
  ctx.strokeStyle=sombre?'#30363D':'#E2E8F0';ctx.lineWidth=2;ctx.stroke();
}

/* ═══════════════════════════════════════════════════════════
   VUE GESTIONNAIRE
═══════════════════════════════════════════════════════════ */
function afficherVueGestionnaire() {
  afficherVue('gestionnaire');
  actualiserGestionnaire();
  afficherOuvriersGestion();
  afficherZones();
  initialiserDatesRapport();
  remplirOuvriersRapport();
}

function changerOnglet(nom, btn) {
  document.querySelectorAll('.bouton-onglet').forEach(b=>b.classList.remove('actif'));
  document.querySelectorAll('.panneau-onglet').forEach(p=>p.classList.remove('actif'));
  btn.classList.add('actif');
  $(`onglet-${nom}`).classList.add('actif');
}

function actualiserGestionnaire() {
  const aujourdhui = dateAujourdhui();
  const ouvriers = Stockage.donnees.ouvriers;

  let presents=0, absents=0, horsZone=0;
  const cartes = ouvriers.map(o => {
    const pointagesJour = Stockage.donnees.pointages
      .filter(p=>p.idOuvrier===o.id && p.horodatage.startsWith(aujourdhui))
      .sort((a,b)=>new Date(a.horodatage)-new Date(b.horodatage));
    const dernier = pointagesJour[pointagesJour.length-1];
    const estPresent = dernier && dernier.type==='entree';
    const estHorsZone = estPresent && !dernier.dansZone && Stockage.donnees.zones.length>0;

    if (estPresent) { presents++; if (estHorsZone) horsZone++; }
    else absents++;

    const premiereEntree = pointagesJour.find(p=>p.type==='entree');
    const tempsTotal = calculerTempsTotal(pointagesJour);
    const zone = dernier?.idZone ? Stockage.donnees.zones.find(z=>z.id===dernier.idZone) : null;
    const couleur = couleurAvatar(o.nom);

    return `<div class="carte carte-ouvrier">
      <div class="haut-carte-ouvrier">
        <div class="identite-carte-ouvrier">
          <div class="avatar-carte-ouvrier" style="background:${couleur};">${initiales(o.nom)}</div>
          <div>
            <div class="nom-carte-ouvrier">${o.nom}</div>
            <div class="role-carte-ouvrier">${o.metier}</div>
          </div>
        </div>
        ${estPresent
          ? estHorsZone
            ? '<span class="badge badge-ambre"><span class="point point-ambre point-pulsation"></span>Hors zone</span>'
            : '<span class="badge badge-vert"><span class="point point-vert point-pulsation"></span>Présent</span>'
          : '<span class="badge badge-gris">Absent</span>'
        }
      </div>
      <div class="stats-carte-ouvrier">
        <div class="ligne-stat-ouvrier">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          <span class="libelle-stat-ouvrier">Entrée :</span>
          <span class="valeur-stat-ouvrier">${premiereEntree?formaterHeureCourte(new Date(premiereEntree.horodatage)):'—'}</span>
        </div>
        <div class="ligne-stat-ouvrier">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 18 0A9 9 0 0 0 3 12"/><path d="M12 7v5l3 3"/></svg>
          <span class="libelle-stat-ouvrier">Temps travaillé :</span>
          <span class="valeur-stat-ouvrier">${tempsTotal>0?formaterDuree(tempsTotal):'—'}</span>
        </div>
        <div class="ligne-stat-ouvrier">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          <span class="libelle-stat-ouvrier">Zone :</span>
          <span class="valeur-stat-ouvrier">${zone?zone.nom:estPresent?'Hors zone':'—'}</span>
        </div>
      </div>
    </div>`;
  });

  $('stat-presents').textContent = presents;
  $('stat-absents').textContent = absents;
  $('stat-hors-zone').textContent = horsZone;
  $('grille-ouvriers-gestionnaire').innerHTML = cartes.join('');
}

function calculerTempsTotal(pointages) {
  let total = 0;
  for (let i=0; i<pointages.length-1; i++) {
    if (pointages[i].type==='entree' && pointages[i+1].type==='sortie') {
      total += new Date(pointages[i+1].horodatage) - new Date(pointages[i].horodatage);
    }
  }
  // Si le dernier pointage est une entrée, compter le temps jusqu'à maintenant
  const dernier = pointages[pointages.length-1];
  if (dernier && dernier.type==='entree') total += Date.now() - new Date(dernier.horodatage);
  return total;
}

/* ─── GESTION DES OUVRIERS ─── */
function afficherOuvriersGestion() {
  const el = $('liste-ouvriers-gestion');
  if (!Stockage.donnees.ouvriers.length) {
    el.innerHTML = '<div class="etat-vide"><div class="icone-etat-vide">👷</div><div class="texte-etat-vide">Aucun ouvrier enregistré. Ajoutez le premier.</div></div>';
    return;
  }
  el.innerHTML = Stockage.donnees.ouvriers.map(o => `<div class="carte carte-zone">
      <div class="haut-carte-zone">
        <div>
          <div class="nom-zone">👷 ${o.nom}</div>
          <div class="meta-zone">${o.metier}</div>
        </div>
        <button class="bouton bouton-fantome bouton-petit" style="color:var(--rouge);flex-shrink:0;" onclick="supprimerOuvrier('${o.id}')">Supprimer</button>
      </div>
    </div>`).join('');
}

function ajouterOuvrier() {
  const nom = $('nom-ouvrier').value.trim();
  const metier = $('metier-ouvrier').value.trim();
  if (!nom || !metier) {
    afficherNotification('Veuillez renseigner le nom et le métier', 'erreur');
    return;
  }
  Stockage.donnees.ouvriers.push({ id: genererId(), nom, metier });
  Stockage.enregistrer();
  $('nom-ouvrier').value=''; $('metier-ouvrier').value='';
  afficherOuvriersGestion();
  remplirOuvriersRapport();
  afficherNotification(`Ouvrier « ${nom} » ajouté`, 'succes');
}

function supprimerOuvrier(id) {
  const o = Stockage.donnees.ouvriers.find(x=>x.id===id);
  ouvrirDialogue('Supprimer l\'ouvrier', `Supprimer « ${o?.nom} » ? Son historique de pointages sera conservé.`, () => {
    Stockage.donnees.ouvriers = Stockage.donnees.ouvriers.filter(x=>x.id!==id);
    Stockage.enregistrer();
    afficherOuvriersGestion();
    remplirOuvriersRapport();
    actualiserGestionnaire();
    afficherNotification('Ouvrier supprimé', 'info');
  });
}

/* ─── ZONES ─── */
function afficherZones() {
  const el = $('liste-zones');
  if (!Stockage.donnees.zones.length) {
    el.innerHTML = '<div class="etat-vide"><div class="icone-etat-vide">📍</div><div class="texte-etat-vide">Aucune zone définie. Ajoutez votre premier chantier.</div></div>';
    return;
  }
  el.innerHTML = Stockage.donnees.zones.map(z => {
    const aujourdhui = dateAujourdhui();
    const ouvriersPresents = Stockage.donnees.ouvriers.filter(o => {
      const pointages = Stockage.donnees.pointages
        .filter(p=>p.idOuvrier===o.id && p.horodatage.startsWith(aujourdhui))
        .sort((a,b)=>new Date(a.horodatage)-new Date(b.horodatage));
      const dernier = pointages[pointages.length-1];
      return dernier && dernier.type==='entree' && dernier.idZone===z.id;
    });
    const puces = ouvriersPresents.length
      ? ouvriersPresents.map(o=>`<span class="puce-ouvrier-zone" style="border-color:${couleurAvatar(o.nom)}33;">${o.nom}</span>`).join('')
      : '<span style="font-size:12px;color:var(--texte-3);">Personne en ce moment</span>';
    return `<div class="carte carte-zone">
      <div class="haut-carte-zone">
        <div>
          <div class="nom-zone">📍 ${z.nom}</div>
          <div class="meta-zone">Rayon ${z.rayon}m · ${z.lat.toFixed(4)}°N, ${z.lng.toFixed(4)}°E</div>
        </div>
        <button class="bouton bouton-fantome bouton-petit" style="color:var(--rouge);flex-shrink:0;" onclick="supprimerZone('${z.id}')">Supprimer</button>
      </div>
      <div class="ouvriers-zone">${puces}</div>
    </div>`;
  }).join('');
}

function ajouterZone() {
  const nom = $('nom-zone').value.trim();
  const lat = parseFloat($('lat-zone').value);
  const lng = parseFloat($('lng-zone').value);
  const rayon = parseInt($('rayon-zone').value);
  if (!nom||isNaN(lat)||isNaN(lng)||isNaN(rayon)||rayon<10) {
    afficherNotification('Veuillez remplir tous les champs correctement', 'erreur');
    return;
  }
  if (lat<-90||lat>90||lng<-180||lng>180) {
    afficherNotification('Coordonnées GPS invalides', 'erreur');
    return;
  }
  Stockage.donnees.zones.push({ id:genererId(), nom, lat, lng, rayon });
  Stockage.enregistrer();
  $('nom-zone').value=''; $('lat-zone').value=''; $('lng-zone').value=''; $('rayon-zone').value='';
  afficherZones();
  afficherNotification(`Zone « ${nom} » ajoutée`, 'succes');
}

function supprimerZone(id) {
  const z = Stockage.donnees.zones.find(x=>x.id===id);
  ouvrirDialogue('Supprimer la zone', `Supprimer « ${z?.nom} » ? Les pointages existants ne seront pas affectés.`, () => {
    Stockage.donnees.zones = Stockage.donnees.zones.filter(x=>x.id!==id);
    Stockage.enregistrer();
    afficherZones();
    afficherNotification('Zone supprimée', 'info');
  });
}

function utiliserPositionActuelle() {
  if (!navigator.geolocation) { afficherNotification('GPS non disponible', 'erreur'); return; }
  afficherNotification('Récupération de la position…', 'info');
  navigator.geolocation.getCurrentPosition(pos => {
    $('lat-zone').value = pos.coords.latitude.toFixed(6);
    $('lng-zone').value = pos.coords.longitude.toFixed(6);
    afficherNotification('Position récupérée', 'succes');
  }, () => {
    // Repli : centre de Bruxelles
    $('lat-zone').value = '50.8503';
    $('lng-zone').value = '4.3517';
    afficherNotification('GPS indisponible — position par défaut (Bruxelles)', 'alerte');
  });
}

async function rechercherAdresse() {
  const adresse = $('adresse-zone').value.trim();
  if (!adresse) {
    afficherNotification('Veuillez saisir une adresse', 'erreur');
    return;
  }
  const statut = $('adresse-zone-statut');
  const bouton = $('bouton-recherche-adresse');
  statut.textContent = 'Recherche en cours…';
  bouton.disabled = true;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(adresse)}`;
    const reponse = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
    const resultats = await reponse.json();
    if (!resultats.length) {
      statut.textContent = 'Adresse introuvable — précisez la ville ou le code postal';
      afficherNotification('Adresse introuvable', 'erreur');
      return;
    }
    const r = resultats[0];
    $('lat-zone').value = parseFloat(r.lat).toFixed(6);
    $('lng-zone').value = parseFloat(r.lon).toFixed(6);
    statut.textContent = `✓ ${r.display_name}`;
    if (!$('nom-zone').value.trim()) $('nom-zone').value = adresse;
    afficherNotification('Adresse localisée', 'succes');
  } catch (e) {
    statut.textContent = 'Erreur réseau lors de la recherche';
    afficherNotification('Erreur réseau lors de la recherche d\'adresse', 'erreur');
  } finally {
    bouton.disabled = false;
  }
}

/* ─── RAPPORTS ─── */
let donneesRapport = [];

function initialiserDatesRapport() {
  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  $('rapport-du').value = debutMois.toISOString().slice(0,10);
  $('rapport-au').value = dateAujourdhui();
}

function remplirOuvriersRapport() {
  const sel = $('rapport-ouvrier');
  sel.innerHTML = '<option value="">Tous les ouvriers</option>';
  Stockage.donnees.ouvriers.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.id; opt.textContent = o.nom;
    sel.appendChild(opt);
  });
}

function genererRapport() {
  const du = $('rapport-du').value;
  const au = $('rapport-au').value;
  const idOuvrier = $('rapport-ouvrier').value;

  if (!du||!au||du>au) { afficherNotification('Sélectionnez une période valide', 'erreur'); return; }

  // Construire le résumé par ouvrier et par jour
  const jours = [];
  const d = new Date(du);
  while (d.toISOString().slice(0,10) <= au) { jours.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+1); }

  const ouvriers = idOuvrier ? Stockage.donnees.ouvriers.filter(o=>o.id===idOuvrier) : Stockage.donnees.ouvriers;
  donneesRapport = [];

  for (const o of ouvriers) {
    for (const jour of jours) {
      const pointages = Stockage.donnees.pointages
        .filter(p=>p.idOuvrier===o.id && p.horodatage.startsWith(jour))
        .sort((a,b)=>new Date(a.horodatage)-new Date(b.horodatage));
      if (!pointages.length) continue;
      const premiereEntree = pointages.find(p=>p.type==='entree');
      const derniereSortie = [...pointages].reverse().find(p=>p.type==='sortie');
      const tempsTotal = calculerTempsTotal(pointages);
      const zone = premiereEntree?.idZone ? Stockage.donnees.zones.find(z=>z.id===premiereEntree.idZone) : null;
      const horsZone = pointages.some(p=>!p.dansZone && Stockage.donnees.zones.length>0);
      donneesRapport.push({ ouvrier: o, jour, premiereEntree, derniereSortie, tempsTotal, zone, horsZone });
    }
  }

  const corps = $('corps-rapport');
  if (!donneesRapport.length) {
    corps.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--texte-3);">Aucun pointage pour cette période</td></tr>';
    $('bouton-export').style.display='none';
    return;
  }

  corps.innerHTML = donneesRapport.map(r => `
    <tr>
      <td><div style="display:flex;align-items:center;gap:8px;">
        <div style="width:24px;height:24px;border-radius:50%;background:${couleurAvatar(r.ouvrier.nom)};display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;font-family:var(--police-titre);flex-shrink:0;">${initiales(r.ouvrier.nom)}</div>
        <span style="font-weight:500;">${r.ouvrier.nom}</span>
      </div></td>
      <td>${formaterDateCourte(new Date(r.jour))}</td>
      <td>${r.premiereEntree?formaterHeureCourte(new Date(r.premiereEntree.horodatage)):'—'}</td>
      <td>${r.derniereSortie?formaterHeureCourte(new Date(r.derniereSortie.horodatage)):'<span style="color:var(--vert);font-size:11px;">En cours</span>'}</td>
      <td><span style="font-weight:600;">${r.tempsTotal>0?formaterDuree(r.tempsTotal):'—'}</span></td>
      <td>${r.zone?r.zone.nom:'<span style="color:var(--texte-3);">—</span>'}</td>
      <td>${r.horsZone
        ? '<span class="badge badge-ambre">⚠️ Hors zone</span>'
        : '<span class="badge badge-vert">✓ OK</span>'}</td>
    </tr>
  `).join('');
  $('bouton-export').style.display='';
  afficherNotification(`${donneesRapport.length} ligne(s) générée(s)`, 'succes');
}

function exporterCSV() {
  if (!donneesRapport.length) return;
  const entetes = ['Ouvrier','Métier','Date','Entrée','Sortie','Durée (min)','Zone','Statut'];
  const lignes = donneesRapport.map(r=>[
    r.ouvrier.nom, r.ouvrier.metier,
    formaterDateCourte(new Date(r.jour)),
    r.premiereEntree?formaterHeureCourte(new Date(r.premiereEntree.horodatage)):'',
    r.derniereSortie?formaterHeureCourte(new Date(r.derniereSortie.horodatage)):'En cours',
    r.tempsTotal>0?Math.round(r.tempsTotal/60000):'',
    r.zone?r.zone.nom:'',
    r.horsZone?'Hors zone':'OK'
  ]);
  const csv = [entetes,...lignes].map(l=>l.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const bom = '﻿';
  const blob = new Blob([bom+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=`pointages_${$('rapport-du').value}_${$('rapport-au').value}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  afficherNotification('Export CSV téléchargé', 'succes');
}

/* ═══════════════════════════════════════════════════════════
   INITIALISATION
═══════════════════════════════════════════════════════════ */
Stockage.charger();
if (!Stockage.donnees.ouvriers.length) Stockage.initialiser();

const session = chargerSession();
if (session) {
  utilisateurActuel = session;
  if (utilisateurActuel.role==='gestionnaire') afficherVueGestionnaire();
  else afficherVueOuvrier();
} else {
  afficherVue('connexion');
}

// Redessiner le radar au changement de thème
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ()=>{
  if (utilisateurActuel?.role==='ouvrier' && GPS.position) {
    const resultat = GPS.zoneLaPlusProche(GPS.position.lat, GPS.position.lng);
    if (resultat) dessinerRadar(GPS.position, resultat); else dessinerRadarSansGPS();
  }
});
