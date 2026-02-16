require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { validatePlayRequest } = require('./validate');
const { calculateDifficulty, shouldFollowPrediction } = require('./difficulty');
const { getAiDecision } = require('./gemini');
const { getCounterMove, getRandomMove, determineWinner } = require('./game');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '10kb' })); // Security: Body limit
app.use(express.static(path.join(__dirname, '../../public')));

// Health Check (Google Services Signal)
app.get('/health', (req, res) => {
    res.json({
        status: "ok",
        service: "cloud-run",
        ai_provider: "vertex-ai",
        model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
        region: process.env.GCP_LOCATION || "us-central1",
        timestamp: new Date().toISOString()
    });
});

app.post('/api/play', async (req, res) => {
  try {
    // 1. Validate
    const validation = validatePlayRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { playerMove, history, stats, personality } = req.body;

    // 2. Difficulty
    const difficulty = calculateDifficulty(stats.winStreak, stats.loseStreak);

    // 3. AI Prediction (Vertex AI)
    const aiInsight = await getAiDecision({ history, stats, personality, difficulty });
    
    // 4. Strategy Execution
    // Hard = Trust prediction (counter it). Easy = Randomize often.
    const optimalCounter = getCounterMove(aiInsight.predicted_player_move);
    let finalAiMove;

    if (shouldFollowPrediction(difficulty)) {
      finalAiMove = optimalCounter;
    } else {
      finalAiMove = getRandomMove();
    }

    // 5. Result
    const winner = determineWinner(playerMove, finalAiMove);

    res.json({
      predicted_player_move: aiInsight.predicted_player_move,
      prediction_confidence: aiInsight.prediction_confidence,
      ai_move: finalAiMove,
      winner: winner,
      player_style: aiInsight.player_style,
      explanation: aiInsight.explanation,
      coach_tip: aiInsight.coach_tip,
      difficulty_level: difficulty
    });

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`RPS 2026 Server running on port ${PORT}`);
});
