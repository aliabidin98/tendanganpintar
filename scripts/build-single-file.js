import fs from 'fs';
import path from 'path';

function insertBefore(source, needle, addition) {
  const pos = source.indexOf(needle);
  if (pos === -1) {
    return source + addition;
  }
  return source.slice(0, pos) + addition + source.slice(pos);
}

export function buildSingleFileHtml() {
  const docsDir = path.resolve('docs');
  const indexHtmlPath = path.join(docsDir, 'index.html');

  if (!fs.existsSync(indexHtmlPath)) {
    console.error('❌ docs/index.html not found, please build first.');
    return;
  }

  let html = fs.readFileSync(indexHtmlPath, 'utf-8');
  const assetsDir = path.join(docsDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    console.error('❌ docs/assets not found.');
    return;
  }

  // Find exact script and style files referenced by docs/index.html
  const scriptMatches = [...html.matchAll(/<script[^>]+src=["'](?:\.\/|\/)?assets\/([^"']+\.js)["'][^>]*><\/script>/gi)];
  const cssMatches = [...html.matchAll(/<link[^>]+href=["'](?:\.\/|\/)?assets\/([^"']+\.css)["'][^>]*>/gi)];

  const referencedJsFiles = scriptMatches.map((m) => m[1]);
  const referencedCssFiles = cssMatches.map((m) => m[1]);

  const allFiles = fs.readdirSync(assetsDir);
  const jsFiles = referencedJsFiles.length > 0 ? referencedJsFiles : allFiles.filter((f) => f.endsWith('.js')).slice(-1);
  const cssFiles = referencedCssFiles.length > 0 ? referencedCssFiles : allFiles.filter((f) => f.endsWith('.css')).slice(-1);
  const imgFiles = allFiles.filter((f) => /\.(jpg|jpeg|png|webp|svg)$/i.test(f));

  // Map images to base64 data URIs
  const imageMap = {};
  for (const img of imgFiles) {
    const ext = path.extname(img).slice(1).toLowerCase();
    const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'png' ? 'image/png' : 'image/jpeg';
    const buf = fs.readFileSync(path.join(assetsDir, img));
    const dataUri = `data:${mime};base64,${buf.toString('base64')}`;
    imageMap[img] = dataUri;
  }

  // Combine referenced CSS & inline asset URIs
  let allCss = '';
  for (const cssFile of cssFiles) {
    const fullPath = path.join(assetsDir, cssFile);
    if (!fs.existsSync(fullPath)) continue;
    let cssContent = fs.readFileSync(fullPath, 'utf-8');
    for (const [imgName, dataUri] of Object.entries(imageMap)) {
      cssContent = cssContent.split(imgName).join(dataUri);
      cssContent = cssContent.split(`./${imgName}`).join(dataUri);
      cssContent = cssContent.split(`assets/${imgName}`).join(dataUri);
    }
    allCss += `\n/* --- ${cssFile} --- */\n` + cssContent;
  }

  // Combine referenced JS & inline asset URIs
  let allJs = '';
  for (const jsFile of jsFiles) {
    const fullPath = path.join(assetsDir, jsFile);
    if (!fs.existsSync(fullPath)) continue;
    let jsContent = fs.readFileSync(fullPath, 'utf-8');
    for (const [imgName, dataUri] of Object.entries(imageMap)) {
      const escaped = imgName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`new\\s+URL\\([\\'\\"\`]?${escaped}[\\'\\"\`]?\\s*,\\s*import\\.meta\\.url\\)\\.href`, 'g');
      jsContent = jsContent.replace(pattern, JSON.stringify(dataUri));

      jsContent = jsContent.split(JSON.stringify(imgName)).join(JSON.stringify(dataUri));
      jsContent = jsContent.split(`\`${imgName}\``).join(JSON.stringify(dataUri));
    }
    allJs += `\n// --- ${jsFile} ---\n` + jsContent;
  }

  // Optional: Read camera_utils.js and pose.js from node_modules if present
  let mediapipeInlined = '';
  const camUtilsPath = path.resolve('node_modules/@mediapipe/camera_utils/camera_utils.js');
  const posePath = path.resolve('node_modules/@mediapipe/pose/pose.js');

  if (fs.existsSync(camUtilsPath)) {
    const camJs = fs.readFileSync(camUtilsPath, 'utf-8');
    mediapipeInlined += `<script id="mp-camera-utils-inlined">\n${camJs}\n</script>\n`;
  }
  if (fs.existsSync(posePath)) {
    const poseJs = fs.readFileSync(posePath, 'utf-8');
    mediapipeInlined += `<script id="mp-pose-inlined">\n${poseJs}\n</script>\n`;
  }

  // Strip external CSS link tags that point to assets
  html = html.replace(/<link[^>]+rel=["']stylesheet["'][^>]*href=["'][^"']*assets\/[^"']*\.css["'][^>]*>/gi, '');
  html = html.replace(/<link[^>]+href=["'][^"']*assets\/[^"']*\.css["'][^>]*rel=["']stylesheet["'][^>]*>/gi, '');

  // Strip external script module tags pointing to assets
  html = html.replace(/<script[^>]+type=["']module["'][^>]+src=["'][^"']*assets\/[^"']*\.js["'][^>]*><\/script>/gi, '');
  html = html.replace(/<script[^>]+src=["'][^"']*assets\/[^"']*\.js["'][^>]*><\/script>/gi, '');

  // If we inlined mediapipe, strip the external mediapipe script tags to avoid duplicate network requests
  if (mediapipeInlined) {
    html = html.replace(/<script[^>]+src=["'][^"']*@mediapipe\/camera_utils[^"']*["'][^>]*><\/script>/gi, '');
    html = html.replace(/<script[^>]+src=["'][^"']*@mediapipe\/pose[^"']*["'][^>]*><\/script>/gi, '');
  }

  // Safe insertion using index slicing (NO String.prototype.replace with '$' corruption!)
  const styleBlock = `<style id="ar-tendangan-pintar-inline-styles">\n${allCss}\n</style>\n`;
  if (mediapipeInlined) {
    html = insertBefore(html, '</head>', mediapipeInlined);
  }
  html = insertBefore(html, '</head>', styleBlock);

  // Wrap in self-executing function inside standard <script> tag for 100% universal compatibility
  // (Works flawlessly when opened directly via file://, double-clicked from local folders, or served over HTTP)
  const scriptBlock = `<script id="ar-tendangan-pintar-inline-script">\n(() => {\n${allJs}\n})();\n</script>\n`;
  html = insertBefore(html, '</body>', scriptBlock);

  // Ensure destinations exist
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const targetFilename = 'ar-tendangan-pintar-singlefile.html';
  const publicPath = path.join(publicDir, targetFilename);
  const docsPath = path.join(docsDir, targetFilename);
  const docDir = path.resolve('doc');

  fs.writeFileSync(publicPath, html, 'utf-8');
  fs.writeFileSync(docsPath, html, 'utf-8');
  if (fs.existsSync(docDir)) {
    fs.writeFileSync(path.join(docDir, targetFilename), html, 'utf-8');
  }

  const sizeMb = (Buffer.byteLength(html, 'utf-8') / (1024 * 1024)).toFixed(2);
  console.log(`✅ Single-file standalone HTML created cleanly: ${targetFilename} (${sizeMb} MB)`);
}

// If run directly
if (process.argv[1] && process.argv[1].endsWith('build-single-file.js')) {
  buildSingleFileHtml();
}
