const fs = require('fs');
const path = require('path');

const glbPath = path.join(__dirname, '../static/areas/areas-compressed.glb');
const buf = fs.readFileSync(glbPath);
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
const nodes = json.nodes || [];

const socialIdx = nodes.findIndex((n) => n && n.name === 'social');
if (socialIdx === -1) {
  console.log('Noeud "social" introuvable.');
  process.exit(1);
}

const names = [];
function collect(idx) {
  const n = nodes[idx];
  if (!n) return;
  if (n.name) names.push(n.name);
  (n.children || []).forEach(collect);
}
collect(socialIdx);

console.log('--- Tous les noeuds sous "social" ---');
names.sort().forEach((n) => console.log(n));

const icons = names.filter((n) => /linkedin|discord|twitch|twitter|github|mail|youtube|bluesky|x Physical/i.test(n));
console.log('\n--- Icônes / physical (linkedin, discord, twitch, etc.) ---');
icons.forEach((n) => console.log(n));
