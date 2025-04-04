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
			fontFamily: {
				// Custom modern font (ensure you've imported it in your project)
				sans: ['Inter', 'ui-sans-serif', 'system-ui']
			},
			spacing: {
				// Extended spacing for finer layout control
				72: '18rem',
				84: '21rem',
				96: '24rem'
			},
			keyframes: {
				// Fade in keyframes for subtle component animations
				fadeIn: {
					'0%': { opacity: 0 },
					'100%': { opacity: 1 }
				}
			},
			animation: {
				// Animation utility using the fadeIn keyframes
				fadeIn: 'fadeIn 0.5s ease-out'
			},
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))'
			},
			outline: {
				none: 'none',
			},
		}
	},
	plugins: [typography, forms, containerQueries, daisyui],
	daisyui: {
		themes: [
			{
				mytheme: {
					// Custom DaisyUI theme aligned with your color palette
					primary: '#00d1ff',
					secondary: '#f0f0f0',
					accent: '#f9a826', // you can change this to your preferred accent
					neutral: '#1e1e1e',
					'base-100': '#2a2a2a', // base background for cards, etc.
					info: '#3ABFF8',
					success: '#36D399',
					warning: '#FBBD23',
					error: '#F87272'
				}
			},
			'coffee' // fallback theme if needed
		]
	}
};