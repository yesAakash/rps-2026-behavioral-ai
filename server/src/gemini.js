const { VertexAI } = require('@google-cloud/vertexai');
const { deterministicFallback, summarizeHistory } = require('./behavior');
const { MOVES } = require('./constants');

// Configuration
const PROJECT_ID = process.env.GCP_PROJECT_ID;
const LOCATION = process.env.GCP_LOCATION || 'us-central1';
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

// Initialize Vertex AI Client
let model = null;
if (PROJECT_ID) {
    try {
        const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
        model = vertexAI.getGenerativeModel({ model: MODEL_NAME });
    } catch (e) {
        console.warn("Failed to initialize Vertex AI client:", e.message);
    }
} else {
    console.warn("GCP_PROJECT_ID not set. Vertex AI disabled.");
}

/**
 * Main function to get AI decision.
 * Wraps Vertex AI call with fallback logic.
 */
async function getAiDecision(context) {
  // 1. Fallback if client is missing
  if (!model) {
      return deterministicFallback(context.history);
  }

  const { history, stats, personality, difficulty } = context;
  const summary = summarizeHistory(history);
  
  const systemPrompt = `
    You are a Rock Paper Scissors AI.
    Context:
    - Personality: ${personality}
    - Difficulty: ${difficulty}
    - Stats: Wins ${stats.wins}, Losses ${stats.losses}
    - History: ${summary}
    
    Predict the player's NEXT move.
    Output STRICT JSON only (no markdown).
    
    Schema:
    {
      "predicted_player_move": "rock|paper|scissors",
      "prediction_confidence": 0-100,
      "player_style": "string",
      "explanation": "string",
      "coach_tip": "string"
    }
  `;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    });

    const response = result.response;
    if (!response.candidates || !response.candidates[0]) throw new Error("No candidates");
    
    const text = response.candidates[0].content.parts[0].text;
    const data = parseGeminiJson(text); // Use helper for safety
    
    // Validate structural integrity of response
    if (!Object.values(MOVES).includes(data.predicted_player_move)) {
        throw new Error("Invalid move predicted by AI");
    }

    return {
      predicted_player_move: data.predicted_player_move,
      prediction_confidence: data.prediction_confidence || 50,
      player_style: data.player_style || 'unknown',
      explanation: data.explanation || "I predicted your move.",
      coach_tip: data.coach_tip || "Keep playing!"
    };

  } catch (error) {
    console.error("Gemini/Vertex Error:", error.message);
    return deterministicFallback(history);
  }
}

/**
 * Helper to safely parse JSON from LLM output, handling Code Block fences.
 * Exported for testing.
 */
function parseGeminiJson(text) {
    if (!text) throw new Error("Empty response text");
    // Remove Markdown code blocks if present (common LLM behavior)
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
}

module.exports = { getAiDecision, parseGeminiJson };
