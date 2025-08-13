// Collection of different prompt templates organized by style

export const promptTemplates = {
	// Standard prompt style (current implementation)
	standard: {
		transcribeAudio: {
			text: "Transcribe this audio file accurately and completely, removing any redundant 'ums,' 'likes', 'uhs', and similar filler words. Return only the cleaned-up transcription, with no additional text."
		},
		generateAnimation: {
			text: 'Generate a CSS animation for a ghost SVG based on this description: \'{{description}}\'. Return a JSON object with the following structure:\n\n{\n  "name": "unique-animation-name", // A unique, descriptive kebab-case name for the animation\n  "target": "whole" or "eyes" or "bg" or "outline", // Which part of the ghost to animate. Default to \'whole\' if not specified in the description\n  "duration": value in seconds, // Reasonable animation duration (0.5-3s)\n  "timing": "ease"/"linear"/"cubic-bezier(x,x,x,x)", // Appropriate timing function\n  "iteration": number or "infinite", // How many times to play (usually 1 or infinite)\n  "keyframes": [\n    {\n      "percentage": 0, // Keyframe percentage (0-100)\n      "properties": { // CSS properties to animate\n        "transform": "...", // Any transform functions\n        "opacity": value, // Opacity value if needed\n        // Other properties as needed\n      }\n    },\n    // More keyframes as needed\n  ],\n  "description": "Short description of what this animation does"\n}\n\nCritical requirements:\n1. Make sure the animation is visually appealing and matches the description\n2. Use ONLY transform properties (scale, rotate, translate, etc.) and opacity for animation\n3. Avoid properties that would break the SVG (like background-color)\n4. Ensure animation starts and ends in a natural state (if not infinite)\n5. If the animation should affect only part of the ghost, specify the correct \'target\'\n6. Ensure all values are valid CSS\n7. DO NOT include any explanation or text outside the JSON object\n8. VERY IMPORTANT: Return raw JSON only - DO NOT use markdown formatting, code blocks, or backticks (```) in your response'
		}
	},

	// Surly pirate prompt style
	surlyPirate: {
		transcribeAudio: {
			text: 'Transcribe this audio file accurately, but rewrite it in the style of a surly pirate. Use pirate slang, expressions, and attitude. Arr! Return only the pirate-style transcription, no additional text.'
		}
	},

	// L33T Sp34k prompt style
	leetSpeak: {
		transcribeAudio: {
			text: 'Tr4n5cr1b3 th15 4ud10 f1l3 4ccur4t3ly, but c0nv3rt 1t 1nt0 l33t 5p34k. U53 num3r1c 5ub5t1tut10n5 (3=e, 4=a, 1=i, 0=o, 5=s, 7=t) 4nd h4ck3r j4rg0n wh3n p0551bl3. R3turn 0nly th3 l33t 5p34k tr4n5cr1pt10n, n0 4dd1t10n4l t3xt.'
		}
	},

	// Sparkle Pop prompt style
	sparklePop: {
		transcribeAudio: {
			text: "OMG!!! Transcribe this audio file like TOTALLY accurately, but make it SUPER bubbly and enthusiastic!!! Use LOTS of emojis, exclamation points, and teen slang!!!! Sprinkle in words like 'literally,' 'totally,' 'sooo,' 'vibes,' and 'obsessed'!!! Add sparkle emojis ✨, hearts 💖, and rainbow emojis 🌈 throughout!!! Make it EXTRA and over-the-top excited!!!"
		}
	},

	// Code Whisperer (formerly Prompt Engineer)
	codeWhisperer: {
		transcribeAudio: {
			text: 'Transcribe this audio file accurately and completely, but reformat it into clear, structured, technical language suitable for a coding prompt. Remove redundancies, organize thoughts logically, use precise technical terminology, and structure content with clear sections. Return only the optimized, programmer-friendly transcription.'
		}
	},

	// Quill & Ink (formerly Victorian Author)
	quillAndInk: {
		transcribeAudio: {
			text: 'Transcribe this audio file with the eloquence and stylistic flourishes of a 19th century Victorian novelist, in the vein of Jane Austen or Charles Dickens. Employ elaborate sentences, period-appropriate vocabulary, literary devices, and a generally formal and ornate prose style. The transcription should maintain the original meaning but transform the manner of expression entirely.'
		}
	}
};

// Helper function to apply template with variables
export function applyTemplate(template, variables) {
	let result = template;

	// Replace all variables in the template
	Object.entries(variables).forEach(([key, value]) => {
		const regex = new RegExp(`{{${key}}}`, 'g');
		result = result.replace(regex, value);
	});

	return result;
}
