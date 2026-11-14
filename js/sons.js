// Gestion des sons. Chaque catégorie tire un fichier au hasard.
// pierreentree : entrée au survol
// pierresortie : sortie du survol
// pierre1-8    : tintement à l'ajout sur le collier
// chaine       : la chaîne bouge
// ciseau       : la chaîne se brise (réinitialisation)
const Sons = (() => {
  const POOLS = {
    entree: ['pierreentree1', 'pierreentree2', 'pierreentree3'],
    sortie: ['pierresortie1', 'pierresortie2', 'pierresortie3'],
    tintement: ['pierre1', 'pierre2', 'pierre3', 'pierre4', 'pierre5', 'pierre6', 'pierre7', 'pierre8'],
    chaine: ['pierre7'],   // remplace l'ancien son de chaîne
    ciseau: ['ciseau']
  };

  // OGG pour la plupart des navigateurs, MP3 pour Safari
  const ext = new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'mp3';

  function jouer(categorie) {
    const liste = POOLS[categorie];
    if (!liste) return;
    const nom = liste[Math.floor(Math.random() * liste.length)];
    const a = new Audio(`sounds/${nom}.${ext}`);
    a.volume = 0.9;   // bruitages plus présents que la musique
    a.play().catch(() => {}); // ignore si l'audio n'est pas encore débloqué
  }

  return { jouer };
})();
