
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeFinancialData = async (summary: any) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the following financial data for our coaching center and provide 3 short actionable insights:
      Total Collection: ${summary.collection} BDT
      Total Expenses: ${summary.expenses} BDT
      Net Profit: ${summary.profit} BDT
      Active Students: ${summary.studentsCount}`,
      config: {
        systemInstruction: "You are a professional financial advisor for a coaching center. Provide concise, expert advice.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return ["Maintain higher collection rates by tracking dues.", "Monitor expenses closely this month.", "Consider early payment discounts."];
  }
};
