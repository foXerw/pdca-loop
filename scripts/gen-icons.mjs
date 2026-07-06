// 从 public/icon.svg 生成各尺寸 PNG 图标。需要 sharp（已随 Next 安装）。
// 用法：node --import tsx scripts/gen-icons.mjs  或  npx tsx scripts/gen-icons.mjs
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = await readFile(join(root, 'public/icon.svg'));

const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-icon.png', 180],
];

for (const [name, size] of targets) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(join(root, 'public', name));
  console.log(`generated ${name} (${size}x${size})`);
}
