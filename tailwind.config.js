// tailwind.config.js
import containerQueries from '@tailwindcss/container-queries';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				primary: '#00d1ff', // vibrant blue for accents
				secondary: '#f0f0f0', // light neutral for text
				background: '#1e1e1e' // deep dark for backgrounds
			},
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))'
			}
		}
	},
	plugins: [typography, forms, containerQueries, daisyui],
	daisyui: {
		themes: ['coffee'] // you can still keep coffee as a fallback if needed
	}
};
