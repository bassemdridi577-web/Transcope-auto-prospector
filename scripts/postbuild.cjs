const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../dist/index.html');
const dest = path.join(__dirname, '../dist/404.html');

try {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('Postbuild: Successfully copied dist/index.html to dist/404.html for GitHub Pages routing!');
  } else {
    console.warn('Postbuild: dist/index.html not found, skipping 404.html creation.');
  }
} catch (err) {
  console.error('Postbuild: Failed to create dist/404.html:', err);
}
