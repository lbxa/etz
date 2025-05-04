import { OpenAI } from "openai";
import fs from "fs";
import path from "path";

const DEFAULT_VOICES = ["voice1", "voice2", "voice3"] as const;
type Voice = typeof DEFAULT_VOICES[number];

// sk-proj-4p7QFdDo8kAofAWOoXU5T3BlbkFJ2qoqtBktM4wfYZv2C4o3

export class TTSConverter {
  private voice: Voice;
  private client: OpenAI;

  constructor(voice?: Voice, apiClient?: OpenAI) {
    this.voice = voice ?? DEFAULT_VOICES[
      Math.floor(Math.random() * DEFAULT_VOICES.length)
    ];
    this.client = apiClient ?? new OpenAI();
  }

  async textToSpeech(text: string, outPath: string): Promise<void> {
    try {
      const res = await this.client.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: this.voice,
        input: text,
        instructions: "Speak in a conversational tone, like a podcast.",
        stream: true,
      });

      const writeStream = fs.createWriteStream(outPath);
      for await (const chunk of res) {
        writeStream.write(chunk);
      }
      writeStream.end();
      console.log(`Created ${path.basename(outPath)}`);
    } catch (e) {
      console.error(`Error creating ${path.basename(outPath)}:`, e);
    }
  }

  async processChunk(args: [string, [number, string]]): Promise<void> {
    const [outDir, [idx, text]] = args;
    const filePath = path.join(outDir, `${idx}.mp3`);
    console.log(`Processing chunk ${idx}`);
    await this.textToSpeech(text, filePath);
  }
}
