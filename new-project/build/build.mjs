// esbuild-ভিত্তিক বিল্ড স্ক্রিপ্ট — Electron মূল প্রসেস, preload ও React রেন্ডারার
// বান্ডল করে এবং HTML কপি করে `dist/`-এ আউটপুট দেয়।
//
// আউটপুট কাঠামো (electron-builder ও `main` এন্ট্রির সাথে সামঞ্জস্যপূর্ণ):
//   dist/main/index.js      — মূল প্রসেস (cjs, platform=node, electron বাহ্যিক)
//   dist/main/preload.js    — preload স্ক্রিপ্ট (cjs)
//   dist/renderer/renderer.js — React UI শেল (iife, platform=browser)
//   dist/renderer/index.html  — কপিকৃত HTML এন্ট্রি
//
// ব্যবহার: `node build/build.mjs` অথবা `node build/build.mjs --watch`।

import { build, context } from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const watch = process.argv.includes('--watch');

const nodeConfig = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  // Electron রানটাইমে সরবরাহকৃত — বান্ডল করি না।
  external: ['electron'],
  logLevel: 'info',
};

const mainConfig = {
  ...nodeConfig,
  entryPoints: [resolve(root, 'src/main/index.ts')],
  outfile: resolve(root, 'dist/main/index.js'),
};

const preloadConfig = {
  ...nodeConfig,
  entryPoints: [resolve(root, 'src/main/preload.ts')],
  outfile: resolve(root, 'dist/main/preload.js'),
};

const rendererConfig = {
  bundle: true,
  platform: 'browser',
  target: ['chrome120'],
  format: 'iife',
  sourcemap: true,
  minify: true,
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.tsx': 'tsx', '.ts': 'ts' },
  entryPoints: [resolve(root, 'src/renderer/main.tsx')],
  outfile: resolve(root, 'dist/renderer/renderer.js'),
  logLevel: 'info',
};

function copyHtml() {
  mkdirSync(resolve(root, 'dist/renderer'), { recursive: true });
  cpSync(
    resolve(root, 'src/renderer/index.html'),
    resolve(root, 'dist/renderer/index.html'),
  );
}

async function run() {
  if (watch) {
    const ctxs = await Promise.all([
      context(mainConfig),
      context(preloadConfig),
      context(rendererConfig),
    ]);
    copyHtml();
    await Promise.all(ctxs.map((c) => c.watch()));
    console.log('[build] watch মোডে — পরিবর্তনের জন্য অপেক্ষা করছি…');
  } else {
    await Promise.all([
      build(mainConfig),
      build(preloadConfig),
      build(rendererConfig),
    ]);
    copyHtml();
    console.log('[build] সম্পন্ন — আউটপুট dist/-এ।');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
