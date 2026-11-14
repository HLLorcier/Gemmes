// Réglette en km, couleur menthe, recalculée à chaque zoom.
const Reglette = {
  COULEUR: '#D2E7D1',
  TEXTE: '#745447',
  CHOIX_KM: [2, 5, 10, 20, 50, 100, 200, 500],
  LONGUEUR_CIBLE: 200,

  maj() {
    const el = document.getElementById('reglette');
    const svg = Carte.svg;
    if (!el || !svg || !Carte.vue) return;

    const r = svg.getBoundingClientRect();
    const v = Carte.vue;
    const pxParUnite = Math.min(r.width / v.w, r.height / v.h);
    if (!isFinite(pxParUnite) || pxParUnite <= 0) return;
    const pxParKm = pxParUnite / Carte.kmParUnite;

    let km = this.CHOIX_KM[0];
    for (const c of this.CHOIX_KM) if (c * pxParKm <= this.LONGUEUR_CIBLE) km = c;
    const L = km * pxParKm;

    const pad = 12, H = 26, y0 = 22;   // base à y0, graduations courtes
    const C = this.COULEUR, T = this.TEXTE;
    let s = `<svg width="${L + 2 * pad}" height="${H}" viewBox="0 0 ${L + 2 * pad} ${H}" fill="none">`;
    s += `<path d="M${pad} ${y0} L${pad + L} ${y0}" stroke="${C}" stroke-width="0.6"/>`;
    for (let i = 0; i <= 4; i++) {
      const x = pad + (L * i) / 4;
      const h = i % 2 === 0 ? 8 : 5;
      s += `<path d="M${x} ${y0} L${x} ${y0 - h}" stroke="${C}" stroke-width="0.6"/>`;
    }
    const lab = (x, t) => `<text x="${x}" y="${y0 - 10}" fill="${T}" font-size="12" stroke="${T}" stroke-width="0.3" text-anchor="middle">${t}</text>`;
    s += lab(pad, '0') + lab(pad + L / 2, km / 2) + lab(pad + L, km + ' km');
    s += '</svg>';
    el.innerHTML = s;
  }
};
