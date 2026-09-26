/**
 * Script Cliente de Túnel para DBeaver <-> PostgreSQL na Discloud
 * Uso: node db-tunnel.js
 */

const net = require('node:net');
const { WebSocket } = require('ws');

// Usamos a porta 5433 porque a 5432 geralmente já está em uso por um Postgres/Docker local
const LOCAL_PORT = process.env.TUNNEL_PORT ? parseInt(process.env.TUNNEL_PORT, 10) : 5433;
const DISCLOUD_WS_URL =
  process.env.DISCLOUD_WS_URL ||
  'wss://marthi-backend.discloud.app/db-tunnel?secret=marthi-secret-tunnel-dev-2026';

const server = net.createServer((clientSocket) => {
  console.log('\n[Túnel] Nova conexão recebida do DBeaver!');
  console.log('[Túnel] Conectando ao backend na Discloud via canal seguro...');

  const ws = new WebSocket(DISCLOUD_WS_URL);

  ws.on('open', () => {
    console.log('[Túnel] ✅ Conexão estabelecida com a Discloud! Trafegando pacotes do PostgreSQL...');
    clientSocket.on('data', (chunk) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(chunk);
      }
    });
  });

  ws.on('message', (data) => {
    clientSocket.write(Buffer.from(data));
  });

  const cleanup = () => {
    try {
      clientSocket.destroy();
    } catch {}
    try {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    } catch {}
  };

  clientSocket.on('close', () => {
    console.log('[Túnel] Conexão do DBeaver finalizada.');
    cleanup();
  });

  clientSocket.on('error', (err) => {
    console.error('[Túnel] Erro no socket local:', err.message);
    cleanup();
  });

  ws.on('close', () => {
    cleanup();
  });

  ws.on('error', (err) => {
    console.error('[Túnel] ❌ Erro ao conectar ao WebSocket na Discloud:', err.message);
    cleanup();
  });
});

server.listen(LOCAL_PORT, () => {
  console.log('===============================================================');
  console.log(`🚀 TÚNEL POSTGRES ATIVO NA SUA MÁQUINA!`);
  console.log(`📡 Escutando localmente em: localhost:${LOCAL_PORT}`);
  console.log(`☁️  Apontando para Discloud: ${DISCLOUD_WS_URL.split('?')[0]}`);
  console.log('===============================================================');
  console.log(`👉 CONFIGURE SEU DBEAVER ASSIM:`);
  console.log(`   - Host / Servidor : localhost`);
  console.log(`   - Porta           : ${LOCAL_PORT}`);
  console.log(`   - Banco de dados  : MarthiDB`);
  console.log(`   - Nome de usuário : MarthiTec`);
  console.log(`   - Senha           : Marthi170926`);
  console.log('===============================================================');
  console.log('Pressione Ctrl+C para encerrar o túnel quando terminar.\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ [ERRO] A porta ${LOCAL_PORT} já está em uso na sua máquina!`);
    console.error(`Tente rodar com outra porta, por exemplo:`);
    console.error(`$env:TUNNEL_PORT="5434"; node db-tunnel.js\n`);
  } else {
    console.error(err);
  }
});
