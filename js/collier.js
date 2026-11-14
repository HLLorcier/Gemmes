const NS_COLLIER = 'http://www.w3.org/2000/svg';

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

  // Recalcule le fil en U selon la taille réelle de la zone
  dessiner() {
    const w = this.zone.clientWidth;
    const h = this.zone.clientHeight;
    if (!w || !h) return;
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const top = h * 0.07;
    const bas = h * 0.8;
    const R = Math.min(w * 0.3, (bas - top) / 2);
    const cx = w / 2;
    const cy = bas - R;               // centre du demi-cercle du fond
    const xl = cx - R, xr = cx + R;
    const Lh = cy - top;              // longueur d'un bras
    this.geo = {
      top, cy, xl, xr, R, Lh,
      Ltot: 2 * Lh + Math.PI * R,
      sCentre: Lh + Math.PI * R / 2,  // position du fond du U le long du fil
      neck: Math.min(w, h) * 0.09     // taille d'une perle
    };

    this.chemin.setAttribute('d',
      `M${xl} ${top} L${xl} ${cy} A${R} ${R} 0 0 0 ${xr} ${cy} L${xr} ${top}`);

    this.items.forEach(it => { it.s = this.sFor(it.cote, it.index); this.placer(it); });
  },

  // Position le long du fil pour une perle (côté gauche ou droit, rang i)
  sFor(cote, i) {
    const g = this.geo;
    const off = g.neck * 0.7 + i * g.neck * 1.05;
    const s = cote === 'droite' ? g.sCentre + off : g.sCentre - off;
    return Math.max(g.neck / 2, Math.min(g.Ltot - g.neck / 2, s));
  },

  // s < 0 : au-dessus du haut du collier, hors écran
  pointAt(s) {
    const g = this.geo;
    if (s < 0) return { x: g.xl, y: g.top + s };
    return this.chemin.getPointAtLength(s);
  },

  placer(it) {
    if (!this.geo) return;
    const p = this.pointAt(it.s);
    const k = this.geo.neck / it.g.bA.width;
    it.el.setAttribute('transform',
      `translate(${p.x} ${p.y}) scale(${k}) translate(${-it.g.cA.x} ${-it.g.cA.y})`);
  },

  // Ajoute une gemme : elle glisse depuis le fond vers son emplacement
  ajouter(g) {
    if (!this.geo) return false;
    if (this.items.some(it => it.g.id === g.id)) return false;

    const cote = Carte.estAGauche(g) ? 'gauche' : 'droite';
    const index = this.items.filter(it => it.cote === cote).length;

    const el = document.createElementNS(NS_COLLIER, 'path');
    el.setAttribute('d', g.dStill);
    el.setAttribute('fill', `url(#tex-${g.id})`);
    this.groupe.appendChild(el);

    const depart = -this.geo.top - this.geo.neck * 2; // hors champ, au-dessus
    const it = { g, cote, index, el, s: depart };
    this.items.push(it);
    this.placer(it);

    Sons.jouer('chaine');
    tween(it, depart, this.sFor(cote, index), 1600,
      v => { it.s = v; this.placer(it); },
      () => Sons.jouer('tintement'));
    return true;
  },

  // Cisailles : la chaîne se brise, les perles disparaissent en fondu
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
