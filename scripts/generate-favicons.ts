#!/usr/bin/env tsx
/**
 * Favicon Generation Script
 * Generates multi-size favicons from the brand logo
 */

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const projectRoot = process.cwd();
const sourceImage = join(projectRoot, 'attached_assets', 'generated_images', 'basicstutor_app_icon_logo.png');
const publicDir = join(projectRoot, 'client', 'public');

interface FaviconSize {
  size: number;
  name: string;
}

const sizes: FaviconSize[] = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'android-chrome-192x192.png' },
  { size: 512, name: 'android-chrome-512x512.png' },
];

async function generateFavicons() {
  console.log('🎨 Generating favicons...\n');

  // Check if source image exists
  if (!fs.existsSync(sourceImage)) {
    console.error(`❌ Source image not found: ${sourceImage}`);
    process.exit(1);
  }

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    console.error(`❌ Public directory not found: ${publicDir}`);
    process.exit(1);
  }

  try {
    // Generate each size
    for (const { size, name } of sizes) {
      const outputPath = join(publicDir, name);

      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated ${name} (${size}x${size})`);
    }

    // Generate favicon.ico (multi-size ICO format)
    // For now, we'll use the 32x32 PNG as favicon.ico
    const favicon32 = join(publicDir, 'favicon-32x32.png');
    const faviconIco = join(publicDir, 'favicon.ico');

    await sharp(sourceImage)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(faviconIco);

    console.log(`✅ Generated favicon.ico (32x32)`);

    console.log('\n✨ All favicons generated successfully!');
    console.log('\nNext steps:');
    console.log('1. Update client/index.html with favicon links');
    console.log('2. Create site.webmanifest for PWA support');

  } catch (error) {
    console.error('❌ Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();
