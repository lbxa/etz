// To run this code you need to install the following dependencies:
// bun add @google/genai

import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface KeyEvent {
  id: number;
  title: string;
  description: string;
  importance: number; // 1-10 scale
  timestamp?: string; // Optional timestamp from transcript
}

interface EventConnection {
  sourceEventId: number;
  targetEventId: number;
  relationship: string; // e.g., "causes", "follows", "contrasts with"
  description: string;
}

interface StoryboardData {
  keyEvents: KeyEvent[];
  connections: EventConnection[];
}

async function extractSemanticInformation(transcriptPath: string): Promise<StoryboardData> {
  // Initialize Google Generative AI
  const apiKey = process.env.GOOGLE_API_KEY || "YOUR_API_KEY_HERE";
  const genAI = new GoogleGenAI('AIzaSyAH19FlHAJdQZoTwA37tPZ85bhScckDNJo');

  // Read transcript file
  const transcriptContent = fs.readFileSync(transcriptPath, 'utf8');
  
  // Define the prompt for extracting key events
  const podcastOutlinePrompt = `
    You are a senior podcast story architect.

    Goal
    Turn raw story material into a complete multi‑episode outline that flows logically and keeps listeners engaged.

    Input
    1. Family‑history transcript (or list of rough key events)
    2. Any metadata I pass in
    ${keyEvents ? `\nExisting key events:\n${keyEvents.map(e => `ID ${e.id}: ${e.title} – ${e.description}`).join('\n')}\n` : ''}

    Tasks
    A. Event refinement
      • Extract or polish the smallest set of pivotal events (7‑15 ideal).  
      • For each event give: id, short title, one‑sentence summary, date (if known).

    B. Episode planning
      • Decide the optimal number of podcast episodes (3‑8 typical).  
      • For each episode give: episodeNumber, workingTitle, hook, eventIdsInOrder, brief episodeSynopsis.

    C. Narrative continuity
      • Map how events link so that cause and effect are clear.  
      • For every significant link provide: sourceEventId, targetEventId, relationshipType (causes, follows, contrasts, parallels, echoes), one‑line description.

    Output
    Return a single JSON object with three keys:
    {
      "events": [ {...} ],
      "episodes": [ {...} ],
      "connections": [ {...} ]
    }

    Keep prose tight, avoid repetition, and maintain chronological clarity.
  `;

  // Extract key events
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  const keyEventsResponse = await model.generateContent(promptKeyEvents);
  const keyEventsText = keyEventsResponse.response.text();
  
  // Parse the JSON response
  let keyEvents: KeyEvent[] = [];
  try {
    // Extract JSON from the response (in case there's any wrapper text)
    const jsonMatch = keyEventsText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      keyEvents = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Could not find JSON array in response");
    }
  } catch (error) {
    console.error("Error parsing key events JSON:", error);
    console.error("Raw response:", keyEventsText);
    return { keyEvents: [], connections: [] };
  }
  
  // Define the prompt for extracting connections between events
  const promptConnections = `
  You are an expert story analyst and editor with deep knowledge of narrative structure.
  
  I've identified the following key events in the story:
  
  ${keyEvents.map(event => `ID ${event.id}: ${event.title} - ${event.description}`).join('\n')}
  
  Now, I need you to analyze how these events connect to each other to form a coherent narrative. For each meaningful connection between events, provide:
  
  1. The source event ID
  2. The target event ID (the event that follows or is affected by the source event)
  3. The type of relationship (e.g., "causes", "follows", "contrasts with", "parallels", "echoes")
  4. A brief description of how they connect
  
  Focus on the most important connections that demonstrate continuity and causality in the story.
  
  Format your response as a JSON array of objects with the keys: sourceEventId, targetEventId, relationship, and description.
  `;

  // Extract connections
  const connectionsResponse = await model.generateContent(promptConnections);
  const connectionsText = connectionsResponse.response.text();
  
  // Parse the JSON response
  let connections: EventConnection[] = [];
  try {
    // Extract JSON from the response (in case there's any wrapper text)
    const jsonMatch = connectionsText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      connections = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Could not find JSON array in response");
    }
  } catch (error) {
    console.error("Error parsing connections JSON:", error);
    console.error("Raw response:", connectionsText);
    return { keyEvents, connections: [] };
  }
  
  return { keyEvents, connections };
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
  
  output += "## KEY EVENTS\n\n";
  for (const event of data.keyEvents) {
    output += `### ${event.id}. ${event.title} (Importance: ${event.importance}/10)\n`;
    output += `${event.description}\n`;
    if (event.timestamp) {
      output += `Timestamp: ${event.timestamp}\n`;
    }
    output += "\n";
  }
  
  output += "## CONNECTIONS & CONTINUITY\n\n";
  for (const connection of data.connections) {
    const sourceEvent = data.keyEvents.find(e => e.id === connection.sourceEventId);
    const targetEvent = data.keyEvents.find(e => e.id === connection.targetEventId);
    
    if (sourceEvent && targetEvent) {
      output += `### ${sourceEvent.title} ${connection.relationship} ${targetEvent.title}\n`;
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
export type { StoryboardData, KeyEvent, EventConnection };
