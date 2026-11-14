const NS_COLLIER = 'http://www.w3.org/2000/svg';

// Les perles s'alignent dans l'ordre d'ajout, de gauche à droite le long du fil.
const Collier = {
  svg: null,
  zone: null,
  chemin: null,
  groupe: null,
  items: [],
  geo: null,

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
  },

  dessiner() {
    const w = this.zone.clientWidth;
    const h = this.zone.clientHeight;
    if (!w || !h) return;
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const top = h * 0.07;
    const bas = h * 0.8;
    const R = Math.min(w * 0.3, (bas - top) / 2);
    const cx = w / 2;
    const cy = bas - R;
    const xl = cx - R, xr = cx + R;
    const Lh = cy - top;
    const neck = Math.min(w, h) * 0.09;
    this.geo = {
      w, h, top, cy, xl, xr, R, Lh,
      Ltot: 2 * Lh + Math.PI * R,
      neck,
      gap: neck * 1.05
    };

    this.chemin.setAttribute('d',
      `M${xl} ${top} L${xl} ${cy} A${R} ${R} 0 0 0 ${xr} ${cy} L${xr} ${top}`);

    this.items.forEach(it => { it.s = this.sPour(it.index); this.placer(it); });
  },

  // Position le long du fil pour le rang i
  sPour(i) {
    return this.geo.neck * 0.5 + i * this.geo.gap;
  },

  // s < 0 : au-dessus du bras gauche ; s > Ltot : au-dessus du bras droit (hors écran)
  pointAt(s) {
    const g = this.geo;
    if (s < 0) return { x: g.xl, y: g.top + s };
    if (s > g.Ltot) return { x: g.xr, y: g.top - (s - g.Ltot) };
    return this.chemin.getPointAtLength(s);
  },

  placer(it) {
    if (!this.geo) return;
    const p = this.pointAt(it.s);
    const g = it.g;
    const k = this.geo.neck / g.bA.width * (g.echelle ? 1.2 : 1);
    const c = g.echelle ? g.cA : g.cB;
    it.el.setAttribute('transform',
      `translate(${p.x} ${p.y}) scale(${k}) translate(${-c.x} ${-c.y})`);
  },

  // Ajoute une pierre (forme taillée, survol morphé) : elle descend du haut du bras droit
  ajouter(g) {
    if (!this.geo) return false;
    const index = this.items.length;
    if (this.sPour(index) > this.geo.Ltot - this.geo.neck * 0.5) {
      console.info('Collier plein');
      return false;
    }

    const el = document.createElementNS(NS_COLLIER, 'path');
    el.setAttribute('d', g.echelle ? g.dStill : g.interp(1));
    el.setAttribute('fill', `url(#tex-${g.id})`);
    this.groupe.appendChild(el);

    const it = { g, index, el, s: this.geo.Ltot + this.geo.neck * 2 };
    this.items.push(it);
    this.placer(it);

    Sons.jouer('chaine');
    tween(it, it.s, this.sPour(index), 1400,
      v => { it.s = v; this.placer(it); },
      () => Sons.jouer('tintement'));
    return true;
  },

  // Cisailles : le fil se brise, les pierres disparaissent en fondu
  reinitialiser() {
    Sons.jouer('ciseau');
    tween(this, 1, 0.25, 200,
      v => { this.chemin.style.opacity = v; },
      () => tween(this, 0.25, 1, 500, v => { this.chemin.style.opacity = v; }));

    const anciens = this.items;
    this.items = [];
    anciens.forEach(it => {
      tween(it, 1, 0, 700,
        v => { it.el.style.opacity = v; },
        () => it.el.remove());
    });
  }
};
