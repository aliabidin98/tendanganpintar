/**
 * Copies the compiled `docs` folder to `doc` so that deployment
 * works whether GitHub Pages or user tooling expects `/docs` or `/doc`.
 */
import fs from 'fs';
import path from 'path';

const src = path.resolve('docs');
const dest = path.resolve('doc');

if (fs.existsSync(src)) {
  fs.cpSync(src, dest, { recursive: true });
  // Ensure .nojekyll exists in both folders
  fs.writeFileSync(path.join(src, '.nojekyll'), '');
  fs.writeFileSync(path.join(dest, '.nojekyll'), '');
  console.log('✅ Successfully built and synced output to /docs and /doc with .nojekyll');
} else {
  console.warn('⚠️ /docs directory was not found');
}
