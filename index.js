'use strict';

try {
  require('./dist/main.js');
} catch (error) {
  console.error('[marthi] failed to load dist/main.js', error);
  process.exit(1);
}
