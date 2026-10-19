const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const raizProjeto = path.resolve(__dirname, '..');
const pastaIos = path.join(raizProjeto, 'ios');

if (fs.existsSync(pastaIos)) {
  console.log('Pasta ios/ ja existe, pulando `cap add ios`.');
  process.exit(0);
}

console.log('Pasta ios/ nao encontrada, rodando `npx cap add ios`...');
const resultado = spawnSync('npx', ['cap', 'add', 'ios'], {
  cwd: raizProjeto,
  stdio: 'inherit',
  shell: true,
});

if (resultado.status !== 0) {
  console.error('Falha ao rodar `npx cap add ios` (precisa de macOS com Xcode).');
  process.exit(resultado.status ?? 1);
}
