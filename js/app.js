// Icône des cisailles : SVG en ligne, colorée en marron via currentColor
async function chargerCisailles() {
  const txt = await (await fetch('assets/svg/cisailles.svg')).text();
  const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
  const svg = doc.documentElement;
  svg.querySelectorAll('*').forEach(el => {
    if (el.closest('mask')) return;            // on garde le masque tel quel
    const f = el.getAttribute('fill');
    if (f && f !== 'none') el.setAttribute('fill', 'currentColor');
    const s = el.getAttribute('stroke');
    if (s && s !== 'none') el.setAttribute('stroke', 'currentColor');
  });
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const bouton = document.getElementById('cisailles');
  bouton.innerHTML = '';
  bouton.appendChild(document.importNode(svg, true));
}

document.addEventListener('DOMContentLoaded', async () => {
  const data = await (await fetch('data/gemmes.json')).json();
  await Carte.init(data.gemmes);
  Carte.initVue();
  Collier.init();
  chargerCisailles();

  // Chaque pierre survolée est ajoutée au collier au clic (ou double toucher)
  Carte.onSelection = g => Collier.ajouter(g);

  document.getElementById('cisailles').addEventListener('click', () => Collier.reinitialiser());
  document.getElementById('zoom-plus').addEventListener('click', () => Carte.zoomerAuCentre(1.4));
  document.getElementById('zoom-moins').addEventListener('click', () => Carte.zoomerAuCentre(1 / 1.4));
  document.getElementById('zoom-reset').addEventListener('click', () => Carte.vueComplete());
  window.addEventListener('resize', () => Carte.appliquerVue());

  // Musique d'ambiance : démarre à la première interaction (exigence des navigateurs)
  const ambiance = new Audio('sounds/ambiance.mp3');
  ambiance.loop = true;
  ambiance.volume = 0.12;
  const lancer = () => {
    ambiance.play().catch(err => console.warn('Musique non lancée :', err));
  };
  ['pointerdown', 'wheel', 'keydown'].forEach(t =>
    document.addEventListener(t, lancer, { once: true, passive: true }));
});
