
import { GoogleGenAI, Type } from "@google/genai";
import { Board } from "../types";

export const getHintFromGemini = async (board: Board, minesRemaining: number): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  // Condense board state to save tokens
  const simplifiedBoard = board.map(row => 
    row.map(c => {
      if (c.isRevealed) return c.neighborCount.toString();
      if (c.isFlagged) return 'F';
      return '?';
    }).join('')
  ).join('\n');

  const prompt = `
    Analyze this Minesweeper board. '?' is hidden, 'F' is flagged, numbers are neighbor mine counts.
    Total mines remaining: ${minesRemaining}
    Board:
    ${simplifiedBoard}
    
    Give a concise, strategic tip for the next move or a general logical deduction. Keep it under 2 sentences.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "AI currently unavailable. Use your logic!";
  } catch (error) {
    console.error("Gemini Hint Error:", error);
    return "Error contacting Gemini. Please try again later.";
  }
};
