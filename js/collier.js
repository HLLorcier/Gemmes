const NS_COLLIER = 'http://www.w3.org/2000/svg';

// Collier : perles enfilées sur le fil ovale.
// - la gravité les fait glisser le long de la courbe ;
// - deux perles voisines ne se traversent pas (distance = diamètre) ;
// - le fil commence hors champ, en haut des bras.
const Collier = {
  svg: null,
  zone: null,
  chemin: null,
  groupe: null,
  perles: [],
  geo: null,
  dernier: 0,
  dernierChoc: 0,

  init() {
    this.svg = document.getElementById('collier');
    this.zone = document.getElementById('collier-zone');

    this.chemin = document.createElementNS(NS_COLLIER, 'path');
    this.chemin.setAttribute('fill', 'none');
    this.chemin.setAttribute('stroke', 'url(#tex-fil)');
    this.chemin.setAttribute('stroke-width', '7');
    this.chemin.setAttribute('stroke-linecap', 'round');

    this.groupe = document.createElementNS(NS_COLLIER, 'g');
    this.svg.append(this.chemin, this.groupe);

    new ResizeObserver(() => this.dessiner()).observe(this.zone);
    this.dessiner();
    requestAnimationFrame(t => { this.dernier = t; this.boucle(t); });
  },

  // Forme ovale : bras droits, puis demi-ellipse en bas. Les bras partent hors champ.
  dessiner() {
    const w = this.zone.clientWidth;
    const h = this.zone.clientHeight;
    if (!w || !h) return;
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const ext = h * 0.35;
    const top = h * 0.07;
    const top0 = top - ext;
    const bas = h * 0.8;
    const R = Math.min(w * 0.27, (bas - top) * 0.5);   // demi-largeur
    const ry = Math.min(R * 1.45, bas - top - 10);     // hauteur de la partie ovale
    const cy = bas - ry;
    const xl = w / 2 - R, xr = w / 2 + R;

    this.chemin.setAttribute('d',
      `M${xl} ${top0} L${xl} ${cy} A${R} ${ry} 0 0 0 ${xr} ${cy} L${xr} ${top0}`);
    const Ltot = this.chemin.getTotalLength();

    const ancien = this.geo ? this.geo.Ltot : Ltot;
    const neck = Math.min(w, h) * 0.13;                // perles plus grosses
    this.geo = { w, h, Ltot, neck, D: neck * 1.02, G: h * 1.6 };
    this.perles.forEach(p => { p.s *= Ltot / ancien; });
    this.perles.forEach(p => this.placer(p));
  },

  pointAt(s) {
    const g = this.geo;
    return this.chemin.getPointAtLength(Math.max(0, Math.min(g.Ltot, s)));
  },

  // composante verticale de la tangente : positive quand s augmente en descendant
  penteY(s) {
    const g = this.geo;
    const a = this.pointAt(s - 1);
    const b = this.pointAt(s + 1);
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return (b.y - a.y) / len;
  },

  placer(p) {
    if (!this.geo) return;
    const q = this.pointAt(p.s);
    const k = this.geo.neck / p.g.bA.width;
    const c = p.g.cB;
    p.el.setAttribute('transform',
      `translate(${q.x} ${q.y}) scale(${k}) translate(${-c.x} ${-c.y})`);
  },

  boucle(t) {
    const dt = Math.min((t - this.dernier) / 1000, 1 / 30);
    this.dernier = t;
    if (this.geo && this.perles.length) this.pas(dt);
    requestAnimationFrame(t2 => this.boucle(t2));
  },

  pas(dt) {
    const g = this.geo;
    const n = 4;
    const h = dt / n;
    const maintenant = performance.now();
    for (let k = 0; k < n; k++) {
      for (const p of this.perles) {
        p.v += g.G * this.penteY(p.s) * h;
        p.v *= Math.exp(-2.2 * h);            // frottement : glissement plus freiné
        p.s += p.v * h;
      }
      this.contraintes();
    }
    // son de glissement, tiré au hasard, quand une perle file sur le fil
    for (const p of this.perles) {
      if (Math.abs(p.v) > 90 && maintenant - (p.dernierGlisse || 0) > 500) {
        p.dernierGlisse = maintenant;
        Sons.jouer('enfiler');
      }
    }
    this.perles.forEach(p => this.placer(p));
  },

  contraintes() {
    const g = this.geo;
    for (let it = 0; it < 12; it++) {
      this.perles.sort((a, b) => a.s - b.s);
      for (let i = 0; i < this.perles.length - 1; i++) {
        const a = this.perles[i], b = this.perles[i + 1];
        const d = b.s - a.s;
        if (d < g.D) {
          const corr = (g.D - d) / 2;
          a.s -= corr;
          b.s += corr;
          const moy = (a.v + b.v) / 2;
          const dv = Math.abs(a.v - b.v);
          a.v = moy; b.v = moy;
          if (dv > 60 && it === 0) this.choc();
        }
      }
    }
    for (const p of this.perles) {
      if (p.s < 0) { p.s = 0; p.v = Math.max(p.v, 0); }
      if (p.s > g.Ltot) { p.s = g.Ltot; p.v = Math.min(p.v, 0); }
    }
  },

  choc() {
    const maintenant = performance.now();
    if (maintenant - this.dernierChoc < 160) return;
    this.dernierChoc = maintenant;
    Sons.jouer('tintement');
  },

  // la perle entre par le haut du bras de son côté, hors champ, et glisse sur le fil
  ajouter(g) {
    if (!this.geo) return false;
    const cote = Carte.estAGauche(g) ? 'gauche' : 'droite';
    const el = document.createElementNS(NS_COLLIER, 'path');
    el.setAttribute('d', g.dSurvol);
    el.setAttribute('fill', `url(#tex-${g.id})`);
    el.setAttribute('class', 'perle');
    this.groupe.appendChild(el);

    const p = { g, el, cote, s: cote === 'gauche' ? 0 : this.geo.Ltot, v: 0, dernierGlisse: 0 };
    this.perles.push(p);
    this.placer(p);
    Sons.jouer('chaine');
    return true;
  },

  // cisailles : le fil se brise, les perles disparaissent en fondu
  reinitialiser() {
    Sons.jouer('coupe');
    tween(this, 1, 0.25, 200,
      v => { this.chemin.style.opacity = v; },
      () => tween(this, 0.25, 1, 500, v => { this.chemin.style.opacity = v; }));

    const anciennes = this.perles;
    this.perles = [];
    anciennes.forEach(p => {
      tween(p, 1, 0, 700,
        v => { p.el.style.opacity = v; },
        () => p.el.remove());
    });
  }
};
