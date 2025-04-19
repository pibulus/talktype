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
  
  // L33T Sp34k prompt style
  leetSpeak: {
    transcribeAudio: {
      text: "Tr4n5cr1b3 th15 4ud10 f1l3 4ccur4t3ly, but c0nv3rt 1t 1nt0 l33t 5p34k. U53 num3r1c 5ub5t1tut10n5 (3=e, 4=a, 1=i, 0=o, 5=s, 7=t) 4nd h4ck3r j4rg0n wh3n p0551bl3. R3turn 0nly th3 l33t 5p34k tr4n5cr1pt10n, n0 4dd1t10n4l t3xt."
    },
    generateTitle: {
      text: `G3n3r4t3 4 l33t 5p34k t1tl3 (3-4 w0rd5 m4x1mum) f0r th15 tr4n5cr1pt. U53 num3r1c 5ub5t1tut10n5 4nd h4ck3r t3rm1n0l0gy. R3turn 0nly th3 t1tl3 t3xt, n0 qu0t35 0r 3xtr4 t3xt.

TR4N5CR1PT: {{transcript}}`
    },
    extractActionItems: {
      text: `4n4lyz3 th15 c0nv3r54t10n 4nd 3xtr4ct t45k5.exe.
1d3nt1fy 4ny 4ct10n 1t3m5, r3qu1r3m3nt5, 0r t45k5 m3nt10n3d.
th3n 5ugg35t 4dd1t10n4l h4ck5 b453d 0n wh4t w45 d15cu553d.

f0r 34ch 4ct10n 1t3m, pr0v1d3:
- t45k d35cr1pt10n (1n l33t 5p34k)
- u53r r35p0n51bl3 (1f m3nt10n3d, 0th3rw153 null)
- d34dl1n3.1n1t (0r null 1f n0 t1m3fr4m3)

r3turn 4 j50n 4rr4y w1th th15 5tructur3:
[
    {
        "description": "l33t 5p34k t45k d35cr1pt10n",
        "assignee": "u53r 0r null",
        "due_date": "YYYY-MM-DD 0r null"
    }
]

1f n0 3xpl1c1t t45k5 4r3 f0und, g3n3r4t3 4t l345t 3-5 5ugg35t3d h4ck5 b453d 0n th3 t0p1c5, 4ll 1n l33t 5p34k!
C0NV3R54T10N: {{text}}`
    },
    extractKeywords: {
      text: `h4ck th15 c0nv3r54t10n 4nd m4p 4ll n0d35 4nd c0nn3ct10n5.
br34k d0wn th3 c0nv3r54t10n 1nt0 m41n t0p1c5 4nd th31r l1nk5.
n0t 1n chr0n0l0g1c4l 0rd3r - ju5t l0g1c4l c0nn3ct10n5.

u53 c0l0r5 th4t l00k l1k3 4 h4ck3r t3rm1n4l: gr33n5, blu35, purpl35, bl4ck.
455ign 4 h4ck3r/t3ch 3m0j1 t0 34ch t0p1c.

r3turn 4 j50n 0bj3ct w1th th15 5tructur3:
{
  "nodes": [
    {
      "id": "n0d31",
      "label": "t0p1c_1",
      "color": "#33FF33",
      "emoji": "⚡"
    },
    {
      "id": "n0d32",
      "label": "t0p1c_2",
      "color": "#3333FF",
      "emoji": "💻"
    }
  ],
  "edges": [
    {
      "source_topic_id": "n0d31",
      "target_topic_id": "n0d32",
      "color": "#999999"
    }
  ]
}

1MP0RT4NT: 0nly 4n4lyz3 th3 c0nv3r54t10n b3l0w.

C0NV3R54T10N: {{text}}`
    },
    generateMarkdown: {
      text: `tr4n5f0rm th3 f0ll0w1ng t3xt 4cc0rd1ng t0 th353 1n5truct10n5, but c0nv3rt 1t t0 l33t 5p34k w1th num3r1c 5ub5t1tut10n5 4nd h4ck3r l4ngu4g3:

{{prompt}}

r3turn th3 r35ult 1n m4rkd0wn f0rm4t, pr0p3rly f0rm4tt3d 4nd 5tructur3d.
0nly r3turn th3 m4rkd0wn c0nt3nt, n0 4dd1t10n4l t3xt 0r 3xpl4n4t10n5.
u53 pr0p3r m4rkd0wn 5ynt4x 1nclud1ng h34d3r5, l15t5, c0d3 bl0ck5, 3tc.

C0NV3R54T10N T3XT:
{{text}}`
    }
  },

  // Sparkle Pop prompt style
  sparklePop: {
    transcribeAudio: {
      text: "OMG!!! Transcribe this audio file like TOTALLY accurately, but make it SUPER bubbly and enthusiastic!!! Use LOTS of emojis, exclamation points, and teen slang!!!! Sprinkle in words like 'literally,' 'totally,' 'sooo,' 'vibes,' and 'obsessed'!!! Add sparkle emojis ✨, hearts 💖, and rainbow emojis 🌈 throughout!!! Make it EXTRA and over-the-top excited!!!"
    },
    generateTitle: {
      text: `OMG create the MOST AMAZING title (3-4 words max!) for this convo!!! Make it SUPER cute and bubbly with at least one emoji!!! It should be TOTALLY eye-catching and give the BEST vibes!!! Return just the sparkly title, nothing else!!!

TRANSCRIPT: {{transcript}}`
    },
    extractActionItems: {
      text: `OMG!!! Analyze this AMAZING convo and find all the super important to-dos and action items!!! 💖✨

First, look for any specific tasks or goals that were mentioned (SO important!!!)
Then, suggest some AWESOME follow-up actions based on what was discussed!!!

For each to-do item, identify:
- The FABULOUS task description (make it sound SUPER exciting!!!)
- Who should totally do it (if mentioned, otherwise just put null)
- When it should be done by (a date or null if there's no deadline)

Return a JSON array with this structure (but make EVERYTHING sound EXTRA enthusiastic with teen slang and excitement!!!):
[
    {
        "description": "Super enthusiastic task description!!!",
        "assignee": "Person's name or null",
        "due_date": "YYYY-MM-DD or null"
    }
]

If you don't find specific tasks, PLEASE create at least 3-5 suggested actions that would be LITERALLY PERFECT based on the convo topics!!! Make them sound SUPER EXCITING with lots of emojis!!! 💯✨🌈

CONVERSATION: {{text}}`
    },
    extractKeywords: {
      text: `OMG!!! 😍 Analyze this AMAZING conversation and find all the SUPER IMPORTANT topics and how they connect!!! ✨💖

Break down this convo into the MAIN topics and show how they're TOTALLY related to each other!!! Not in boring time order, just how the ideas connect!!!

Use the CUTEST colors ever!!! Think pastels, pinks, purples, blues - SUPER aesthetic vibes!!! 🌈
Give each topic the MOST PERFECT emoji that matches the vibe!!! 💯

Return a JSON object with this structure (but make the topic labels sound EXTRA enthusiastic!!!):
{
  "nodes": [
    {
      "id": "node1",
      "label": "SUPER AMAZING Topic 1!!!",
      "color": "#f7a5f7",
      "emoji": "✨"
    },
    {
      "id": "node2",
      "label": "LITERALLY PERFECT Topic 2!!!",
      "color": "#a5c5f7",
      "emoji": "💖"
    }
  ],
  "edges": [
    {
      "source_topic_id": "node1",
      "target_topic_id": "node2",
      "color": "#f5cef5"
    }
  ]
}

IMPORTANT: Only analyze the conversation below!!! TYSM!!! 💕

CONVERSATION: {{text}}`
    },
    generateMarkdown: {
      text: `OMG!!! Transform this convo according to these instructions, but make it SUPER BUBBLY and ENTHUSIASTIC with teen slang and TONS of emojis!!! 💖✨

{{prompt}}

Return the result in markdown format, but make it TOTALLY EXTRA!!! Use lots of emojis, exclamation points, and make it sound like an SUPER excited teenager wrote it!!! 
Only return the markdown content, no additional text!!! Make sure to use proper markdown format like headers, lists, etc., but add SPARKLE to everything!!! ✨💯

CONVERSATION TEXT:
{{text}}`
    }
  },
  
  // Code Whisperer (formerly Prompt Engineer)
  codeWhisperer: {
    transcribeAudio: {
      text: "Transcribe this audio file accurately and completely, but reformat it into clear, structured, technical language suitable for a coding prompt. Remove redundancies, organize thoughts logically, use precise technical terminology, and structure content with clear sections. Return only the optimized, programmer-friendly transcription."
    },
    generateTitle: {
      text: `Generate a precise technical title (3-4 words maximum) for this transcript that would serve as a good GitHub issue or function name. Use programming naming conventions (camelCase or similar). Return only the title text, no quotes or additional text.

TRANSCRIPT: {{transcript}}`
    },
    extractActionItems: {
      text: `Parse the following conversation and extract or suggest implementation tasks.
Analyze the content for explicit development requirements, technical tasks, and engineering goals.
Reformat any implied tasks into clear, actionable development tickets.

For each task item:
- Write a precise, unambiguous task description using technical language
- Assign to a developer if mentioned, otherwise null
- Add estimated complexity (low/medium/high) based on the apparent difficulty
- Include due date if mentioned, otherwise null

Return a JSON array of task items with this structure:
[
    {
        "description": "Precise technical task description",
        "assignee": "Developer name or null",
        "complexity": "low/medium/high",
        "due_date": "YYYY-MM-DD or null"
    }
]

If insufficient explicit tasks are identified, derive 3-5 logical implementation steps based on the discussion context.
CONVERSATION: {{text}}`
    },
    extractKeywords: {
      text: `Parse the following conversation and extract key technical concepts and their relationships.
Map the content into a directed graph of topics with logical dependencies.

The result will serve as an implementation map and architectural overview.
Be comprehensive but avoid noise; focus on actionable technical components.

Use a professional technical color scheme for the graph.
Assign appropriate technical icons to each topic.

Return a JSON object with the following structure:
{
  "nodes": [
    {
      "id": "node1",
      "label": "TechnicalComponent1",
      "color": "#4287f5",
      "emoji": "⚙️"
    },
    {
      "id": "node2",
      "label": "TechnicalComponent2",
      "color": "#42f5a7",
      "emoji": "🔧"
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

IMPORTANT: Parse only the conversation text provided below.

CONVERSATION: {{text}}`
    },
    generateMarkdown: {
      text: `Transform the following conversation text according to these instructions, reformatting it into clear, structured technical documentation:

{{prompt}}

Return the result as clean, well-structured markdown.
Use proper formatting including headers, code blocks, lists, and tables as appropriate.
Organize content logically with clear section hierarchy.
Use precise technical terminology and remove redundancies.
Include only the formatted markdown content with no additional commentary.

SOURCE:
{{text}}`
    }
  },
  
  // Quill & Ink (formerly Victorian Author)
  quillAndInk: {
    transcribeAudio: {
      text: "Transcribe this audio file with the eloquence and stylistic flourishes of a 19th century Victorian novelist, in the vein of Jane Austen or Charles Dickens. Employ elaborate sentences, period-appropriate vocabulary, literary devices, and a generally formal and ornate prose style. The transcription should maintain the original meaning but transform the manner of expression entirely."
    },
    generateTitle: {
      text: `Compose an elegant and literary title (3-4 words maximum) for this transcript, in the style of a Victorian novel chapter heading. Employ period-appropriate language and a touch of refined sentiment. Return only the title text, free from quotation marks or supplementary commentary.

TRANSCRIPT: {{transcript}}`
    },
    extractActionItems: {
      text: `Pray, examine this conversation with the utmost care and extract, with all due diligence, the matters requiring future attention and activity.

First, identify any explicit commitments or obligations mentioned by the respective parties.
Then, with judicious consideration, suggest additional courses of action befitting the subjects discussed.

For each action item, kindly provide:
- A description of the task, composed in elegant Victorian prose
- The name of the individual to whom this responsibility falls (if mentioned, otherwise indicate as unassigned)
- The appointed date of completion (if specified, otherwise indicate no fixed date has been established)

Present these findings in the form of a JSON array, with the following structure:
[
    {
        "description": "A most elegantly phrased description of the task at hand",
        "assignee": "The good gentleman or lady's name, or null if unassigned",
        "due_date": "YYYY-MM-DD or null if no date is appointed"
    }
]

Should you find the conversation lacking in explicit obligations, pray generate 3-5 suggested courses of action that would most appropriately complement the topics discussed, all phrased in the most refined Victorian literary style.

CONVERSATION: {{text}}`
    },
    extractKeywords: {
      text: `I humbly request that you analyze this most illuminating discourse and extract, with all the refinement of a Victorian scholar, the principal subjects and their elegant interconnections.

Pray, arrange these topics not in vulgar chronological sequence, but rather in a manner that demonstrates their literary and intellectual relationships to one another.

This endeavor shall serve as a most refined visual representation of the conversation's essence, allowing participants to revisit subjects of interest without rudely interrupting the natural flow of discourse.

Employ a color palette of subtle distinction, befitting a gentleman's study or a lady's drawing room - delicate hues rather than garish tones.

For each topic, kindly assign an appropriate emblem that captures its essence with Victorian sensibility.

Return this information in the structure of a JSON object, as follows:
{
  "nodes": [
    {
      "id": "node1",
      "label": "A Most Refined Topic",
      "color": "#9a8478",
      "emoji": "📜"
    },
    {
      "id": "node2",
      "label": "A Subject of Great Import",
      "color": "#7a94ab",
      "emoji": "🖋️"
    }
  ],
  "edges": [
    {
      "source_topic_id": "node1",
      "target_topic_id": "node2",
      "color": "#b8a99a"
    }
  ]
}

IMPORTANT: Pray confine your analysis to the conversation provided herewith.

CONVERSATION: {{text}}`
    },
    generateMarkdown: {
      text: `I entreat you to transform the following conversation text according to these instructions, but pray, do so with all the literary flourish and eloquence of a Victorian novelist - employing ornate language, elaborate sentence structures, and period-appropriate turns of phrase:

{{prompt}}

Return the result in markdown format, properly formatted and structured as befits a literary work.
Provide only the markdown content, with no supplementary text or explanations.
Employ proper markdown syntax including headers, lists, and other elements as appropriate, while maintaining the Victorian literary style throughout.

CONVERSATION TEXT:
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
