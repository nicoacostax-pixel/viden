const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '../src/app/icon.png');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

async function generateIcons() {
  for (const size of sizes) {
    await sharp(INPUT)
      .resize(size, size, { fit: 'contain', background: { r: 79, g: 70, b: 229, alpha: 1 } })
      .png()
      .toFile(path.join(OUTPUT_DIR, `icon-${size}.png`));
    console.log(`icon-${size}.png`);
  }
  await sharp(INPUT)
    .resize(180, 180, { fit: 'contain', background: { r: 79, g: 70, b: 229, alpha: 1 } })
    .png()
    .toFile(path.join(OUTPUT_DIR, 'apple-touch-icon.png'));
  console.log('apple-touch-icon.png');
}

generateIcons().catch(console.error);
