import * as esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const watch = process.argv.includes('--watch');

mkdirSync(dist, { recursive: true });

const common = {
  bundle: true,
  platform: 'browser',
  legalComments: 'none'
};

const targets = [
  {
    entry: join(root, 'src/phone-utils.mjs'),
    out: join(dist, 'phone-utils.js'),
    banner: '/* GlobalClick2Dial — generated from src/phone-utils.mjs */'
  },
  {
    entry: join(root, 'src/content-app.mjs'),
    out: join(dist, 'content.js'),
    banner: '/* GlobalClick2Dial — generated from src/content-app.mjs */'
  }
];

if (watch) {
  const contexts = await Promise.all(
    targets.map((t) =>
      esbuild.context({
        ...common,
        entryPoints: [t.entry],
        format: 'iife',
        banner: { js: t.banner },
        outfile: t.out
      })
    )
  );
  await Promise.all(contexts.map((c) => c.watch()));
  console.log('Watching src/ for changes…');
} else {
  await Promise.all(
    targets.map((t) =>
      esbuild.build({
        ...common,
        entryPoints: [t.entry],
        format: 'iife',
        banner: { js: t.banner },
        outfile: t.out
      })
    )
  );
  console.log('Wrote dist/phone-utils.js and dist/content.js');
}
