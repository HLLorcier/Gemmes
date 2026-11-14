const Fiche = {
  afficher(g) {
    const el = document.getElementById('fiche');
    el.querySelector('.fiche-nom').textContent = g.nom;
    el.querySelector('.fiche-lieu').textContent = g.lieu || '';
    el.querySelector('.fiche-texte').textContent = g.texte;
    el.hidden = false;
  },
  cacher() {
    document.getElementById('fiche').hidden = true;
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const data = await (await fetch('data/gemmes.json')).json();
  await Carte.init(data.gemmes);
  Carte.initVue();
  Collier.init();

  // Zoom
  document.getElementById('zoom-plus').addEventListener('click', () => Carte.zoomerAuCentre(1.4));
  document.getElementById('zoom-moins').addEventListener('click', () => Carte.zoomerAuCentre(1 / 1.4));
  document.getElementById('zoom-reset').addEventListener('click', () => Carte.vueComplete());

  // Musique d'ambiance : démarre au premier toucher de la page (règle des navigateurs)
  const ambiance = new Audio('sounds/ambiance.mp3');
  ambiance.loop = true;
  ambiance.volume = 0.12;   // fond discret, sous les bruitages
  document.addEventListener('pointerdown', () => { ambiance.play().catch(() => {}); }, { once: true });
  const muet = document.getElementById('muet');
  muet.addEventListener('click', () => {
    ambiance.muted = !ambiance.muted;
    muet.setAttribute('aria-pressed', String(ambiance.muted));
    muet.textContent = ambiance.muted ? 'Son : off' : 'Son : on';
  });
  muet.textContent = 'Son : on';


  Carte.onSelection = g => {
    if (Collier.ajouter(g)) Fiche.afficher(g);
  };

  document.getElementById('cisailles').addEventListener('click', () => {
    Collier.reinitialiser();
    Fiche.cacher();
  });

  window.addEventListener('resize', () => Carte.appliquerVue());

  document.querySelector('.fiche-fermer').addEventListener('click', () => Fiche.cacher());
});
