// Столбчатый график на SVG без библиотек: факт столбцами, план — риской на каждом столбце.
// bars: [{ label, value, plan, title }]. Цвета — через CSS-переменные.
import { esc } from './fmt.js';

export function barChart(bars, { color = 'var(--accent)', height = 150 } = {}) {
  if (!bars.length) return '';
  const W = 320, H = height, top = 14, bottom = 20;
  const max = Math.max(1, ...bars.map(b => Math.max(b.value, b.plan || 0)));
  const step = W / bars.length;
  const bw = Math.max(3, step * 0.62);
  const y = (v) => top + (H - top - bottom) * (1 - v / max);
  const every = Math.ceil(bars.length / 8);
  const cols = bars.map((b, i) => {
    const x = i * step + (step - bw) / 2;
    const yv = y(b.value);
    const hv = Math.max(b.value > 0 ? 2 : 0, H - bottom - yv);
    const met = b.plan ? b.value >= b.plan - 1e-9 : b.value > 0;
    return `<g><title>${esc(b.title || '')}</title>
      <rect x="${x.toFixed(1)}" y="${(H - bottom - hv).toFixed(1)}" width="${bw.toFixed(1)}" height="${hv.toFixed(1)}" rx="2" class="bar-v${met ? ' met' : ''}"/>
      ${b.plan ? `<line x1="${(x - 1).toFixed(1)}" x2="${(x + bw + 1).toFixed(1)}" y1="${y(b.plan).toFixed(1)}" y2="${y(b.plan).toFixed(1)}" class="bar-plan"/>` : ''}
      ${i % every === 0 ? `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 5}" class="bar-l">${esc(b.label)}</text>` : ''}
    </g>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" style="--c:${color}">
    <line x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}" class="bar-axis"/>${cols}</svg>`;
}
