import { GoogleGenerativeAI } from '@google/generative-ai';

const genAIKEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!genAIKEY) {
	console.error('VITE_GEMINI_API_KEY is not set in the environment variables.');
}
const genAI = new GoogleGenerativeAI(genAIKEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// Track model initialization state
let modelInitialized = false;
let initializationPromise = null;

// Function to preload/initialize the model for faster response
function preloadModel() {
  // Only initialize once
  if (modelInitialized || initializationPromise) {
    return initializationPromise;
  }
  
  console.log('🔍 Preloading speech model for faster response');
  
  // We create a very small "ping" query to initialize the model
  // This warms up the Gemini API connection and loads necessary client-side resources
  initializationPromise = model.generateContent('hello')
    .then(response => {
      console.log('✅ Speech model preloaded successfully');
      modelInitialized = true;
      return response;
    })
    .catch(error => {
      console.error('❌ Error preloading speech model:', error);
      // Reset the initialization state so we can try again
      initializationPromise = null;
      throw error;
    });
    
  return initializationPromise;
}

function blobToGenerativePart(blob) {
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			const base64data = reader.result.split(',')[1];
			resolve({
				inlineData: {
					data: base64data,
					mimeType: blob.type
				}
			});
		};
		reader.readAsDataURL(blob);
	});
}

export const geminiService = {
	// Expose the preload function for hover-based preloading
	preloadModel,
	
	async extractActionItems(text) {
		try {
			console.log('🤖 Extracting action items with Gemini');
			const prompt = `Analyze the following conversation and extract or suggest action items.
            First, look for any explicit action items, tasks, or commitments mentioned.
            Then, based on the topics discussed, suggest relevant follow-up actions or research tasks.

            For example, if people discuss AI ethics but don't specify actions, you could suggest:
            "Research current AI ethics guidelines and frameworks"

            For each action item (found or suggested), identify:
            - The task description
            - Who should do it (if mentioned, otherwise leave as null)
            - A reasonable suggested due date (or null if not time-sensitive)

            Return a JSON array of action items with this structure:
            [
                {
                    "description": "Complete task description",
                    "assignee": "Person name or null",
                    "due_date": "YYYY-MM-DD or null"
                }
            ]

            If no explicit action items are found, generate at least 3-5 suggested actions based on the conversation topics.
            CONVERSATION: ${text}`;

			const result = await model.generateContent(prompt);
			const response = await result.response;
			console.log('response: ', response);
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
			
			// Try to preload the model if it hasn't been preloaded yet
			// This ensures we take advantage of preloading optimization when possible
			if (!modelInitialized && !initializationPromise) {
				try {
					console.log('🔍 Preloading model before transcription');
					await preloadModel();
				} catch (err) {
					// Continue even if preloading fails - we'll still attempt transcription
					console.log('⚠️ Preloading failed, continuing with transcription:', err);
				}
			}
			
			const prompt =
				"Transcribe this audio file accurately and completely, removing any redundant 'ums,' 'likes', 'uhs', and similar filler words. Return only the cleaned-up transcription, with no additional text.";
			const audioPart = await blobToGenerativePart(audioBlob);

			const result = await model.generateContent([prompt, audioPart]);
			console.log('✅ Audio transcription complete');
			return result.response.text();
		} catch (error) {
			console.error('❌ Error transcribing audio:', error);
			throw new Error('Failed to transcribe audio with Gemini');
		}
	},

	async generateTitle(transcript) {
		try {
			console.log('📝 Generating title with Gemini');
			const prompt = `Generate a concise and descriptive title (3-4 words maximum) for this conversation transcript. Return only the title text, no quotes or additional text.
			
			TRANSCRIPT: ${transcript}`;

			const result = await model.generateContent(prompt);
			const response = await result.response;
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
			const prompt = `Analyze the following conversation and extract the main topics and their relationships.
            I want a you to break down the conversation into the topics covered and how they are related.
            I'm not interested in a chronoliogical order, but rather the relationships of the topics.

			The purpose of this it to provide a live visualisation of the conversation for note taking but also to
			prevent interruptions of the speaker by letting all participants have a visualisation of what all the topics
			that have been mentioned/discussed so that they can circle back to them later.
			Make sure to include all the main topics and their relationships, err in favour of more topics rather than less.

            Use a color scheme for the edges to show the relationships between the topics.
            Base the colours on having a white background but being muted and understated modern style of understated colours.
			Dont make it black and white.

			Provide an emoji for each topic in the emoji field. Do not include the emoji in the label.

			
            
            Return a JSON object with the following structure:
			{
				"nodes": [
					{
						"id": "node1",
						"label": "Topic 1",
						"color": "#4287f5",
						"emoji": "😀"
					},
					{
						"id": "node2",
						"label": "Topic 2",
						"color": "#42f5a7",
						"emoji": "🤔"
					}
				],
				"edges": [
					{
						"source_topic_id": "node1",
						"target_topic_id": "node2",
						"color": "#999999"
					}
				]
			}
			
			IMPORTANT: Only summarise the conversation which is the text below denoted as CONVERSATION.

			CONVERSATION: ${text}`;
			const result = await model.generateContent(prompt);
			const response = await result.response;
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

	async generateMarkdown(prompt, text) {
		try {
			console.log('📝 Generating markdown with Gemini');
			const fullPrompt = `Transform the following conversation text according to these instructions:
			
			${prompt}

			Return the result in markdown format, properly formatted and structured.
			Only return the markdown content, no additional text or explanations.
			Use proper markdown syntax including headers, lists, code blocks, etc as appropriate.
			
			CONVERSATION TEXT:
			${text}`;

			const result = await model.generateContent(fullPrompt);
			const response = await result.response;
			return response.text().trim();
		} catch (error) {
			console.error('Error generating markdown:', error);
			throw new Error('Failed to generate markdown with Gemini');
		}
	}
};
