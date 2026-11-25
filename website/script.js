/* Mémo 54 — logique du jeu */
'use strict';
/* =====================================================================
   CONFIGURATION — colle ici les infos de ton projet Supabase (gratuit).
   Laisse vide pour jouer en mode local (classement limité à ce navigateur).
   ===================================================================== */
const CONFIG = {
  SUPABASE_URL: 'https://uzaxdahkuqlycjhmkwtr.supabase.co',   // ex : 'https://abcdefghijkl.supabase.co'
  SUPABASE_KEY: 'sb_publishable_2cw7rwtKcpgbPCpZEHYElw_EZuindA8',   // clé publique : "anon" (eyJ...) ou "publishable" (sb_publishable_...)
};

/* ============================ OUTILS ============================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const fmtTime = ms => { ms = Math.max(0, Math.floor(ms)); return pad(Math.floor(ms / 60000)) + ':' + pad(Math.floor(ms / 1000) % 60) + '.' + pad(Math.floor(ms / 10) % 100); };
const fmtClock = ms => { const s = Math.ceil(Math.max(0, ms) / 1000); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };
function rnd32() { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0]; }
const randSeed = () => (rnd32() % 2147483646) + 1;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16); crypto.getRandomValues(b); b[6] = b[6] & 15 | 64; b[8] = b[8] & 63 | 128;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
function genCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const b = new Uint8Array(12); crypto.getRandomValues(b);
  const s = [...b].map(x => A[x % 32]).join(''); return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8);
}
function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return 0;
  const n = parseInt(m[1], 16); const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
}

/* =====================================================================
   TRADUCTIONS — 4 langues d'interface (fr, en, es, de)
   ===================================================================== */
const LANGS = ['fr', 'en', 'es', 'de'];
const I18N = {
fr: {
  'lang.name': 'Français',
  'top.board': 'Classement', 'board.top10': 'Top 10', 'aria.menu': 'Menu', 'aria.settings': 'Paramètres', 'aria.profile': 'Profil', 'aria.close': 'Fermer',
  'zone.deck': 'Paquet', 'zone.pile': 'Retournées', 'ghost.empty': 'Paquet vide', 'ghost.pile': 'Les cartes retournées arrivent ici',
  'hud.record': 'Record', 'hud.packs': 'Paquets', 'hud.lives': 'Vies', 'hud.time': 'Temps', 'hud.left': 'Restant',
  'btn.red': 'Rouge', 'btn.black': 'Noir', 'or': 'ou',
  'ans.ph.hard': 'Hauteur : 7, dame, R, as…', 'ans.ph.expert': 'Carte : roi de cœur, 10♠, QH…', 'ans.go': 'Valider',
  'ans.unknown': 'Carte non reconnue', 'ans.needSuit': '{x} · ajoute l’enseigne ou touche un symbole', 'ans.needRank': '{x} · ajoute la hauteur', 'ans.needColor': 'Joker · rouge ou noir ?', 'ans.tapSuit': 'Écris d’abord la hauteur, puis touche l’enseigne',
  'diff.title': 'Choisis ta difficulté', 'diff.normal': 'Normal', 'diff.normal.d': 'Devine la couleur de chaque carte : rouge ou noir.',
  'diff.hard': 'Difficile', 'diff.hard.d': 'Écris la hauteur de chaque carte, en chiffres ou en lettres.',
  'diff.expert': 'Expert', 'diff.expert.d': 'Écris la carte exacte : hauteur et enseigne.', 'diff.change': 'Changer',
  'diff.hard.ex': '7|dame|R|as|joker', 'diff.expert.ex': 'roi de cœur|10♠|QH|joker rouge',
  'menu.tag': 'Retiens l’ordre du paquet. Une erreur, et tout recommence.', 'menu.hello': 'Connecté en tant que {x}',
  'mode.classic': 'Classique',
  'mode.classic.d.normal': 'Devine la couleur des 54 cartes. Une erreur et le paquet revient dans son ordre d’origine.',
  'mode.classic.d.hard': 'Devine la hauteur des 54 cartes. Une erreur et le paquet revient dans son ordre d’origine.',
  'mode.classic.d.expert': 'Devine chacune des 54 cartes exactement. Une erreur et le paquet revient dans son ordre d’origine.',
  'mode.infinite': 'Infini', 'mode.infinite.d': '3 vies. Te tromper sur une carte jamais vue est gratuit, mais rater une carte déjà vue coûte une vie. +1 vie par paquet fini.',
  'mode.chrono': 'Chrono', 'mode.chrono.d': 'Le chrono démarre à ta première réponse.',
  'mode.half': '½ paquet', 'mode.half.d': '13 rouges · 13 noires', 'mode.full': 'Paquet', 'mode.full.d': '54 cartes', 'mode.c15': '15 min', 'mode.c15.d': 'max de cartes',
  'hud.mode.full': 'Chrono paquet', 'board.tab.full': 'Paquet chrono', 'board.tab.c15': '15 minutes',
  'rec.classic.none': 'Commence ton premier paquet', 'rec.classic': '{p} · record carte {b}', 'rec.resume': ' · reprise carte {n}', 'rec.inf': 'Record : {x}', 'rec.none': 'Pas encore de record',
  'n.card': 'carte', 'n.cards': 'cartes', 'n.pack': 'paquet', 'n.packs': 'paquets',
  'foot.board': '🏆 Classement', 'foot.settings': '⚙ Paramètres', 'foot.profile': '👤 Profil',
  'rules.title': 'Comment jouer ?',
  'rules.html': '<p>Un paquet de <b>52 cartes + joker rouge + joker noir</b> est mélangé. Devine la prochaine carte :</p><ul><li><b>Normal</b> : sa couleur, rouge ou noir.</li><li><b>Difficile</b> : sa hauteur (as, 2 à 10, valet, dame, roi ou joker).</li><li><b>Expert</b> : sa hauteur et son enseigne (cœur, carreau, pique, trèfle), ou joker rouge / joker noir.</li></ul><p>✔ Bonne réponse : la carte se retourne et tu devines la suivante.<br>✘ Mauvaise réponse : toutes les cartes retournent dans le paquet <b>dans le même ordre</b>. À toi de te souvenir de la suite !</p><p>Réponses écrites : chiffres ou lettres, majuscules ou minuscules, en français, anglais, espagnol, allemand, italien, portugais ou néerlandais. Ex. : <b>1</b> ou <b>as</b>, <b>v</b> ou <b>valet</b>, <b>roi de cœur</b>, <b>K♥</b>, <b>kh</b>, <b>rey de corazones</b>, <b>Herz König</b>. En Expert, tu peux aussi écrire la hauteur puis toucher le symbole ♥ ♦ ♠ ♣.</p><p>Clavier : <b>←</b> / <b>→</b> en Normal, <b>Entrée</b> pour valider en Difficile et Expert.</p>',
  'board.top100': 'Classement · Top 100', 'board.loading': 'Chargement…', 'board.empty': 'Aucun score pour l’instant.<br>Sois le premier !', 'board.local': 'Mode local : seuls les profils de ce navigateur apparaissent.', 'board.err': 'Classement indisponible pour le moment.', 'board.see100': 'Voir le Top 100 ›', 'board.rank': 'Ton rang', 'board.unranked': 'Pas encore classé ici', 'board.val.classic': '{p} · carte {c}',
  'toast.resume': 'Reprise : carte {n} sur 54', 'toast.chrono': 'Le chrono démarre à ta première réponse', 'toast.life': '+1 vie ❤', 'toast.newpack': 'Nouveau paquet mélangé !', 'toast.copied': 'Code copié ✔', 'toast.select': 'Sélectionne le code pour le copier',
  'cap.miss': 'Raté ! C’était : {x}', 'cap.seen': 'Carte déjà vue : −1 vie', 'cap.unseen': 'Carte jamais vue : pas de vie perdue',
  'ban.half': 'Demi-paquet terminé !', 'ban.full': 'Paquet terminé !',
  'res.lives.t': 'Plus de vies !', 'res.lives.s': 'Cartes mémorisées sur toute la partie', 'res.time.t': 'Temps écoulé !', 'res.time.s': 'Cartes mémorisées en 15 minutes', 'res.done.half': 'Demi-paquet bouclé !', 'res.done.full': 'Paquet bouclé !', 'res.done.s': 'Ton temps', 'res.quit.t': 'Partie terminée', 'res.quit.s': 'Score enregistré', 'res.record': 'Nouveau record !', 'res.calc': 'Calcul de ton rang…', 'res.rank.world': 'Rang mondial : #{p}', 'res.rank.local': 'Ton rang : #{p}', 'res.of': ' sur {t}', 'res.unavail': 'Classement indisponible pour le moment', 'res.localmode': 'Mode local : classement limité à ce navigateur', 'res.menu': 'Menu', 'res.again': 'Rejouer',
  'ask.cancel': 'Annuler', 'ask.quit.t': 'Quitter la partie ?', 'ask.quit.x': 'Ton score actuel ({x}) sera enregistré.', 'ask.quit.ok': 'Quitter', 'ask.abandon.t': 'Abandonner le chrono ?', 'ask.abandon.x': 'Ce temps ne sera pas enregistré.', 'ask.abandon.ok': 'Abandonner', 'ask.recover.t': 'Récupérer cette sauvegarde ?', 'ask.recover.x': 'La progression actuelle de ce navigateur sera remplacée.', 'ask.recover.ok': 'Récupérer', 'ask.wipe.t': 'Tout effacer ?', 'ask.wipe.x': 'Profil, progression et réglages de ce navigateur seront supprimés. Note ton code de sauvegarde avant !', 'ask.wipe.ok': 'Effacer',
  'prof.title': 'Ton profil', 'prof.current': 'Pseudo actuel', 'prof.choose': 'Choisis ton pseudo', 'prof.ph': 'ex : MaxLeMalin', 'prof.dice': 'Pseudo aléatoire', 'prof.hint': '3 à 20 caractères : lettres, chiffres, tiret et underscore. Ta progression reste attachée à ton profil.', 'prof.save': 'Enregistrer ce pseudo', 'prof.code': 'Code de sauvegarde', 'prof.code.hint': 'Garde ce code secret : il te permet de retrouver ta progression sur un autre appareil ou navigateur.', 'prof.show': 'Afficher', 'prof.hide': 'Masquer', 'prof.copy': 'Copier', 'prof.recover': 'Récupérer une sauvegarde', 'prof.recover.go': 'Récupérer',
  'prof.err.format': '3 à 20 caractères : lettres sans accent, chiffres, - ou _', 'prof.err.same': 'C’est déjà ton pseudo !', 'prof.ok': 'Pseudo enregistré ✔', 'prof.err.taken': 'Ce pseudo est déjà pris, essaie-en un autre.', 'prof.err.invalid': 'Pseudo invalide.',
  'rec.err.format': 'Format attendu : XXXX-XXXX-XXXX', 'rec.err.same': 'C’est déjà ton code actuel.', 'rec.err.none': 'Aucune sauvegarde trouvée pour ce code.', 'rec.ok': 'Bienvenue {x} ! Progression récupérée ✔',
  'net.local': 'Mode local (classement limité à ce navigateur)', 'net.on': 'En ligne : sauvegarde synchronisée', 'net.off': 'Hors ligne — {x}', 'net.offDefault': 'sauvegarde locale, synchro dès que possible', 'net.connecting': 'Connexion…',
  'set.title': 'Paramètres', 'set.t.look': 'Apparence', 'set.t.lang': 'Langue', 'set.t.btn': 'Boutons', 'set.t.snd': 'Son', 'set.t.acc': 'Données', 'set.bg': 'Fond du site', 'set.felt': 'Tapis de jeu', 'set.cards': 'Style des cartes', 'set.custom': 'Perso',
  'set.btnRed': 'Bouton « Rouge » (gauche)', 'set.btnBlack': 'Bouton « Noir » (droite)', 'set.btnHint': '10 caractères maximum, sur une seule ligne. Laisse vide pour le texte par défaut. Le bouton de gauche reste « rouge » et celui de droite « noir » pour le jeu.', 'set.reset': 'Rétablir par défaut', 'lbl.err.long': '10 caractères maximum', 'lbl.err.wide': 'Trop large pour le bouton sur cet écran',
  'set.vol.master': 'Général', 'set.vol.sfx': 'Effets', 'set.vol.music': 'Musique', 'set.test': '🔊 Tester',
  'set.lang.title': 'Langue du jeu', 'set.lang.hint': 'Change la langue de l’interface et des cartes (V/D/R, J/Q/K…). Quelle que soit la langue choisie, en Difficile et Expert tu peux répondre en français, anglais, espagnol, allemand, italien, portugais ou néerlandais.', 'set.lang.words': 'Réponses acceptées', 'w.numbers': '2 à 10', 'w.numbers.d': 'chiffres ou mots : deux, two, dos, zwei, due…', 'w.color': 'Joker rouge / noir',
  'set.acc.hint': 'Ta progression est enregistrée dans ce navigateur et envoyée au classement en ligne.', 'set.testNet': '🔌 Tester la connexion au serveur', 'set.manage': '👤 Gérer mon profil et mon code', 'set.wipe': 'Effacer les données de ce navigateur', 'set.wipe.hint': 'Sans ton code de sauvegarde, ta progression ne pourra pas être récupérée.',
  'tn.local': 'Mode local : CONFIG est vide dans script.js (SUPABASE_URL et SUPABASE_KEY).', 'tn.url': 'URL utilisée : ', 'tn.key': 'Clé : ', 'tn.running': 'Test en cours…', 'tn.ok': '✔ Serveur joignable, clé acceptée, fonctions installées.', 'tn.profOk': '✔ Profil « {x} » enregistré et synchronisé.', 'tn.profKo': '✘ Profil : {x}',
  'e.secret': 'Tu as mis la clé SECRÈTE dans script.js. Remplace-la par la clé « Publishable » (sb_publishable_…).', 'e.url': 'SUPABASE_URL invalide dans script.js. Format attendu : https://xxxxxxxx.supabase.co', 'e.net': 'Serveur injoignable. Vérifie SUPABASE_URL, ta connexion, et que le projet Supabase n’est pas en pause.', 'e.key': 'Clé refusée par Supabase. Vérifie SUPABASE_KEY : colle la clé Publishable complète (sb_publishable_…).', 'e.fn': 'Fonctions introuvables sur Supabase : exécute la nouvelle version de supabase.sql en entier dans le SQL Editor, puis réessaie.', 'e.perm': 'Droits manquants sur Supabase : relance le fichier supabase.sql en entier.', 'e.auth': 'Ton profil n’existe pas sur ce serveur. Recharge la page : un nouveau profil sera créé.', 'e.other': 'Erreur serveur : {x}',
  'bg0': 'Minuit', 'bg1': 'Aurore', 'bg2': 'Crépuscule', 'bg3': 'Forêt', 'bg4': 'Graphite', 'felt0': 'Casino', 'felt1': 'Bleu nuit', 'felt2': 'Velours', 'felt3': 'Chêne', 'felt4': 'Ardoise', 'cs.classic': 'Classique', 'cs.royal': 'Royal', 'cs.neon': 'Néon', 'cs.minimal': 'Minimal', 'cs.pixel': 'Rétro pixel',
  'card.fmt': '{r} de {s}', 'card.joker': 'Joker', 'card.jokerRed': 'Joker rouge', 'card.jokerBlack': 'Joker noir',
  'rank.A': 'As', 'rank.J': 'Valet', 'rank.Q': 'Dame', 'rank.K': 'Roi', 'suit.H': 'cœur', 'suit.D': 'carreau', 'suit.S': 'pique', 'suit.C': 'trèfle', 'face.J': 'V', 'face.Q': 'D', 'face.K': 'R',
},
en: {
  'lang.name': 'English',
  'top.board': 'Leaderboard', 'board.top10': 'Top 10', 'aria.menu': 'Menu', 'aria.settings': 'Settings', 'aria.profile': 'Profile', 'aria.close': 'Close',
  'zone.deck': 'Deck', 'zone.pile': 'Revealed', 'ghost.empty': 'Empty deck', 'ghost.pile': 'Revealed cards land here',
  'hud.record': 'Best', 'hud.packs': 'Decks', 'hud.lives': 'Lives', 'hud.time': 'Time', 'hud.left': 'Left',
  'btn.red': 'Red', 'btn.black': 'Black', 'or': 'or',
  'ans.ph.hard': 'Rank: 7, queen, K, ace…', 'ans.ph.expert': 'Card: king of hearts, 10♠, QH…', 'ans.go': 'Enter',
  'ans.unknown': 'Card not recognised', 'ans.needSuit': '{x} · add the suit or tap a symbol', 'ans.needRank': '{x} · add the rank', 'ans.needColor': 'Joker · red or black?', 'ans.tapSuit': 'Type the rank first, then tap the suit',
  'diff.title': 'Choose your difficulty', 'diff.normal': 'Normal', 'diff.normal.d': 'Guess the colour of each card: red or black.',
  'diff.hard': 'Hard', 'diff.hard.d': 'Type the rank of each card, as a number or a word.',
  'diff.expert': 'Expert', 'diff.expert.d': 'Type the exact card: rank and suit.', 'diff.change': 'Change',
  'diff.hard.ex': '7|queen|K|ace|joker', 'diff.expert.ex': 'king of hearts|10♠|QH|red joker',
  'menu.tag': 'Remember the order of the deck. One mistake and it starts over.', 'menu.hello': 'Signed in as {x}',
  'mode.classic': 'Classic',
  'mode.classic.d.normal': 'Guess the colour of all 54 cards. One mistake and the deck goes back to its original order.',
  'mode.classic.d.hard': 'Guess the rank of all 54 cards. One mistake and the deck goes back to its original order.',
  'mode.classic.d.expert': 'Guess each of the 54 cards exactly. One mistake and the deck goes back to its original order.',
  'mode.infinite': 'Endless', 'mode.infinite.d': '3 lives. Missing a card you have never seen is free, but missing a card you have already seen costs a life. +1 life per finished deck.',
  'mode.chrono': 'Time trial', 'mode.chrono.d': 'The clock starts with your first answer.',
  'mode.half': '½ deck', 'mode.half.d': '13 red · 13 black', 'mode.full': 'Deck', 'mode.full.d': '54 cards', 'mode.c15': '15 min', 'mode.c15.d': 'most cards',
  'hud.mode.full': 'Deck time trial', 'board.tab.full': 'Deck time trial', 'board.tab.c15': '15 minutes',
  'rec.classic.none': 'Start your first deck', 'rec.classic': '{p} · best card {b}', 'rec.resume': ' · resume at card {n}', 'rec.inf': 'Best: {x}', 'rec.none': 'No record yet',
  'n.card': 'card', 'n.cards': 'cards', 'n.pack': 'deck', 'n.packs': 'decks',
  'foot.board': '🏆 Leaderboard', 'foot.settings': '⚙ Settings', 'foot.profile': '👤 Profile',
  'rules.title': 'How to play',
  'rules.html': '<p>A deck of <b>52 cards + red joker + black joker</b> is shuffled. Guess the next card:</p><ul><li><b>Normal</b>: its colour, red or black.</li><li><b>Hard</b>: its rank (ace, 2 to 10, jack, queen, king or joker).</li><li><b>Expert</b>: its rank and suit (hearts, diamonds, spades, clubs), or red joker / black joker.</li></ul><p>✔ Right: the card is revealed and you guess the next one.<br>✘ Wrong: every card goes back into the deck <b>in the same order</b>. Remember what comes next!</p><p>Typed answers: numbers or words, upper or lower case, in English, French, Spanish, German, Italian, Portuguese or Dutch. E.g. <b>1</b> or <b>ace</b>, <b>j</b> or <b>jack</b>, <b>king of hearts</b>, <b>K♥</b>, <b>kh</b>, <b>roi de cœur</b>, <b>Herz König</b>. In Expert you can also type the rank and tap ♥ ♦ ♠ ♣.</p><p>Keyboard: <b>←</b> / <b>→</b> in Normal, <b>Enter</b> to submit in Hard and Expert.</p>',
  'board.top100': 'Leaderboard · Top 100', 'board.loading': 'Loading…', 'board.empty': 'No scores yet.<br>Be the first!', 'board.local': 'Local mode: only profiles from this browser are shown.', 'board.err': 'Leaderboard unavailable right now.', 'board.see100': 'See the Top 100 ›', 'board.rank': 'Your rank', 'board.unranked': 'Not ranked here yet', 'board.val.classic': '{p} · card {c}',
  'toast.resume': 'Resuming: card {n} of 54', 'toast.chrono': 'The clock starts with your first answer', 'toast.life': '+1 life ❤', 'toast.newpack': 'New deck shuffled!', 'toast.copied': 'Code copied ✔', 'toast.select': 'Select the code to copy it',
  'cap.miss': 'Missed! It was: {x}', 'cap.seen': 'Card already seen: −1 life', 'cap.unseen': 'Card never seen: no life lost',
  'ban.half': 'Half deck done!', 'ban.full': 'Deck done!',
  'res.lives.t': 'Out of lives!', 'res.lives.s': 'Cards memorised over the whole game', 'res.time.t': 'Time’s up!', 'res.time.s': 'Cards memorised in 15 minutes', 'res.done.half': 'Half deck cleared!', 'res.done.full': 'Deck cleared!', 'res.done.s': 'Your time', 'res.quit.t': 'Game over', 'res.quit.s': 'Score saved', 'res.record': 'New record!', 'res.calc': 'Working out your rank…', 'res.rank.world': 'World rank: #{p}', 'res.rank.local': 'Your rank: #{p}', 'res.of': ' of {t}', 'res.unavail': 'Leaderboard unavailable right now', 'res.localmode': 'Local mode: leaderboard limited to this browser', 'res.menu': 'Menu', 'res.again': 'Play again',
  'ask.cancel': 'Cancel', 'ask.quit.t': 'Leave the game?', 'ask.quit.x': 'Your current score ({x}) will be saved.', 'ask.quit.ok': 'Leave', 'ask.abandon.t': 'Give up the time trial?', 'ask.abandon.x': 'This time will not be saved.', 'ask.abandon.ok': 'Give up', 'ask.recover.t': 'Restore this save?', 'ask.recover.x': 'The progress stored in this browser will be replaced.', 'ask.recover.ok': 'Restore', 'ask.wipe.t': 'Erase everything?', 'ask.wipe.x': 'Profile, progress and settings in this browser will be deleted. Write down your save code first!', 'ask.wipe.ok': 'Erase',
  'prof.title': 'Your profile', 'prof.current': 'Current name', 'prof.choose': 'Choose your name', 'prof.ph': 'e.g. MaxTheSmart', 'prof.dice': 'Random name', 'prof.hint': '3 to 20 characters: letters, numbers, dash and underscore. Your progress stays tied to your profile.', 'prof.save': 'Save this name', 'prof.code': 'Save code', 'prof.code.hint': 'Keep this code secret: it lets you restore your progress on another device or browser.', 'prof.show': 'Show', 'prof.hide': 'Hide', 'prof.copy': 'Copy', 'prof.recover': 'Restore a save', 'prof.recover.go': 'Restore',
  'prof.err.format': '3 to 20 characters: letters without accents, numbers, - or _', 'prof.err.same': 'That is already your name!', 'prof.ok': 'Name saved ✔', 'prof.err.taken': 'This name is taken, try another one.', 'prof.err.invalid': 'Invalid name.',
  'rec.err.format': 'Expected format: XXXX-XXXX-XXXX', 'rec.err.same': 'That is already your current code.', 'rec.err.none': 'No save found for this code.', 'rec.ok': 'Welcome {x}! Progress restored ✔',
  'net.local': 'Local mode (leaderboard limited to this browser)', 'net.on': 'Online: progress synced', 'net.off': 'Offline — {x}', 'net.offDefault': 'saved locally, will sync when possible', 'net.connecting': 'Connecting…',
  'set.title': 'Settings', 'set.t.look': 'Look', 'set.t.lang': 'Language', 'set.t.btn': 'Buttons', 'set.t.snd': 'Sound', 'set.t.acc': 'Data', 'set.bg': 'Page background', 'set.felt': 'Table cloth', 'set.cards': 'Card style', 'set.custom': 'Custom',
  'set.btnRed': '“Red” button (left)', 'set.btnBlack': '“Black” button (right)', 'set.btnHint': '10 characters max, on a single line. Leave empty for the default text. The left button always means red and the right one black.', 'set.reset': 'Reset to default', 'lbl.err.long': '10 characters max', 'lbl.err.wide': 'Too wide for the button on this screen',
  'set.vol.master': 'Master', 'set.vol.sfx': 'Effects', 'set.vol.music': 'Music', 'set.test': '🔊 Test',
  'set.lang.title': 'Game language', 'set.lang.hint': 'Changes the language of the interface and of the cards (J/Q/K, V/D/R…). Whatever the language, in Hard and Expert you can answer in English, French, Spanish, German, Italian, Portuguese or Dutch.', 'set.lang.words': 'Accepted answers', 'w.numbers': '2 to 10', 'w.numbers.d': 'numbers or words: two, deux, dos, zwei, due…', 'w.color': 'Red / black joker',
  'set.acc.hint': 'Your progress is stored in this browser and sent to the online leaderboard.', 'set.testNet': '🔌 Test the server connection', 'set.manage': '👤 Manage my profile and code', 'set.wipe': 'Erase this browser’s data', 'set.wipe.hint': 'Without your save code, your progress cannot be restored.',
  'tn.local': 'Local mode: CONFIG is empty in script.js (SUPABASE_URL and SUPABASE_KEY).', 'tn.url': 'URL used: ', 'tn.key': 'Key: ', 'tn.running': 'Testing…', 'tn.ok': '✔ Server reachable, key accepted, functions installed.', 'tn.profOk': '✔ Profile “{x}” registered and synced.', 'tn.profKo': '✘ Profile: {x}',
  'e.secret': 'You put the SECRET key in script.js. Replace it with the “Publishable” key (sb_publishable_…).', 'e.url': 'Invalid SUPABASE_URL in script.js. Expected: https://xxxxxxxx.supabase.co', 'e.net': 'Server unreachable. Check SUPABASE_URL, your connection, and that the Supabase project is not paused.', 'e.key': 'Key rejected by Supabase. Check SUPABASE_KEY: paste the full Publishable key (sb_publishable_…).', 'e.fn': 'Functions not found on Supabase: run the new supabase.sql in full in the SQL Editor, then try again.', 'e.perm': 'Missing permissions on Supabase: run supabase.sql again in full.', 'e.auth': 'Your profile does not exist on this server. Reload the page: a new profile will be created.', 'e.other': 'Server error: {x}',
  'bg0': 'Midnight', 'bg1': 'Dawn', 'bg2': 'Dusk', 'bg3': 'Forest', 'bg4': 'Graphite', 'felt0': 'Casino', 'felt1': 'Night blue', 'felt2': 'Velvet', 'felt3': 'Oak', 'felt4': 'Slate', 'cs.classic': 'Classic', 'cs.royal': 'Royal', 'cs.neon': 'Neon', 'cs.minimal': 'Minimal', 'cs.pixel': 'Retro pixel',
  'card.fmt': '{r} of {s}', 'card.joker': 'Joker', 'card.jokerRed': 'Red joker', 'card.jokerBlack': 'Black joker',
  'rank.A': 'Ace', 'rank.J': 'Jack', 'rank.Q': 'Queen', 'rank.K': 'King', 'suit.H': 'hearts', 'suit.D': 'diamonds', 'suit.S': 'spades', 'suit.C': 'clubs', 'face.J': 'J', 'face.Q': 'Q', 'face.K': 'K',
},
es: {
  'lang.name': 'Español',
  'top.board': 'Clasificación', 'board.top10': 'Top 10', 'aria.menu': 'Menú', 'aria.settings': 'Ajustes', 'aria.profile': 'Perfil', 'aria.close': 'Cerrar',
  'zone.deck': 'Mazo', 'zone.pile': 'Reveladas', 'ghost.empty': 'Mazo vacío', 'ghost.pile': 'Aquí caen las cartas reveladas',
  'hud.record': 'Récord', 'hud.packs': 'Mazos', 'hud.lives': 'Vidas', 'hud.time': 'Tiempo', 'hud.left': 'Queda',
  'btn.red': 'Rojo', 'btn.black': 'Negro', 'or': 'o',
  'ans.ph.hard': 'Valor: 7, reina, K, as…', 'ans.ph.expert': 'Carta: rey de corazones, 10♠, QH…', 'ans.go': 'Validar',
  'ans.unknown': 'Carta no reconocida', 'ans.needSuit': '{x} · añade el palo o toca un símbolo', 'ans.needRank': '{x} · añade el valor', 'ans.needColor': 'Joker · ¿rojo o negro?', 'ans.tapSuit': 'Escribe primero el valor y luego toca el palo',
  'diff.title': 'Elige tu dificultad', 'diff.normal': 'Normal', 'diff.normal.d': 'Adivina el color de cada carta: rojo o negro.',
  'diff.hard': 'Difícil', 'diff.hard.d': 'Escribe el valor de cada carta, en número o en letras.',
  'diff.expert': 'Experto', 'diff.expert.d': 'Escribe la carta exacta: valor y palo.', 'diff.change': 'Cambiar',
  'diff.hard.ex': '7|reina|K|as|joker', 'diff.expert.ex': 'rey de corazones|10♠|QH|joker rojo',
  'menu.tag': 'Memoriza el orden del mazo. Un error y todo vuelve a empezar.', 'menu.hello': 'Conectado como {x}',
  'mode.classic': 'Clásico',
  'mode.classic.d.normal': 'Adivina el color de las 54 cartas. Un error y el mazo vuelve a su orden original.',
  'mode.classic.d.hard': 'Adivina el valor de las 54 cartas. Un error y el mazo vuelve a su orden original.',
  'mode.classic.d.expert': 'Adivina exactamente cada una de las 54 cartas. Un error y el mazo vuelve a su orden original.',
  'mode.infinite': 'Infinito', 'mode.infinite.d': '3 vidas. Fallar una carta nunca vista es gratis, pero fallar una carta ya vista cuesta una vida. +1 vida por mazo terminado.',
  'mode.chrono': 'Contrarreloj', 'mode.chrono.d': 'El reloj empieza con tu primera respuesta.',
  'mode.half': '½ mazo', 'mode.half.d': '13 rojas · 13 negras', 'mode.full': 'Mazo', 'mode.full.d': '54 cartas', 'mode.c15': '15 min', 'mode.c15.d': 'máximo de cartas',
  'hud.mode.full': 'Mazo contrarreloj', 'board.tab.full': 'Mazo contrarreloj', 'board.tab.c15': '15 minutos',
  'rec.classic.none': 'Empieza tu primer mazo', 'rec.classic': '{p} · récord carta {b}', 'rec.resume': ' · seguir en la carta {n}', 'rec.inf': 'Récord: {x}', 'rec.none': 'Aún sin récord',
  'n.card': 'carta', 'n.cards': 'cartas', 'n.pack': 'mazo', 'n.packs': 'mazos',
  'foot.board': '🏆 Clasificación', 'foot.settings': '⚙ Ajustes', 'foot.profile': '👤 Perfil',
  'rules.title': '¿Cómo se juega?',
  'rules.html': '<p>Se baraja un mazo de <b>52 cartas + joker rojo + joker negro</b>. Adivina la siguiente carta:</p><ul><li><b>Normal</b>: su color, rojo o negro.</li><li><b>Difícil</b>: su valor (as, 2 a 10, jota, reina, rey o joker).</li><li><b>Experto</b>: su valor y su palo (corazones, diamantes, picas, tréboles), o joker rojo / joker negro.</li></ul><p>✔ Acierto: la carta se revela y adivinas la siguiente.<br>✘ Fallo: todas las cartas vuelven al mazo <b>en el mismo orden</b>. ¡Recuerda lo que viene!</p><p>Respuestas escritas: números o palabras, mayúsculas o minúsculas, en español, francés, inglés, alemán, italiano, portugués o neerlandés. Ej.: <b>1</b> o <b>as</b>, <b>j</b> o <b>jota</b>, <b>rey de corazones</b>, <b>K♥</b>, <b>kh</b>, <b>roi de cœur</b>, <b>Herz König</b>. En Experto también puedes escribir el valor y tocar ♥ ♦ ♠ ♣.</p><p>Teclado: <b>←</b> / <b>→</b> en Normal, <b>Intro</b> para validar en Difícil y Experto.</p>',
  'board.top100': 'Clasificación · Top 100', 'board.loading': 'Cargando…', 'board.empty': 'Todavía no hay puntuaciones.<br>¡Sé el primero!', 'board.local': 'Modo local: solo aparecen los perfiles de este navegador.', 'board.err': 'Clasificación no disponible por ahora.', 'board.see100': 'Ver el Top 100 ›', 'board.rank': 'Tu puesto', 'board.unranked': 'Aún sin clasificar aquí', 'board.val.classic': '{p} · carta {c}',
  'toast.resume': 'Continúas: carta {n} de 54', 'toast.chrono': 'El reloj empieza con tu primera respuesta', 'toast.life': '+1 vida ❤', 'toast.newpack': '¡Nuevo mazo barajado!', 'toast.copied': 'Código copiado ✔', 'toast.select': 'Selecciona el código para copiarlo',
  'cap.miss': '¡Fallo! Era: {x}', 'cap.seen': 'Carta ya vista: −1 vida', 'cap.unseen': 'Carta nunca vista: no pierdes vida',
  'ban.half': '¡Medio mazo terminado!', 'ban.full': '¡Mazo terminado!',
  'res.lives.t': '¡Sin vidas!', 'res.lives.s': 'Cartas memorizadas en toda la partida', 'res.time.t': '¡Se acabó el tiempo!', 'res.time.s': 'Cartas memorizadas en 15 minutos', 'res.done.half': '¡Medio mazo completado!', 'res.done.full': '¡Mazo completado!', 'res.done.s': 'Tu tiempo', 'res.quit.t': 'Partida terminada', 'res.quit.s': 'Puntuación guardada', 'res.record': '¡Nuevo récord!', 'res.calc': 'Calculando tu puesto…', 'res.rank.world': 'Puesto mundial: #{p}', 'res.rank.local': 'Tu puesto: #{p}', 'res.of': ' de {t}', 'res.unavail': 'Clasificación no disponible por ahora', 'res.localmode': 'Modo local: clasificación limitada a este navegador', 'res.menu': 'Menú', 'res.again': 'Jugar otra vez',
  'ask.cancel': 'Cancelar', 'ask.quit.t': '¿Salir de la partida?', 'ask.quit.x': 'Se guardará tu puntuación actual ({x}).', 'ask.quit.ok': 'Salir', 'ask.abandon.t': '¿Abandonar la contrarreloj?', 'ask.abandon.x': 'Este tiempo no se guardará.', 'ask.abandon.ok': 'Abandonar', 'ask.recover.t': '¿Recuperar esta partida guardada?', 'ask.recover.x': 'Se reemplazará el progreso de este navegador.', 'ask.recover.ok': 'Recuperar', 'ask.wipe.t': '¿Borrarlo todo?', 'ask.wipe.x': 'Se borrarán el perfil, el progreso y los ajustes de este navegador. ¡Apunta antes tu código!', 'ask.wipe.ok': 'Borrar',
  'prof.title': 'Tu perfil', 'prof.current': 'Nombre actual', 'prof.choose': 'Elige tu nombre', 'prof.ph': 'ej.: MaxElListo', 'prof.dice': 'Nombre aleatorio', 'prof.hint': 'De 3 a 20 caracteres: letras, números, guion y guion bajo. Tu progreso queda ligado a tu perfil.', 'prof.save': 'Guardar este nombre', 'prof.code': 'Código de guardado', 'prof.code.hint': 'Guarda este código en secreto: te permite recuperar tu progreso en otro dispositivo o navegador.', 'prof.show': 'Mostrar', 'prof.hide': 'Ocultar', 'prof.copy': 'Copiar', 'prof.recover': 'Recuperar una partida', 'prof.recover.go': 'Recuperar',
  'prof.err.format': 'De 3 a 20 caracteres: letras sin acento, números, - o _', 'prof.err.same': '¡Ya es tu nombre!', 'prof.ok': 'Nombre guardado ✔', 'prof.err.taken': 'Ese nombre ya está cogido, prueba otro.', 'prof.err.invalid': 'Nombre no válido.',
  'rec.err.format': 'Formato: XXXX-XXXX-XXXX', 'rec.err.same': 'Ya es tu código actual.', 'rec.err.none': 'No hay ninguna partida con ese código.', 'rec.ok': '¡Bienvenido {x}! Progreso recuperado ✔',
  'net.local': 'Modo local (clasificación limitada a este navegador)', 'net.on': 'En línea: progreso sincronizado', 'net.off': 'Sin conexión — {x}', 'net.offDefault': 'guardado local, se sincronizará en cuanto se pueda', 'net.connecting': 'Conectando…',
  'set.title': 'Ajustes', 'set.t.look': 'Aspecto', 'set.t.lang': 'Idioma', 'set.t.btn': 'Botones', 'set.t.snd': 'Sonido', 'set.t.acc': 'Datos', 'set.bg': 'Fondo de la página', 'set.felt': 'Tapete', 'set.cards': 'Estilo de cartas', 'set.custom': 'Propio',
  'set.btnRed': 'Botón «Rojo» (izquierda)', 'set.btnBlack': 'Botón «Negro» (derecha)', 'set.btnHint': '10 caracteres como máximo, en una sola línea. Déjalo vacío para el texto por defecto. El botón izquierdo sigue siendo «rojo» y el derecho «negro».', 'set.reset': 'Restablecer', 'lbl.err.long': '10 caracteres como máximo', 'lbl.err.wide': 'Demasiado ancho para el botón en esta pantalla',
  'set.vol.master': 'General', 'set.vol.sfx': 'Efectos', 'set.vol.music': 'Música', 'set.test': '🔊 Probar',
  'set.lang.title': 'Idioma del juego', 'set.lang.hint': 'Cambia el idioma de la interfaz y de las cartas (J/Q/K, V/D/R…). Sea cual sea el idioma, en Difícil y Experto puedes responder en español, francés, inglés, alemán, italiano, portugués o neerlandés.', 'set.lang.words': 'Respuestas aceptadas', 'w.numbers': '2 a 10', 'w.numbers.d': 'números o palabras: dos, two, deux, zwei, due…', 'w.color': 'Joker rojo / negro',
  'set.acc.hint': 'Tu progreso se guarda en este navegador y se envía a la clasificación en línea.', 'set.testNet': '🔌 Probar la conexión con el servidor', 'set.manage': '👤 Gestionar mi perfil y mi código', 'set.wipe': 'Borrar los datos de este navegador', 'set.wipe.hint': 'Sin tu código de guardado, no se podrá recuperar tu progreso.',
  'tn.local': 'Modo local: CONFIG está vacío en script.js (SUPABASE_URL y SUPABASE_KEY).', 'tn.url': 'URL usada: ', 'tn.key': 'Clave: ', 'tn.running': 'Probando…', 'tn.ok': '✔ Servidor accesible, clave aceptada, funciones instaladas.', 'tn.profOk': '✔ Perfil «{x}» registrado y sincronizado.', 'tn.profKo': '✘ Perfil: {x}',
  'e.secret': 'Has puesto la clave SECRETA en script.js. Sustitúyela por la clave «Publishable» (sb_publishable_…).', 'e.url': 'SUPABASE_URL no válida en script.js. Formato: https://xxxxxxxx.supabase.co', 'e.net': 'Servidor inaccesible. Revisa SUPABASE_URL, tu conexión y que el proyecto Supabase no esté en pausa.', 'e.key': 'Supabase rechaza la clave. Revisa SUPABASE_KEY: pega la clave Publishable completa (sb_publishable_…).', 'e.fn': 'Funciones no encontradas en Supabase: ejecuta la nueva versión completa de supabase.sql en el SQL Editor y vuelve a probar.', 'e.perm': 'Faltan permisos en Supabase: vuelve a ejecutar supabase.sql completo.', 'e.auth': 'Tu perfil no existe en este servidor. Recarga la página: se creará uno nuevo.', 'e.other': 'Error del servidor: {x}',
  'bg0': 'Medianoche', 'bg1': 'Aurora', 'bg2': 'Atardecer', 'bg3': 'Bosque', 'bg4': 'Grafito', 'felt0': 'Casino', 'felt1': 'Azul noche', 'felt2': 'Terciopelo', 'felt3': 'Roble', 'felt4': 'Pizarra', 'cs.classic': 'Clásico', 'cs.royal': 'Real', 'cs.neon': 'Neón', 'cs.minimal': 'Minimal', 'cs.pixel': 'Retro píxel',
  'card.fmt': '{r} de {s}', 'card.joker': 'Joker', 'card.jokerRed': 'Joker rojo', 'card.jokerBlack': 'Joker negro',
  'rank.A': 'As', 'rank.J': 'Jota', 'rank.Q': 'Reina', 'rank.K': 'Rey', 'suit.H': 'corazones', 'suit.D': 'diamantes', 'suit.S': 'picas', 'suit.C': 'tréboles', 'face.J': 'J', 'face.Q': 'Q', 'face.K': 'K',
},
de: {
  'lang.name': 'Deutsch',
  'top.board': 'Rangliste', 'board.top10': 'Top 10', 'aria.menu': 'Menü', 'aria.settings': 'Einstellungen', 'aria.profile': 'Profil', 'aria.close': 'Schließen',
  'zone.deck': 'Stapel', 'zone.pile': 'Aufgedeckt', 'ghost.empty': 'Stapel leer', 'ghost.pile': 'Hier landen die aufgedeckten Karten',
  'hud.record': 'Rekord', 'hud.packs': 'Stapel', 'hud.lives': 'Leben', 'hud.time': 'Zeit', 'hud.left': 'Rest',
  'btn.red': 'Rot', 'btn.black': 'Schwarz', 'or': 'oder',
  'ans.ph.hard': 'Wert: 7, Dame, K, Ass…', 'ans.ph.expert': 'Karte: Herz König, 10♠, QH…', 'ans.go': 'OK',
  'ans.unknown': 'Karte nicht erkannt', 'ans.needSuit': '{x} · Farbe ergänzen oder Symbol tippen', 'ans.needRank': '{x} · Wert ergänzen', 'ans.needColor': 'Joker · rot oder schwarz?', 'ans.tapSuit': 'Erst den Wert schreiben, dann die Farbe tippen',
  'diff.title': 'Wähle deinen Schwierigkeitsgrad', 'diff.normal': 'Normal', 'diff.normal.d': 'Rate die Farbe jeder Karte: rot oder schwarz.',
  'diff.hard': 'Schwer', 'diff.hard.d': 'Schreibe den Wert jeder Karte, als Zahl oder Wort.',
  'diff.expert': 'Experte', 'diff.expert.d': 'Schreibe die genaue Karte: Wert und Farbe.', 'diff.change': 'Ändern',
  'diff.hard.ex': '7|Dame|K|Ass|Joker', 'diff.expert.ex': 'Herz König|10♠|QH|roter Joker',
  'menu.tag': 'Merk dir die Reihenfolge. Ein Fehler und alles beginnt von vorn.', 'menu.hello': 'Angemeldet als {x}',
  'mode.classic': 'Klassisch',
  'mode.classic.d.normal': 'Rate die Farbe aller 54 Karten. Ein Fehler und der Stapel kehrt in seine ursprüngliche Reihenfolge zurück.',
  'mode.classic.d.hard': 'Rate den Wert aller 54 Karten. Ein Fehler und der Stapel kehrt in seine ursprüngliche Reihenfolge zurück.',
  'mode.classic.d.expert': 'Rate jede der 54 Karten genau. Ein Fehler und der Stapel kehrt in seine ursprüngliche Reihenfolge zurück.',
  'mode.infinite': 'Endlos', 'mode.infinite.d': '3 Leben. Ein Fehler bei einer nie gesehenen Karte ist gratis, ein Fehler bei einer schon gesehenen Karte kostet ein Leben. +1 Leben pro fertigem Stapel.',
  'mode.chrono': 'Zeitrennen', 'mode.chrono.d': 'Die Uhr startet mit deiner ersten Antwort.',
  'mode.half': '½ Stapel', 'mode.half.d': '13 rote · 13 schwarze', 'mode.full': 'Stapel', 'mode.full.d': '54 Karten', 'mode.c15': '15 Min', 'mode.c15.d': 'max. Karten',
  'hud.mode.full': 'Stapel-Zeitrennen', 'board.tab.full': 'Stapel-Zeitrennen', 'board.tab.c15': '15 Minuten',
  'rec.classic.none': 'Starte deinen ersten Stapel', 'rec.classic': '{p} · Rekord Karte {b}', 'rec.resume': ' · weiter bei Karte {n}', 'rec.inf': 'Rekord: {x}', 'rec.none': 'Noch kein Rekord',
  'n.card': 'Karte', 'n.cards': 'Karten', 'n.pack': 'Stapel', 'n.packs': 'Stapel',
  'foot.board': '🏆 Rangliste', 'foot.settings': '⚙ Einstellungen', 'foot.profile': '👤 Profil',
  'rules.title': 'Wie spielt man?',
  'rules.html': '<p>Ein Stapel aus <b>52 Karten + rotem Joker + schwarzem Joker</b> wird gemischt. Rate die nächste Karte:</p><ul><li><b>Normal</b>: ihre Farbe, rot oder schwarz.</li><li><b>Schwer</b>: ihren Wert (Ass, 2 bis 10, Bube, Dame, König oder Joker).</li><li><b>Experte</b>: Wert und Farbe (Herz, Karo, Pik, Kreuz), oder roter / schwarzer Joker.</li></ul><p>✔ Richtig: die Karte wird aufgedeckt und du rätst die nächste.<br>✘ Falsch: alle Karten gehen <b>in derselben Reihenfolge</b> zurück in den Stapel. Merk dir, was kommt!</p><p>Geschriebene Antworten: Zahlen oder Wörter, groß oder klein, auf Deutsch, Französisch, Englisch, Spanisch, Italienisch, Portugiesisch oder Niederländisch. Z. B. <b>1</b> oder <b>Ass</b>, <b>b</b> oder <b>Bube</b>, <b>Herz König</b>, <b>K♥</b>, <b>kh</b>, <b>roi de cœur</b>, <b>king of hearts</b>. Als Experte kannst du auch den Wert schreiben und ♥ ♦ ♠ ♣ tippen.</p><p>Tastatur: <b>←</b> / <b>→</b> in Normal, <b>Enter</b> zum Bestätigen in Schwer und Experte.</p>',
  'board.top100': 'Rangliste · Top 100', 'board.loading': 'Wird geladen…', 'board.empty': 'Noch keine Punkte.<br>Sei der Erste!', 'board.local': 'Lokaler Modus: nur Profile aus diesem Browser.', 'board.err': 'Rangliste gerade nicht verfügbar.', 'board.see100': 'Top 100 ansehen ›', 'board.rank': 'Dein Rang', 'board.unranked': 'Hier noch nicht platziert', 'board.val.classic': '{p} · Karte {c}',
  'toast.resume': 'Weiter: Karte {n} von 54', 'toast.chrono': 'Die Uhr startet mit deiner ersten Antwort', 'toast.life': '+1 Leben ❤', 'toast.newpack': 'Neuer Stapel gemischt!', 'toast.copied': 'Code kopiert ✔', 'toast.select': 'Markiere den Code, um ihn zu kopieren',
  'cap.miss': 'Daneben! Es war: {x}', 'cap.seen': 'Karte schon gesehen: −1 Leben', 'cap.unseen': 'Karte nie gesehen: kein Leben verloren',
  'ban.half': 'Halber Stapel geschafft!', 'ban.full': 'Stapel geschafft!',
  'res.lives.t': 'Keine Leben mehr!', 'res.lives.s': 'Gemerkte Karten im ganzen Spiel', 'res.time.t': 'Zeit abgelaufen!', 'res.time.s': 'Gemerkte Karten in 15 Minuten', 'res.done.half': 'Halber Stapel geschafft!', 'res.done.full': 'Stapel geschafft!', 'res.done.s': 'Deine Zeit', 'res.quit.t': 'Spiel beendet', 'res.quit.s': 'Punkte gespeichert', 'res.record': 'Neuer Rekord!', 'res.calc': 'Dein Rang wird berechnet…', 'res.rank.world': 'Weltrang: #{p}', 'res.rank.local': 'Dein Rang: #{p}', 'res.of': ' von {t}', 'res.unavail': 'Rangliste gerade nicht verfügbar', 'res.localmode': 'Lokaler Modus: Rangliste nur für diesen Browser', 'res.menu': 'Menü', 'res.again': 'Nochmal',
  'ask.cancel': 'Abbrechen', 'ask.quit.t': 'Spiel verlassen?', 'ask.quit.x': 'Deine aktuelle Punktzahl ({x}) wird gespeichert.', 'ask.quit.ok': 'Verlassen', 'ask.abandon.t': 'Zeitrennen abbrechen?', 'ask.abandon.x': 'Diese Zeit wird nicht gespeichert.', 'ask.abandon.ok': 'Abbrechen', 'ask.recover.t': 'Diesen Spielstand laden?', 'ask.recover.x': 'Der Fortschritt in diesem Browser wird ersetzt.', 'ask.recover.ok': 'Laden', 'ask.wipe.t': 'Alles löschen?', 'ask.wipe.x': 'Profil, Fortschritt und Einstellungen in diesem Browser werden gelöscht. Notiere vorher deinen Code!', 'ask.wipe.ok': 'Löschen',
  'prof.title': 'Dein Profil', 'prof.current': 'Aktueller Name', 'prof.choose': 'Wähle deinen Namen', 'prof.ph': 'z. B. MaxDerSchlaue', 'prof.dice': 'Zufallsname', 'prof.hint': '3 bis 20 Zeichen: Buchstaben, Zahlen, Bindestrich und Unterstrich. Dein Fortschritt bleibt mit deinem Profil verbunden.', 'prof.save': 'Namen speichern', 'prof.code': 'Speichercode', 'prof.code.hint': 'Halte diesen Code geheim: damit holst du deinen Fortschritt auf ein anderes Gerät oder in einen anderen Browser.', 'prof.show': 'Zeigen', 'prof.hide': 'Verbergen', 'prof.copy': 'Kopieren', 'prof.recover': 'Spielstand laden', 'prof.recover.go': 'Laden',
  'prof.err.format': '3 bis 20 Zeichen: Buchstaben ohne Umlaute, Zahlen, - oder _', 'prof.err.same': 'Das ist schon dein Name!', 'prof.ok': 'Name gespeichert ✔', 'prof.err.taken': 'Dieser Name ist vergeben, versuch einen anderen.', 'prof.err.invalid': 'Ungültiger Name.',
  'rec.err.format': 'Format: XXXX-XXXX-XXXX', 'rec.err.same': 'Das ist schon dein aktueller Code.', 'rec.err.none': 'Kein Spielstand zu diesem Code gefunden.', 'rec.ok': 'Willkommen {x}! Fortschritt geladen ✔',
  'net.local': 'Lokaler Modus (Rangliste nur für diesen Browser)', 'net.on': 'Online: Fortschritt synchronisiert', 'net.off': 'Offline — {x}', 'net.offDefault': 'lokal gespeichert, Synchronisierung sobald möglich', 'net.connecting': 'Verbinde…',
  'set.title': 'Einstellungen', 'set.t.look': 'Aussehen', 'set.t.lang': 'Sprache', 'set.t.btn': 'Tasten', 'set.t.snd': 'Ton', 'set.t.acc': 'Daten', 'set.bg': 'Hintergrund', 'set.felt': 'Spieltisch', 'set.cards': 'Kartenstil', 'set.custom': 'Eigene',
  'set.btnRed': 'Taste „Rot“ (links)', 'set.btnBlack': 'Taste „Schwarz“ (rechts)', 'set.btnHint': 'Höchstens 10 Zeichen, in einer Zeile. Leer lassen für den Standardtext. Links bleibt immer „rot“, rechts „schwarz“.', 'set.reset': 'Zurücksetzen', 'lbl.err.long': 'Höchstens 10 Zeichen', 'lbl.err.wide': 'Zu breit für die Taste auf diesem Bildschirm',
  'set.vol.master': 'Gesamt', 'set.vol.sfx': 'Effekte', 'set.vol.music': 'Musik', 'set.test': '🔊 Testen',
  'set.lang.title': 'Spielsprache', 'set.lang.hint': 'Ändert die Sprache der Oberfläche und der Karten (B/D/K, J/Q/K…). Egal welche Sprache: in Schwer und Experte kannst du auf Deutsch, Französisch, Englisch, Spanisch, Italienisch, Portugiesisch oder Niederländisch antworten.', 'set.lang.words': 'Akzeptierte Antworten', 'w.numbers': '2 bis 10', 'w.numbers.d': 'Zahlen oder Wörter: zwei, two, deux, dos, due…', 'w.color': 'Roter / schwarzer Joker',
  'set.acc.hint': 'Dein Fortschritt wird in diesem Browser gespeichert und an die Online-Rangliste gesendet.', 'set.testNet': '🔌 Serververbindung testen', 'set.manage': '👤 Profil und Code verwalten', 'set.wipe': 'Daten dieses Browsers löschen', 'set.wipe.hint': 'Ohne deinen Speichercode kann dein Fortschritt nicht wiederhergestellt werden.',
  'tn.local': 'Lokaler Modus: CONFIG ist in script.js leer (SUPABASE_URL und SUPABASE_KEY).', 'tn.url': 'Verwendete URL: ', 'tn.key': 'Schlüssel: ', 'tn.running': 'Test läuft…', 'tn.ok': '✔ Server erreichbar, Schlüssel akzeptiert, Funktionen installiert.', 'tn.profOk': '✔ Profil „{x}“ registriert und synchronisiert.', 'tn.profKo': '✘ Profil: {x}',
  'e.secret': 'Du hast den GEHEIMEN Schlüssel in script.js eingetragen. Ersetze ihn durch den „Publishable“-Schlüssel (sb_publishable_…).', 'e.url': 'Ungültige SUPABASE_URL in script.js. Format: https://xxxxxxxx.supabase.co', 'e.net': 'Server nicht erreichbar. Prüfe SUPABASE_URL, deine Verbindung und ob das Supabase-Projekt pausiert ist.', 'e.key': 'Schlüssel von Supabase abgelehnt. Prüfe SUPABASE_KEY: füge den vollständigen Publishable-Schlüssel ein (sb_publishable_…).', 'e.fn': 'Funktionen auf Supabase nicht gefunden: führe die neue supabase.sql vollständig im SQL Editor aus und versuche es erneut.', 'e.perm': 'Fehlende Rechte auf Supabase: führe supabase.sql erneut vollständig aus.', 'e.auth': 'Dein Profil existiert auf diesem Server nicht. Lade die Seite neu: ein neues Profil wird erstellt.', 'e.other': 'Serverfehler: {x}',
  'bg0': 'Mitternacht', 'bg1': 'Morgenrot', 'bg2': 'Dämmerung', 'bg3': 'Wald', 'bg4': 'Graphit', 'felt0': 'Casino', 'felt1': 'Nachtblau', 'felt2': 'Samt', 'felt3': 'Eiche', 'felt4': 'Schiefer', 'cs.classic': 'Klassisch', 'cs.royal': 'Königlich', 'cs.neon': 'Neon', 'cs.minimal': 'Minimal', 'cs.pixel': 'Retro-Pixel',
  'card.fmt': '{s} {r}', 'card.joker': 'Joker', 'card.jokerRed': 'Roter Joker', 'card.jokerBlack': 'Schwarzer Joker',
  'rank.A': 'Ass', 'rank.J': 'Bube', 'rank.Q': 'Dame', 'rank.K': 'König', 'suit.H': 'Herz', 'suit.D': 'Karo', 'suit.S': 'Pik', 'suit.C': 'Kreuz', 'face.J': 'B', 'face.Q': 'D', 'face.K': 'K',
},
};
function detectLang() { const n = (navigator.language || 'fr').slice(0, 2).toLowerCase(); return LANGS.includes(n) ? n : 'en'; }
let LANG = 'fr';
function t(key, vars) {
  let s = (I18N[LANG] && I18N[LANG][key]) ?? I18N.fr[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  return s;
}
const nCards = n => n + ' ' + t(n > 1 ? 'n.cards' : 'n.card');
const nPacks = n => n + ' ' + t(n > 1 ? 'n.packs' : 'n.pack');

/* =====================================================================
   RÉPONSES ÉCRITES (modes Difficile / Expert) — mots acceptés
   Toutes les langues sont acceptées en même temps, quelle que soit
   la langue de l'interface. Ajoute des mots ici si tu veux.
   ===================================================================== */
const WORDS = {
  rank: {
    A: '1 A as ace Ass asso ás aas',
    '2': '2 deux two dos zwei due dois twee',
    '3': '3 trois three tres três drei tre drie',
    '4': '4 quatre four cuatro vier quattro quatro',
    '5': '5 cinq five cinco fünf fuenf cinque vijf',
    '6': '6 six seis sechs sei zes',
    '7': '7 sept seven siete sieben sette sete zeven',
    '8': '8 huit eight ocho acht otto oito',
    '9': '9 neuf nine nueve neun nove negen',
    '10': '10 dix ten diez zehn dieci dez tien',
    J: '11 V J B valet jack knave jota sota Bube Bauer fante valete boer',
    Q: '12 D Q dame reine queen reina dama Königin donna regina rainha vrouw koningin',
    K: '13 R K roi king rey König re rei heer koning',
    JK: 'joker jokers jolly comodín coringa curinga jocker ★ *',
  },
  suit: {
    H: '♥ ♡ H cœur cœurs heart hearts corazón corazones Herz cuori cuore copas harten',
    D: '♦ ♢ D carreau carreaux diamond diamonds diamante diamantes Karo caro quadri quadro ouros oros ruiten',
    S: '♠ ♤ S pique piques spade spades pica picas Pik picche espadas espada schoppen',
    C: '♣ ♧ C trèfle trèfles club clubs trébol tréboles Kreuz Treff fiori paus bastos klaveren',
  },
  color: {
    red: 'rouge red rojo roja rot rote roter rosso rossa vermelho vermelha rood',
    black: 'noir noire black negro negra schwarz schwarze schwarzer nero nera preto preta zwart',
  },
};
const FILLER = new Set('de del des du of von vom der die das di do da la le les el los las the un une en et and y und e'.split(' '));
const normTxt = s => String(s || '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[︎️]/g, '');
const RANK_W = {}, SUIT_W = {}, COLOR_W = {};
for (const [k, l] of Object.entries(WORDS.rank)) l.split(' ').forEach(w => { RANK_W[normTxt(w)] = k; });
for (const [k, l] of Object.entries(WORDS.suit)) l.split(' ').forEach(w => { SUIT_W[normTxt(w)] = k; });
for (const [k, l] of Object.entries(WORDS.color)) l.split(' ').forEach(w => { COLOR_W[normTxt(w)] = k; });
const SUIT_SYMS = '♥♡♦♢♠♤♣♧★*';
function tokenize(s) {
  s = normTxt(s).replace(new RegExp('([' + SUIT_SYMS + '])', 'g'), ' $1 ').replace(/(\d+)/g, ' $1 ');
  return s.split(new RegExp('[^a-z0-9' + SUIT_SYMS + ']+')).filter(w => w && !FILLER.has(w));
}
/* Analyse une réponse écrite.
   → { status:'ok', rank:'Q', suit:'H' } | { status:'ok', joker:true, color:'red'|null }
   → status 'empty' | 'unknown' | 'needSuit' | 'needRank' | 'needColor' */
function parseAnswer(input, needSuit) {
  const tk = tokenize(input);
  if (!tk.length) return { status: 'empty' };
  if (tk.some(w => RANK_W[w] === 'JK')) {
    let color = null;
    for (const w of tk) {
      if (RANK_W[w] === 'JK') continue;
      if (COLOR_W[w]) color = COLOR_W[w];
      else if (SUIT_W[w]) color = 'HD'.includes(SUIT_W[w]) ? 'red' : 'black';
      else return { status: 'unknown' };
    }
    if (needSuit && !color) return { status: 'needColor', joker: true };
    return { status: 'ok', joker: true, color };
  }
  let rank = null, suit = null;
  for (const w of tk) if (!RANK_W[w] && !SUIT_W[w] && !COLOR_W[w] && !compact(w)) return { status: 'unknown' };
  // 1) une hauteur + une enseigne dans deux mots différents
  for (let i = 0; i < tk.length && !suit; i++) {
    if (!RANK_W[tk[i]]) continue;
    for (let j = 0; j < tk.length; j++) if (j !== i && SUIT_W[tk[j]]) { rank = RANK_W[tk[i]]; suit = SUIT_W[tk[j]]; break; }
  }
  // 2) écriture compacte : KH, 10s, qd…
  if (!suit) for (const w of tk) { const c = compact(w); if (c) { rank = c.rank; suit = c.suit; break; } }
  // 3) sinon, hauteur seule ou enseigne seule
  if (!rank && !suit) {
    const r = tk.find(w => RANK_W[w]); if (r) rank = RANK_W[r];
    const s = tk.find(w => SUIT_W[w] && !RANK_W[w]); if (s) suit = SUIT_W[s];
    if (!rank && !s) { const s2 = tk.find(w => SUIT_W[w]); if (s2) suit = SUIT_W[s2]; }
  }
  if (!rank && !suit) return { status: 'unknown' };
  if (!rank) return { status: 'needRank', suit };
  if (needSuit && !suit) return { status: 'needSuit', rank };
  return { status: 'ok', rank, suit };
}
function compact(w) {
  if (RANK_W[w] || SUIT_W[w]) return null;
  const m = /^(.+?)([hdsc])$/.exec(w);
  if (m && RANK_W[m[1]] && RANK_W[m[1]] !== 'JK') return { rank: RANK_W[m[1]], suit: SUIT_W[m[2]] };
  return null;
}
function answerMatches(card, a, needSuit) {
  if (card.joker) return !!a.joker && (!needSuit || a.color === card.c);
  if (a.joker) return false;
  return a.rank === card.r && (!needSuit || a.suit === card.s);
}

/* ===================== 100 PSEUDOS (style Xbox) ===================== */
const PSEUDOS = [
  'BateauTigre','RenardAgile','LoutreRapide','NuageBrave','PirateCalme','CometeFolle','PingouinFurtif','DragonDoux','HibouMalin','CactusJoyeux',
  'ZebreCosmique','TortueTurbo','LapinNinja','FauconSage','PoulpeRoyal','ChatonSauvage','BisonTranquille','MarmotteVive','VolcanTimide','OuraganDoux',
  'GeckoPilote','LamaMystique','RequinPoli','CastorRebelle','PandaElectrique','CorbeauLunaire','MoutonFeroce','CrevetteGeante','AigleFantome','ScarabeeDore',
  'SanglierRuse','PhenixTimide','BaleineAgile','FourmiTitan','LynxSilencieux','KoalaPirate','YetiCurieux','GirafeRapide','CygneSombre','MammouthZen',
  'CrabeAudacieux','LezardSolaire','CoyoteMagique','ManchotFurieux','HerissonCosmique','GorilleCalme','RatonVif','PieuvreRusee','TaureauLunaire','LibelluleFolle',
  'CaribouBrave','FlamantRapide','ToucanJovial','OursTonnerre','GrenouilleNinja','ChouetteAstrale','DauphinRieur','MustangSauvage','OrqueTranquille','VipereDouce',
  'BlaireauHardi','CameleonFlou','PumaEclair','CanardMeteore','SingeFarceur','LoupGivre','HyeneSage','ElanVaillant','MouetteRebelle','TapirGalactique',
  'AlpagaFurtif','PelicanPilote','CerfBoreal','ChameauTurbo','MerlePecheur','TatouBlinde','IguaneRoyal','OcelotAgile','FuretMalicieux','AnguilleVive',
  'CondorFier','GuepardNomade','HamsterTitan','JaguarNocturne','KangourouFou','LemurienZen','MorseGrognon','NarvalMagique','OtarieJoueuse','PerroquetBavard',
  'QuokkaSouriant','RhinoTonnerre','SalamandreFeu','TigreNeige','UrsonCurieux','VautourPatient','WapitiNoble','XerusRapide','YakSerein','ZorilleMalin'
];
const randomPseudo = () => PSEUDOS[rnd32() % PSEUDOS.length] + String(rnd32() % 10000).padStart(4, '0');
const PSEUDO_RE = /^[A-Za-z0-9_-]{3,20}$/;

/* ============================ PRÉRÉGLAGES ============================ */
const BG_PRESETS = [
  'radial-gradient(1200px 800px at 50% 0%,#26315c 0%,#0b0f22 55%,#05070f 100%)',
  'linear-gradient(160deg,#0f2027 0%,#203a43 45%,#2c5364 100%)',
  'linear-gradient(160deg,#2a0f45 0%,#7a2e6b 50%,#e0795d 100%)',
  'radial-gradient(1000px 700px at 50% 10%,#1d4a34,#0a1f15 70%)',
  'linear-gradient(160deg,#2c2f36,#14161b)',
];
const FELTS = [
  { v: 'radial-gradient(ellipse at 50% 40%,#2a9160 0%,#146b42 45%,#0a3f26 100%)', rim: '#3b2414' },
  { v: 'radial-gradient(ellipse at 50% 40%,#2f63a8 0%,#1a3f78 45%,#0b1f42 100%)', rim: '#1c1c26' },
  { v: 'radial-gradient(ellipse at 50% 40%,#9a2541 0%,#6b1429 45%,#350712 100%)', rim: '#2b1a0e' },
  { v: 'repeating-linear-gradient(92deg,rgba(0,0,0,.09) 0 2px,transparent 2px 14px),repeating-linear-gradient(88deg,rgba(255,255,255,.05) 0 1px,transparent 1px 23px),linear-gradient(180deg,#8a5a34,#6b4226 50%,#4e2f1a)', rim: '#2a170b' },
  { v: 'radial-gradient(ellipse at 50% 40%,#4a5262 0%,#2c323d 50%,#171a20 100%)', rim: '#0f1114' },
];
const CARD_STYLES = ['classic', 'royal', 'neon', 'minimal', 'pixel'];
const DIFFS = ['normal', 'hard', 'expert'];
const MODES = ['classic', 'infinite', 'half', 'full', 'c15'];
const DIFF_LVL = { normal: 1, hard: 2, expert: 3 };
const bkey = (d, m) => d + '.' + m;
const isChrono = m => m === 'half' || m === 'full' || m === 'c15';
const isTime = m => m === 'half' || m === 'full';
const C15_MS = 15 * 60 * 1000;
const modeLabel = m => t({ classic: 'mode.classic', infinite: 'mode.infinite', half: 'mode.half', full: 'hud.mode.full', c15: 'mode.c15' }[m]);
const boardTabLabel = m => t({ classic: 'mode.classic', infinite: 'mode.infinite', half: 'mode.half', full: 'board.tab.full', c15: 'board.tab.c15' }[m]);
const dots = d => [1, 2, 3].map(i => `<i class="${i <= DIFF_LVL[d] ? 'on' : ''}"></i>`).join('');

/* ============================ CARTES ============================ */
const SUITS = ['H', 'D', 'S', 'C'];
const SYM = { H: '♥', D: '♦', S: '♠', C: '♣' };
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const VS = '︎';
function fullDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ r, s, c: s === 'H' || s === 'D' ? 'red' : 'black' });
  d.push({ r: 'JK', s: '', c: 'red', joker: true }, { r: 'JK', s: '', c: 'black', joker: true });
  return d;
}
function shuffle(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function buildDeck(kind, seed) {
  const rng = mulberry32(seed); const all = fullDeck();
  if (kind === 'half') {
    const R = shuffle(all.filter(c => !c.joker && c.c === 'red'), rng).slice(0, 13);
    const B = shuffle(all.filter(c => !c.joker && c.c === 'black'), rng).slice(0, 13);
    return shuffle(R.concat(B), rng);
  }
  return shuffle(all, rng);
}
const faceLetter = r => ['J', 'Q', 'K'].includes(r) ? t('face.' + r) : r;
const rankName = r => ['A', 'J', 'Q', 'K'].includes(r) ? t('rank.' + r) : r;
const suitName = s => t('suit.' + s);
const jokerName = c => c === 'red' ? t('card.jokerRed') : c === 'black' ? t('card.jokerBlack') : t('card.joker');
function cardName(c) {
  if (c.joker) return jokerName(c.c);
  const s = t('card.fmt', { r: rankName(c.r), s: suitName(c.s) });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function faceHTML(c) {
  if (c.joker) {
    const v = 'J<br>O<br>K<br>E<br>R';
    return `<div class="idx tl jkx">${v}</div><div class="pip jk"><span class="star">★</span><em>JOKER</em></div><div class="idx br jkx">${v}</div>`;
  }
  const sym = SYM[c.s] + VS, L = faceLetter(c.r), idx = `<span class="rk">${L}</span><span class="st">${sym}</span>`;
  const mid = ['J', 'Q', 'K'].includes(c.r) ? `<div class="pip court"><span class="cl">${L}</span><span class="cs">${sym}</span></div>`
    : `<div class="pip${c.r === 'A' ? ' ace' : ''}">${sym}</div>`;
  return `<div class="idx tl">${idx}</div>${mid}<div class="idx br">${idx}</div>`;
}
function cardEl(c, up = true) {
  const el = document.createElement('div');
  el.className = 'card' + (up ? ' up' : '');
  el.innerHTML = `<div class="inner"><div class="face back"></div><div class="face front ${c ? c.c : ''}">${c ? faceHTML(c) : ''}</div></div>`;
  return el;
}

/* ======================== ÉTAT SAUVEGARDÉ ======================== */
const DEFAULT_SET = { lang: '', diff: 'normal', bg: 0, bgCustom: '#24305e', felt: 0, cards: 'classic', redLabel: '', blackLabel: '', redColor: '#d4263f', blackColor: '#24252e', master: 80, sfx: 80, music: 35 };
const P = {
  player: store.get('m54_player', null),
  prog: store.get('m54_prog', null) || {},
  set: Object.assign({}, DEFAULT_SET, store.get('m54_set', {})),
};
// anciennes sauvegardes (avant les difficultés) → mode Normal
if (P.prog.classic && !P.prog['normal.classic']) {
  const o = P.prog; P.prog = {};
  MODES.forEach(m => { if (o[m] != null) P.prog[bkey('normal', m)] = o[m]; });
}
if (P.set.redLabel === 'Rouge') P.set.redLabel = '';
if (P.set.blackLabel === 'Noir') P.set.blackLabel = '';
if (!LANGS.includes(P.set.lang)) P.set.lang = detectLang();
if (!DIFFS.includes(P.set.diff)) P.set.diff = 'normal';
LANG = P.set.lang;
function classicProg(d) { const k = bkey(d, 'classic'); if (!P.prog[k]) P.prog[k] = { seed: randSeed(), packs: 0, best: 0, pos: 0 }; return P.prog[k]; }
DIFFS.forEach(classicProg);
function saveLocal() { store.set('m54_player', P.player); store.set('m54_prog', P.prog); store.set('m54_set', P.set); }

/* Scores à envoyer : { "normal.classic": {v1:paquets, v2:carte, seed}, "hard.infinite": {v1}, … } */
function scoresFromProg() {
  const sc = {};
  for (const d of DIFFS) for (const m of MODES) {
    const k = bkey(d, m), v = P.prog[k]; if (v == null) continue;
    if (m === 'classic') { if (v.packs > 0 || v.best > 0) sc[k] = { v1: v.packs, v2: v.best, seed: v.seed }; }
    else if (isTime(m)) sc[k] = { v1: Math.round(v) };
    else if (v > 0) sc[k] = { v1: v };
  }
  return sc;
}
function progFromScores(scores) {
  const p = {};
  for (const [k, s] of Object.entries(scores || {})) {
    const m = k.split('.')[1];
    if (m === 'classic') p[k] = { seed: Number(s.seed) || randSeed(), packs: Number(s.v1) || 0, best: Number(s.v2) || 0, pos: 0 };
    else p[k] = Number(s.v1);
  }
  return p;
}
function better(board, n, o) {
  const m = board.split('.')[1];
  if (!o) return true;
  if (m === 'classic') return n.v1 > o.v1 || (n.v1 === o.v1 && n.v2 >= o.v2);
  if (isTime(m)) return n.v1 < o.v1;
  return n.v1 > o.v1;
}
function validScore(board, s) {
  const m = board.split('.')[1];
  if (m === 'classic') return s.v1 >= 0 && s.v2 >= 0 && s.v2 <= 54;
  if (m === 'half') return s.v1 >= 3000;
  if (m === 'full') return s.v1 >= 6000;
  return s.v1 > 0;
}

/* ===================== STOCKAGE LOCAL (hors-ligne) ===================== */
const Local = {
  db() {
    const db = store.get('m54_db', { players: {} });
    for (const p of Object.values(db.players)) if (!p.scores) { // ancien format
      p.scores = {};
      if (p.classic_packs || p.classic_card) p.scores['normal.classic'] = { v1: p.classic_packs, v2: p.classic_card, seed: p.classic_seed };
      if (p.infinite_best) p.scores['normal.infinite'] = { v1: p.infinite_best };
      if (p.chrono_half_ms != null) p.scores['normal.half'] = { v1: p.chrono_half_ms };
      if (p.chrono_full_ms != null) p.scores['normal.full'] = { v1: p.chrono_full_ms };
      if (p.chrono_15_best) p.scores['normal.c15'] = { v1: p.chrono_15_best };
    }
    return db;
  },
  put(db) { store.set('m54_db', db); },
  find(db, pseudo) { return Object.values(db.players).find(p => p.pseudo.toLowerCase() === pseudo.toLowerCase()); },
  auth(db, id, secret) { const p = db.players[id]; if (!p || p.secret !== secret) throw new Error('AUTH'); return p; },
  register(pseudo, secret) {
    const db = this.db();
    if (!PSEUDO_RE.test(pseudo)) throw new Error('PSEUDO_INVALIDE');
    if (this.find(db, pseudo)) throw new Error('PSEUDO_PRIS');
    const id = uuid(); db.players[id] = { id, pseudo, secret, scores: {} }; this.put(db); return id;
  },
  rename(id, secret, pseudo) {
    const db = this.db(); const p = this.auth(db, id, secret);
    if (!PSEUDO_RE.test(pseudo)) throw new Error('PSEUDO_INVALIDE');
    const o = this.find(db, pseudo); if (o && o.id !== id) throw new Error('PSEUDO_PRIS');
    p.pseudo = pseudo; this.put(db);
  },
  save(id, secret, scores) {
    const db = this.db(); const p = this.auth(db, id, secret);
    for (const [k, s] of Object.entries(scores)) if (validScore(k, s) && better(k, s, p.scores[k])) p.scores[k] = s;
    this.put(db);
  },
  recover(secret) { const p = Object.values(this.db().players).find(p => p.secret === secret); return p ? [{ id: p.id, pseudo: p.pseudo, scores: p.scores }] : []; },
  board(board) {
    const m = board.split('.')[1];
    const r = Object.values(this.db().players).filter(p => p.scores[board]).map(p => ({ id: p.id, pseudo: p.pseudo, v1: p.scores[board].v1, v2: m === 'classic' ? p.scores[board].v2 : null }));
    r.sort((a, b) => m === 'classic' ? (b.v1 - a.v1 || b.v2 - a.v2) : isTime(m) ? a.v1 - b.v1 : b.v1 - a.v1);
    let last, pos = 0; r.forEach((x, i) => { const k = x.v1 + '|' + x.v2; if (k !== last) { pos = i + 1; last = k; } x.pos = pos; });
    return r;
  },
};

/* ========================= API EN LIGNE ========================= */
/* Nettoie l'URL collée (accepte aussi l'URL du tableau de bord ou une URL finissant par /rest/v1) */
function cleanUrl(u) {
  u = String(u || '').trim().replace(/\s/g, '');
  const m = /supabase\.com\/dashboard\/project\/([a-z0-9]+)/i.exec(u);
  if (m) return 'https://' + m[1] + '.supabase.co';
  u = u.replace(/\/rest\/v1.*$/i, '').replace(/\/+$/, '');
  if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}
const SB_URL = cleanUrl(CONFIG.SUPABASE_URL);
const SB_KEY = String(CONFIG.SUPABASE_KEY || '').trim().replace(/^['"]|['"]$/g, '');
const BACKEND = SB_URL && SB_KEY ? SB_URL : 'local';

/* Traduit une erreur technique en message compréhensible */
function explainError(e) {
  const msg = String((e && e.message) || e), st = e && e.status, code = e && e.code;
  if (/SECRET_KEY/.test(msg)) return t('e.secret');
  if (/BAD_URL/.test(msg)) return t('e.url');
  if (/NETWORK/.test(msg)) return t('e.net');
  if (st === 401 || st === 403 && /api key|apikey|JWT/i.test(msg) || /invalid api key|no api key|unregistered api key/i.test(msg)) return t('e.key');
  if (code === 'PGRST202' || st === 404 || /could not find the function/i.test(msg)) return t('e.fn');
  if (/permission denied/i.test(msg)) return t('e.perm');
  if (/^AUTH$/.test(msg)) return t('e.auth');
  return t('e.other', { x: msg });
}
let lastErr = null;

const API = {
  online: BACKEND !== 'local',
  async rpc(fn, body) {
    if (SB_KEY.startsWith('sb_secret_')) throw new Error('SECRET_KEY');
    if (!/^https?:\/\/[^/]+$/i.test(SB_URL)) throw new Error('BAD_URL');
    const h = { 'Content-Type': 'application/json', apikey: SB_KEY };
    if (SB_KEY.startsWith('eyJ')) h.Authorization = 'Bearer ' + SB_KEY;
    let r;
    try { r = await fetch(SB_URL + '/rest/v1/rpc/' + fn, { method: 'POST', headers: h, body: JSON.stringify(body), keepalive: document.hidden }); }
    catch (e) { throw new Error('NETWORK'); }
    const tx = await r.text(); let d = null; try { d = tx ? JSON.parse(tx) : null; } catch (e) {}
    if (!r.ok) {
      const err = new Error((d && (d.message || d.error || d.msg)) || ('HTTP ' + r.status));
      err.status = r.status; err.code = d && d.code; throw err;
    }
    return d;
  },
  async register(pseudo, secret) { return this.online ? this.rpc('register_player', { p_pseudo: pseudo, p_secret: secret }) : Local.register(pseudo, secret); },
  async rename(pseudo) { const p = P.player; return this.online ? this.rpc('rename_player', { p_id: p.id, p_secret: p.secret, p_pseudo: pseudo }) : Local.rename(p.id, p.secret, pseudo); },
  async save() {
    const pl = P.player, sc = scoresFromProg();
    return this.online ? this.rpc('save_scores', { p_id: pl.id, p_secret: pl.secret, p_scores: sc }) : Local.save(pl.id, pl.secret, sc);
  },
  async recover(code) { const r = this.online ? await this.rpc('recover_player', { p_secret: code }) : Local.recover(code); return Array.isArray(r) ? r[0] : r; },
  async leaderboard(board, limit) { if (this.online) return (await this.rpc('get_leaderboard', { p_board: board, p_limit: limit })) || []; return Local.board(board).slice(0, limit); },
  async myRank(board) {
    if (!P.player || !P.player.id) return null;
    if (this.online) { const r = await this.rpc('get_my_rank', { p_id: P.player.id, p_board: board }); return (r && r[0]) || null; }
    const b = Local.board(board); const me = b.find(x => x.id === P.player.id); return me ? Object.assign({ total: b.length }, me) : null;
  },
};

/* ========================= JOUEUR & SYNCHRO ========================= */
let netOk = null;
function setNet(ok, e) { netOk = ok; lastErr = ok ? null : (e || lastErr); renderNet(); }
/* Un profil créé en mode local (ou sur un autre projet) n'existe pas sur le serveur actuel :
   on garde pseudo + code et on le réinscrit sur le bon serveur. */
if (P.player && P.player.backend !== BACKEND) { P.player.id = null; P.player.backend = BACKEND; saveLocal(); }
async function ensurePlayer() {
  if (!P.player) { P.player = { id: null, pseudo: randomPseudo(), secret: genCode(), backend: BACKEND }; saveLocal(); }
  if (!P.player.id) {
    for (let i = 0; i < 6; i++) {
      try { P.player.id = await API.register(P.player.pseudo, P.player.secret); P.player.backend = BACKEND; setNet(true); break; }
      catch (e) {
        if (/PSEUDO_PRIS/.test(e.message)) { P.player.pseudo = randomPseudo(); continue; }
        if (e.status === 409 || /duplicate|unique/i.test(e.message)) { P.player.secret = genCode(); continue; }
        setNet(false, e); break;
      }
    }
    saveLocal();
  } else if (netOk === null) setNet(true);
  renderPlayer();
  return !!P.player.id;
}
let syncT = null, syncing = null;
function queueSync() { clearTimeout(syncT); syncT = setTimeout(syncNow, 1500); }
function syncNow() {
  clearTimeout(syncT);
  if (syncing) return syncing;
  syncing = (async () => {
    try {
      if (!P.player || !P.player.id) { if (!(await ensurePlayer())) return false; }
      try { await API.save(); }
      catch (e) {
        if (!/^AUTH$/.test(e.message)) throw e;
        P.player.id = null; saveLocal();                       // profil inconnu du serveur : on le réinscrit
        if (!(await ensurePlayer())) return false;
        await API.save();
      }
      setNet(true); return true;
    } catch (e) {
      setNet(false, e); return false;
    } finally { syncing = null; }
  })();
  return syncing;
}

/* ============================ SON ============================ */
const Sound = {
  ctx: null, bar: 0, nextBar: 0, barLen: 3.2,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.connect(this.master);
    this.mus = c.createGain(); this.mus.connect(this.master);
    const len = Math.floor(c.sampleRate * .6), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = b; this.apply();
    this.nextBar = c.currentTime + .15; this.timer = setInterval(() => this.schedule(), 250);
  },
  apply() {
    if (!this.ctx) return; const s = P.set, tt = this.ctx.currentTime;
    this.master.gain.setTargetAtTime((s.master / 100) ** 2, tt, .05);
    this.sfx.gain.setTargetAtTime((s.sfx / 100) ** 2, tt, .05);
    this.mus.gain.setTargetAtTime((s.music / 100) ** 2 * .9, tt, .2);
  },
  env(g, tt, a, peak, dur) { g.gain.setValueAtTime(.0001, tt); g.gain.exponentialRampToValueAtTime(peak, tt + a); g.gain.exponentialRampToValueAtTime(.0001, tt + dur); },
  tone(f, dt, dur, type = 'sine', vol = .2, dest, slide) {
    const c = this.ctx; if (!c) return; const tt = c.currentTime + dt;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, tt);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, tt + dur);
    this.env(g, tt, .01, vol, dur); o.connect(g); g.connect(dest || this.sfx); o.start(tt); o.stop(tt + dur + .05);
  },
  hiss(dt, dur, freq, vol, q = 1) {
    const c = this.ctx; if (!c) return; const tt = c.currentTime + dt;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); this.env(g, tt, .004, vol, dur);
    s.connect(f); f.connect(g); g.connect(this.sfx); s.start(tt, Math.random() * .4, dur + .05);
  },
  flip() { this.hiss(0, .07, 2600, .55, .8); this.hiss(.035, .05, 1300, .3); },
  correct() { this.tone(784, 0, .14, 'triangle', .18); this.tone(1175, .08, .24, 'sine', .16); },
  wrong() { this.tone(220, 0, .3, 'sawtooth', .06, null, 150); this.tone(150, .1, .4, 'triangle', .16, null, 98); },
  lose() { this.tone(110, 0, .5, 'sine', .3, null, 55); this.hiss(0, .2, 300, .3); },
  shuffle() { for (let i = 0; i < 16; i++) this.hiss(i * .032, .045, 1700 + Math.random() * 1700, .3, 1.2); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, i * .09, .38, 'triangle', .15)); this.tone(1568, .5, .7, 'sine', .1); },
  click() { this.tone(1500, 0, .03, 'square', .025); },
  /* musique d'ambiance générée (aucun fichier à héberger) */
  schedule() {
    const c = this.ctx; if (!c) return;
    if (P.set.music <= 0 || P.set.master <= 0 || document.hidden) { this.nextBar = Math.max(this.nextBar, c.currentTime + .2); return; }
    while (this.nextBar < c.currentTime + 1) { this.playBar(this.nextBar, this.bar++); this.nextBar += this.barLen; }
  },
  playBar(tt, i) {
    const c = this.ctx, mf = m => 440 * 2 ** ((m - 69) / 12);
    const chords = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]];
    const ch = chords[i % 4], L = this.barLen;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(this.mus);
    ch.forEach(m => {
      const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = mf(m); o.detune.value = Math.random() * 8 - 4;
      g.gain.setValueAtTime(.0001, tt); g.gain.linearRampToValueAtTime(.03, tt + .9); g.gain.linearRampToValueAtTime(.0001, tt + L + .3);
      o.connect(g); g.connect(lp); o.start(tt); o.stop(tt + L + .4);
    });
    [0, L / 2].forEach(dt => {
      const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = mf(ch[0] - 12);
      g.gain.setValueAtTime(.0001, tt + dt); g.gain.exponentialRampToValueAtTime(.09, tt + dt + .03); g.gain.exponentialRampToValueAtTime(.0001, tt + dt + 1.4);
      o.connect(g); g.connect(this.mus); o.start(tt + dt); o.stop(tt + dt + 1.5);
    });
    const pat = [0, 2, 1, 3, 2, 1, 3, 2];
    pat.forEach((k, j) => {
      if (i % 2 && j === 7) return;
      const t2 = tt + j * L / 8, o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = mf(ch[k] + 12);
      g.gain.setValueAtTime(.0001, t2); g.gain.exponentialRampToValueAtTime(.028, t2 + .01); g.gain.exponentialRampToValueAtTime(.0001, t2 + .5);
      o.connect(g); g.connect(this.mus); o.start(t2); o.stop(t2 + .55);
    });
  },
};

/* ============================ JEU ============================ */
let G = null;
const deckBox = $('#deckBox'), pileBox = $('#pileBox'), ansIn = $('#ansIn');
const curDiff = () => G ? G.diff : P.set.diff;

function newSession(mode, diff) {
  const g = { mode, diff, key: bkey(diff, mode), packs: 0, best: 0, pos: 0, seen: 0, seed: randSeed(), lives: 3, started: false, t0: 0, final: 0, ended: false, busy: false, wrong: null };
  if (mode === 'classic') { const c = classicProg(diff); Object.assign(g, { seed: c.seed, packs: c.packs, best: c.best, pos: c.pos || 0 }); }
  g.deck = buildDeck(mode === 'half' ? 'half' : 'full', g.seed);
  if (g.pos >= g.deck.length) g.pos = 0;
  g.best = Math.min(Math.max(g.best, g.pos), g.deck.length);
  g.seen = g.best;
  return g;
}
function startMode(mode) {
  closeAllModals(); Sound.init();
  if (G) G.ended = true;
  G = newSession(mode, P.set.diff);
  $('#menu').classList.add('off'); $('#diffScreen').classList.add('off');
  ansIn.value = ''; updatePreview();
  renderAll();
  if (mode === 'classic' && G.pos > 0) toast(t('toast.resume', { n: G.pos + 1 }));
  if (isChrono(mode)) toast(t('toast.chrono'));
  if (G.diff !== 'normal') ansIn.focus({ preventScroll: true });
}
function persist() {
  if (!G || G.mode !== 'classic') return;
  P.prog[G.key] = { seed: G.seed, packs: G.packs, best: G.best, pos: G.pos };
  saveLocal(); queueSync();
}

/* --- Normal : Rouge / Noir --- */
function guess(color) {
  if (!G || G.busy || G.ended || G.diff !== 'normal') return;
  const ok = G.deck[G.pos].c === color;
  btnFx(color, ok);
  reveal(ok);
}
/* --- Difficile / Expert : réponse écrite (forcedSuit = symbole touché) --- */
function submitAnswer(forcedSuit) {
  if (!G || G.ended || G.diff === 'normal') return;
  const needSuit = G.diff === 'expert';
  let a;
  if (forcedSuit) {
    a = parseAnswer(ansIn.value, false);
    if (a.status !== 'ok') return ansError(t('ans.tapSuit'));
    if (a.joker) a.color = 'HD'.includes(forcedSuit) ? 'red' : 'black'; else a.suit = forcedSuit;
  } else {
    a = parseAnswer(ansIn.value, needSuit);
    if (a.status === 'empty') return ansError('');
    if (a.status !== 'ok') return ansError(previewText(a));
  }
  if (G.busy) return;
  const ok = answerMatches(G.deck[G.pos], a, needSuit);
  ansIn.value = ''; updatePreview();
  ansFx(ok);
  reveal(ok);
}
function previewText(a) {
  const needSuit = curDiff() === 'expert';
  switch (a.status) {
    case 'ok': return a.joker ? jokerName(needSuit ? a.color : null) : needSuit ? cardName({ r: a.rank, s: a.suit }) : rankName(a.rank);
    case 'needSuit': return t('ans.needSuit', { x: rankName(a.rank) });
    case 'needRank': return t('ans.needRank', { x: SYM[a.suit] + ' ' + suitName(a.suit) });
    case 'needColor': return t('ans.needColor');
    case 'unknown': return t('ans.unknown');
    default: return '';
  }
}
const KNOWN_WORDS = Object.keys(RANK_W).concat(Object.keys(SUIT_W), Object.keys(COLOR_W));
function typingWord(v) { // dernier mot en cours de frappe (début d'un mot connu) ?
  const tk = tokenize(v), last = tk[tk.length - 1];
  return !!last && !/\s$/.test(v) && KNOWN_WORDS.some(w => w.length > last.length && w.startsWith(last));
}
function updatePreview() {
  const el = $('#ansPrev'), a = parseAnswer(ansIn.value, curDiff() === 'expert');
  if (a.status === 'unknown' && typingWord(ansIn.value)) { el.textContent = '…'; el.className = 'ans-prev'; return; }
  el.textContent = a.status === 'ok' ? '→ ' + previewText(a) : previewText(a);
  el.className = 'ans-prev ' + (a.status === 'ok' ? 'good' : a.status === 'unknown' ? 'bad' : a.status === 'empty' ? '' : 'part');
}
function ansError(msg) {
  const f = $('#ansField');
  if (msg) { const el = $('#ansPrev'); el.textContent = msg; el.className = 'ans-prev bad'; }
  f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
  ansIn.focus({ preventScroll: true });
}
function ansFx(ok) {
  const bar = $('#answerBar');
  bar.classList.remove('ok', 'ko'); void bar.offsetWidth; bar.classList.add(ok ? 'ok' : 'ko');
  setTimeout(() => bar.classList.remove('ok', 'ko'), 650);
}

/* --- révélation de la carte (commun à toutes les difficultés) --- */
async function reveal(ok) {
  const S0 = G; Sound.init();
  if (isChrono(G.mode) && !G.started) { G.started = true; G.t0 = performance.now(); }
  G.busy = true;
  const card = G.deck[G.pos], fast = isChrono(G.mode);
  hideCaption();
  renderDeck(G.deck.length - G.pos - 1);
  Sound.flip();
  await flyCard(card, deckBox, pileBox, { dur: fast ? 300 : 460 });
  if (G !== S0 || G.ended) return;

  if (ok) {
    G.pos++; G.best = Math.max(G.best, G.pos); G.seen = Math.max(G.seen, G.pos);
    Sound.correct(); renderPile(); renderHud();
    if (G.pos >= G.deck.length) { persist(); await packComplete(S0); if (G !== S0 || G.ended) return; }
    persist();
  } else {
    const seenBefore = G.pos < G.seen;
    G.wrong = G.pos; G.seen = Math.max(G.seen, G.pos + 1);
    Sound.wrong(); renderPile(); ringFlash();
    let extra = '';
    if (G.mode === 'infinite') {
      if (seenBefore) { G.lives--; Sound.lose(); renderHud(true); extra = `<small>${t('cap.seen')}</small>`; }
      else extra = `<small>${t('cap.unseen')}</small>`;
    }
    showCaption(esc(t('cap.miss', { x: cardName(card) })) + extra);
    await wait(fast ? 800 : (G.diff === 'normal' ? 1300 : 1700));
    if (G !== S0 || G.ended) return;
    if (G.mode === 'infinite' && G.lives <= 0) { hideCaption(); return endGame('lives'); }
    const n = G.pos + 1; G.wrong = null; G.pos = 0;
    hideCaption();
    await returnCards(n, S0);
    if (G !== S0 || G.ended) return;
    renderAll(); persist();
  }
  G.busy = false;
}

async function packComplete(S0) {
  G.packs++;
  Sound.win(); confetti(); banner(t(G.mode === 'half' ? 'ban.half' : 'ban.full'));
  if (isTime(G.mode)) { G.final = performance.now() - G.t0; renderHud(); await wait(1100); if (G === S0) endGame('done'); return; }
  renderHud();
  await wait(1400); if (G !== S0 || G.ended) return;
  await returnCards(G.deck.length, S0); if (G !== S0 || G.ended) return;
  G.seed = randSeed(); G.deck = buildDeck('full', G.seed); G.pos = 0; G.best = 0; G.seen = 0;
  if (G.mode === 'infinite') { G.lives = Math.min(5, G.lives + 1); toast(t('toast.life')); }
  else if (G.mode === 'classic') toast(t('toast.newpack'));
  renderAll();
}

function liveScore(g) { return g.packs * 54 + g.best; }
function endGame(reason) {
  if (!G || G.ended) return;
  const g = G; g.ended = true; g.busy = true;
  const m = g.mode, k = g.key; let score, label, rec = false;
  if (m === 'infinite' || m === 'c15') {
    score = liveScore(g); if (score > (P.prog[k] || 0)) { P.prog[k] = score; rec = true; }
    label = nCards(score);
  } else {
    score = g.final; if (P.prog[k] == null || score < P.prog[k]) { P.prog[k] = score; rec = true; }
    label = fmtTime(score);
  }
  saveLocal(); renderHud();
  const T = {
    lives: ['💔', 'res.lives.t', 'res.lives.s'],
    time: ['⏰', 'res.time.t', 'res.time.s'],
    done: ['🏁', m === 'half' ? 'res.done.half' : 'res.done.full', 'res.done.s'],
    quit: ['🚪', 'res.quit.t', 'res.quit.s'],
  }[reason];
  $('#resIco').textContent = T[0]; $('#resTitle').textContent = t(T[1]);
  $('#resSub').textContent = `${modeLabel(m)} · ${t('diff.' + g.diff)} — ${t(T[2])}`;
  $('#resScore').textContent = label;
  $('#resRec').innerHTML = rec ? `<span class="res-rec">${t('res.record')}</span>` : '';
  $('#resRank').textContent = t('res.calc');
  $('#resAgain').dataset.mode = m; $('#resBoard').dataset.mode = m; $('#resBoard').dataset.diff = g.diff;
  ansIn.blur();
  openModal('resModal');
  syncNow().then(() => API.myRank(k)).then(r => {
    $('#resRank').textContent = r ? t(API.online ? 'res.rank.world' : 'res.rank.local', { p: r.pos }) + (r.total ? t('res.of', { t: r.total }) : '') : t(API.online ? 'res.unavail' : 'res.localmode');
  }).catch(() => { $('#resRank').textContent = t('res.unavail'); });
}

async function goHome() {
  if (G && !G.ended) {
    if ((G.mode === 'infinite' || (G.mode === 'c15' && G.started)) && liveScore(G) > 0) {
      if (!(await ask(t('ask.quit.t'), t('ask.quit.x', { x: nCards(liveScore(G)) }), t('ask.quit.ok')))) return;
      return endGame('quit');
    }
    if (isTime(G.mode) && G.started) {
      if (!(await ask(t('ask.abandon.t'), t('ask.abandon.x'), t('ask.abandon.ok')))) return;
    }
  }
  if (G) G.ended = true;
  G = null; renderAll(); showMenu();
}
function showMenu() { closeAllModals(); ansIn.blur(); renderMenu(); $('#diffScreen').classList.add('off'); $('#menu').classList.remove('off'); }
function showDiffScreen() {
  closeAllModals(); ansIn.blur();
  $$('.dcard').forEach(c => c.classList.toggle('sel', c.dataset.diff === P.set.diff));
  $('#menu').classList.add('off'); $('#diffScreen').classList.remove('off');
}
function chooseDiff(d) {
  P.set.diff = d; saveLocal(); Sound.init(); Sound.click();
  if (G) { G.ended = true; G = null; }
  renderAll(); showMenu();
}

/* ============================ RENDU ============================ */
function renderAll() { setInputMode(); renderDeck(); renderPile(); renderHud(); }
function setInputMode() {
  const d = curDiff(), typed = d !== 'normal';
  $('#rowChoice').classList.toggle('hide', typed);
  const bar = $('#answerBar'), tb = $('#table');
  bar.classList.toggle('hide', !typed);
  bar.classList.toggle('expert', d === 'expert');
  tb.classList.toggle('typed', typed); tb.classList.toggle('expert', d === 'expert');
  ansIn.placeholder = t(d === 'expert' ? 'ans.ph.expert' : 'ans.ph.hard');
}
function renderDeck(rem) {
  if (rem == null) rem = G ? G.deck.length - G.pos - (G.wrong != null ? 1 : 0) : 54;
  deckBox.innerHTML = '';
  if (rem <= 0) { deckBox.innerHTML = `<div class="ghost">${t('ghost.empty')}</div>`; }
  else {
    const layers = Math.max(1, Math.ceil(rem / 54 * 6));
    for (let i = 0; i < layers; i++) {
      const el = cardEl(null, false); el.classList.add('static');
      const o = (layers - 1 - i) * 1.6; el.style.transform = `translate(${o}px,${o}px)`;
      deckBox.appendChild(el);
    }
    const b = document.createElement('div'); b.className = 'badge'; b.textContent = rem; deckBox.appendChild(b);
  }
  $('#deckCount').textContent = Math.max(0, rem);
}
const tilt = i => (((i * 37) % 9) - 4) * 1.4;
function renderPile() {
  pileBox.innerHTML = '';
  const shown = G ? G.deck.slice(0, G.pos) : [];
  const list = G && G.wrong != null ? shown.concat([G.deck[G.wrong]]) : shown;
  if (!list.length) pileBox.innerHTML = `<div class="ghost">${t('ghost.pile')}</div>`;
  const start = Math.max(0, list.length - 3);
  for (let i = start; i < list.length; i++) {
    const el = cardEl(list[i], true); el.classList.add('static');
    const top = i === list.length - 1;
    if (!top) el.style.transform = `rotate(${tilt(i)}deg) translate(${tilt(i + 3)}px,${tilt(i + 1) / 2}px)`;
    if (top && G.wrong != null) el.classList.add('wrong');
    pileBox.appendChild(el);
  }
  $('#pileCount').textContent = shown.length;
}
const RING_C = 276.46;
function renderHud(lifeHit) {
  const g = G, len = g ? g.deck.length : 54, pos = g ? g.pos : 0, best = g ? g.best : 0;
  $('#hudMode').textContent = g ? `${modeLabel(g.mode)} · ${t('diff.' + g.diff)}` : t('diff.' + P.set.diff);
  $('#hudPos').textContent = pos; $('#hudLen').textContent = '/' + len;
  $('#ringProg').style.strokeDashoffset = RING_C * (1 - pos / len);
  $('#ringBest').style.strokeDashoffset = RING_C * (1 - best / len);
  $('#hudBest').textContent = best;
  $('#hudPacks').textContent = g ? g.packs : classicProg(P.set.diff).packs;
  $('#hudPacksWrap').classList.toggle('hide', !!g && isTime(g.mode));
  const inf = g && g.mode === 'infinite';
  $('#hudLivesWrap').classList.toggle('hide', !inf);
  if (inf) {
    const h = $('#hudLives'); let s = '';
    for (let i = 0; i < 5; i++) s += `<i class="${i < g.lives ? 'on' : ''}">♥${VS}</i>`;
    h.innerHTML = s;
    if (lifeHit) { h.classList.remove('hit'); void h.offsetWidth; h.classList.add('hit'); }
  }
  $('#hudTimerWrap').classList.toggle('hide', !(g && isChrono(g.mode)));
  $('#hudTimerLbl').textContent = t(g && g.mode === 'c15' ? 'hud.left' : 'hud.time');
  if (g && isChrono(g.mode)) tickTimer();
}
function tickTimer() {
  const g = G; if (!g || !isChrono(g.mode)) return;
  const el = $('#hudTimer'), wrap = $('#hudTimerWrap');
  if (g.mode === 'c15') {
    const left = g.started ? C15_MS - (performance.now() - g.t0) : C15_MS;
    el.textContent = fmtClock(g.ended ? Math.max(0, left) : left);
    wrap.classList.toggle('low', g.started && !g.ended && left < 60000);
    if (g.started && !g.ended && left <= 0) endGame('time');
  } else {
    el.textContent = fmtTime(g.ended ? g.final : g.started ? (g.final || performance.now() - g.t0) : 0);
  }
}
(function loop() { tickTimer(); requestAnimationFrame(loop); })();

function ringFlash() { const r = $('#ring'); r.classList.add('bad'); setTimeout(() => r.classList.remove('bad'), 900); }
function btnFx(color, ok) {
  const b = color === 'red' ? $('#btnRed') : $('#btnBlack');
  b.classList.remove('ok', 'ko'); b.classList.add('press'); setTimeout(() => b.classList.remove('press'), 110);
  setTimeout(() => { b.classList.add(ok ? 'ok' : 'ko'); setTimeout(() => b.classList.remove('ok', 'ko'), 500); }, 250);
}
function showCaption(html) { const c = $('#caption'); c.innerHTML = html; c.classList.add('show'); }
function hideCaption() { $('#caption').classList.remove('show'); }

/* ---- animations ---- */
function flyCard(card, fromEl, toEl, { startUp = false, endUp = true, dur = 460, arc = -50 } = {}) {
  const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
  const el = cardEl(card, false); el.classList.add('flyer');
  Object.assign(el.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
  $('#fly').appendChild(el);
  const dx = b.left - a.left, dy = b.top - a.top, inner = el.firstElementChild;
  const r0 = startUp ? 180 : 0, r1 = endUp ? 180 : 0;
  inner.style.transition = 'none'; inner.style.transform = `rotateY(${r0}deg)`;
  if (!el.animate) { el.remove(); return wait(dur); }
  const mv = el.animate([
    { transform: 'translate(0,0) rotate(0deg) scale(1)' },
    { transform: `translate(${dx * .5}px,${dy * .5 + arc}px) rotate(${dx > 0 ? -7 : 7}deg) scale(1.12)` },
    { transform: `translate(${dx}px,${dy}px) rotate(0deg) scale(1)` }], { duration: dur, easing: 'cubic-bezier(.3,.7,.25,1)' });
  inner.animate([{ transform: `rotateY(${r0}deg)` }, { transform: `rotateY(${r1}deg)` }], { duration: dur * .85, easing: 'ease-in-out', fill: 'forwards' });
  return mv.finished.then(() => el.remove(), () => el.remove());
}
async function returnCards(n, S0) {
  const cards = G.deck.slice(0, n), k = Math.min(cards.length, 12);
  pileBox.innerHTML = '<div class="ghost"></div>'; $('#pileCount').textContent = '0';
  if (!k) return;
  Sound.shuffle();
  const base = G.deck.length - n, fly = cards.slice(-k).reverse(); let landed = 0;
  await Promise.all(fly.map((c, i) => wait(i * 42).then(() => flyCard(c, pileBox, deckBox, { startUp: true, endUp: false, dur: 380, arc: -30 }))
    .then(() => { landed++; if (G === S0) renderDeck(base + Math.round(n * landed / k)); })));
}
function confetti() {
  const r = pileBox.getBoundingClientRect(), cx = innerWidth / 2, cy = r.top + r.height / 2;
  const colors = ['#f4cf6b', '#ff5d73', '#5ef2ff', '#7dffa8', '#ffffff', '#b48cff'];
  for (let i = 0; i < 80; i++) {
    const d = document.createElement('i'); d.className = 'cf'; d.style.background = colors[i % colors.length];
    d.style.left = cx + 'px'; d.style.top = cy + 'px'; $('#fly').appendChild(d);
    const ang = Math.random() * Math.PI * 2, v = 140 + Math.random() * 320, dx = Math.cos(ang) * v, dy = Math.sin(ang) * v - 200;
    if (!d.animate) { d.remove(); continue; }
    d.animate([{ transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 },
      { transform: `translate(${dx}px,${dy}px) rotate(${Math.random() * 720}deg)`, opacity: 1, offset: .6 },
      { transform: `translate(${dx * 1.2}px,${dy + 420}px) rotate(${Math.random() * 1080}deg)`, opacity: 0 }],
      { duration: 1600 + Math.random() * 700, easing: 'cubic-bezier(.2,.6,.4,1)' }).finished.then(() => d.remove(), () => d.remove());
  }
}
let bannerT; function banner(s) { const b = $('#banner'); b.textContent = s; b.classList.add('show'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), 1500); }
let toastT; function toast(s) { const el = $('#toast'); el.textContent = s; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2400); }

/* ---- taille des cartes selon l'écran (et clavier du téléphone) ---- */
function viewport() {
  const vv = window.visualViewport;
  const h = vv && vv.scale < 1.01 ? vv.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-h', Math.round(h) + 'px');
  document.body.classList.toggle('kbd-open', innerWidth <= 600 && h < 560);
  if (vv && vv.offsetTop > 0 && vv.scale < 1.01) window.scrollTo(0, 0);
}
function layout() {
  const s = $('#deckSlot'), w = s.clientWidth, h = s.clientHeight;
  const cw = Math.max(34, Math.min(w * .82, (h * .84) / 1.4, 240));
  document.documentElement.style.setProperty('--cw', cw.toFixed(1) + 'px');
  fitLabels();
}
function fitLabels() {
  for (const id of ['lblRed', 'lblBlack']) {
    const sp = $('#' + id), btn = sp.parentElement, avail = btn.clientWidth * .72, w = sp.offsetWidth;
    sp.style.transform = w > avail && avail > 0 ? `scale(${avail / w})` : '';
  }
}

/* ============================ MODALES ============================ */
function openModal(id) { $('#' + id).classList.add('open'); }
function closeModal(id) { $('#' + id).classList.remove('open'); }
function closeAllModals() { $$('.modal.open').forEach(m => m.classList.remove('open')); }
let askResolve = null;
function ask(title, text, okLabel = 'OK') {
  $('#askTitle').textContent = title; $('#askText').textContent = text; $('#askYes').textContent = okLabel;
  openModal('askModal');
  return new Promise(r => { askResolve = r; });
}
function answerAsk(v) { closeModal('askModal'); if (askResolve) { askResolve(v); askResolve = null; } }

/* ---------- classement ---------- */
let boardTab = 'classic', boardDiff = 'normal', boardFull = false, boardReq = 0;
function openBoard(full, mode, diff) {
  boardFull = !!full; if (mode) boardTab = mode; boardDiff = diff || curDiff();
  ansIn.blur();
  $('#boardModal').classList.toggle('full', boardFull);
  $('#boardTitle').textContent = t(boardFull ? 'board.top100' : 'board.top10');
  $('#boardDiff').innerHTML = DIFFS.map(d => `<button data-bd="${d}" class="${d === boardDiff ? 'on' : ''}"><span class="dlvl">${dots(d)}</span>${t('diff.' + d)}</button>`).join('');
  $('#boardTabs').innerHTML = MODES.map(m => `<button data-b="${m}" class="${m === boardTab ? 'on' : ''}">${boardTabLabel(m)}</button>`).join('');
  openModal('boardModal'); loadBoard();
}
function fmtVal(mode, r) {
  if (mode === 'classic') return t('board.val.classic', { p: `<b>${r.v1}</b> ${t(r.v1 > 1 ? 'n.packs' : 'n.pack')}`, c: `<b>${r.v2}</b>` });
  if (mode === 'infinite' || mode === 'c15') return `<b>${r.v1}</b> ${t(r.v1 > 1 ? 'n.cards' : 'n.card')}`;
  return `<b>${fmtTime(Number(r.v1))}</b>`;
}
async function loadBoard() {
  const req = ++boardReq, list = $('#boardList'), foot = $('#boardFoot'), mode = boardTab, board = bkey(boardDiff, mode);
  $$('#boardTabs button').forEach(b => b.classList.toggle('on', b.dataset.b === mode));
  $$('#boardDiff button').forEach(b => b.classList.toggle('on', b.dataset.bd === boardDiff));
  const on = $('#boardTabs .on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  list.innerHTML = `<div class="empty">${t('board.loading')}</div>`;
  foot.innerHTML = boardFull ? `<div class="myrank">${t('board.rank')} : <b>…</b></div>` : `<button class="btn primary block" id="btnTop100">${t('board.see100')}</button>`;
  await syncNow();
  try {
    const rows = await API.leaderboard(board, boardFull ? 100 : 10);
    if (req !== boardReq) return;
    const myName = P.player && P.player.pseudo;
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    list.innerHTML = rows.length ? rows.map(r => `<div class="brow${r.pseudo === myName ? ' me' : ''}"><span class="bpos${medals[r.pos] ? ' medal' : ''}">${medals[r.pos] || '#' + r.pos}</span><span class="bname">${esc(r.pseudo)}</span><span class="bval">${fmtVal(mode, r)}</span></div>`).join('')
      : `<div class="empty">${t('board.empty')}</div>`;
    if (!API.online) list.insertAdjacentHTML('beforeend', `<p class="hint" style="text-align:center;margin-top:14px">${t('board.local')}</p>`);
    if (boardFull) {
      const me = await API.myRank(board); if (req !== boardReq) return;
      foot.innerHTML = me ? `<div class="myrank"><span>${t('board.rank')} : <b>#${me.pos}</b>${me.total ? ' / ' + me.total : ''}</span><span>${esc(P.player.pseudo)} · ${fmtVal(mode, me)}</span></div>`
        : `<div class="myrank"><span>${esc(P.player ? P.player.pseudo : '')}</span><span>${t('board.unranked')}</span></div>`;
    }
  } catch (e) {
    if (req !== boardReq) return;
    list.innerHTML = `<div class="empty">${t('board.err')}<br><small>${esc(explainError(e))}</small></div>`;
    if (boardFull) foot.innerHTML = '';
  }
}

/* ---------- profil ---------- */
function renderPlayer() {
  const p = P.player; const name = p ? p.pseudo : '—';
  $('#regLabel').textContent = name; $('#regCur').textContent = name;
  $('#regAvatar').textContent = name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '?';
  $('#hello').innerHTML = p ? esc(t('menu.hello', { x: '\u0000' })).replace('\u0000', `<b>${esc(name)}</b>`) : '';
  if (!codeShown) $('#regCode').textContent = '••••-••••-••••';
  $('#regShow').textContent = t(codeShown ? 'prof.hide' : 'prof.show');
}
function renderNet() {
  const cls = netOk === true ? 'on' : netOk === false ? 'off' : '';
  const txt = !API.online ? t('net.local') : netOk === true ? t('net.on') : netOk === false ? t('net.off', { x: lastErr ? explainError(lastErr) : t('net.offDefault') }) : t('net.connecting');
  [['#netDot', '#netTxt'], ['#netDot2', '#netTxt2']].forEach(([d, s]) => { $(d).className = cls; $(s).textContent = txt; });
  $('#regDot').className = 'dot ' + (API.online ? cls : '');
}
let codeShown = false;
async function doRegister() {
  const v = $('#regIn').value.trim(), err = $('#regErr'); err.textContent = ''; err.classList.remove('ok-msg');
  if (!PSEUDO_RE.test(v)) { err.textContent = t('prof.err.format'); return; }
  if (P.player && v === P.player.pseudo) { err.textContent = t('prof.err.same'); return; }
  const btn = $('#regGo'); btn.disabled = true;
  const registerNew = async () => {
    if (!P.player) P.player = { id: null, pseudo: v, secret: genCode(), backend: BACKEND };
    P.player.id = await API.register(v, P.player.secret); P.player.backend = BACKEND;
  };
  try {
    if (P.player && P.player.id) {
      try { await API.rename(v); }
      catch (e) { if (!/^AUTH$/.test(e.message)) throw e; P.player.id = null; await registerNew(); } // profil inconnu du serveur
    } else await registerNew();
    P.player.pseudo = v; saveLocal(); renderPlayer(); setNet(true); syncNow();
    $('#regIn').value = ''; err.classList.add('ok-msg'); err.textContent = t('prof.ok'); Sound.correct();
  } catch (e) {
    saveLocal();
    if (/PSEUDO_PRIS/.test(e.message)) err.textContent = t('prof.err.taken');
    else if (/PSEUDO_INVALIDE/.test(e.message)) err.textContent = t('prof.err.invalid');
    else { err.textContent = explainError(e); setNet(false, e); }
  } finally { btn.disabled = false; }
}
async function doRecover() {
  const code = $('#recIn').value.trim().toUpperCase(), err = $('#recErr'); err.textContent = ''; err.classList.remove('ok-msg');
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) { err.textContent = t('rec.err.format'); return; }
  if (P.player && code === P.player.secret) { err.textContent = t('rec.err.same'); return; }
  if (!(await ask(t('ask.recover.t'), t('ask.recover.x'), t('ask.recover.ok')))) return;
  try {
    const r = await API.recover(code);
    if (!r) { err.textContent = t('rec.err.none'); return; }
    P.player = { id: r.id, pseudo: r.pseudo, secret: code, backend: BACKEND };
    P.prog = progFromScores(r.scores); DIFFS.forEach(classicProg);
    saveLocal(); renderPlayer(); setNet(true); renderMenu();
    if (G && G.mode === 'classic') { G.ended = true; G = newSession('classic', G.diff); renderAll(); }
    $('#recIn').value = ''; err.classList.add('ok-msg'); err.textContent = t('rec.ok', { x: r.pseudo });
  } catch (e) { err.textContent = explainError(e); setNet(false, e); }
}

/* ---------- langue ---------- */
function applyLang() {
  LANG = P.set.lang;
  document.documentElement.lang = LANG;
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $$('[data-i18n-aria]').forEach(el => { const s = t(el.dataset.i18nAria); el.setAttribute('aria-label', s); el.title = s; });
  $$('[data-langs]').forEach(box => {
    box.innerHTML = LANGS.map(l => `<button data-lang="${l}" class="${l === LANG ? 'on' : ''}"><b>${l.toUpperCase()}</b><span>${I18N[l]['lang.name']}</span></button>`).join('');
  });
  // exemples de l'écran de difficulté
  $('#exNormal').innerHTML = `<span class="kchip red">${esc(P.set.redLabel || t('btn.red'))}</span><span class="kchip black">${esc(P.set.blackLabel || t('btn.black'))}</span>`;
  $('#exHard').innerHTML = t('diff.hard.ex').split('|').map(x => `<span class="kchip">${esc(x)}</span>`).join('');
  $('#exExpert').innerHTML = t('diff.expert.ex').split('|').map(x => `<span class="kchip">${esc(x)}</span>`).join('');
  const kr = t('btn.red').charAt(0).toUpperCase(), kb = t('btn.black').charAt(0).toUpperCase();
  $('#kbdHint').textContent = `← ${kr}   ${kb} →`;
  buildWordTable();
  buildSettings(); applySettings(); renderMenu(); renderAll(); renderNet(); renderPlayer(); updatePreview();
  if ($('#boardModal').classList.contains('open')) openBoard(boardFull, boardTab, boardDiff);
}
function setLang(l) { if (!LANGS.includes(l)) return; P.set.lang = l; saveLocal(); applyLang(); }
function buildWordTable() {
  const row = (label, words) => `<div class="wrow"><b>${label}</b><span>${Array.isArray(words) ? words.map(w => `<code>${esc(w)}</code>`).join(' ') : esc(words)}</span></div>`;
  const W = k => WORDS.rank[k].split(' ');
  let h = '';
  h += row(rankName('A'), W('A'));
  h += row(t('w.numbers'), t('w.numbers.d'));
  ['J', 'Q', 'K'].forEach(k => { h += row(rankName(k), W(k)); });
  h += row(t('card.joker'), W('JK'));
  SUITS.forEach(s => { h += row(`<span class="${'HD'.includes(s) ? 'sr' : ''}">${SYM[s]}${VS}</span> ${esc(suitName(s))}`, WORDS.suit[s].split(' ').filter(w => !SUIT_SYMS.includes(w))); });
  h += row(t('w.color'), WORDS.color.red.split(' ').slice(0, 6).concat(['/'], WORDS.color.black.split(' ').slice(0, 6)));
  $('#wordTable').innerHTML = h;
}

/* ---------- paramètres ---------- */
function applySettings() {
  const s = P.set, root = document.documentElement.style;
  root.setProperty('--page-bg', s.bg >= 0 && BG_PRESETS[s.bg] ? BG_PRESETS[s.bg]
    : `radial-gradient(1200px 800px at 50% 0%,color-mix(in srgb,${s.bgCustom} 70%,white),${s.bgCustom} 50%,color-mix(in srgb,${s.bgCustom} 45%,black))`);
  const f = FELTS[s.felt] || FELTS[0]; root.setProperty('--felt', f.v); root.setProperty('--rim', f.rim);
  $('#app').className = 'cs-' + s.cards;
  [['#btnRed', '#lblRed', s.redColor, s.redLabel || t('btn.red')], ['#btnBlack', '#lblBlack', s.blackColor, s.blackLabel || t('btn.black')]].forEach(([b, l, col, txt]) => {
    const btn = $(b); btn.style.setProperty('--bc', col); btn.style.setProperty('--tc', luminance(col) > .5 ? '#1a1a1a' : '#fff');
    $(l).textContent = txt; btn.setAttribute('aria-label', txt);
  });
  fitLabels(); Sound.apply();
}
function buildSettings() {
  const s = P.set;
  $('#swBg').innerHTML = BG_PRESETS.map((v, i) => `<button class="sw" data-bg="${i}" style="background:${v}"><span>${t('bg' + i)}</span></button>`).join('')
    + `<label class="sw custom" data-bg="-1"><input type="color" id="bgColor" value="${s.bgCustom}" aria-label="${t('set.custom')}"><span>${t('set.custom')}</span></label>`;
  $('#swFelt').innerHTML = FELTS.map((f, i) => `<button class="sw" data-felt="${i}" style="background:${f.v};box-shadow:inset 0 0 0 4px ${f.rim}"><span>${t('felt' + i)}</span></button>`).join('');
  const sw = $('#swCards'); sw.innerHTML = '';
  const sample = { r: 'A', s: 'H', c: 'red' };
  CARD_STYLES.forEach(k => {
    const b = document.createElement('button'); b.className = 'cs-opt cs-' + k; b.dataset.cards = k;
    const mini = document.createElement('div'); mini.className = 'mini';
    const fr = cardEl(sample, true); fr.classList.add('static'); const bk = cardEl(null, false); bk.classList.add('static');
    mini.append(fr, bk); b.append(mini); b.insertAdjacentHTML('beforeend', `<span>${t('cs.' + k)}</span>`); sw.appendChild(b);
  });
  $('#inRed').value = s.redLabel; $('#inBlack').value = s.blackLabel; $('#colRed').value = s.redColor; $('#colBlack').value = s.blackColor;
  $('#inRed').placeholder = t('btn.red'); $('#inBlack').placeholder = t('btn.black');
  $('#cntRed').textContent = s.redLabel.length + '/10'; $('#cntBlack').textContent = s.blackLabel.length + '/10';
  [['volMaster', 'master', 'outMaster'], ['volSfx', 'sfx', 'outSfx'], ['volMusic', 'music', 'outMusic']].forEach(([i, k, o]) => {
    const r = $('#' + i); r.value = s[k]; r.style.setProperty('--p', s[k] + '%'); $('#' + o).textContent = s[k];
  });
  markSettings();
}
function markSettings() {
  const s = P.set;
  $$('#swBg .sw').forEach(e => e.classList.toggle('on', +e.dataset.bg === s.bg));
  $$('#swFelt .sw').forEach(e => e.classList.toggle('on', +e.dataset.felt === s.felt));
  $$('#swCards .cs-opt').forEach(e => e.classList.toggle('on', e.dataset.cards === s.cards));
}
function tryLabel(which) {
  const inp = $(which === 'red' ? '#inRed' : '#inBlack'), err = $(which === 'red' ? '#errRed' : '#errBlack'), cnt = $(which === 'red' ? '#cntRed' : '#cntBlack');
  const raw = inp.value.replace(/\s+/g, ' '); const v = raw.trim(); cnt.textContent = raw.length + '/10'; err.textContent = '';
  const key = which === 'red' ? 'redLabel' : 'blackLabel';
  if (v.length > 10) { err.textContent = t('lbl.err.long'); return; }
  const sp = $(which === 'red' ? '#lblRed' : '#lblBlack'), old = sp.textContent;
  sp.textContent = v || t(which === 'red' ? 'btn.red' : 'btn.black');
  const fits = sp.offsetWidth <= sp.parentElement.clientWidth * .72;
  if (!fits) { sp.textContent = old; fitLabels(); err.textContent = t('lbl.err.wide'); return; }
  P.set[key] = v; saveLocal(); applySettings();
}

/* ---------- menu ---------- */
function renderMenu() {
  const d = P.set.diff, c = classicProg(d), g = m => P.prog[bkey(d, m)];
  $('#descClassic').textContent = t('mode.classic.d.' + d);
  $('#recClassic').textContent = c.packs || c.best ? t('rec.classic', { p: nPacks(c.packs), b: c.best }) + (c.pos ? t('rec.resume', { n: c.pos + 1 }) : '') : t('rec.classic.none');
  $('#recInfinite').textContent = g('infinite') ? t('rec.inf', { x: nCards(g('infinite')) }) : t('rec.none');
  $('#recHalf').textContent = g('half') != null ? fmtTime(g('half')) : '—';
  $('#recFull').textContent = g('full') != null ? fmtTime(g('full')) : '—';
  $('#recC15').textContent = g('c15') ? nCards(g('c15')) : '—';
  $('#diffLvl').innerHTML = dots(d); $('#diffName').textContent = t('diff.' + d);
  $('#btnDiff').dataset.d = d;
}
function buildFans() {
  $$('.fan').forEach(fan => {
    fan.innerHTML = '';
    [[{ r: 'A', s: 'H', c: 'red' }, -16], [{ r: 'JK', c: 'black', joker: true }, 0], [{ r: 'A', s: 'S', c: 'black' }, 16]].forEach(([c, a]) => {
      const el = cardEl(c, true); el.classList.add('static'); el.style.transform = `rotate(${a}deg)`; fan.appendChild(el);
    });
  });
}

/* ============================ ÉVÉNEMENTS ============================ */
$('#btnRed').addEventListener('click', () => guess('red'));
$('#btnBlack').addEventListener('click', () => guess('black'));
$('#answerBar').addEventListener('submit', e => { e.preventDefault(); submitAnswer(); });
ansIn.addEventListener('input', updatePreview);
$$('#suitBtns .sbtn').forEach(b => b.addEventListener('click', () => submitAnswer(b.dataset.suit)));
// garder le clavier du téléphone ouvert quand on touche un bouton
$$('#suitBtns .sbtn, #ansGo').forEach(b => b.addEventListener('mousedown', e => e.preventDefault()));
$('#btnHome').addEventListener('click', () => { Sound.click(); goHome(); });
$('#btnSettings').addEventListener('click', () => { Sound.click(); ansIn.blur(); openModal('setModal'); });
$('#btnRegister').addEventListener('click', () => { Sound.click(); ansIn.blur(); openModal('regModal'); });
$('#btnScore').addEventListener('click', () => { Sound.click(); openBoard(false, G ? G.mode : boardTab, curDiff()); });
$('#btnDiff').addEventListener('click', () => { Sound.click(); showDiffScreen(); });
$$('[data-diff]').forEach(b => b.addEventListener('click', () => chooseDiff(b.dataset.diff)));
$$('[data-start]').forEach(b => b.addEventListener('click', () => startMode(b.dataset.start)));
document.addEventListener('click', e => {
  const o = e.target.closest('[data-open]'); if (o) { Sound.init(); Sound.click(); const k = o.dataset.open; if (k === 'board') openBoard(false, boardTab, P.set.diff); else { closeModal('setModal'); openModal(k === 'settings' ? 'setModal' : 'regModal'); } }
  const c = e.target.closest('[data-close]'); if (c) c.closest('.modal').classList.remove('open');
  if (e.target.classList.contains('modal') && e.target.hasAttribute('data-closable')) e.target.classList.remove('open');
  if (e.target.id === 'btnTop100') openBoard(true, boardTab, boardDiff);
  const l = e.target.closest('[data-lang]'); if (l) { Sound.init(); Sound.click(); setLang(l.dataset.lang); }
});
$('#boardTabs').addEventListener('click', e => { const b = e.target.closest('[data-b]'); if (b) { boardTab = b.dataset.b; Sound.click(); loadBoard(); } });
$('#boardDiff').addEventListener('click', e => { const b = e.target.closest('[data-bd]'); if (b) { boardDiff = b.dataset.bd; Sound.click(); loadBoard(); } });
(() => { // glisser à gauche/droite pour changer de classement
  let sx = null, sy = 0; const body = $('#boardBody');
  body.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  body.addEventListener('touchend', e => {
    if (sx == null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const i = MODES.indexOf(boardTab), j = Math.min(MODES.length - 1, Math.max(0, i + (dx < 0 ? 1 : -1)));
      if (j !== i) { boardTab = MODES[j]; loadBoard(); }
    }
  });
})();
$('#resAgain').addEventListener('click', e => startMode(e.currentTarget.dataset.mode));
$('#resMenu').addEventListener('click', () => { G = null; renderAll(); showMenu(); });
$('#resBoard').addEventListener('click', e => { closeModal('resModal'); openBoard(true, e.currentTarget.dataset.mode, e.currentTarget.dataset.diff); });
$('#askYes').addEventListener('click', () => answerAsk(true));
$('#askNo').addEventListener('click', () => answerAsk(false));

$('#regGo').addEventListener('click', doRegister);
$('#regIn').addEventListener('keydown', e => { if (e.key === 'Enter') doRegister(); });
$('#regDice').addEventListener('click', () => { $('#regIn').value = randomPseudo(); Sound.click(); });
$('#regShow').addEventListener('click', () => { codeShown = !codeShown; $('#regCode').textContent = codeShown && P.player ? P.player.secret : '••••-••••-••••'; $('#regShow').textContent = t(codeShown ? 'prof.hide' : 'prof.show'); });
$('#regCopy').addEventListener('click', async () => { if (!P.player) return; try { await navigator.clipboard.writeText(P.player.secret); toast(t('toast.copied')); } catch (e) { codeShown = true; $('#regCode').textContent = P.player.secret; toast(t('toast.select')); } });
$('#recGo').addEventListener('click', doRecover);

$('#setTabs').addEventListener('click', e => {
  const b = e.target.closest('[data-t]'); if (!b) return;
  $$('#setTabs button').forEach(x => x.classList.toggle('on', x === b));
  $$('#setModal .pane').forEach(p => p.classList.toggle('on', p.dataset.p === b.dataset.t));
});
$('#swBg').addEventListener('click', e => { const b = e.target.closest('[data-bg]'); if (!b || b.dataset.bg === '-1') return; P.set.bg = +b.dataset.bg; saveLocal(); applySettings(); markSettings(); });
$('#swBg').addEventListener('input', e => { if (e.target.id !== 'bgColor') return; P.set.bg = -1; P.set.bgCustom = e.target.value; saveLocal(); applySettings(); markSettings(); });
$('#swFelt').addEventListener('click', e => { const b = e.target.closest('[data-felt]'); if (!b) return; P.set.felt = +b.dataset.felt; saveLocal(); applySettings(); markSettings(); });
$('#swCards').addEventListener('click', e => { const b = e.target.closest('[data-cards]'); if (!b) return; P.set.cards = b.dataset.cards; saveLocal(); applySettings(); markSettings(); Sound.flip(); });
$('#inRed').addEventListener('input', () => tryLabel('red'));
$('#inBlack').addEventListener('input', () => tryLabel('black'));
$('#colRed').addEventListener('input', e => { P.set.redColor = e.target.value; saveLocal(); applySettings(); });
$('#colBlack').addEventListener('input', e => { P.set.blackColor = e.target.value; saveLocal(); applySettings(); });
$('#btnLblReset').addEventListener('click', () => {
  Object.assign(P.set, { redLabel: '', blackLabel: '', redColor: DEFAULT_SET.redColor, blackColor: DEFAULT_SET.blackColor });
  saveLocal(); applySettings(); buildSettings(); $('#errRed').textContent = $('#errBlack').textContent = '';
});
[['volMaster', 'master', 'outMaster'], ['volSfx', 'sfx', 'outSfx'], ['volMusic', 'music', 'outMusic']].forEach(([i, k, o]) => {
  $('#' + i).addEventListener('input', e => { const v = +e.target.value; P.set[k] = v; e.target.style.setProperty('--p', v + '%'); $('#' + o).textContent = v; saveLocal(); Sound.init(); Sound.apply(); });
});
$('#volSfx').addEventListener('change', () => Sound.correct());
$('#btnTestSnd').addEventListener('click', () => { Sound.init(); Sound.flip(); setTimeout(() => Sound.correct(), 250); setTimeout(() => Sound.win(), 700); });
$('#btnTestNet').addEventListener('click', async () => {
  const out = $('#testNetOut'), btn = $('#btnTestNet');
  if (!API.online) { out.textContent = t('tn.local'); return; }
  btn.disabled = true;
  const lines = [t('tn.url') + (SB_URL || '—'), t('tn.key') + (SB_KEY ? SB_KEY.slice(0, 18) + '…' : '—')];
  out.textContent = lines.join('\n') + '\n' + t('tn.running');
  try {
    await API.rpc('get_leaderboard', { p_board: 'normal.classic', p_limit: 1 });
    lines.push(t('tn.ok'));
    const ok = await syncNow();
    lines.push(ok ? t('tn.profOk', { x: P.player.pseudo }) : t('tn.profKo', { x: lastErr ? explainError(lastErr) : '?' }));
  } catch (e) { lines.push('✘ ' + explainError(e)); setNet(false, e); }
  out.textContent = lines.join('\n'); btn.disabled = false;
});
$('#btnWipe').addEventListener('click', async () => {
  if (!(await ask(t('ask.wipe.t'), t('ask.wipe.x'), t('ask.wipe.ok')))) return;
  ['m54_player', 'm54_prog', 'm54_set', 'm54_db'].forEach(k => store.del(k)); location.reload();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if ($('#askModal').classList.contains('open')) return answerAsk(false); const m = $$('.modal.open[data-closable]').pop(); if (m) m.classList.remove('open'); return; }
  if ($('.modal.open') || !$('#menu').classList.contains('off') || !$('#diffScreen').classList.contains('off')) return;
  if (!G || G.ended) return;
  if (G.diff !== 'normal') { // une touche tapée hors du champ → on y place le curseur
    if (e.target !== ansIn && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) ansIn.focus({ preventScroll: true });
    return;
  }
  if (e.target.tagName === 'INPUT' || e.repeat) return;
  const k = e.key.toLowerCase(), kr = normTxt(t('btn.red')).charAt(0), kb = normTxt(t('btn.black')).charAt(0);
  if (k === 'arrowleft' || k === kr) { e.preventDefault(); guess('red'); }
  else if (k === 'arrowright' || k === kb) { e.preventDefault(); guess('black'); }
});
document.addEventListener('pointerdown', () => Sound.init(), { once: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) syncNow(); });
window.addEventListener('resize', () => { viewport(); layout(); });
if (window.visualViewport) { visualViewport.addEventListener('resize', viewport); visualViewport.addEventListener('scroll', viewport); }
if (window.ResizeObserver) new ResizeObserver(layout).observe($('#deckSlot'));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLabels);

/* ============================ DÉMARRAGE ============================ */
viewport(); buildFans(); applyLang(); layout(); showDiffScreen();
ensurePlayer().then(() => syncNow());
