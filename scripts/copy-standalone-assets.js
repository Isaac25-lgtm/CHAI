/**
 * Copy public/ and .next/static/ into .next/standalone/ for standalone deployment.
 * Next.js standalone output doesn't include these by default.
 */
const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const root = path.resolve(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');

if (!fs.existsSync(standalone)) {
  console.log('No standalone output found — skipping asset copy.');
  process.exit(0);
}

console.log('Copying public/ → .next/standalone/public/');
copyDir(path.join(root, 'public'), path.join(standalone, 'public'));

console.log('Copying .next/static/ → .next/standalone/.next/static/');
copyDir(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'));

console.log('Standalone assets ready.');
