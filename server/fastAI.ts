import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "");

// Lightweight model for quick responses
const quickModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 1024,
  },
});

// Full model for detailed content
const fullModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 8192,
  },
});

interface QuickTopicResult {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  keyPoints: string[];
}

/**
 * Quick generation - Returns in ~2-3 seconds
 * Used for instant search results like Gemini
 */
export async function generateQuickTopic(topicTitle: string): Promise<QuickTopicResult> {
  const prompt = `You are BasicsTutor, an educational AI that explains topics using first principles.

Topic: "${topicTitle}"

Provide a quick educational overview in this JSON format:
{
  "title": "Clear topic title",
  "description": "One compelling sentence about what this topic is",
  "category": "Category like Science, Technology, Business, Arts",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "estimatedMinutes": number (15-45),
  "keyPoints": [
    "3-5 key first principles as short phrases"
  ]
}

Keep it concise and engaging. Return ONLY valid JSON.`;

  const result = await quickModel.generateContent(prompt);
  const text = result.response.text();
  
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse quick topic response");
  }
  
  return JSON.parse(jsonMatch[0]);
}

/**
 * Stream detailed content progressively
 * Sends updates as they're generated
 */
export async function* streamDetailedContent(topicTitle: string) {
  // First yield the quick result immediately
  const quickResult = await generateQuickTopic(topicTitle);
  yield { type: 'quick', data: quickResult };
  
  // Then generate detailed principles
  const principlesPrompt = `Topic: "${topicTitle}"

Break this down into 4-6 first principles. For each principle provide:
- Title
- Brief explanation (2-3 sentences)
- Real-world analogy
- 2-3 key takeaways

Return as JSON:
{
  "principles": [
    {
      "title": "...",
      "explanation": "...",
      "analogy": "...",
      "keyTakeaways": ["..."]
    }
  ]
}`;

  const principlesResult = await fullModel.generateContent(principlesPrompt);
  const principlesText = principlesResult.response.text();
  const principlesJson = principlesText.match(/\{[\s\S]*\}/);
  
  if (principlesJson) {
    yield { type: 'principles', data: JSON.parse(principlesJson[0]) };
  }
  
  // Finally generate mind map
  const mindMapPrompt = `Topic: "${topicTitle}"

Create a mind map structure with:
- Central topic node
- 4-6 principle nodes connected to topic
- 1-2 concept nodes connected to each principle

Return as JSON:
{
  "mindMap": {
    "nodes": [{"id": "...", "label": "...", "type": "topic|principle|concept"}],
    "edges": [{"source": "...", "target": "..."}]
  }
}`;

  const mindMapResult = await fullModel.generateContent(mindMapPrompt);
  const mindMapText = mindMapResult.response.text();
  const mindMapJson = mindMapText.match(/\{[\s\S]*\}/);
  
  if (mindMapJson) {
    yield { type: 'mindmap', data: JSON.parse(mindMapJson[0]) };
  }
}

/**
 * Legacy full generation (for background jobs)
 */
export async function generateFullTopic(topicTitle: string) {
  const prompt = `You are BasicsTutor... [full prompt]`;
  const result = await fullModel.generateContent(prompt);
  return result.response.text();
}
