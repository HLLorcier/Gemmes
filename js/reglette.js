// Réglette en km, couleur menthe #D2E7D1, qui se recalcule à chaque zoom.
// Reprend la géométrie des SVG echelle-horizontal (base), echelle-vertical (petite graduation)
// et echelle-vertical-haut (grande graduation) : traits de 4 px, carrés aux extrémités.
const Reglette = {
  COULEUR: '#D2E7D1',
  TEXTE: '#745447',
  CHOIX_KM: [2, 5, 10, 20, 50, 100, 200, 500],
  LONGUEUR_CIBLE: 200,   // px environ

  maj() {
    const el = document.getElementById('reglette');
    const svg = Carte.svg;
    if (!el || !svg || !Carte.vue) return;

    const r = svg.getBoundingClientRect();
    const v = Carte.vue;
    const pxParUnite = Math.min(r.width / v.w, r.height / v.h);
    if (!isFinite(pxParUnite) || pxParUnite <= 0) return;
    const pxParKm = pxParUnite / Carte.kmParUnite;

    // plus grande valeur ronde dont la longueur reste sous la cible
    let km = this.CHOIX_KM[0];
    for (const c of this.CHOIX_KM) if (c * pxParKm <= this.LONGUEUR_CIBLE) km = c;
    const L = km * pxParKm;

    const pad = 12, H = 64, y0 = H - 12;
    const C = this.COULEUR;
    let s = `<svg width="${L + 2 * pad}" height="${H}" viewBox="0 0 ${L + 2 * pad} ${H}" fill="none">`;
    // base horizontale
    s += `<path d="M${pad} ${y0} L${pad + L} ${y0}" stroke="${C}" stroke-width="1"/>`;
    // graduations : 4 divisions, grandes aux extrémités et au milieu
    for (let i = 0; i <= 4; i++) {
      const x = pad + (L * i) / 4;
      const grande = i % 2 === 0;
      const h = grande ? 48 : 28;
      s += `<path d="M${x} ${y0} L${x} ${y0 - h}" stroke="${C}" stroke-width="1" stroke-linecap="square"/>`;
    }
    // libellés en Julius
    const T = this.TEXTE;
    const lab = (x, t) => `<text x="${x}" y="${y0 - 56 + 14}" fill="${T}" font-size="14" stroke="${T}" stroke-width="0.4" text-anchor="middle">${t}</text>`;
    s += lab(pad, '0') + lab(pad + L / 2, km / 2) + lab(pad + L, km + ' km');
    s += '</svg>';
    el.innerHTML = s;
  }
};
