import { GoogleGenAI } from "@google/genai";
import { DataPoint, Athlete } from "../types";

export class GeminiService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    // In a real app, manage this key securely or prompt user
    if (process.env.API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
  }

  public hasKey(): boolean {
    return !!process.env.API_KEY;
  }

  public async analyzeRun(athlete: Athlete, data: DataPoint[]): Promise<string> {
    if (!this.ai) {
      return "API Key not configured. Cannot generate AI analysis.";
    }

    // Downsample data for prompt size efficiency (take every 5th point or approx 50 points max)
    const step = Math.max(1, Math.floor(data.length / 50));
    const sampledData = data.filter((_, index) => index % step === 0).map(p => ({
      t: p.timestamp / 1000, // seconds
      s: p.speed.toFixed(2), // m/s
      d: p.distance.toFixed(1) // meters
    }));

    const prompt = `
      You are an elite sprint coach. Analyze the following sprint data for athlete ${athlete.name}.
      
      Data Format: JSON Array of {t: time(s), s: speed(m/s), d: distance(m)}.
      Data: ${JSON.stringify(sampledData)}

      Please provide a concise analysis in 3 bullet points:
      1. Acceleration Phase: How quickly did they reach peak velocity?
      2. Max Velocity: What was the top speed and was it maintained?
      3. Speed Endurance/Deceleration: Did they slow down significantly at the end?
      
      End with 1 specific actionable drill to improve.
      Keep the tone encouraging but professional.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text || "No analysis generated.";
    } catch (error) {
      console.error("Gemini Analysis Failed:", error);
      return "Failed to generate analysis. Please check internet connection.";
    }
  }
}

export const geminiService = new GeminiService();