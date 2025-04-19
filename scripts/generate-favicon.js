/**
 * Generate a favicon from the TalkType ghost SVG
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
const outputFile = path.join(__dirname, '..', 'static', 'favicon.png');

// Create the favicon (32x32)
sharp(sourceFile)
  .resize(32, 32)
  .png()
  .toFile(outputFile)
  .then(() => console.log('✅ Created favicon.png successfully'))
  .catch(err => console.error('❌ Error creating favicon.png:', err));