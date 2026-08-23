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
   BASE DE DONNÉES PARTAGÉE (FIREBASE)
═══════════════════════════════════════════════════════════ */
const firebaseConfig = {
  apiKey: "AIzaSyBR3LsM69V3CdeTxq1VGs6WSj_bIySIVBU",
  authDomain: "pointagepro-7616c.firebaseapp.com",
  projectId: "pointagepro-7616c",
  storageBucket: "pointagepro-7616c.firebasestorage.app",
  messagingSenderId: "114668935302",
  appId: "1:114668935302:web:f979cd071c3de5faec5907"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const Stockage = {
  donnees: { ouvriers: [], zones: [], pointages: [] },

  async initialiserFirestore() {
    const maintenant = new Date();
    const t = (h,m) => { const d=new Date(maintenant); d.setHours(h,m,0,0); return d.toISOString(); };

    const ouvriers = [
      { id:'o1', nom:'Jean Dupont',    metier:'Maçon' },
      { id:'o2', nom:'Marc Laurent',   metier:'Électricien' },
      { id:'o3', nom:'Sophie Renard',  metier:'Chef de chantier' },
      { id:'o4', nom:'Pierre Lecomte', metier:'Peintre' },
      { id:'o5', nom:'Nadia Bouchard', metier:'Plombier' },
    ];
    const zones = [
      { id:'z1', nom:'Chantier Bruxelles Centre', lat:50.8503, lng:4.3517, rayon:150 },
      { id:'z2', nom:'Dépôt Anderlecht',          lat:50.8366, lng:4.3142, rayon:200 },
    ];
    // Pointages du jour
    const pointages = [
      { id:genererId(), idOuvrier:'o1', type:'entree', lat:50.8505, lng:4.3520, horodatage:t(7,35), idZone:'z1', dansZone:true },
      { id:genererId(), idOuvrier:'o2', type:'entree', lat:50.8501, lng:4.3515, horodatage:t(7,50), idZone:'z1', dansZone:true },
      { id:genererId(), idOuvrier:'o2', type:'sortie', lat:50.8503, lng:4.3518, horodatage:t(12,5),  idZone:'z1', dansZone:true },
      { id:genererId(), idOuvrier:'o2', type:'entree', lat:50.8502, lng:4.3516, horodatage:t(12,45), idZone:'z1', dansZone:true },
      { id:genererId(), idOuvrier:'o3', type:'entree', lat:50.8365, lng:4.3140, horodatage:t(8,10), idZone:'z2', dansZone:true },
      { id:genererId(), idOuvrier:'o4', type:'entree', lat:50.8490, lng:4.3600, horodatage:t(9,0),  idZone:null,  dansZone:false },
      { id:genererId(), idOuvrier:'o4', type:'sortie', lat:50.8490, lng:4.3600, horodatage:t(11,30),idZone:null,  dansZone:false },
    ];

    const batch = db.batch();
    ouvriers.forEach(({id, ...data}) => batch.set(db.collection('ouvriers').doc(id), data));
    zones.forEach(({id, ...data}) => batch.set(db.collection('zones').doc(id), data));
    pointages.forEach(({id, ...data}) => batch.set(db.collection('pointages').doc(id), data));
    batch.set(db.collection('meta').doc('etat'), { initialise: true });
    await batch.commit();
  }
};

let verificationInitialisationFaite = false;

async function verifierEtInitialiserDonnees() {
  // Indicateur permanent et partagé : une fois posé, la démo ne revient plus
  // jamais, même si tous les ouvriers/zones sont ensuite supprimés.
  const refEtat = db.collection('meta').doc('etat');
  const docEtat = await refEtat.get();
  if (docEtat.exists) return;
  await Stockage.initialiserFirestore();
}

function demarrerSynchronisation() {
  db.collection('ouvriers').onSnapshot(snap => {
    Stockage.donnees.ouvriers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!verificationInitialisationFaite) { verificationInitialisationFaite = true; verifierEtInitialiserDonnees(); }
    rafraichirSelonContexte();
  }, err => { console.error('Erreur de synchronisation (ouvriers) :', err); afficherNotification('Synchronisation impossible (ouvriers)', 'erreur'); });

  db.collection('zones').onSnapshot(snap => {
    Stockage.donnees.zones = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    rafraichirSelonContexte();
  }, err => { console.error('Erreur de synchronisation (zones) :', err); afficherNotification('Synchronisation impossible (zones)', 'erreur'); });

  db.collection('pointages').onSnapshot(snap => {
    Stockage.donnees.pointages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    rafraichirSelonContexte();
  }, err => { console.error('Erreur de synchronisation (pointages) :', err); afficherNotification('Synchronisation impossible (pointages)', 'erreur'); });
}

function rafraichirSelonContexte() {
  if (!utilisateurActuel) {
    if (roleSelectionne === 'ouvrier') peuplerListeOuvriersConnexion();
    return;
  }
  if (utilisateurActuel.role === 'gestionnaire') {
    actualiserGestionnaire();
    afficherOuvriersGestion();
    afficherZones();
    remplirOuvriersRapport();
  } else if (utilisateurActuel.role === 'ouvrier') {
    mettreAJourStatutOuvrier();
    afficherHistoriqueOuvrier();
    if (GPS.position) mettreAJourAffichageGPS(GPS.position);
  }
}

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
const CLE_MDP_GESTIONNAIRE = 'pointagepro_mdp_gestionnaire';

async function hacherTexte(texte) {
  const donnees = new TextEncoder().encode(texte);
  const empreinte = await crypto.subtle.digest('SHA-256', donnees);
  return Array.from(new Uint8Array(empreinte)).map(o => o.toString(16).padStart(2, '0')).join('');
}

function selectionnerRole(role) {
  roleSelectionne = role;
  $('role-gestionnaire').classList.toggle('selectionne', role==='gestionnaire');
  $('role-ouvrier').classList.toggle('selectionne', role==='ouvrier');
  $('section-selection-ouvrier').style.display = 'none';
  $('section-mdp-gestionnaire').style.display = 'none';
  $('mdp-gestionnaire').value = '';

  if (role === 'ouvrier') {
    $('section-selection-ouvrier').style.display = 'block';
    peuplerListeOuvriersConnexion();
    $('selection-ouvrier').onchange = () => mettreAJourBoutonConnexion();
  } else if (role === 'gestionnaire') {
    $('section-mdp-gestionnaire').style.display = 'block';
    const mdpExiste = !!localStorage.getItem(CLE_MDP_GESTIONNAIRE);
    $('libelle-mdp-gestionnaire').textContent = mdpExiste ? 'Mot de passe' : 'Créer un mot de passe gestionnaire';
    $('lien-mdp-oublie').style.display = mdpExiste ? 'block' : 'none';
  }
  mettreAJourBoutonConnexion();
}

function peuplerListeOuvriersConnexion() {
  const sel = $('selection-ouvrier');
  const valeurActuelle = sel.value;
  sel.innerHTML = '<option value="">-- Choisir votre nom --</option>';
  Stockage.donnees.ouvriers.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.id; opt.textContent = `${o.nom} — ${o.metier}`;
    sel.appendChild(opt);
  });
  if ([...sel.options].some(o => o.value === valeurActuelle)) sel.value = valeurActuelle;
  mettreAJourBoutonConnexion();
}

function mettreAJourBoutonConnexion() {
  const btn = $('bouton-connexion');
  if (!roleSelectionne) { btn.disabled = true; return; }
  if (roleSelectionne === 'ouvrier' && !$('selection-ouvrier').value) { btn.disabled = true; return; }
  if (roleSelectionne === 'gestionnaire' && !$('mdp-gestionnaire').value) { btn.disabled = true; return; }
  btn.disabled = false;
}

async function seConnecter() {
  if (!roleSelectionne) return;
  if (roleSelectionne === 'gestionnaire') {
    const mdp = $('mdp-gestionnaire').value;
    if (!mdp) return;
    const empreinte = await hacherTexte(mdp);
    const empreinteEnregistree = localStorage.getItem(CLE_MDP_GESTIONNAIRE);
    if (!empreinteEnregistree) {
      localStorage.setItem(CLE_MDP_GESTIONNAIRE, empreinte);
      afficherNotification('Mot de passe gestionnaire défini', 'succes');
    } else if (empreinte !== empreinteEnregistree) {
      afficherNotification('Mot de passe incorrect', 'erreur');
      return;
    }
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

function reinitialiserMotDePasseGestionnaire() {
  ouvrirDialogue('Réinitialiser le mot de passe', 'Le mot de passe gestionnaire actuel sera oublié et un nouveau pourra être défini à la prochaine connexion. Continuer ?', () => {
    localStorage.removeItem(CLE_MDP_GESTIONNAIRE);
    $('mdp-gestionnaire').value = '';
    $('libelle-mdp-gestionnaire').textContent = 'Créer un mot de passe gestionnaire';
    $('lien-mdp-oublie').style.display = 'none';
    afficherNotification('Mot de passe réinitialisé', 'info');
  });
}

function seDeconnecter() {
  GPS.arreter(); effacerSession(); utilisateurActuel = null;
  clearInterval(intervalleHorloge);
  afficherVue('connexion');
  roleSelectionne = null;
  $('role-gestionnaire').classList.remove('selectionne');
  $('role-ouvrier').classList.remove('selectionne');
  $('section-selection-ouvrier').style.display = 'none';
  $('section-mdp-gestionnaire').style.display = 'none';
  $('mdp-gestionnaire').value = '';
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

function dernierPointageDuJour(idOuvrier) {
  const aujourdhui = dateAujourdhui();
  const pointages = Stockage.donnees.pointages
    .filter(p=>p.idOuvrier===idOuvrier && p.horodatage.startsWith(aujourdhui))
    .sort((a,b)=>new Date(a.horodatage)-new Date(b.horodatage));
  return pointages[pointages.length-1] || null;
}

function verifierCoherencePointage(dansZone) {
  const el = $('alerte-pointage-manquant');
  if (dansZone === null) { el.style.display = 'none'; return; }
  const dernier = dernierPointageDuJour(utilisateurActuel.id);
  const estPresent = !!dernier && dernier.type === 'entree';
  if (dansZone && !estPresent) {
    $('texte-alerte-pointage').textContent = "Vous êtes dans la zone du chantier mais vous n'avez pas pointé votre entrée.";
    el.style.display = 'block';
  } else if (!dansZone && estPresent) {
    $('texte-alerte-pointage').textContent = 'Vous avez quitté la zone du chantier sans pointer votre sortie.';
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

function mettreAJourAffichageGPS(pos) {
  if (!pos) {
    $('badge-gps-ouvrier').innerHTML = '<span class="badge badge-gris">Recherche…</span>';
    dessinerRadarSansGPS();
    verifierCoherencePointage(null);
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
    verifierCoherencePointage(dansZone);
  } else {
    $('point-zone-ouvrier').className = 'point point-gris';
    $('texte-zone-ouvrier').textContent = 'Aucune zone configurée';
    $('texte-zone-ouvrier').style.color = 'var(--texte-2)';
    dessinerRadarSansGPS();
    verifierCoherencePointage(null);
  }
}

async function pointer() {
  if (!GPS.position) {
    // Mode démo : permet de pointer sans GPS
    const pos = { lat: 50.8503 + (Math.random()-.5)*0.002, lng: 4.3517 + (Math.random()-.5)*0.002, precision: 15 };
    GPS.position = pos;
    mettreAJourAffichageGPS(pos);
  }
  const pos = GPS.position;
  const dernier = dernierPointageDuJour(utilisateurActuel.id);
  const type = (!dernier || dernier.type==='sortie') ? 'entree' : 'sortie';

  const resultat = GPS.zoneLaPlusProche(pos.lat, pos.lng);
  const pointage = {
    idOuvrier: utilisateurActuel.id,
    type, lat: pos.lat, lng: pos.lng,
    horodatage: new Date().toISOString(),
    idZone: resultat?.zone?.id || null,
    dansZone: resultat?.dansZone || false
  };

  try {
    await db.collection('pointages').doc(genererId()).set(pointage);
    const libelle = type==='entree' ? 'Entrée pointée' : 'Sortie pointée';
    const alerte = !pointage.dansZone && Stockage.donnees.zones.length > 0 ? ' (hors zone)' : '';
    afficherNotification(`${libelle} à ${formaterHeureCourte(new Date())}${alerte}`, pointage.dansZone||!Stockage.donnees.zones.length?'succes':'alerte');
  } catch (e) {
    afficherNotification('Erreur lors du pointage : ' + e.message, 'erreur');
  }
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
  reinitialiserFormulaireZone();
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

async function ajouterOuvrier() {
  const nom = $('nom-ouvrier').value.trim();
  const metier = $('metier-ouvrier').value.trim();
  if (!nom || !metier) {
    afficherNotification('Veuillez renseigner le nom et le métier', 'erreur');
    return;
  }
  try {
    await db.collection('ouvriers').doc(genererId()).set({ nom, metier });
    $('nom-ouvrier').value=''; $('metier-ouvrier').value='';
    afficherNotification(`Ouvrier « ${nom} » ajouté`, 'succes');
  } catch (e) {
    afficherNotification("Erreur lors de l'ajout : " + e.message, 'erreur');
  }
}

function supprimerOuvrier(id) {
  const o = Stockage.donnees.ouvriers.find(x=>x.id===id);
  ouvrirDialogue('Supprimer l\'ouvrier', `Supprimer « ${o?.nom} » ? Son historique de pointages sera conservé.`, async () => {
    try {
      await db.collection('ouvriers').doc(id).delete();
      afficherNotification('Ouvrier supprimé', 'info');
    } catch (e) {
      afficherNotification('Erreur lors de la suppression : ' + e.message, 'erreur');
    }
  });
}

/* ─── ZONES ─── */
let zoneEnEdition = null;

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
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="bouton bouton-fantome bouton-petit" onclick="modifierZone('${z.id}')">Modifier</button>
          <button class="bouton bouton-fantome bouton-petit" style="color:var(--rouge);" onclick="supprimerZone('${z.id}')">Supprimer</button>
        </div>
      </div>
      <div class="ouvriers-zone">${puces}</div>
    </div>`;
  }).join('');
}

function modifierZone(id) {
  const z = Stockage.donnees.zones.find(x=>x.id===id);
  if (!z) return;
  zoneEnEdition = id;
  $('nom-zone').value = z.nom;
  $('adresse-zone').value = '';
  $('adresse-zone-statut').textContent = 'Laissez vide pour garder les coordonnées actuelles, ou recherchez une nouvelle adresse';
  $('lat-zone').value = z.lat;
  $('lng-zone').value = z.lng;
  $('rayon-zone').value = z.rayon;
  $('titre-ajout-zone').textContent = '✏️ Modifier la zone';
  $('bouton-enregistrer-zone').textContent = 'Enregistrer les modifications';
  $('bouton-annuler-modif-zone').style.display = '';
  $('nom-zone').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function annulerModifierZone() {
  reinitialiserFormulaireZone();
}

function reinitialiserFormulaireZone() {
  zoneEnEdition = null;
  $('nom-zone').value=''; $('lat-zone').value=''; $('lng-zone').value=''; $('rayon-zone').value='';
  $('adresse-zone').value = '';
  $('adresse-zone-statut').textContent = 'Recherche via OpenStreetMap · remplit automatiquement lat/long ci-dessous';
  $('titre-ajout-zone').textContent = '➕ Ajouter une zone';
  $('bouton-enregistrer-zone').textContent = 'Ajouter la zone';
  $('bouton-annuler-modif-zone').style.display = 'none';
}

async function enregistrerZone() {
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
  try {
    if (zoneEnEdition) {
      await db.collection('zones').doc(zoneEnEdition).update({ nom, lat, lng, rayon });
      reinitialiserFormulaireZone();
      afficherNotification(`Zone « ${nom} » modifiée`, 'succes');
    } else {
      await db.collection('zones').doc(genererId()).set({ nom, lat, lng, rayon });
      reinitialiserFormulaireZone();
      afficherNotification(`Zone « ${nom} » ajoutée`, 'succes');
    }
  } catch (e) {
    afficherNotification('Erreur : ' + e.message, 'erreur');
  }
}

function supprimerZone(id) {
  const z = Stockage.donnees.zones.find(x=>x.id===id);
  ouvrirDialogue('Supprimer la zone', `Supprimer « ${z?.nom} » ? Les pointages existants ne seront pas affectés.`, async () => {
    try {
      await db.collection('zones').doc(id).delete();
      if (zoneEnEdition === id) reinitialiserFormulaireZone();
      afficherNotification('Zone supprimée', 'info');
    } catch (e) {
      afficherNotification('Erreur : ' + e.message, 'erreur');
    }
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
firebase.auth().onAuthStateChanged(u => { if (u) demarrerSynchronisation(); });
firebase.auth().signInAnonymously().catch(err => {
  console.error('Authentification anonyme impossible :', err);
  afficherNotification('Connexion au serveur impossible — vérifiez votre connexion internet', 'erreur');
});

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
