const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', 'src', 'layout', 'ResponsiveShell.css');
const targetDir = path.join(__dirname, '..', 'dist', 'layout');
const target = path.join(targetDir, 'ResponsiveShell.css');

try {
  if (!fs.existsSync(source)) {
    console.warn('[copy-css] source file not found:', source);
    process.exit(0);
  }

  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(source, target);
  console.log('[copy-css] copied ResponsiveShell.css to dist');
} catch (err) {
  console.error('[copy-css] failed:', err);
  process.exit(1);
}
