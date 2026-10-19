const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
Module._extensions['.ts'] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      fileName: filename,
    }).outputText,
    filename,
  );
const T = require('three');
const {
  CITY_SITE_PLAN: city,
  CITY_MONORAIL_PLAN: rail,
  cityPlotDefinition,
  cityPedestrianSegments,
  monorailPointAt,
  monorailSupportPoint,
  validateCityClearances,
  validateCityPedestrianNetwork,
} = require('../src/app/town/city-site-plan.ts');
const {
  CHAPTER_TWO_SITE_PLAN: ch2,
  CHAPTER_TWO_ROAD_CONTROL_POINTS: road,
} = require('../src/app/town/chapter-two-site-plan.ts');
const { CHAPTER_ONE_PROPERTY_BOUNDS: home } = require('../src/app/town/plot-blueprints.ts');
const { resolvePlotPoint, validatePlot } = require('../src/app/town/plot-framework.ts');
const output = 'docs/evidence/urban-cohesion';
fs.mkdirSync(output, { recursive: true });
const bounds = { minX: -34, maxX: 144, minZ: -50, maxZ: 49 },
  scale = 7.5,
  X = (x) => 50 + (x - bounds.minX) * scale,
  Y = (z) => 120 + (z - bounds.minZ) * scale;
const parts = [],
  add = (value) => parts.push(value),
  escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const line = (points, color, width, dash = '') =>
  add(
    `<path d="${points.map(([x, z], i) => `${i ? 'L' : 'M'}${X(x).toFixed(2)},${Y(z).toFixed(2)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="${width * scale}" ${dash ? `stroke-dasharray="${dash}"` : ''} stroke-linecap="round" stroke-linejoin="round"/>`,
  );
function rect(x, z, w, d, fill, stroke, rotation = 0, dash = '') {
  add(
    `<rect x="${X(x - w / 2)}" y="${Y(z - d / 2)}" width="${w * scale}" height="${d * scale}" fill="${fill}" stroke="${stroke}" stroke-width="1.2" transform="rotate(${(-rotation * 180) / Math.PI} ${X(x)} ${Y(z)})" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`,
  );
}
function text(x, z, label, size = 12) {
  add(
    `<text x="${X(x)}" y="${Y(z)}" text-anchor="middle" font-size="${size}" paint-order="stroke" stroke="#faf7ed" stroke-width="4" fill="#294736">${escape(label)}</text>`,
  );
}
add(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 1040" width="1440" height="1040"><style>text{font-family:Segoe UI,Arial}</style><rect width="1440" height="1040" fill="#faf7ed"/><text x="50" y="42" font-family="Georgia" font-size="28" fill="#294736">Foundations — connected town plan</text><text x="50" y="72" font-size="14" fill="#536855">Production site-plan coordinates · metres · established houses fixed · blue rail / ochre walking links</text>`,
);
rect(
  rail.terrain.center[0],
  rail.terrain.center[1],
  rail.terrain.width,
  rail.terrain.depth,
  '#edf0df',
  '#839483',
);
rect(
  city.terrain.center[0],
  city.terrain.center[1],
  city.terrain.width,
  city.terrain.depth,
  'none',
  '#9fa889',
  0,
  '5 4',
);
for (const green of city.greenSpaces) {
  rect(
    city.origin[0] + green.center[0],
    city.origin[2] + green.center[1],
    green.width,
    green.depth,
    '#cedcba',
    '#799a62',
  );
  text(city.origin[0] + green.center[0], city.origin[2] + green.center[1] + 2, green.name, 11);
}
const roadWorld = road.map(([x, z]) => [
  x + ch2.district.position[0],
  z + ch2.district.position[2],
]);
line(roadWorld, '#d0cbb8', 9.5);
line(roadWorld, '#626b66', 6.3);
for (const segment of city.streets.roadSegments) {
  const p = [segment.from, segment.to].map(([x, z]) => [x + city.origin[0], z + city.origin[2]]);
  line(p, '#d0cbb8', 9.5);
  line(p, '#626b66', 6.3);
}
rect(
  (home.minX + home.maxX) / 2,
  (home.minZ + home.maxZ) / 2,
  home.maxX - home.minX,
  home.maxZ - home.minZ,
  '#d8cdb7',
  '#746b5b',
);
text(-5, -4, 'Original home', 10);
for (const lot of ch2.lots) {
  rect(lot.x, lot.z, lot.width, lot.depth, '#e1dfcd', '#99967d', lot.rotation);
  text(lot.x, lot.z, 'Neighbor ' + lot.index, 10);
}
for (const site of ch2.publicSites) {
  rect(site.x, site.z, site.width, site.depth, '#d2e3cf', '#809a80');
  text(
    site.x,
    site.z,
    site.projectId === 'ch2-community-park'
      ? 'Park'
      : site.projectId === 'ch2-landmark'
        ? 'Landmark'
        : 'Entry',
    10,
  );
}
for (const site of city.projects.filter((site) => site.role === 'public-space')) {
  rect(
    city.origin[0] + site.position[0],
    city.origin[2] + site.position[2],
    site.width,
    site.depth,
    '#e6dfcc',
    '#9b997e',
  );
  text(
    city.origin[0] + site.position[0],
    city.origin[2] + site.position[2],
    site.id === 'city-plaza' ? 'Civic square' : 'Greenway',
    11,
  );
}
const definition = cityPlotDefinition();
for (const node of definition.nodes.filter(
  (node) => node.role === 'structure' && node.id.startsWith('city-'),
)) {
  const p = resolvePlotPoint(definition, node.id, [0, 0, 0]);
  const site = city.projects.find((site) => site.id === node.parentId);
  rect(p.x, p.z, node.dimensions.width, node.dimensions.depth, '#c4b494', '#7c6b52', site.rotation);
  text(
    p.x,
    p.z,
    node.id === 'city-library-building'
      ? 'Library'
      : node.id === 'city-shop-1'
        ? 'Bakery'
        : node.id === 'city-shop-2'
          ? 'Books'
          : 'Market',
    10,
  );
}
for (const path of cityPedestrianSegments())
  line([path.from, path.to], '#b49255', Math.min(path.width, 1.2), '3 3');
const railPoints = Array.from({ length: 401 }, (_, i) => {
  const p = monorailPointAt(i / 400);
  return [p.x + rail.origin[0], p.z + rail.origin[2]];
});
line(railPoints, '#4e7d90', 0.55);
for (let i = 0; i < rail.supportCount; i++) {
  const p = monorailSupportPoint(i);
  add(
    `<circle cx="${X(p.x + rail.origin[0])}" cy="${Y(p.z + rail.origin[2])}" r="2" fill="#40687b"/>`,
  );
}
for (const station of rail.stations) {
  const x = rail.origin[0] + station.position[0],
    z = rail.origin[2] + station.position[2];
  rect(x, z, station.width, station.depth, '#d9dbe4', '#426e83', station.rotation);
  text(x, z - 8, station.name, 12);
}
text(35, 5, 'Established residential street', 11);
text(83, 5.2, 'Main Street', 11);
text(17, 33, 'Quiet residential edge / future outward growth', 12);
add(
  `<text x="50" y="942" font-size="16" fill="#294736">One continuous world: home → residential street → walkable Main Street → civic square / greenway</text><text x="50" y="972" font-size="13" fill="#536855">Dashed outline: complete Chapter 3 terrain · outer outline: Chapter 4 terrain · dots: offset cantilever piers</text><text x="50" y="997" font-size="13" fill="#536855">The diagnostic uses authored footprints and walking centerlines; it is not arbitrary mesh collision or NPC navigation.</text></svg>`,
);
fs.writeFileSync(`${output}/site-plan.svg`, parts.join('\n'));
const diagnostics = {
  streetLength: 39,
  maximumSupportSpan: rail.measuredSupportSpacing,
  freePiers: rail.supportCount,
  plot: validatePlot(definition),
  clearances: validateCityClearances(),
  pedestrian: validateCityPedestrianNetwork(),
};
fs.writeFileSync(`${output}/site-plan-checks.json`, JSON.stringify(diagnostics, null, 2) + '\n');
console.log(diagnostics);
