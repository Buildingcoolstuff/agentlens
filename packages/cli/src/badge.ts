/**
 * Dynamic SVG Shield Badge Generator (badge.ts)
 *
 * Produces GitHub README badges: [ Agent Readiness | 94/100 ]
 */

export function generateSvgBadge(score: number): string {
  const label = 'Agent Readiness';
  const value = `${Math.round(score)}/100`;

  let color = '#10b981'; // green
  if (score < 60) {
    color = '#ef4444'; // red
  } else if (score < 80) {
    color = '#f59e0b'; // amber
  }

  const labelWidth = 104;
  const valueWidth = 56;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#24292e"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${(labelWidth / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(labelWidth - 16) * 10}">${label}</text>
    <text x="${(labelWidth / 2) * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${(labelWidth - 16) * 10}">${label}</text>
    <text aria-hidden="true" x="${(labelWidth + valueWidth / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(valueWidth - 16) * 10}">${value}</text>
    <text x="${(labelWidth + valueWidth / 2) * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${(valueWidth - 16) * 10}">${value}</text>
  </g>
</svg>`;
}
