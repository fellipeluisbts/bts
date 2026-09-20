const isLinux = process.platform === 'linux';
const hasDisplay = process.env.DISPLAY || process.env.WAYLAND_DISPLAY;

if (isLinux && !hasDisplay) {
  console.error('\nNao foi possivel abrir a janela: este ambiente nao possui tela grafica.');
  console.error('Abra o projeto no VS Code instalado no seu computador e execute npm start novamente.\n');
  process.exit(1);
}
