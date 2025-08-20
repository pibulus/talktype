import { promptManager } from './promptManager';

// The geminiService now only handles prompt styles
// All actual API calls are done server-side for security
export const geminiService = {
	// Get/set prompt style functions
	getPromptStyle: promptManager.getCurrentStyle,
	setPromptStyle: promptManager.setStyle,
	getAvailableStyles: promptManager.getAvailableStyles,
	subscribeToStyleChanges: promptManager.subscribe
};
