import { GoogleGenAI, Type } from "@google/genai";
import type { Principle } from "@shared/schema";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

interface GeneratedPrinciple {
  title: string;
  explanation: string;
  analogy: string;
  visualType: string;
  visualData: any;
  keyTakeaways: string[];
}

interface TopicContent {
  description: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  principles: GeneratedPrinciple[];
}

export async function generateTopicContent(topicTitle: string): Promise<TopicContent> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `You are an expert educator who teaches using first principles thinking. 
    
Break down the topic "${topicTitle}" into its fundamental first principles. 

For each principle:
1. Start with the most basic, foundational concept
2. Build up to more complex ideas
3. Use real-world analogies to make abstract concepts tangible
4. Include key takeaways

Return a JSON object with this structure:
{
  "description": "A compelling 1-2 sentence description of what the learner will understand",
  "category": "The broad category (e.g., Physics, Business, Technology, Philosophy)",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "estimatedMinutes": number (typically 20-60),
  "principles": [
    {
      "title": "The name of this principle",
      "explanation": "A clear, thorough explanation (2-3 paragraphs) that builds understanding from scratch",
      "analogy": "A relatable real-world analogy that makes this concept click",
      "visualType": "diagram" | "flowchart" | "comparison" | "timeline",
      "visualData": { "type": "...", "description": "Description for the visual" },
      "keyTakeaways": ["Key point 1", "Key point 2", "Key point 3"]
    }
  ]
}

Include 4-6 principles, ordered from most fundamental to more advanced. Each principle should build on the previous ones.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          category: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          estimatedMinutes: { type: Type.INTEGER },
          principles: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                explanation: { type: Type.STRING },
                analogy: { type: Type.STRING },
                visualType: { type: Type.STRING },
                visualData: { type: Type.OBJECT },
                keyTakeaways: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["title", "explanation", "analogy", "keyTakeaways"]
            }
          }
        },
        required: ["description", "category", "difficulty", "estimatedMinutes", "principles"]
      }
    }
  });

  return JSON.parse(response.text || "{}") as TopicContent;
}

interface GeneratedQuestion {
  principleId?: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export async function generateQuizQuestions(
  topicTitle: string, 
  principles: Principle[]
): Promise<GeneratedQuestion[]> {
  const principlesSummary = principles.map((p, i) => 
    `${i + 1}. "${p.title}": ${p.explanation.substring(0, 200)}...`
  ).join('\n');

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `You are creating a quiz to test understanding of "${topicTitle}" based on first principles.

The topic covers these principles:
${principlesSummary}

Create 5 multiple-choice questions that test deep understanding (not just memorization).

Each question should:
1. Test understanding of a fundamental principle
2. Include 4 answer options (A, B, C, D)
3. Have exactly one correct answer
4. Include an explanation of why the correct answer is right

Return a JSON array of questions with this structure:
[
  {
    "principleIndex": 0-based index of which principle this tests,
    "questionText": "The question",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0-3 (index of correct option),
    "explanation": "Why this is the correct answer and what it demonstrates about the principle"
  }
]`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            principleIndex: { type: Type.INTEGER },
            questionText: { type: Type.STRING },
            options: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            correctAnswer: { type: Type.INTEGER },
            explanation: { type: Type.STRING }
          },
          required: ["questionText", "options", "correctAnswer", "explanation"]
        }
      }
    }
  });

  const rawQuestions = JSON.parse(response.text || "[]");
  
  return rawQuestions.map((q: any) => ({
    principleId: principles[q.principleIndex]?.id,
    questionText: q.questionText,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
  }));
}
