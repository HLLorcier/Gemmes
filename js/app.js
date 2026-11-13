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
  Collier.init();

  Carte.onSelection = g => {
    if (Collier.ajouter(g)) Fiche.afficher(g);
  };

  document.getElementById('entrer').addEventListener('click', () => {
    document.getElementById('accueil').hidden = true;
  });

  document.getElementById('cisailles').addEventListener('click', () => {
    Collier.reinitialiser();
    Fiche.cacher();
  });

  document.querySelector('.fiche-fermer').addEventListener('click', () => Fiche.cacher());
});
