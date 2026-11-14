document.addEventListener('DOMContentLoaded', async () => {
  const data = await (await fetch('data/gemmes.json')).json();
  await Carte.init(data.gemmes);
  Carte.initVue();
  Collier.init();

  // Chaque pierre survolée est ajoutée au collier au clic (ou double toucher)
  Carte.onSelection = g => Collier.ajouter(g);

  document.getElementById('cisailles').addEventListener('click', () => Collier.reinitialiser());
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
