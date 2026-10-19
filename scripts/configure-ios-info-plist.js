const fs = require('fs');
const path = require('path');
const plist = require('plist');

const infoPlistPath = path.resolve(__dirname, '../ios/App/App/Info.plist');

const orientations = [
  'UIInterfaceOrientationPortrait',
];

if (!fs.existsSync(infoPlistPath)) {
  console.error(`Arquivo Info.plist não encontrado em: ${infoPlistPath}`);
  process.exit(1);
}

const plistContent = fs.readFileSync(infoPlistPath, 'utf8');
const plistData = plist.parse(plistContent);

plistData.UISupportedInterfaceOrientations = orientations;

plistData['UISupportedInterfaceOrientations~ipad'] = orientations;

const updatedPlist = plist.build(plistData);

fs.writeFileSync(infoPlistPath, updatedPlist, 'utf8');

console.log('Info.plist atualizado com sucesso!');
