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

The user wants to learn about: "${topicTitle}"

IMPORTANT: Your response must be SPECIFIC to "${topicTitle}". Do not generate generic content.

If "${topicTitle}" contains an obvious spelling mistake of a well-known term (e.g. "Quantim Computing"), correct it in the "title" field. Do NOT change the subject or rephrase a title that's already spelled correctly, even if unusual or niche -- only fix clear typos.

Provide a quick educational overview in this EXACT JSON format:
{
  "title": "The corrected, properly-capitalized topic title (same as input unless it has an obvious typo)",
  "description": "One compelling sentence specifically about what ${topicTitle} is and why it matters",
  "category": "Specific category like Marketing, Physics, Programming, Finance, Psychology",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "estimatedMinutes": number (15-45),
  "keyPoints": [
    "3-5 specific first principles about ${topicTitle} - be concrete and specific"
  ]
}

Rules:
1. Description must specifically mention ${topicTitle}
2. Key points must be about ${topicTitle}, not generic learning advice
3. Return ONLY valid JSON, no markdown, no explanation

Example for "Marketing":
{
  "title": "Marketing",
  "description": "Marketing is the strategic process of understanding customer needs and creating value propositions that connect products with the right audiences.",
  "category": "Business",
  "difficulty": "beginner",
  "estimatedMinutes": 25,
  "keyPoints": [
    "Customer segmentation identifies distinct groups with specific needs",
    "Value proposition communicates unique benefits better than alternatives",
    "Marketing channels are selected based on where target audiences spend attention",
    "Brand positioning creates mental associations that drive preference",
    "Metrics and analytics measure campaign effectiveness and ROI"
  ]
}`;

  const result = await quickModel.generateContent(prompt);
  const text = result.response.text();
  
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse quick topic response");
  }
  
  const parsed = JSON.parse(jsonMatch[0]);

  // Validate the response is about the right topic. Check against both the
  // raw input and whatever (possibly typo-corrected) title the model
  // returned -- a corrected "Quantim" -> "Quantum" response won't literally
  // contain the misspelled input anywhere, which is expected, not a failure.
  const lowerTitle = topicTitle.toLowerCase();
  const lowerReturnedTitle = (parsed.title || "").toLowerCase();
  const lowerDesc = (parsed.description || "").toLowerCase();
  const lowerPoints = (parsed.keyPoints || []).join(" ").toLowerCase();

  const isRelevant =
    lowerDesc.includes(lowerTitle) ||
    lowerPoints.includes(lowerTitle) ||
    lowerDesc.includes(lowerReturnedTitle) ||
    lowerPoints.includes(lowerReturnedTitle) ||
    lowerReturnedTitle === lowerTitle;

  if (!isRelevant) {
    // Force the title and regenerate key points
    parsed.title = topicTitle;
    parsed.keyPoints = [
      `Understanding the core concepts of ${topicTitle}`,
      `Key principles that define ${topicTitle}`,
      `Practical applications of ${topicTitle}`,
      `Common misconceptions about ${topicTitle}`,
      `How ${topicTitle} relates to real-world scenarios`
    ];
  }
  
  return parsed;
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
