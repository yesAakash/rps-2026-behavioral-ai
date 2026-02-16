const { VertexAI } = require('@google-cloud/vertexai');
const { deterministicFallback, summarizeHistory } = require('./behavior');
const { getCounterMove, getRandomMove } = require('./game');

// Initialize Vertex AI
const project = process.env.GCP_PROJECT_ID || 'your-project-id';
const location = 'us-central1';
const vertexAI = new VertexAI({ project: project, location: location });

// Using Flash for speed/cost efficiency
const model = vertexAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function getAiDecision(context) {
  const { history, stats, personality, difficulty } = context;

  const summary = summarizeHistory(history);
  
  const systemPrompt = `
    You are a Rock Paper Scissors game AI. 
    Your goal: Predict the player's NEXT move based on history and provide a JSON response.
    
    Personality: ${personality} (Adjust explanation tone).
    Current Stats: Player Wins ${stats.wins}, Losses ${stats.losses}.
    History: ${summary}

    Return strict JSON:
    {
      "predicted_player_move": "rock|paper|scissors",
      "prediction_confidence": number (0-100),
      "player_style": "pattern|rock-biased|paper-biased|scissors-biased|reactive-to-loss|random",
      "explanation": "short explanation 1 sentence",
      "coach_tip": "short improvement tip"
    }
  `;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    });

    const response = result.response;
    const text = response.candidates[0].content.parts[0].text;
    
    // Parse JSON
    const data = JSON.parse(text);
    
    // Validate AI didn't hallucinate invalid moves
    if (!['rock','paper','scissors'].includes(data.predicted_player_move)) {
        throw new Error("Invalid move predicted");
    }

    return {
      predicted_player_move: data.predicted_player_move,
      prediction_confidence: data.prediction_confidence || 50,
      player_style: data.player_style || 'unknown',
      explanation: data.explanation || "I predicted your move.",
      coach_tip: data.coach_tip || "Keep playing!"
    };

  } catch (error) {
    console.error("Gemini Error:", error.message);
    return deterministicFallback(history);
  }
}

module.exports = { getAiDecision };
