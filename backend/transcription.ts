// To run this code you need to install the following dependencies:
// bun add @google/genai mime fluent-ffmpeg readline-sync
// bun add -d @types/fluent-ffmpeg @types/readline-sync

import {
    GoogleGenAI,
    Type,
  } from '@google/genai';
import * as fs from 'node:fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import * as readline from 'readline-sync';

// Function to get the next available file number
function getNextFileNumber(): number {
  let fileNumber = 1;
  
  while (true) {
    if (!fs.existsSync(`translated_output_${fileNumber}.txt`)) {
      // File does not exist, we can use this number
      return fileNumber;
    }
    fileNumber++;
  }
}

// Function to get audio duration in seconds
function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}

// Function to split audio into up to maxChunks chunks
async function splitAudioIntoChunks(
  filePath: string, 
  chunkDurationSec: number,
  maxChunks?: number
): Promise<string[]> {
  const outputDir = path.join(path.dirname(filePath), 'chunks');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  
  const totalDuration = await getAudioDuration(filePath);
  const totalPossibleChunks = Math.ceil(totalDuration / chunkDurationSec);
  const chunksToCreate = maxChunks ? Math.min(maxChunks, totalPossibleChunks) : totalPossibleChunks;
  const outputFiles: string[] = [];
  
  console.log(`Creating ${chunksToCreate} chunks of ${chunkDurationSec/60} minutes each...`);
  
  for (let i = 0; i < chunksToCreate; i++) {
    const startTime = i * chunkDurationSec;
    const outputFile = path.join(outputDir, `chunk_${i + 1}.mp3`);
    outputFiles.push(outputFile);
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(filePath)
        .setStartTime(startTime)
        .setDuration(chunkDurationSec)
        .output(outputFile)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
    console.log(`Created chunk ${i+1}/${chunksToCreate}`);
  }
  
  return outputFiles;
}

// Function to transcribe a single chunk
async function transcribeChunk(
  ai: GoogleGenAI, 
  filePath: string, 
  chunkNumber: number,
  outputFilePath: string
): Promise<void> {
  console.log(`Processing chunk ${chunkNumber}...`);
  
  let file;
  try {
    file = await ai.files.upload({file: filePath});
    if (!file || !file.uri || !file.mimeType) {
      throw new Error("File upload failed or missing URI/MIME type");
    }
  } catch (error) {
    console.error(`Error uploading chunk ${chunkNumber}:`, error);
    return;
  }
  
  const config = {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      required: ["transcription_lines"],
      properties: {
        transcription_lines: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            required: ["line_number", "text"],
            properties: {
              line_number: {
                type: Type.INTEGER,
                description: "Sequential number of the transcription line",
              },
              text: {
                type: Type.STRING,
                description: "English translation of the transcribed content",
              },
            },
          },
        },
      },
    },
  };
  
  const model = 'gemini-2.5-pro-exp-03-25';
  const contents = [
    {
      role: 'user',
      parts: [
        {
          fileData: {
            fileUri: file.uri as string,
            mimeType: file.mimeType as string,
          }
        },
        {
          text: `Transcribe the English translation of this audio chunk, include relevant speakers and ignore any non speaking/singing parts.`,
        },
      ],
    },
  ];

  try {
    // Use generateContent instead of generateContentStream
    const response = await ai.models.generateContent({
      model,
      config,
      contents,
    });
    
    // Process the complete response
    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response text received from API");
    }
    
    const jsonResponse = JSON.parse(responseText);
    
    if (jsonResponse && jsonResponse.transcription_lines) {
      // Remove line numbers from output
      const fileContent = jsonResponse.transcription_lines
        .map((line: { text: any; }) => line.text)
        .join('\n');
      
      // Append to a single output file with chunk header
      const header = `\n\n--- Chunk ${chunkNumber} ---\n`;
      fs.appendFileSync(outputFilePath, header + fileContent);
      console.log(`Transcription for chunk ${chunkNumber} appended to ${outputFilePath}`);
    }
  } catch (error) {
    console.error(`Error processing chunk ${chunkNumber}:`, error);
    // Append error information to the output file
    const errorHeader = `\n\n--- Chunk ${chunkNumber} (ERROR) ---\n`;
    fs.appendFileSync(outputFilePath, errorHeader + 
      `Error processing this chunk: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  const ai = new GoogleGenAI({
    apiKey: "AIzaSyAyjnzbr7D_WnzLcJtAV699gSRZiCp3NDc",
  });
  
  const audioFilePath = 'audio/1973 smuel matilda war.mp3';
  const chunkDurationSec = 300; // 5 minutes in seconds
  
  // Calculate total possible chunks without creating them
  console.log("Analyzing audio file...");
  const totalDuration = await getAudioDuration(audioFilePath);
  const totalPossibleChunks = Math.ceil(totalDuration / chunkDurationSec);
  console.log(`Audio can be split into ${totalPossibleChunks} chunks of 5 minutes each.`);
  
  // Ask user how many chunks to process BEFORE splitting
  console.log(`Total possible 5-minute chunks: ${totalPossibleChunks}`);
  const numChunksToProcess = readline.question(`How many chunks would you like to split and transcribe? (1-${totalPossibleChunks}): `);
  const chunksToProcess = Math.min(parseInt(numChunksToProcess), totalPossibleChunks);
  
  if (isNaN(chunksToProcess) || chunksToProcess <= 0) {
    console.error("Invalid input. Please enter a positive number.");
    return;
  }
  
  // Only split the number of chunks requested
  console.log(`Splitting audio into ${chunksToProcess} chunks...`);
  const chunkFiles = await splitAudioIntoChunks(audioFilePath, chunkDurationSec, chunksToProcess);
  
  // Create a single output file for all chunks
  const outputFilePath = `translated_output_${getNextFileNumber()}.txt`;
  console.log(`Writing all transcriptions to ${outputFilePath}`);
  
  // Process chunks sequentially to ensure proper ordering
  console.log(`Processing ${chunksToProcess} chunks...`);
  for (let i = 0; i < chunkFiles.length; i++) {
    await transcribeChunk(ai, chunkFiles[i]!, i + 1, outputFilePath);
  }
  
  console.log("All requested chunks have been processed!");
}

// Use Bun's error handling
main().catch(error => {
  console.error("Error in main process:", error);
  process.exit(1);
});
