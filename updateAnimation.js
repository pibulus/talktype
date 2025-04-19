const fs = require('fs');
const filePath = '/Users/pabloalvarado/Documents/talktype/src/routes/+page.svelte';

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Find the animation sequence and replace it
content = content.replace(
  /clearAllBlinkTimeouts\(\); \/\/ Clear any existing animations\s+\s+\/\/ Double blink animation sequence[\s\S]*?isRecording = true;/m,
  `clearAllBlinkTimeouts(); // Clear any existing animations
								
								// Quick single blink and start recording immediately
								eyes.classList.add('blink-once');
								
								// Start recording immediately
								audioToTextComponent.startRecording();
								
								// Update UI state
								ghostIcon.classList.add('recording');
								
								// Also update the local recording state variable
								isRecording = true;
								
								// Remove blink class after a short delay
								setTimeout(() => {
									eyes.classList.remove('blink-once');
								}, 100);`
);

// Write the updated content back to the file
fs.writeFileSync(filePath, content);

console.log('Animation sequence updated successfully!');