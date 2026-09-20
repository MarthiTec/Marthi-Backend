'use strict';

process.on('uncaughtException', (error) => {
  console.error('[marthi] uncaughtException', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[marthi] unhandledRejection', reason);
  process.exit(1);
});

console.log('[marthi] boot', {
  node: process.version,
  cwd: process.cwd(),
  port: process.env.PORT || '8080',
  hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
});

const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

const prismaBin = join(__dirname, 'node_modules', '.bin', 'prisma');
console.log('[marthi] prisma migrate deploy');

const migrate = spawnSync(prismaBin, ['migrate', 'deploy'], {
  stdio: 'inherit',
  env: process.env,
});

if (migrate.error) {
  console.error('[marthi] prisma spawn failed', migrate.error);
  process.exit(1);
}

if (migrate.status !== 0) {
  console.error('[marthi] prisma migrate deploy exited', migrate.status);
  process.exit(migrate.status ?? 1);
}

try {
  console.log('[marthi] loading build/main.js');
  require('./build/main.js');
} catch (error) {
  console.error('[marthi] failed to load build/main.js', error);
  process.exit(1);
}
