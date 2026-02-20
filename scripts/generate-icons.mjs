import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = join(rootDir, 'public/icons/icon.svg');
const outputDir = join(rootDir, 'public/icons');

// Ensure output directory exists
mkdirSync(outputDir, { recursive: true });

const svgBuffer = readFileSync(svgPath);

console.log('Generating PWA icons...');

for (const size of sizes) {
  const outputPath = join(outputDir, `icon-${size}x${size}.png`);

  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outputPath);

  console.log(`Created: icon-${size}x${size}.png`);
}

// Also generate apple-touch-icon
await sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile(join(outputDir, 'apple-touch-icon.png'));

console.log('Created: apple-touch-icon.png');

// Generate favicon
await sharp(svgBuffer)
  .resize(32, 32)
  .png()
  .toFile(join(outputDir, 'favicon-32x32.png'));

console.log('Created: favicon-32x32.png');

await sharp(svgBuffer)
  .resize(16, 16)
  .png()
  .toFile(join(outputDir, 'favicon-16x16.png'));

console.log('Created: favicon-16x16.png');

console.log('All icons generated successfully!');
