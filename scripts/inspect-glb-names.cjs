const fs = require('fs');
const path = require('path');

const glbPath = path.join(__dirname, '../static/areas/areas-compressed.glb');
const buf = fs.readFileSync(glbPath);

const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));

const nodes = json.nodes || [];
const scenes = json.scenes || [{}];
const rootIndices = scenes[0].nodes || [];

function collectDescendants(idx, out) {
  const n = nodes[idx];
  if (!n) return;
  if (n.name) out.push(n.name);
  (n.children || []).forEach((c) => collectDescendants(c, out));
}

const careerIdx = nodes.findIndex((n) => n && n.name === 'career');
if (careerIdx === -1) {
  console.log('Noeud "career" introuvable.');
  process.exit(1);
}

// Afficher la hiérarchie : parent de chaque Plane
const nodeNames = nodes.map((n, i) => (n && n.name) || '');
const planes = [];
function collectWithParent(idx, parentName) {
  const n = nodes[idx];
  if (!n) return;
  const name = n.name || '';
  if (/^Plane\./i.test(name)) planes.push({ name, parent: parentName, nodeIndex: idx });
  (n.children || []).forEach((c) => collectWithParent(c, name || parentName));
}
collectWithParent(careerIdx, 'career');

console.log('--- Planes sous career (nom, parent) ---');
planes.forEach((p) => console.log(p.name, 'parent:', p.parent));

// Trouver refLine : ce sont les groupes "line"
const lineNodeIndices = [];
function findRefLines(idx) {
  const n = nodes[idx];
  if (!n) return;
  if (/^refLine/i.test(n.name || '')) lineNodeIndices.push(idx);
  (n.children || []).forEach(findRefLines);
}
findRefLines(careerIdx);
console.log('\n--- refLine sous career (indices) ---', lineNodeIndices.map((i) => nodes[i].name));
