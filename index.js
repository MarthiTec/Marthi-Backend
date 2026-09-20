'use strict';

try {
  require('./build/main.js');
} catch (error) {
  console.error('[marthi] failed to load build/main.js', error);
  process.exit(1);
}
