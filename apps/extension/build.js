const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const outdir = path.join(__dirname, 'dist');
if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir, { recursive: true });
}

const baseConfig = {
  platform: 'browser',
  target: 'chrome120',
  minify: true,
  sourcemap: true,
  sourcesContent: true,
};

// Copy static assets
const staticAssets = [
  { src: 'manifest.json', dest: 'manifest.json' },
  { src: 'src/popup/popup.html', dest: 'popup/popup.html' },
  { src: 'src/popup/popup.css', dest: 'popup/popup.css' },
  { src: 'src/popup/popup.js', dest: 'popup/popup.js' },
  { src: 'src/content/content-styles.css', dest: 'content/content-styles.css' },
  { src: 'src/content/result-bubble.css', dest: 'content/result-bubble.css' },
  { src: 'src/content/question-candidate-overlay.css', dest: 'content/question-candidate-overlay.css' },
  { src: 'src/sidepanel/sidepanel.html', dest: 'sidepanel/sidepanel.html' },
  { src: 'src/sidepanel/sidepanel.css', dest: 'sidepanel/sidepanel.css' },
  { src: 'src/sidepanel/sidepanel.js', dest: 'sidepanel/sidepanel.js' },
];

for (const asset of staticAssets) {
  const srcPath = path.join(__dirname, asset.src);
  const destPath = path.join(outdir, asset.dest);
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
  }
}

async function build() {
  // Background service worker (ESM)
  await esbuild.build({
    ...baseConfig,
    entryPoints: [path.join(__dirname, 'src/background/service-worker.ts')],
    outfile: path.join(outdir, 'background/service-worker.js'),
    format: 'esm',
    bundle: true,
  });
  console.log('Built background/service-worker.js');

  // Content script
  await esbuild.build({
    ...baseConfig,
    entryPoints: [path.join(__dirname, 'src/content/content-script.ts')],
    outdir: path.join(outdir, 'content'),
    bundle: true,
    format: 'esm',
    splitting: true,
    chunkNames: 'chunks/[name]-[hash]',
    entryNames: 'content-script',
  });
  console.log('Built content/content-script.js');

  console.log('Build complete!');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});