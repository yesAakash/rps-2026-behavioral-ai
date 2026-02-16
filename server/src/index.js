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
app.use(express.json({ limit: '10kb' })); // Security: Limit body size
app.use(express.static(path.join(__dirname, '../../public')));

app.post('/api/play', async (req, res) => {
  try {
    // 1. Validation
    const validation = validatePlayRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { playerMove, history, stats, personality } = req.body;

    // 2. Difficulty Calculation
    const difficulty = calculateDifficulty(stats.winStreak, stats.loseStreak);

    // 3. AI Prediction (Gemini)
    const aiInsight = await getAiDecision({ history, stats, personality, difficulty });
    
    // 4. Adaptive Logic
    // Based on difficulty, do we use the counter to the prediction, or random?
    const optimalMove = getCounterMove(aiInsight.predicted_player_move);
    let finalAiMove;

    if (shouldFollowPrediction(difficulty)) {
      finalAiMove = optimalMove;
    } else {
      // Intentionally play sub-optimally (randomly) to lower difficulty
      // OR if we want to simulate randomness regardless of prediction
      finalAiMove = getRandomMove();
      // If we accidentally picked the optimal move randomly, that's fine.
    }

    // 5. Determine Winner
    const winner = determineWinner(playerMove, finalAiMove);

    // 6. Response
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
    console.error("Server Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`RPS 2026 Server running on port ${PORT}`);
});
