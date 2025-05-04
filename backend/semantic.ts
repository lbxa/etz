// To run this code you need to install the following dependencies:
// npm install @google/genai mime
// npm install -D @types/node

import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface KeyEvent {
  id: string;
  shortTitle: string;
  summary: string;
  date?: string;
}

interface Episode {
  episodeNumber: number;
  workingTitle: string;
  hook: string;
  orderedEventIds: string[];
  episodeSynopsis: string;
}

interface EventConnection {
  sourceEventId: string;
  targetEventId: string;
  relationshipType: string; // e.g., "causes", "follows", "contrasts", "parallels", "echoes"
  description: string;
}

interface StoryboardData {
  events: KeyEvent[];
  episodes: Episode[];
  connections: EventConnection[];
}

async function extractSemanticInformation(transcriptPath: string): Promise<StoryboardData> {
  // Initialize Google Generative AI
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  if (!apiKey) {
    throw new Error("API key not found in environment variables (GEMINI_API_KEY or GOOGLE_API_KEY)");
  }
  
  const ai = new GoogleGenAI({
    apiKey,
  });

  // Read transcript file
  const transcript = fs.readFileSync(transcriptPath, 'utf8');
  
  // Define the configuration and model
  const config = {
    responseMimeType: 'text/plain',
  };
  const model = 'gemini-2.5-pro-preview-03-25';
  
  // Create the prompt structure for podcast outline
  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: `You are a senior podcast story architect.

Goal
Turn the raw transcript of a family-history interview into a complete multi-episode podcast outline that flows logically and keeps listeners engaged.

Input
Full transcript:
"""
${transcript}
"""

Tasks

A. Event Extraction
    •   Identify the 7–15 pivotal events within the transcript that drive the narrative. Pivotal events often include major life milestones (births, deaths, migrations, marriages), significant challenges or triumphs, key decisions, turning points, moments revealing core character traits, or anecdotes central to the family's identity.
    •   For each event provide:
        *   \`id\`: A unique, sequential identifier (e.g., \`EV001\`, \`EV002\`).
        *   \`shortTitle\`: A concise, evocative title (3-5 words).
        *   \`summary\`: A single sentence summarizing the core of the event.
        *   \`date\`: The date or time period of the event, if mentioned or clearly inferable (e.g., "1945", "Summer 1968", "childhood"). Use "unknown" if not specified.

B. Episode Planning
    •   Determine the optimal number of podcast episodes based on the density and flow of the extracted events (typically 3–8 episodes).
    •   For each episode provide:
        *   \`episodeNumber\`: Sequential integer (1, 2, 3...).
        *   \`workingTitle\`: A compelling, draft title for the episode.
        *   \`hook\`: A 1-2 sentence opening for the episode, designed to grab the listener's attention immediately (e.g., posing a question, presenting a dramatic moment, highlighting a core theme).
        *   \`orderedEventIds\`: An array of \`id\`s from Task A, sequenced to create the narrative flow for *this* episode. The order should generally be chronological but can incorporate flashbacks if narratively effective.
        *   \`episodeSynopsis\`: A brief (2-3 sentence) summary describing the episode's narrative arc, main focus, and how it contributes to the overall story.

C. Narrative Continuity
    •   Map the significant connections between the extracted events to clarify cause-and-effect relationships and thematic links. Focus on connections that build narrative momentum or reveal deeper meaning.
    •   For every significant link identified, output:
        *   \`sourceEventId\`: The \`id\` of the event that influences or precedes.
        *   \`targetEventId\`: The \`id\` of the event that is influenced or follows.
        *   \`relationshipType\`: The nature of the link (choose one: \`causes\`, \`follows\`, \`contrasts\`, \`parallels\`, \`echoes\`).
            *   \`causes\`: Event A directly leads to Event B.
            *   \`follows\`: Event B happens after Event A chronologically, often as a consequence or next step, but not strictly causal.
            *   \`contrasts\`: Event A highlights a difference with Event B.
            *   \`parallels\`: Event A shares a similar theme or pattern with Event B.
            *   \`echoes\`: Event B subtly recalls or mirrors Event A later in the timeline.
        *   \`description\`: A one-line explanation of the specific connection.

Output
Return a single JSON object adhering strictly to the following structure:

{
  "events": [
    {
      "id": "string",
      "shortTitle": "string",
      "summary": "string",
      "date": "string"
    }
  ],
  "episodes": [
    {
      "episodeNumber": integer,
      "workingTitle": "string",
      "hook": "string",
      "orderedEventIds": ["string", ...],
      "episodeSynopsis": "string"
    }
  ],
  "connections": [
    {
      "sourceEventId": "string",
      "targetEventId": "string",
      "relationshipType": "string",
      "description": "string"
    }
  ]
}

General Instructions:
*   Focus on the clearest and most compelling narrative threads present in the transcript.
*   Keep all generated text (titles, summaries, hooks, descriptions) concise and engaging.
*   Avoid repetition in summaries and descriptions.
*   Ensure the overall structure maintains chronological clarity where possible, using the event connections and episode order to build the story effectively over time.`,
        },
      ],
    },
  ];

  // Generate the content
  try {
    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    let resultText = '';
    for await (const chunk of response) {
      resultText += chunk.text || '';
    }

    // Parse the JSON from the response
    try {
      // Try to find a JSON object in the response
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const storyboardData = JSON.parse(jsonMatch[0]) as StoryboardData;
        return storyboardData;
      } else {
        throw new Error("Could not find JSON object in response");
      }
    } catch (error) {
      console.error("Error parsing storyboard JSON:", error);
      console.error("Raw response:", resultText);
      throw new Error("Failed to parse response as JSON");
    }
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}

async function generateStoryboard(transcriptPath: string, outputPath: string): Promise<void> {
  console.log(`Extracting semantic information from ${transcriptPath}...`);
  
  try {
    const semanticData = await extractSemanticInformation(transcriptPath);
    
    // Write the semantic data to a JSON file
    fs.writeFileSync(
      outputPath, 
      JSON.stringify(semanticData, null, 2), 
      'utf8'
    );
    
    // Generate a human-readable storyboard document
    const storyboardText = generateReadableStoryboard(semanticData);
    const storyboardPath = outputPath.replace('.json', '.txt');
    fs.writeFileSync(storyboardPath, storyboardText, 'utf8');
    
    console.log(`Storyboard data written to ${outputPath}`);
    console.log(`Human-readable storyboard written to ${storyboardPath}`);
  } catch (error) {
    console.error("Error generating storyboard:", error);
  }
}

function generateReadableStoryboard(data: StoryboardData): string {
  let output = "# STORYBOARD\n\n";
  
  output += "## EVENTS\n\n";
  for (const event of data.events) {
    output += `### ${event.id}. ${event.shortTitle}\n`;
    output += `${event.summary}\n`;
    if (event.date) {
      output += `Date: ${event.date}\n`;
    }
    output += "\n";
  }
  
  output += "## EPISODES\n\n";
  for (const episode of data.episodes) {
    output += `### Episode ${episode.episodeNumber}: ${episode.workingTitle}\n`;
    output += `Hook: ${episode.hook}\n\n`;
    output += `Synopsis: ${episode.episodeSynopsis}\n\n`;
    output += `Event IDs: ${episode.orderedEventIds.join(', ')}\n\n`;
  }
  
  output += "## CONNECTIONS & CONTINUITY\n\n";
  for (const connection of data.connections) {
    const sourceEvent = data.events.find(e => e.id === connection.sourceEventId);
    const targetEvent = data.events.find(e => e.id === connection.targetEventId);
    
    if (sourceEvent && targetEvent) {
      output += `### ${sourceEvent.shortTitle} ${connection.relationshipType} ${targetEvent.shortTitle}\n`;
      output += `${connection.description}\n\n`;
    }
  }
  
  return output;
}

// Example usage
async function main() {
  const transcriptPath = process.argv[2];
  
  if (!transcriptPath) {
    console.error("Please provide the path to a transcript file as an argument.");
    process.exit(1);
  }
  
  if (!fs.existsSync(transcriptPath)) {
    console.error(`Transcript file not found: ${transcriptPath}`);
    process.exit(1);
  }
  
  const outputPath = path.join(
    path.dirname(transcriptPath),
    `${path.basename(transcriptPath, path.extname(transcriptPath))}_storyboard.json`
  );
  
  await generateStoryboard(transcriptPath, outputPath);
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error("Error in main process:", error);
    process.exit(1);
  });
}

// Export functions for use in other modules
export { extractSemanticInformation, generateStoryboard };
export type { StoryboardData, KeyEvent, EventConnection, Episode };
