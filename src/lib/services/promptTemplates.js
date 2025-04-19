// Collection of different prompt templates organized by style

export const promptTemplates = {
  // Standard prompt style (current implementation)
  standard: {
    transcribeAudio: {
      text: "Transcribe this audio file accurately and completely, removing any redundant 'ums,' 'likes', 'uhs', and similar filler words. Return only the cleaned-up transcription, with no additional text."
    },
    generateTitle: {
      text: `Generate a concise and descriptive title (3-4 words maximum) for this conversation transcript. Return only the title text, no quotes or additional text.

TRANSCRIPT: {{transcript}}`
    },
    extractActionItems: {
      text: `Analyze the following conversation and extract or suggest action items.
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
CONVERSATION: {{text}}`
    },
    extractKeywords: {
      text: `Analyze the following conversation and extract the main topics and their relationships.
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

CONVERSATION: {{text}}`
    },
    generateMarkdown: {
      text: `Transform the following conversation text according to these instructions:

{{prompt}}

Return the result in markdown format, properly formatted and structured.
Only return the markdown content, no additional text or explanations.
Use proper markdown syntax including headers, lists, code blocks, etc as appropriate.

CONVERSATION TEXT:
{{text}}`
    }
  },
  
  // Surly pirate prompt style
  surlyPirate: {
    transcribeAudio: {
      text: "Transcribe this audio file accurately, but rewrite it in the style of a surly pirate. Use pirate slang, expressions, and attitude. Arr! Return only the pirate-style transcription, no additional text."
    },
    generateTitle: {
      text: `Create a pirate-themed title (3-4 words) for this conversation, using pirate slang and expressions. Make it sound like a surly pirate named it. Return only the title, no quotes or extra text.

TRANSCRIPT: {{transcript}}`
    },
    extractActionItems: {
      text: `Arrr! Plunder this conversation and extract the buried treasure of action items, ye scurvy dog!
First, look for any explicit tasks or commitments mentioned by these landlubbers.
Then, suggest some actions these scallywags should take based on their palaverin'.

For each action item, identify:
- The task description (in pirate speak, of course)
- Which scurvy dog should do it (if mentioned, otherwise leave as null)
- When it be due, or null if not time-sensitive

Return a JSON array of action items with this structure, but make all descriptions sound like they be written by a surly pirate:
[
    {
        "description": "Pirate-ified task description",
        "assignee": "Scallywag name or null",
        "due_date": "YYYY-MM-DD or null"
    }
]

If ye find no explicit action items, generate at least 3-5 suggested actions based on the conversation, all in pirate speak!
CONVERSATION: {{text}}`
    },
    extractKeywords: {
      text: `Arrr! Chart out the main topics from this seafarer's log and show how they be connected, ye scurvy dog!
Break down this conversation into a treasure map of topics, not in order of when they were spoken, but showing how they be related to each other.

This map will help prevent the captain from being interrupted, by letting all hands see what topics have been discussed so they can circle back later.
Make sure to include all the important bits of treasure, err on the side of more topics, not less.

Use colors for the connections between topics that would look good on a weathered treasure map.
Give each topic a pirate-themed emoji in the emoji field, but keep the topic label accurate to the content.

Provide a JSON object with the following structure, but written like a pirate:
{
  "nodes": [
    {
      "id": "node1",
      "label": "Topic 1",
      "color": "#4287f5",
      "emoji": "🏴‍☠️"
    },
    {
      "id": "node2",
      "label": "Topic 2",
      "color": "#42f5a7",
      "emoji": "⚓"
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

IMPORTANT: Only summarize the conversation below, ye scurvy dog!

CONVERSATION: {{text}}`
    },
    generateMarkdown: {
      text: `Transform the following conversation text according to these instructions, but make it sound like it was written by a surly pirate, full of pirate slang and expressions:

{{prompt}}

Return the result in markdown format, properly formatted and structured, but with pirate flair.
Only return the markdown content, no additional text or explanations, savvy?
Use proper markdown syntax including headers, lists, code blocks, etc as appropriate.

CONVERSATION TEXT:
{{text}}`
    }
  },
  
  // Corporate prompt style (as another example)
  corporate: {
    transcribeAudio: {
      text: "Transcribe this audio file accurately and completely, removing filler words. Ensure the transcription employs professional, corporate language and phrasing. Return only the polished, professional transcription, no additional text."
    },
    generateTitle: {
      text: `Generate a professional, corporate-style title (3-4 words maximum) for this meeting transcript. Use business-appropriate terminology. Return only the title text, no quotes or additional text.

TRANSCRIPT: {{transcript}}`
    },
    extractActionItems: {
      text: `Conduct a thorough analysis of the following meeting transcript and extract all action items and deliverables.
Identify explicit action items, tasks, and commitments mentioned by participants.
Additionally, suggest strategic follow-up actions based on topics discussed in the meeting.

For each action item (identified or suggested), please specify:
- Action item description (using professional, business-appropriate language)
- Responsible party (if mentioned, otherwise indicate "Unassigned")
- Proposed deadline (if applicable, otherwise indicate "No deadline specified")

Return a JSON array of action items with this structure:
[
    {
        "description": "Complete action item description in professional language",
        "assignee": "Responsible party or null",
        "due_date": "YYYY-MM-DD or null"
    }
]

If insufficient explicit action items are identified, generate 3-5 strategic follow-up actions aligned with the meeting topics and business objectives.
MEETING TRANSCRIPT: {{text}}`
    },
    extractKeywords: {
      text: `Conduct a comprehensive analysis of the following meeting transcript and identify the key discussion topics and their strategic relationships.
Organize the topics based on their logical connections rather than chronological order.

This visualization will facilitate improved meeting documentation and enable participants to revisit important topics without interrupting the current discussion flow.
Please be thorough in your topic identification, erring on the side of comprehensiveness.

Use a professional color palette suitable for business presentations with a white background.
Assign an appropriate business-themed emoji to each topic in the designated field.

Return a JSON object with the following structure:
{
  "nodes": [
    {
      "id": "node1",
      "label": "Strategic Initiative 1",
      "color": "#4287f5",
      "emoji": "📊"
    },
    {
      "id": "node2",
      "label": "Financial Consideration 2",
      "color": "#42f5a7",
      "emoji": "💼"
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

IMPORTANT: Limit your analysis exclusively to the meeting transcript provided below.

MEETING TRANSCRIPT: {{text}}`
    },
    generateMarkdown: {
      text: `Transform the following meeting transcript according to these instructions, employing professional, corporate language throughout:

{{prompt}}

Return the result in markdown format, properly formatted and structured for business documentation.
Provide only the markdown content, with no additional text or explanations.
Utilize appropriate markdown syntax including headers, lists, code blocks, etc. as needed for professional documentation.

MEETING TRANSCRIPT:
{{text}}`
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
