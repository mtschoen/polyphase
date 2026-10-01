// Stage a non-main Pages build so a branch can be previewed under <site>/preview/.
// The branch build is nested at <outDir>/preview/ and the root index redirects to it.
// The live site at the root is restored by every main push, which redeploys the full site.
// Usage: node scripts/stage-preview.mjs <branchDist> <outDir>
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [branchDist, outDir] = process.argv.slice(2);
if (!branchDist || !outDir) {
  console.error('Usage: node scripts/stage-preview.mjs <branchDist> <outDir>');
  process.exit(1);
}

const base = `/${process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'polyphase'}`;

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(branchDist, join(outDir, 'preview'), { recursive: true });

const preview = readFileSync(join(outDir, 'preview', 'index.html'), 'utf8');
writeFileSync(
  join(outDir, 'index.html'),
  preview.replace(
    '<head>',
    `<head><meta http-equiv="refresh" content="0; url=${base}/preview/" />`,
  ),
);
console.log(`Staged branch preview at ${outDir}/preview (base ${base}/preview/).`);
