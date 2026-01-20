
import { GoogleGenAI, Type } from "@google/genai";
import { Ticket } from "../types";

// Note: Initialization is moved inside functions to ensure the most recent API key is used.

export const suggestTasks = async (projectGoal: string): Promise<Partial<Ticket>[]> => {
  // Always initialize GoogleGenAI inside the function call.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      // Using gemini-3-pro-preview for complex reasoning task (WBS generation).
      model: 'gemini-3-pro-preview',
      contents: `プロジェクト目標: "${projectGoal}" に基づいて、必要なWBS（作業分解構成図）のタスクリストをJSON形式で提案してください。
      Redmineのチケット形式に合わせてください。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING, description: "タスクのタイトル" },
              description: { type: Type.STRING, description: "詳細内容" },
              estimatedHours: { type: Type.NUMBER, description: "予想工数(時間)" },
              priority: { type: Type.STRING, enum: ["Low", "Normal", "High", "Urgent"] }
            },
            required: ["subject", "estimatedHours", "priority"]
          }
        }
      }
    });

    // Directly access the .text property of GenerateContentResponse.
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
};

export const optimizeSchedule = async (tickets: Ticket[]): Promise<Ticket[]> => {
  // Always initialize GoogleGenAI inside the function call.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      // Using gemini-3-pro-preview for schedule optimization which involves dependency analysis.
      model: 'gemini-3-pro-preview',
      contents: `以下のタスクリストを分析し、依存関係や工数を考慮して最適な開始日と期日を再設定してください。
      JSON形式で、各タスクのIDとその新しい日付（startDate, dueDate）を返してください。
      
      タスクデータ: ${JSON.stringify(tickets)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              startDate: { type: Type.STRING, description: "YYYY-MM-DD" },
              dueDate: { type: Type.STRING, description: "YYYY-MM-DD" }
            },
            required: ["id", "startDate", "dueDate"]
          }
        }
      }
    });

    // Directly access the .text property of GenerateContentResponse.
    const optimizedData = JSON.parse(response.text || '[]');
    return tickets.map(t => {
      const match = optimizedData.find((opt: any) => opt.id === t.id);
      return match ? { ...t, startDate: match.startDate, dueDate: match.dueDate } : t;
    });
  } catch (error) {
    console.error("Gemini Optimization Error:", error);
    return tickets;
  }
};
