const NS = 'http://www.w3.org/2000/svg';
const TAILLE_PAR_DEFAUT = 60;
const ESPACE_MINI = 10; // vide minimum entre deux pierres, en unités du SVG

// Repousse les pierres qui se chevauchent, sans les éloigner plus que nécessaire
function separerPierres(items) {
  for (let it = 0; it < 300; it++) {
    let bouge = false;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const mini = a.r + b.r + ESPACE_MINI;
        if (d < mini) {
          const push = (mini - d) / 2;
          const ux = dx / d, uy = dy / d;
          a.x -= ux * push; a.y -= uy * push;
          b.x += ux * push; b.y += uy * push;
          bouge = true;
        }
      }
    }
    if (!bouge) break;
  }
} // largeur d'une gemme sur la carte, en unités du viewBox

// Distance à vol d'oiseau Le Caire – Assouan, en km (≈ 682 km)
const KM_CAIRE_ASSOUAN = 682;

const VILLES = {
  'ancre-ville-le-caire': 'Le Caire',
  'ancre-ville-giza': 'Giza',
  'ancre-ville-assouan': 'Assouan',
  'ancre-ville-louxor': 'Louxor',
  'ancre-ville-el-kharga': 'El Kharga',
  'ancre-ville-minieh': 'Minieh',
  'ancre-ville-medinet-el-fayoum': 'El Fayoum'
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
  labels: [],
  hauteur: 0,
  kmParUnite: 1,
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
    this.hauteur = svg.viewBox.baseVal.height;

    // Lire les ancres (positions dans le repère de la carte), puis les masquer
    const ancres = {};
    svg.querySelectorAll('[id^="ancre-"]').forEach(el => {
      ancres[el.id] = this.centre(el);
      el.style.display = 'none';
    });

    // Échelle : distance réelle Le Caire – Assouan / distance dans le SVG
    const pa = ancres['ancre-ville-le-caire'], pb = ancres['ancre-ville-assouan'];
    if (pa && pb) this.kmParUnite = KM_CAIRE_ASSOUAN / Math.hypot(pb.x - pa.x, pb.y - pa.y);

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
      this.labels.push(t);
    });

    // Positions : ancre + décalage manuel, puis écartement des pierres qui se touchent
    const pos = {};
    const items = [];
    for (const g of donnees) {
      const a = ancres['ancre-' + g.id];
      if (!a) { console.warn('Pas d’ancre pour', g.id); continue; }
      const dx = (g.decalage && g.decalage.dx) || 0;
      const dy = (g.decalage && g.decalage.dy) || 0;
      pos[g.id] = { x: a.x + dx, y: a.y + dy };
      items.push({ id: g.id, x: pos[g.id].x, y: pos[g.id].y, r: (g.taille || TAILLE_PAR_DEFAUT) / 2 });
    }
    separerPierres(items);
    items.forEach(it => { pos[it.id] = { x: it.x, y: it.y }; });

    // Gemmes : still + survol, morphing par flubber
    for (const g of donnees) {
      const ancre = pos[g.id];
      if (!ancre) continue;
      creerTexture(defs, g.id, g.texture);

      const [dA, dB] = await Promise.all([
        extraireD(`assets/svg/${g.id}-still.svg`),
        extraireD(`assets/svg/${g.id}-survol.svg`)
      ]);
      const bA = bboxDe(svg, dA);
      const bB = bboxDe(svg, dB);
      const echelle = g.morph === 'echelle';

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
        k: (g.taille || TAILLE_PAR_DEFAUT) / bA.width,
        dStill: dA,
        echelle,
        interp: null,
        t: 0
      };
      gem.interp = this.construireMorph(gem, dA, dB);
      gem.echelle = gem.echelle || !gem.interp;
      if (!gem.interp) gem.interp = () => dA;
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

  // Construit le morphing ; retourne null si flubber n'est pas disponible
  construireMorph(g, dA, dB) {
    if (g.echelle) return null;
    if (typeof flubber === 'undefined') {
      console.error('flubber absent : morphing désactivé pour', g.id);
      return null;
    }
    const f = flubber.interpolate(dA, dB, { maxSegmentLength: 6 });
    // test : la fonction doit produire un tracé à mi-chemin
    if (typeof f(0.5) !== 'string' || f(0.5).length < 10) {
      console.error('morphing invalide pour', g.id);
      return null;
    }
    return f;
  },

  // Centre d'un élément, transformé dans le repère racine de la carte
  centre(el) {
    const b = el.getBBox();
    const p = this.svg.createSVGPoint();
    p.x = b.x + b.width / 2;
    p.y = b.y + b.height / 2;
    // élément -> écran -> repère racine du SVG (sans l'échelle de la fenêtre)
    const m = this.svg.getScreenCTM().inverse().multiply(el.getScreenCTM());
    return p.matrixTransform(m);
  },

  // Affiche la forme à l'état t (0 = still, 1 = survol), centrée sur l'ancre
  rendre(g) {
    const t = g.t;
    let cx = g.cA.x, cy = g.cA.y, zoom = 1;
    if (g.echelle) {
      zoom = 1 + 0.2 * t;             // agrandissement simple, sans morphing
    } else {
      cx = g.cA.x + (g.cB.x - g.cA.x) * t;
      cy = g.cA.y + (g.cB.y - g.cA.y) * t;
    }
    g.el.setAttribute('d', g.interp(t));
    g.el.setAttribute('transform',
      `translate(${g.ax} ${g.ay}) scale(${g.k * zoom}) translate(${-cx} ${-cy})`);
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
    b.querySelector('.bulle-texte').textContent = g.texte;
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

// Zoom : la vue (viewBox) change, les gemmes suivent puisqu'elles sont dans le même repère
Object.assign(Carte, {
  vue: null,
  zoomMin: 1,
  zoomMax: 8,

  initVue() {
    this.vue = { x: 0, y: 0, w: this.largeur, h: this.hauteur };
    this.svg.addEventListener('wheel', e => {
      e.preventDefault();
      const p = this.coordsEcran(e.clientX, e.clientY);
      const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.02 : 0.005));  // pincement ou défilement
      this.zoomer(f, p.x, p.y);
    }, { passive: false });
    this.appliquerVue();
  },

  coordsEcran(cx, cy) {
    const p = this.svg.createSVGPoint();
    p.x = cx; p.y = cy;
    return p.matrixTransform(this.svg.getScreenCTM().inverse());
  },

  zoomActuel() { return this.largeur / this.vue.w; },

  appliquerVue() {
    const v = this.vue;
    this.svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
    // les noms de villes apparaissent progressivement en zoomant
    const op = Math.max(0.75, Math.min(1, 0.75 + (this.zoomActuel() - 1) * 0.25));
    this.labels.forEach(t => { t.style.opacity = op; });
    if (typeof Reglette !== 'undefined') Reglette.maj();
  },

  // Zoom centré sur le point (px, py), en coordonnées de la carte
  zoomer(f, px, py) {
    const v = this.vue;
    const nw = Math.min(this.largeur / this.zoomMin, Math.max(this.largeur / this.zoomMax, v.w / f));
    const r = nw / v.w;
    const nh = v.h * r;
    let x = px - (px - v.x) * r;
    let y = py - (py - v.y) * r;
    x = Math.max(0, Math.min(this.largeur - nw, x));
    y = Math.max(0, Math.min(this.hauteur - nh, y));
    this.vue = { x, y, w: nw, h: nh };
    this.appliquerVue();
  },

  zoomerAuCentre(f) {
    const v = this.vue;
    this.zoomer(f, v.x + v.w / 2, v.y + v.h / 2);
  },

  vueComplete() {
    this.vue = { x: 0, y: 0, w: this.largeur, h: this.hauteur };
    this.appliquerVue();
  }
});
