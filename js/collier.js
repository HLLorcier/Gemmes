const NS_COLLIER = 'http://www.w3.org/2000/svg';

// Les pierres tombent du haut du bras de leur côté et s'empilent depuis le fond du U,
// comme sous l'effet de la gravité. Une nouvelle pierre ne passe jamais par-dessus les autres.
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
      sCentre: Lh + Math.PI * R / 2,   // fond du U, le long du fil
      neck,
      gap: neck * 1.05
    };

    this.chemin.setAttribute('d',
      `M${xl} ${top} L${xl} ${cy} A${R} ${R} 0 0 0 ${xr} ${cy} L${xr} ${top}`);

    this.items.forEach(it => { it.s = this.sFor(it.cote, it.rang); this.placer(it); });
  },

  // Position d'arrivée : empilée depuis le fond, du côté de la pierre
  sFor(cote, rang) {
    const g = this.geo;
    const off = g.neck * 0.5 + rang * g.gap;
    return cote === 'droite' ? g.sCentre + off : g.sCentre - off;
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
    const k = this.geo.neck / g.bA.width;
    const c = g.cB;                    // centre de la forme survol
    it.el.setAttribute('transform',
      `translate(${p.x} ${p.y}) scale(${k}) translate(${-c.x} ${-c.y})`);
  },

  // Ajoute une pierre (forme taillée, survol morphé) : elle tombe du haut de son bras
  ajouter(g) {
    if (!this.geo) return false;
    const cote = Carte.estAGauche(g) ? 'gauche' : 'droite';
    const rang = this.items.filter(it => it.cote === cote).length;
    const arrivee = this.sFor(cote, rang);
    if (arrivee < this.geo.neck * 0.5 || arrivee > this.geo.Ltot - this.geo.neck * 0.5) {
      console.info('Collier plein de ce côté');
      return false;
    }

    const el = document.createElementNS(NS_COLLIER, 'path');
    el.setAttribute('d', g.dSurvol);   // forme du fichier -survol, telle quelle
    el.setAttribute('fill', `url(#tex-${g.id})`);
    this.groupe.appendChild(el);

    const depart = cote === 'droite' ? this.geo.Ltot + this.geo.neck * 2 : -this.geo.neck * 2;
    const it = { g, cote, rang, el, s: depart };
    this.items.push(it);
    this.placer(it);

    tween(it, depart, arrivee, 1200,
      v => { it.s = v; this.placer(it); },
      () => {
        Sons.jouer('tintement');
        // rebond amorti à l'arrivée, comme une perle qui se pose
        const amp = this.geo.neck * 0.18;
        tween(it, 0, 1, 600, t => {
          it.s = arrivee + amp * Math.sin(t * Math.PI * 3) * (1 - t);
          this.placer(it);
        }, () => { it.s = arrivee; this.placer(it); });
      });
    return true;
  },

  // Cisailles : coupe-collier, le fil se brise, les pierres disparaissent en fondu
  reinitialiser() {
    Sons.jouer('coupe');
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
