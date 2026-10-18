// Regenerates the authored overhead site-plan evidence from the production plot data.
// Run with: node scripts/render-chapter-two-site-plan.cjs [output.svg]
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const THREE = require('three');

Module._extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const {
  CHAPTER_TWO_SITE_PLAN: plan,
  CHAPTER_TWO_ROAD_CONTROL_POINTS: roadPoints,
  chapterTwoRoadCenterZAt,
  createChapterTwoNeighborhoodPlot,
} = require('../src/app/town/chapter-two-site-plan.ts');
const { plotFootprintPolygon, plotPolygonClearance } = require('../src/app/town/plot-framework.ts');
const { CHAPTER_ONE_PROPERTY_BOUNDS: chapterOneBounds } = require('../src/app/town/plot-blueprints.ts');

const chapterOnePlot = {
  nodes: [
    {
      id: 'chapter1-property',
      role: 'lot',
      dimensions: {
        width: chapterOneBounds.maxX - chapterOneBounds.minX,
        depth: chapterOneBounds.maxZ - chapterOneBounds.minZ,
        height: 10,
      },
      localTransform: {
        position: [
          (chapterOneBounds.minX + chapterOneBounds.maxX) / 2,
          0,
          (chapterOneBounds.minZ + chapterOneBounds.maxZ) / 2,
        ],
      },
      occupancy: 'none',
    },
    {
      id: 'chapter1-home',
      role: 'structure',
      parentId: 'chapter1-property',
      dimensions: { width: 8.851957, depth: 7.865, height: 6.58 },
      localTransform: { position: [0.85, 0.13, 0.85] },
      footprint: {
        width: 8.851957,
        depth: 7.865,
        offsetX: 1.1759785,
        offsetZ: 0.6175,
      },
    },
  ],
};
const plotDefinition = createChapterTwoNeighborhoodPlot(chapterOnePlot);

const destination = path.resolve(process.argv[2] || 'docs/evidence/chapter2-production-conversion/site-plan.svg');
fs.mkdirSync(path.dirname(destination), { recursive: true });

const bounds = { minX: -19, maxX: 73, minZ: -38, maxZ: 31 };
const scale = 14;
const margin = { left: 92, top: 116, right: 92, bottom: 132 };
const width = Math.ceil((bounds.maxX - bounds.minX) * scale + margin.left + margin.right);
const height = Math.ceil((bounds.maxZ - bounds.minZ) * scale + margin.top + margin.bottom);
const X = (x) => margin.left + (x - bounds.minX) * scale;
const Y = (z) => margin.top + (bounds.maxZ - z) * scale;
const round = (value) => Number(value.toFixed(2));
const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const parts = [];
const add = (markup) => parts.push(markup);

add(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
add('<defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#31594b"/></marker><pattern id="lawn" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#e5ebd9"/><circle cx="2" cy="2" r="0.55" fill="#c6d2b5"/><circle cx="7" cy="6" r="0.45" fill="#c6d2b5"/></pattern><pattern id="public" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#e5eee8"/><path d="M0 10L10 0" stroke="#c7d9cd" stroke-width="1"/></pattern></defs>');
add(`<rect width="${width}" height="${height}" fill="#f6f4ed"/>`);
add(`<text x="${margin.left}" y="48" font-family="Segoe UI,Arial" font-size="28" font-weight="700" fill="#253d35">FOUNDATIONS · CHAPTER 2 PRODUCTION SITE PLAN</text>`);
add(`<text x="${margin.left}" y="76" font-family="Segoe UI,Arial" font-size="15" fill="#55635c">Measured overhead · metres · existing Chapter 1 property retained in place · diagram follows production spline and plot transforms</text>`);
const legendX=width-margin.right-280,legendY=92;
add(`<rect x="${legendX}" y="${legendY}" width="280" height="91" rx="7" fill="#fffdf7" stroke="#d2d0c5"/>`);
add(`<rect x="${legendX+12}" y="${legendY+12}" width="20" height="12" fill="#e5ebd9" stroke="#456b58" stroke-width="1.5" stroke-dasharray="4 2"/><text x="${legendX+40}" y="${legendY+23}" font-family="Segoe UI,Arial" font-size="11" fill="#394b42">Private property boundary</text>`);
add(`<rect x="${legendX+12}" y="${legendY+33}" width="20" height="12" fill="#e8ddc8" stroke="#6e5841"/><text x="${legendX+40}" y="${legendY+44}" font-family="Segoe UI,Arial" font-size="11" fill="#394b42">Planned home footprint</text>`);
add(`<rect x="${legendX+12}" y="${legendY+54}" width="20" height="12" fill="#c2c0b6" stroke="#77786e"/><text x="${legendX+40}" y="${legendY+65}" font-family="Segoe UI,Arial" font-size="11" fill="#394b42">Driveway · paved entry walk</text>`);
add(`<rect x="${legendX+12}" y="${legendY+75}" width="20" height="8" fill="#e2eee6" stroke="#3e7660" stroke-dasharray="3 2"/><text x="${legendX+40}" y="${legendY+83}" font-family="Segoe UI,Arial" font-size="11" fill="#394b42">Shared public-space plot</text>`);

function pathD(points) {
  return points.map(([x, z], index) => `${index ? 'L' : 'M'} ${round(X(x))} ${round(Y(z))}`).join(' ');
}
function polygon(points, fill, stroke, strokeWidth = 2, dash = '') {
  const coords = points.map(([x, z]) => `${round(X(x))},${round(Y(z))}`).join(' ');
  add(`<polygon points="${coords}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" ${dash ? `stroke-dasharray="${dash}"` : ''} />`);
}
function rect(centerX, centerZ, boxWidth, boxDepth, fill, stroke, strokeWidth = 2, dash = '') {
  const left = X(centerX - boxWidth / 2);
  const top = Y(centerZ + boxDepth / 2);
  add(`<rect x="${round(left)}" y="${round(top)}" width="${round(boxWidth * scale)}" height="${round(boxDepth * scale)}" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" ${dash ? `stroke-dasharray="${dash}"` : ''} />`);
}
function label(x, z, title, sub = '', color = '#23372f', anchor = 'middle') {
  const px = X(x), py = Y(z);
  const titleWidth = Math.max(86, title.length * 8.3 + 24, sub.length * 6.6 + 24);
  const lines = [title, sub].filter(Boolean);
  const boxHeight = 31 + (lines.length - 1) * 18;
  const x0 = anchor === 'start' ? px : px - titleWidth / 2;
  add(`<rect x="${round(x0)}" y="${round(py - boxHeight / 2)}" width="${round(titleWidth)}" height="${boxHeight}" rx="6" fill="#fffdf7" stroke="#c8c7bd"/>`);
  add(`<text x="${round(anchor === 'start' ? x0 + 10 : px)}" y="${round(py - (sub ? 3 : -5))}" text-anchor="${anchor}" font-family="Segoe UI,Arial" font-size="14" font-weight="700" fill="${color}">${esc(title)}</text>`);
  if (sub) add(`<text x="${round(anchor === 'start' ? x0 + 10 : px)}" y="${round(py + 15)}" text-anchor="${anchor}" font-family="Segoe UI,Arial" font-size="11.5" fill="#58655e">${esc(sub)}</text>`);
}
function miniLabel(x,z,title,sub=''){
  const px=X(x),py=Y(z),boxWidth=88,boxHeight=sub?30:20;
  add(`<rect x="${round(px-boxWidth/2)}" y="${round(py-boxHeight/2)}" width="${boxWidth}" height="${boxHeight}" rx="4" fill="#fffdf7" fill-opacity="0.94" stroke="#d0cec4" stroke-width="0.8"/>`);
  add(`<text x="${round(px)}" y="${round(py-(sub?2: -4))}" text-anchor="middle" font-family="Segoe UI,Arial" font-size="10.5" font-weight="700" fill="#334c40">${esc(title)}</text>`);
  if(sub)add(`<text x="${round(px)}" y="${round(py+10)}" text-anchor="middle" font-family="Segoe UI,Arial" font-size="9.5" fill="#58655e">${esc(sub)}</text>`);
}
function transformLocal(lot, x, z) {
  const c = Math.cos(lot.rotation), s = Math.sin(lot.rotation);
  return [lot.x + c * x + s * z, lot.z - s * x + c * z];
}
function corners(cx, cz, w, d, rotation = 0) {
  return [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,z]) => {
    const c = Math.cos(rotation), s = Math.sin(rotation);
    return [cx + c*x + s*z, cz - s*x + c*z];
  });
}
const plotVectors = (nodeId) => plotFootprintPolygon(plotDefinition, nodeId);
const plotPoints = (nodeId) => plotVectors(nodeId).map((point) => [point.x, point.z]);
const centerOf = (points) => points.reduce((sum, [x,z]) => [sum[0]+x/points.length,sum[1]+z/points.length],[0,0]);

// Existing Chapter 1 property and home follow the same transformed plot contract as the neighbors.
polygon(plotPoints('chapter1-property'),'#f0ead7','#456b58',3,'10 5');
label(-5.85, -11.1, 'CHAPTER 1 · EXISTING HOME', '14 × 13.5 m private property');
const chapterOneHomePolygon = plotPoints('chapter1-home');
polygon(chapterOneHomePolygon,'#d9c9ab','#5e5547',2);
const chapterOneHomeCenter = centerOf(chapterOneHomePolygon);
label(chapterOneHomeCenter[0],chapterOneHomeCenter[1],'HOME','unchanged');

// The complete residential road corridor is sampled from the same centripetal spline as runtime.
const curve = new THREE.CatmullRomCurve3(roadPoints.map(([x,z]) => new THREE.Vector3(x+24,0,z-1.5)),false,'centripetal',0.5);
const center = [], near = [], far = [], curbNear = [], curbFar = [], walkNear = [], walkFar = [];
for(let i=0;i<=400;i++){
  const t=i/400,p=curve.getPointAt(t),q=curve.getTangentAt(t);
  const nx=q.z, nz=-q.x;
  center.push([p.x,p.z]);
  near.push([p.x+nx*3.15,p.z+nz*3.15]); far.push([p.x-nx*3.15,p.z-nz*3.15]);
  curbNear.push([p.x+nx*3.16,p.z+nz*3.16]); curbFar.push([p.x-nx*3.16,p.z-nz*3.16]);
  walkNear.push([p.x+nx*4.76,p.z+nz*4.76]); walkFar.push([p.x-nx*4.76,p.z-nz*4.76]);
}
const roadPoly = [...near, ...far.slice().reverse()];
polygon(roadPoly,'#5c625e','#3d4541',2);
for(const offset of [-4.02,4.02]){
  const edge=[];
  for(let i=0;i<=400;i++){
    const p=curve.getPointAt(i/400),q=curve.getTangentAt(i/400),nx=q.z,nz=-q.x;
    edge.push([p.x+nx*(offset-0.74),p.z+nz*(offset-0.74)]);
  }
  const other=[];
  for(let i=400;i>=0;i--){
    const p=curve.getPointAt(i/400),q=curve.getTangentAt(i/400),nx=q.z,nz=-q.x;
    other.push([p.x+nx*(offset+0.74),p.z+nz*(offset+0.74)]);
  }
  polygon([...edge,...other],'#d9d6c9','#b3b0a4',1);
}
add(`<path d="${pathD(center.filter((_,i)=>i%12===0))}" fill="none" stroke="#eee8d4" stroke-width="2.5" stroke-dasharray="15 13"/>`);
label(5.4, 8.4, 'CURVED RESIDENTIAL STREET', '6.3 m carriageway · continuous public sidewalks');

// Properties, planned building footprints, front orientation, driveway/walk routes and mailbox points.
for(const lot of plan.lots){
  const lotCorners=corners(lot.x,lot.z,lot.width,lot.depth,lot.rotation);
  polygon(lotCorners,'#e5ebd9','#456b58',3,'10 5');
  const centerHouse=transformLocal(lot,lot.house.offsetX,lot.house.offsetZ);
  polygon(corners(centerHouse[0],centerHouse[1],lot.house.width,lot.house.depth,lot.rotation),'#e8ddc8','#6e5841',2);
  miniLabel(centerHouse[0],centerHouse[1],`NEIGHBOR ${lot.index}`,`${lot.house.width} × ${lot.house.depth} m`);
  const front=transformLocal(lot,lot.house.offsetX+lot.house.entryX-lot.house.offsetX,lot.house.offsetZ+lot.house.entryZ);
  const frontEnd=transformLocal(lot,0,lot.depth/2+1.2);
  add(`<path d="M ${round(X(front[0]))} ${round(Y(front[1]))} L ${round(X(frontEnd[0]))} ${round(Y(frontEnd[1]))}" stroke="#31594b" stroke-width="2.5" marker-end="url(#arrow)"/>`);
  const sidewalkLocal=lot.depth/2+(plan.street.propertyFrontageOffset-plan.street.sidewalkOffset);
  const driveStart=lot.house.drivewayStartZ;
  const driveCenter=transformLocal(lot,lot.house.drivewayX,(driveStart+sidewalkLocal)/2);
  polygon(corners(driveCenter[0],driveCenter[1],lot.house.drivewayWidth,sidewalkLocal-driveStart,lot.rotation),'#c2c0b6','#77786e',1);
  const walkStart=lot.house.offsetZ+lot.house.entryZ;
  const walkCenter=transformLocal(lot,lot.house.entryX,(walkStart+sidewalkLocal)/2);
  polygon(corners(walkCenter[0],walkCenter[1],1.1,sidewalkLocal-walkStart,lot.rotation),'#ebe5d5','#858176',1);
  const mailbox=transformLocal(lot,-lot.width*.39,lot.depth/2-.5);
  add(`<circle cx="${round(X(mailbox[0]))}" cy="${round(Y(mailbox[1]))}" r="5" fill="#6f5640" stroke="#fff" stroke-width="1.5"/>`);
  const plotTag=transformLocal(lot,-lot.width/2+0.9,-lot.depth/2+0.8);
  miniLabel(plotTag[0],plotTag[1],`PLOT ${lot.index}`,`${lot.width} × ${lot.depth} m`);
}

for(const site of plan.publicSites){
  const color=site.projectId==='ch2-community-park'?'#e2eee6':site.projectId==='ch2-landmark'?'#e9e7dc':'#e8eee1';
  rect(site.x,site.z,site.width,site.depth,color,'#3e7660',3,'8 4');
  const title=site.projectId==='ch2-community-park'?'COMMUNITY PARK':site.projectId==='ch2-landmark'?'LANDMARK':'NEIGHBORHOOD ENTRANCE';
  if(site.projectId==='ch2-entrance'){
    miniLabel(site.x,site.z,'ENTRANCE',`${site.width} × ${site.depth} m`);
  }else label(site.x,site.z,title,`${site.width} × ${site.depth} m public site`,'#31594b');
}
const approach=plan.paths.parkApproach;
add(`<path d="${pathD([[approach.x,approach.startZ],[approach.x,approach.endZ]])}" stroke="#bd9162" stroke-width="7" stroke-linecap="round" stroke-dasharray="2 6"/>`);
const promenade=plan.paths.promenade;
add(`<path d="${pathD([[promenade.startX,promenade.z],[promenade.endX,promenade.z]])}" stroke="#bd9162" stroke-width="7" stroke-linecap="round" stroke-dasharray="2 6"/>`);
label(22.4,-11.7,'PUBLIC PARK APPROACH','connected to entrance and park');
label(45.5,-30.4,'PUBLIC PROMENADE','connects park to landmark');

// Evidence metadata is calculated from the source plan, not copied into a static presentation.
const gapRows=[];
const labels=['Chapter 1',...plan.lots.map((lot)=>`Neighbor ${lot.index}`)];
const propertyPolygons=['chapter1-property',...plan.lots.map((lot)=>lot.nodeId)].map(plotVectors);
for(let i=0;i<propertyPolygons.length;i++)for(let j=i+1;j<propertyPolygons.length;j++)gapRows.push({a:labels[i],b:labels[j],gap:round(plotPolygonClearance(propertyPolygons[i],propertyPolygons[j]))});
const minGap=Math.min(...gapRows.map((row)=>row.gap));
const structureLabels=['Chapter 1 home',...plan.lots.map((lot)=>`Neighbor ${lot.index}`)];
const structurePolygons=['chapter1-home',...plan.lots.map((lot)=>`${lot.projectId}-house`)].map(plotVectors);
const tableTop=height-margin.bottom+17;
add(`<rect x="${margin.left}" y="${tableTop-26}" width="${width-margin.left-margin.right}" height="98" rx="8" fill="#fffdf7" stroke="#d2d0c5"/>`);
add(`<text x="${margin.left+18}" y="${tableTop}" font-family="Segoe UI,Arial" font-size="14" font-weight="700" fill="#253d35">MEASURED CLEARANCES · property-edge to property-edge (m)</text>`);
add(`<text x="${width-margin.right-18}" y="${tableTop}" text-anchor="end" font-family="Segoe UI,Arial" font-size="14" font-weight="700" fill="#31594b">MINIMUM: ${minGap.toFixed(2)} m</text>`);
const selected=gapRows.filter((row)=>row.gap>0).sort((a,b)=>a.gap-b.gap).slice(0,5);
const colWidth=(width-margin.left-margin.right-40)/3;
selected.forEach((row,i)=>{
  const x=margin.left+20+(i%3)*colWidth;
  const y=tableTop+26+Math.floor(i/3)*18;
  add(`<text x="${round(x)}" y="${round(y)}" font-family="Segoe UI,Arial" font-size="12.5" fill="#394b42">${esc(`${row.a} ↔ ${row.b}: ${row.gap.toFixed(2)} m`)}</text>`);
});
add(`<text x="${margin.left+18}" y="${tableTop+68}" font-family="Segoe UI,Arial" font-size="11.5" fill="#5a655f">Homes stay behind the curved sidewalk. Driveways and front walks cross the 0.84 m verge to reach it.</text>`);
add(`<text x="${width-margin.right}" y="${height-18}" text-anchor="end" font-family="Segoe UI,Arial" font-size="10.5" fill="#7a7d74">NORTH ↑ · World X horizontal · world +Z upward · plot scale ${scale} px/m</text>`);
add('</svg>');

const svg=parts.join('\n');
fs.writeFileSync(destination,svg);
const report={
  output:path.relative(process.cwd(),destination).replace(/\\/g,'/'),
  district:plan.district.dimensions,
  roadWidth:plan.street.roadWidth,
  sidewalkWidth:plan.street.sidewalkWidth,
  minimumPropertyGapMeters:minGap,
  propertyGaps:gapRows.sort((a,b)=>a.gap-b.gap),
  houseClearances:structurePolygons.flatMap((a,index)=>structurePolygons.slice(index+1).map((b,offset)=>({
    a:structureLabels[index],b:structureLabels[index+offset+1],gap:round(plotPolygonClearance(a,b)),
  }))).sort((a,b)=>a.gap-b.gap),
  publicClearances:plan.publicSites.map((site)=>{
    const publicPolygon=plotVectors(site.nodeId);
    const nearest=propertyPolygons.map((privatePolygon,index)=>({parcel:labels[index],gap:round(plotPolygonClearance(publicPolygon,privatePolygon))})).sort((a,b)=>a.gap-b.gap)[0];
    return {site:site.projectId,width:site.width,depth:site.depth,nearestPrivate:nearest.parcel,clearance:nearest.gap};
  }),
  lotFrontages:plan.lots.map((lot)=>({id:lot.projectId,side:lot.streetSide,rotation:round(lot.rotation),x:lot.x,z:round(lot.z),width:lot.width,depth:lot.depth,roadZ:round(chapterTwoRoadCenterZAt(lot.x))})),
};
fs.writeFileSync(destination.replace(/\.svg$/i,'.json'),JSON.stringify(report,null,2));
const lotRows=plan.lots.map((lot)=>{
  const sideNear=lot.width/2+lot.house.offsetX-lot.house.width/2;
  const sideFar=lot.width/2-lot.house.offsetX-lot.house.width/2;
  const back=lot.depth/2+lot.house.offsetZ-lot.house.depth/2;
  const front=lot.depth/2-lot.house.offsetZ-lot.house.depth/2;
  return `| Neighbor ${lot.index} | ${lot.width} × ${lot.depth} | ${lot.house.width} × ${lot.house.depth} × ${lot.house.height} | sides ${sideNear.toFixed(2)} / ${sideFar.toFixed(2)}; back/front ${back.toFixed(2)} / ${front.toFixed(2)} | ${lot.streetSide} |`;
});
const nearestPropertyRows=report.propertyGaps.slice(0,5).map((row)=>`| ${row.a} ↔ ${row.b} | ${row.gap.toFixed(2)} m |`);
const publicRows=report.publicClearances.map((row)=>`| ${row.site.replace('ch2-','')} | ${row.width} × ${row.depth} | ${row.clearance.toFixed(2)} m to ${row.nearestPrivate} |`);
const markdown=[
  '# Chapter 2 production site plan',
  '',
  'This is the authored overhead site-plan view rendered directly from `CHAPTER_TWO_SITE_PLAN` and the same road spline used by the production assets. Measurements are metres. North is up; world +Z is up in the drawing.',
  '',
  '![Labeled Chapter 2 production site plan](site-plan.png)',
  '',
  '| Parcel | Property width × depth | Planned house width × depth × height | Side / back / front inset | Street frontage |',
  '|---|---:|---:|---|---|',
  `| Chapter 1 (existing) | 14 × 13.5 | 8.85 × 7.87 × 6.58 measured | sides 4.60 / 0.55; back/front 4.29 / 1.35 | unchanged |`,
  ...lotRows,
  '',
  `The curved carriageway is ${plan.street.roadWidth} m wide, with ${plan.street.sidewalkWidth} m public sidewalks centered ${plan.street.sidewalkOffset} m from the road centerline. The district contract is ${plan.district.dimensions.width} × ${plan.district.dimensions.depth} m. Neighbor frontage is placed ${plan.street.propertyFrontageOffset} m from the road centerline.`,
  '',
  `The minimum private property edge clearance is **${report.minimumPropertyGapMeters.toFixed(2)} m**, between the unchanged Chapter 1 property and Neighbor 1. The nearest five measured pair clearances are:`,
  '',
  '| Property pair | Edge clearance |',
  '|---|---:|',
  ...nearestPropertyRows,
  '',
  'Public feature footprints and nearest private-property clearances:',
  '',
  '| Public site | Width × depth | Nearest private-property clearance |',
  '|---|---:|---:|',
  ...publicRows,
  '',
  'Driveways and front walks remain owned by their residential lot and cross the front boundary, the 0.84 m planted verge, and the sidewalk apron to meet the public route. House footprints remain behind the curved sidewalk. The entrance connects the north sidewalk to the park approach; the park and landmark share a public promenade. The original Chapter 1 property and home coordinates remain unchanged. No vehicle assets are included.',
  '',
  'The SVG and JSON data can be regenerated together with `node scripts/render-chapter-two-site-plan.cjs`.',
  '',
].join('\n');
fs.writeFileSync(destination.replace(/site-plan\.svg$/i,'site-plan.md'),markdown);
process.stdout.write(`${JSON.stringify(report,null,2)}\n`);

const { chromium } = require('playwright');
const pngPath=destination.replace(/\.svg$/i,'.png');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
    await page.setContent(svg,{waitUntil:'load'});
    await page.screenshot({path:pngPath,fullPage:true});
    process.stdout.write(`Rendered PNG: ${pngPath}\n`);
  }finally{await browser.close();}
})().catch((error)=>{console.error(error);process.exitCode=1;});
