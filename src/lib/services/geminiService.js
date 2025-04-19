import { geminiApiService } from './geminiApiService';
import { promptManager } from './promptManager';

// Export the original preloadModel function for backward compatibility
const preloadModel = geminiApiService.preloadModel;

// The main public geminiService object
export const geminiService = {
  // Expose the preload function for hover-based preloading
  preloadModel,
  
  // Get/set prompt style functions
  getPromptStyle: promptManager.getCurrentStyle,
  setPromptStyle: promptManager.setStyle,
  getAvailableStyles: promptManager.getAvailableStyles,
  subscribeToStyleChanges: promptManager.subscribe,
  
  async extractActionItems(text) {
    try {
      console.log('🤖 Extracting action items with Gemini');
      const prompt = promptManager.getPrompt('extractActionItems', { text });

      const response = await geminiApiService.generateContent(prompt);
      let jsonString = response.text().trim();
      // Clean up the JSON string
      jsonString = jsonString.replace(/^```(json)?\s*/, '');
      jsonString = jsonString.replace(/\s*```$/, '');

      try {
        const actionItems = JSON.parse(jsonString);
        console.log('📋 Extracted action items:', actionItems);
        return actionItems;
      } catch (e) {
        console.error('Error parsing action items JSON:', e);
        return [];
      }
    } catch (error) {
      console.error('Error extracting action items:', error);
      return [];
    }
  },

  async transcribeAudio(audioBlob) {
    try {
      console.log('🎤 Transcribing audio with Gemini');
      
      // Ensure model is preloaded if possible
      const { initialized } = geminiApiService.getModelStatus();
      if (!initialized) {
        try {
          console.log('🔍 Preloading model before transcription');
          await preloadModel();
        } catch (err) {
          console.log('⚠️ Preloading failed, continuing with transcription:', err);
        }
      }
      
      // Get the appropriate prompt based on current style
      const prompt = promptManager.getPrompt('transcribeAudio');
      
      // Convert audio to format Gemini can use
      const audioPart = await geminiApiService.blobToGenerativePart(audioBlob);

      // Generate content with both prompt and audio data
      const response = await geminiApiService.generateContent([prompt, audioPart]);
      console.log('✅ Audio transcription complete');
      return response.text();
    } catch (error) {
      console.error('❌ Error transcribing audio:', error);
      throw new Error('Failed to transcribe audio with Gemini');
    }
  },

  async generateTitle(transcript) {
    try {
      console.log('📝 Generating title with Gemini');
      const prompt = promptManager.getPrompt('generateTitle', { transcript });

      const response = await geminiApiService.generateContent(prompt);
      const title = response.text().trim();
      console.log('✨ Generated title:', title);
      return title;
    } catch (error) {
      console.error('❌ Error generating title:', error);
      throw new Error('Failed to generate title with Gemini');
    }
  },

  extractKeywords: async (text) => {
    if (!text) return [];
    try {
      const prompt = promptManager.getPrompt('extractKeywords', { text });
      
      const response = await geminiApiService.generateContent(prompt);
      let jsonString = response.text();
      console.log('🤖 Raw Gemini response:', jsonString);
      // Robustly clean up the JSON string
      jsonString = jsonString.trim();
      jsonString = jsonString.replace(/^```(json)?\s*/, '');
      jsonString = jsonString.replace(/\s*```$/, '');
      jsonString = jsonString.replace(/^.*?({.*}).*?$/, '$1');

      try {
        const data = JSON.parse(jsonString);
        console.log('🤖 Gemini response parsed:', {
          nodeCount: data.nodes?.length || 0,
          edgeCount: data.edges?.length || 0,
          nodes: data.nodes,
          edges: data.edges
        });
        return data;
      } catch (e) {
        console.error('Error parsing JSON response', e, jsonString);
        return { nodes: [], edges: [] };
      }
    } catch (error) {
      console.error('Error extracting topics:', error);
      return { nodes: [], edges: [] };
    }
  },

  async generateMarkdown(userPrompt, text) {
    try {
      console.log('📝 Generating markdown with Gemini');
      const prompt = promptManager.getPrompt('generateMarkdown', { prompt: userPrompt, text });

      const response = await geminiApiService.generateContent(prompt);
      return response.text().trim();
    } catch (error) {
      console.error('Error generating markdown:', error);
      throw new Error('Failed to generate markdown with Gemini');
    }
  }
};
