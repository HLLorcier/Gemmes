const NS = 'http://www.w3.org/2000/svg';
const TAILLE_GEMME = 220;   // largeur d'une gemme sur la carte, en unités du viewBox (à ajuster)

const VILLES = {
  'ancre-ville-le-caire': 'Le Caire',
  'ancre-ville-giza': 'Gizeh',
  'ancre-ville-assouan': 'Assouan',
  'ancre-ville-louxor': 'Louxor',
  'ancre-ville-el-kharga': 'El-Kharga',
  'ancre-ville-assiout': 'Assiout',
  'ancre-ville-minieh': 'Minieh',
  'ancre-ville-medinet-el-fayoum': 'Medinet el-Fayoum'
};

// Dernier type de pointeur utilisé : 'mouse', 'touch' ou 'pen'
let dernierType = 'mouse';
document.addEventListener('pointerdown', e => { dernierType = e.pointerType; }, true);

// Interpolation simple, avec annulation si une nouvelle animation démarre sur le même objet
function tween(o, de, a, dur, maj, fin) {
  const id = (o.tk = (o.tk || 0) + 1);
  const debut = performance.now();
  const pas = now => {
    if (o.tk !== id) return;
    const p = Math.min((now - debut) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    maj(de + (a - de) * e);
    if (p < 1) requestAnimationFrame(pas);
    else if (fin) fin();
  };
  requestAnimationFrame(pas);
}

function bboxDe(svg, d) {
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', d);
  svg.appendChild(p);
  const b = p.getBBox();
  p.remove();
  return b;
}

async function extraireD(url) {
  const txt = await (await fetch(url)).text();
  const m = txt.match(/<path[^>]*?\sd="([^"]+)"/);
  if (!m) throw new Error('Pas de tracé dans ' + url);
  return m[1];
}

function creerTexture(defs, id, fichier) {
  const p = document.createElementNS(NS, 'pattern');
  p.setAttribute('id', 'tex-' + id);
  p.setAttribute('patternUnits', 'objectBoundingBox');
  p.setAttribute('patternContentUnits', 'objectBoundingBox');
  p.setAttribute('width', 1);
  p.setAttribute('height', 1);
  const img = document.createElementNS(NS, 'image');
  img.setAttribute('href', 'assets/img/' + fichier);
  img.setAttribute('width', 1);
  img.setAttribute('height', 1);
  img.setAttribute('preserveAspectRatio', 'none');
  p.appendChild(img);
  defs.appendChild(p);
}

const Carte = {
  svg: null,
  gemmes: [],
  largeur: 0,
  onSelection: null,
  bulle: null,
  gauche: null,

  async init(donnees) {
    this.bulle = document.getElementById('bulle');
    this.gauche = document.getElementById('gauche');
    const defs = document.getElementById('textures');
    creerTexture(defs, 'fil', 'texture-fil.jpg');

    const conteneur = document.getElementById('carte');
    conteneur.innerHTML = await (await fetch('assets/svg/carte-egypte.svg')).text();
    const svg = conteneur.querySelector('svg');
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.cssText = 'width:100%;height:100%;display:block';
    this.svg = svg;
    this.largeur = svg.viewBox.baseVal.width;

    // Lire les ancres (positions dans le repère de la carte), puis les masquer
    const ancres = {};
    svg.querySelectorAll('[id^="ancre-"]').forEach(el => {
      ancres[el.id] = this.centre(el);
      el.style.display = 'none';
    });

    // Étiquettes des villes
    Object.entries(VILLES).forEach(([id, nom]) => {
      const p = ancres[id];
      if (!p) return;
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', p.x + 16);
      t.setAttribute('y', p.y + 8);
      t.setAttribute('class', 'ville');
      t.textContent = nom;
      svg.appendChild(t);
    });

    // Gemmes : still + survol, morphing par flubber
    for (const g of donnees) {
      const ancre = ancres['ancre-' + g.id];
      if (!ancre) { console.warn('Pas d’ancre pour', g.id); continue; }
      creerTexture(defs, g.id, g.texture);

      const [dA, dB] = await Promise.all([
        extraireD(`assets/svg/${g.id}-still.svg`),
        extraireD(`assets/svg/${g.id}-survol.svg`)
      ]);
      const bA = bboxDe(svg, dA);
      const bB = bboxDe(svg, dB);

      const el = document.createElementNS(NS, 'path');
      el.setAttribute('d', dA);
      el.setAttribute('fill', `url(#tex-${g.id})`);
      el.setAttribute('class', 'gemme');
      svg.appendChild(el);

      const gem = {
        ...g,
        el,
        bA,
        ax: ancre.x,
        ay: ancre.y,
        cA: { x: bA.x + bA.width / 2, y: bA.y + bA.height / 2 },
        cB: { x: bB.x + bB.width / 2, y: bB.y + bB.height / 2 },
        k: TAILLE_GEMME / bA.width,
        dStill: dA,
        interp: flubber.interpolate(dA, dB, { maxSegmentLength: 6 }),
        t: 0
      };
      this.rendre(gem);
      this.brancher(gem);
      this.gemmes.push(gem);
    }

    // Toucher ailleurs (mobile) ramène les gemmes à leur taille
    document.addEventListener('pointerdown', e => {
      if (e.target.closest && e.target.closest('.gemme')) return;
      this.gemmes.forEach(g => {
        if (g.t > 0) tween(g, g.t, 0, 280, v => { g.t = v; this.rendre(g); });
      });
      this.cacherBulle();
    });
  },

  // Centre d'un élément, transformé dans le repère racine de la carte
  centre(el) {
    const b = el.getBBox();
    const p = this.svg.createSVGPoint();
    p.x = b.x + b.width / 2;
    p.y = b.y + b.height / 2;
    return p.matrixTransform(el.getCTM());
  },

  // Affiche la forme à l'état t (0 = still, 1 = survol), centrée sur l'ancre
  rendre(g) {
    const t = g.t;
    const cx = g.cA.x + (g.cB.x - g.cA.x) * t;
    const cy = g.cA.y + (g.cB.y - g.cA.y) * t;
    g.el.setAttribute('d', g.interp(t));
    g.el.setAttribute('transform',
      `translate(${g.ax} ${g.ay}) scale(${g.k}) translate(${-cx} ${-cy})`);
  },

  brancher(g) {
    const el = g.el;

    el.addEventListener('pointerenter', e => {
      Sons.jouer('entree');
      this.afficherBulle(g, e);
      tween(g, g.t, 1, 280, v => { g.t = v; this.rendre(g); });
    });

    el.addEventListener('pointermove', e => this.placerBulle(e));

    el.addEventListener('pointerleave', () => {
      if (dernierType === 'touch') return; // sur mobile, la bulle reste jusqu'à un toucher ailleurs
      this.cacherBulle();
      Sons.jouer('sortie');
      tween(g, g.t, 0, 280, v => { g.t = v; this.rendre(g); });
    });

    // Souris : clic simple. Mobile : double toucher.
    el.addEventListener('click', () => { if (dernierType !== 'touch') this.choisir(g); });
    el.addEventListener('dblclick', () => { if (dernierType === 'touch') this.choisir(g); });
  },

  afficherBulle(g, e) {
    const b = this.bulle;
    b.querySelector('.bulle-nom').textContent = g.nom;
    b.querySelector('.bulle-lieu').textContent = g.lieu || '';
    b.querySelector('.bulle-accroche').textContent = g.accroche;
    b.hidden = false;
    this.placerBulle(e);
  },

  placerBulle(e) {
    const r = this.gauche.getBoundingClientRect();
    this.bulle.style.left = (e.clientX - r.left) + 'px';
    this.bulle.style.top = (e.clientY - r.top) + 'px';
  },

  cacherBulle() { this.bulle.hidden = true; },

  choisir(g) { if (this.onSelection) this.onSelection(g); },

  estAGauche(g) { return g.ax < this.largeur / 2; }
};
