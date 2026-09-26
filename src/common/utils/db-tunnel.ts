import { WebSocketServer, WebSocket } from 'ws';
import * as net from 'node:net';
import * as http from 'node:http';

function getPostgresTarget() {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      const parsed = new URL(dbUrl);
      return {
        host: parsed.hostname || 'marthitec216',
        port: Number(parsed.port) || 5432,
      };
    } catch {
      // url parsing fallback
    }
  }
  return { host: 'marthitec216', port: 5432 };
}

export function setupDbTunnel(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true });
  const TUNNEL_SECRET =
    process.env.DB_TUNNEL_SECRET || 'marthi-secret-tunnel-dev-2026';

  server.on('upgrade', (request, socket, head) => {
    try {
      const hostHeader = request.headers.host || 'localhost';
      const url = new URL(request.url || '', `http://${hostHeader}`);

      if (url.pathname === '/db-tunnel') {
        const secret = url.searchParams.get('secret');
        if (secret !== TUNNEL_SECRET) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch (err) {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    const { host, port } = getPostgresTarget();
    process.stderr.write(
      `[db-tunnel] Cliente conectou! Abrindo ponte com Postgres em ${host}:${port}...\n`,
    );

    const pgSocket = net.connect({ host, port });

    pgSocket.on('connect', () => {
      process.stderr.write(`[db-tunnel] Conexão com Postgres estabelecida!\n`);
    });

    pgSocket.on('data', (data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
      if (Array.isArray(data)) {
        for (const chunk of data) {
          pgSocket.write(chunk);
        }
      } else if (data instanceof ArrayBuffer) {
        pgSocket.write(Buffer.from(data));
      } else {
        pgSocket.write(data);
      }
    });

    const cleanup = () => {
      try {
        pgSocket.destroy();
      } catch {}
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      } catch {}
    };

    ws.on('close', () => {
      process.stderr.write('[db-tunnel] Cliente desconectou.\n');
      cleanup();
    });
    ws.on('error', (err) => {
      process.stderr.write(`[db-tunnel] Erro no ws: ${err.message}\n`);
      cleanup();
    });
    pgSocket.on('close', cleanup);
    pgSocket.on('error', (err) => {
      process.stderr.write(`[db-tunnel] Erro no Postgres: ${err.message}\n`);
      cleanup();
    });
  });

  process.stderr.write(
    '[db-tunnel] Ponte WebSocket do banco de dados configurada em /db-tunnel\n',
  );
}
