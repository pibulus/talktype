/**
 * Generate theme-aware favicons for light and dark modes
 */

import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// Get the current file's directory (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source file - the main ghost SVG icon
const sourceFile = path.join(__dirname, '..', 'static', 'talktype-icon.svg');

// Output paths for light and dark icons
const lightIconPath = path.join(__dirname, '..', 'static', 'favicon-light.png');
const darkIconPath = path.join(__dirname, '..', 'static', 'favicon-dark.png'); 
const faviconPath = path.join(__dirname, '..', 'static', 'favicon.png');

// Create the light mode favicon (black ghost for light backgrounds)
async function generateLightModeFavicon() {
  try {
    // Create with black fill (for light backgrounds)
    await sharp(sourceFile)
      .resize(32, 32)
      .png()
      .toFile(lightIconPath);
    
    console.log('✅ Created favicon-light.png successfully');
  } catch (err) {
    console.error('❌ Error creating light mode favicon:', err);
  }
}

// Create the dark mode favicon (white ghost for dark backgrounds)
async function generateDarkModeFavicon() {
  try {
    // Modify SVG content to use white fill
    const svgBuffer = await fs.readFile(sourceFile, 'utf8');
    const whiteSvg = svgBuffer.replace(/#000000/g, '#FFFFFF');
    
    // Create with white fill (for dark backgrounds)
    await sharp(Buffer.from(whiteSvg))
      .resize(32, 32)
      .png()
      .toFile(darkIconPath);
    
    console.log('✅ Created favicon-dark.png successfully');
  } catch (err) {
    console.error('❌ Error creating dark mode favicon:', err);
  }
}

// Default favicon (used as fallback if theme detection fails)
async function generateDefaultFavicon() {
  try {
    // Create with the peach theme gradient for better visibility on both themes
    // We're using a medium gray fill which works reasonably well on both light and dark backgrounds
    const svgBuffer = await fs.readFile(sourceFile, 'utf8');
    const grayGhostSvg = svgBuffer.replace(/#000000/g, '#8F8F8F');
    
    await sharp(Buffer.from(grayGhostSvg))
      .resize(32, 32)
      .png()
      .toFile(faviconPath);
    
    console.log('✅ Created default favicon.png successfully');
  } catch (err) {
    console.error('❌ Error creating default favicon:', err);
  }
}

// Generate all favicons
async function generateAllFavicons() {
  await generateLightModeFavicon();
  await generateDarkModeFavicon();
  await generateDefaultFavicon();
  console.log('✅ All favicons generated successfully');
}

generateAllFavicons();