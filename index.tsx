import { GoogleGenAI, Type } from "@google/genai";
import './styles.css';

// --- Types & Interfaces ---

interface Stats {
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  loseStreak: number;
}

interface HistoryItem {
  player: string;
  ai: string;
  winner: string;
}

interface GameState {
  history: HistoryItem[];
  stats: Stats;
  personality: string;
  onboardingAnswer: string | null;
  totalRounds: number;
  isVisionEnabled: boolean;
  lastRoundEndTime: number; // For reaction time calc
}

interface AiResponse {
  predicted_player_move: string;
  prediction_confidence: number;
  ai_move: string;
  player_style: string;
  emotional_state: string; // New: vision derived
  mind_game_event: string; // New: none|bluff|pressure|trap
  explanation: string;
  coach_tip: string;
}

// --- Configuration ---
const STATE_KEY = 'rps_2026_vision_state';
const MODEL_NAME = 'gemini-3-flash-preview';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Vision & Biometric Logic ---

class VisionAnalyzer {
  stream: MediaStream | null = null;
  videoEl: HTMLVideoElement | null = null;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  lastFrameData: Uint8ClampedArray | null = null;
  isAnalyzing: boolean = false;
  currentMovementScore: number = 0; // 0-100

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 100; // Low res for performance
    this.canvas.height = 75;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  async start(videoElementId: string) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      this.videoEl = document.getElementById(videoElementId) as HTMLVideoElement;
      if (this.videoEl) {
        this.videoEl.srcObject = this.stream;
        this.videoEl.play();
        this.isAnalyzing = true;
        this.loop();
      }
    } catch (e) {
      console.error("Camera access denied", e);
      alert("Camera access denied or unavailable. Vision Mode disabled.");
      throw e;
    }
  }

  stop() {
    this.isAnalyzing = false;
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.videoEl) this.videoEl.srcObject = null;
    this.currentMovementScore = 0;
  }

  loop = () => {
    if (!this.isAnalyzing || !this.videoEl || !this.ctx) return;

    // Draw video frame to small canvas
    this.ctx.drawImage(this.videoEl, 0, 0, this.canvas.width, this.canvas.height);
    const frame = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    // Calculate motion (diff from last frame)
    if (this.lastFrameData) {
      let diff = 0;
      const data = frame.data;
      const prev = this.lastFrameData;
      // Sampling pixels to save CPU
      for (let i = 0; i < data.length; i += 16) { 
        diff += Math.abs(data[i] - prev[i]); // R channel diff
      }
      // Normalize somewhat
      this.currentMovementScore = Math.min(100, Math.floor(diff / 500)); 
      this.updateHud();
    }

    this.lastFrameData = frame.data;
    requestAnimationFrame(this.loop);
  }

  getMetrics() {
    return {
      movement: this.currentMovementScore,
      // Simple heuristic: High movement = 'Agitated', Low = 'Calm'
      inferredEmotion: this.currentMovementScore > 20 ? 'Agitated' : 'Calm/Focused'
    };
  }

  updateHud() {
    const hudMove = document.getElementById('hud-movement');
    const hudEmot = document.getElementById('hud-emotion');
    if (hudMove) hudMove.textContent = `${this.currentMovementScore}%`;
    if (hudEmot) hudEmot.textContent = this.currentMovementScore > 20 ? "HIGH ACTIVITY" : "STABLE";
    
    // Visual flair on overlay
    const overlay = document.querySelector('.vision-overlay') as HTMLElement;
    if (overlay && this.currentMovementScore > 30) {
      overlay.style.boxShadow = `inset 0 0 ${this.currentMovementScore}px rgba(239, 68, 68, 0.3)`;
    } else if (overlay) {
        overlay.style.boxShadow = 'none';
    }
  }
}

const visionSystem = new VisionAnalyzer();


// --- "Server-Side" Logic (Simulated) ---

const GameServer = {
  validatePlayRequest: (body: any) => {
    const validMoves = ['rock', 'paper', 'scissors'];
    if (!body.playerMove || !validMoves.includes(body.playerMove)) {
      return { valid: false, error: "Invalid player move." };
    }
    return { valid: true };
  },

  determineWinner: (pMove: string, aiMove: string): 'player' | 'ai' | 'draw' => {
    if (pMove === aiMove) return 'draw';
    if (
      (pMove === 'rock' && aiMove === 'scissors') ||
      (pMove === 'paper' && aiMove === 'rock') ||
      (pMove === 'scissors' && aiMove === 'paper')
    ) {
      return 'player';
    }
    return 'ai';
  },

  getDifficultyLevel: (winStreak: number, loseStreak: number): 'easy' | 'medium' | 'hard' => {
    if (winStreak >= 2) return 'hard';
    if (loseStreak >= 2) return 'easy';
    return 'medium';
  },

  applyDifficultyStrategy: (difficulty: string, suggestedAiMove: string): string => {
    let predictionProbability = 0.7; // Medium
    if (difficulty === 'easy') predictionProbability = 0.4;
    if (difficulty === 'hard') predictionProbability = 0.9;

    const roll = Math.random();
    // If AI is confident, it uses the suggested counter. 
    // If we roll outside probability, we fallback to random.
    return roll < predictionProbability ? suggestedAiMove : ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
  },

  summarizeHistory: (history: HistoryItem[]): string => {
    if (history.length === 0) return "No history.";
    const counts: Record<string, number> = { rock: 0, paper: 0, scissors: 0 };
    history.forEach(h => {
      if (counts[h.player] !== undefined) counts[h.player]++;
    });
    return `Rounds: ${history.length}. R:${counts.rock}, P:${counts.paper}, S:${counts.scissors}. Last: ${history[0]?.player || 'N/A'}.`;
  },

  callGeminiAI: async (context: any): Promise<AiResponse> => {
    const { historySummary, lastMoves, stats, personality, difficulty, onboardingAnswer, biometric } = context;

    const systemPrompt = `You are a behavioral AI opponent using both move history and emotional context. You must adapt difficulty and generate dynamic mind-game events. Output strict JSON only.
    
    Inputs:
    - History & Stats: Use pattern matching.
    - Biometrics: 
      * Hesitation: <1000ms (Impulsive/Confident), >3000ms (Hesitant/Calculating).
      * Emotion: Agitated (likely to play randomly or repeat), Calm (likely to stick to strategy).
    
    Mind Games (Trigger occasionally based on context):
    - "bluff_round": Claim you predicted X when you predicted Y.
    - "confidence_trap": Use their confidence against them.
    - "psychological_pressure": Taunt a hesitation.
    - "none": Standard play.
    
    Output JSON Schema:
    {
      "predicted_player_move": "rock|paper|scissors",
      "prediction_confidence": integer (0-100),
      "ai_move": "rock|paper|scissors" (The move that BEATS the predicted move),
      "player_style": "pattern|bias|tilted|confident|random",
      "emotional_state": "calm|frustrated|excited|neutral",
      "mind_game_event": "none|bluff_round|psychological_pressure|confidence_trap",
      "explanation": "string (short, personality driven)",
      "coach_tip": "string (tactical advice)"
    }`;

    const userPrompt = `
    Context:
    - Mode: ${personality} | Difficulty: ${difficulty}
    - Player Intent: ${onboardingAnswer}
    - Stats: W${stats.wins}/L${stats.losses} Streak: W${stats.winStreak}/L${stats.loseStreak}
    - BIOMETRICS: Hesitation: ${biometric.hesitationMs}ms. Inferred Emotion: ${biometric.emotion}. Movement Score: ${biometric.movement}.
    - History: ${historySummary}
    - Last 5: ${JSON.stringify(lastMoves)}

    Analyze signals. Predict Next Move. Explain.
    `;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [
            { role: 'user', parts: [{ text: systemPrompt + "\n" + userPrompt }] }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              predicted_player_move: { type: Type.STRING, enum: ["rock", "paper", "scissors"] },
              prediction_confidence: { type: Type.INTEGER },
              ai_move: { type: Type.STRING, enum: ["rock", "paper", "scissors"] },
              player_style: { type: Type.STRING, enum: ["pattern", "rock-biased", "paper-biased", "scissors-biased", "reactive-to-loss", "random", "tilted", "confident"] },
              emotional_state: { type: Type.STRING, enum: ["calm", "frustrated", "excited", "neutral"] },
              mind_game_event: { type: Type.STRING, enum: ["none", "bluff_round", "psychological_pressure", "confidence_trap"] },
              explanation: { type: Type.STRING },
              coach_tip: { type: Type.STRING }
            },
            required: ["predicted_player_move", "prediction_confidence", "ai_move", "player_style", "emotional_state", "mind_game_event", "explanation", "coach_tip"]
          }
        }
      });

      const jsonStr = response.text;
      return JSON.parse(jsonStr) as AiResponse;

    } catch (error) {
      console.error("Gemini Error:", error);
      // Fallback
      return {
        predicted_player_move: 'rock',
        prediction_confidence: 0,
        ai_move: ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)],
        player_style: 'random',
        emotional_state: 'neutral',
        mind_game_event: 'none',
        explanation: "Signal interference detected. Switching to random protocol.",
        coach_tip: "Stay unpredictable."
      };
    }
  },

  processPlayRequest: async (payload: any) => {
    // 1. Validate
    const validation = GameServer.validatePlayRequest(payload);
    if (!validation.valid) throw new Error(validation.error);

    const { playerMove, history, stats, personality, onboardingAnswer, biometric } = payload;
    const difficulty = GameServer.getDifficultyLevel(stats.winStreak, stats.loseStreak);

    // 2. AI Analysis
    const historySummary = GameServer.summarizeHistory(history);
    const aiResult = await GameServer.callGeminiAI({
      historySummary,
      lastMoves: history.slice(0, 5),
      stats,
      personality,
      difficulty,
      onboardingAnswer,
      biometric
    });

    // 3. Logic & Difficulty
    const finalAiMove = GameServer.applyDifficultyStrategy(difficulty, aiResult.ai_move);
    const winner = GameServer.determineWinner(playerMove, finalAiMove);

    return {
      aiMove: finalAiMove,
      predictedPlayerMove: aiResult.predicted_player_move,
      confidence: aiResult.prediction_confidence,
      winner: winner,
      playerStyle: aiResult.player_style,
      emotionalState: aiResult.emotional_state,
      mindGameEvent: aiResult.mind_game_event,
      explanation: aiResult.explanation,
      coachTip: aiResult.coach_tip,
      difficulty: difficulty
    };
  }
};


// --- Client State & Logic ---

let gameState: GameState = {
  history: [],
  stats: { wins: 0, losses: 0, draws: 0, winStreak: 0, loseStreak: 0 },
  personality: 'Friendly',
  onboardingAnswer: null,
  totalRounds: 0,
  isVisionEnabled: false,
  lastRoundEndTime: Date.now()
};

// --- Initialization ---

function loadState() {
  const saved = localStorage.getItem(STATE_KEY);
  if (saved) {
    const loaded = JSON.parse(saved);
    gameState = { ...gameState, ...loaded, isVisionEnabled: false }; // Always reset vision on load
    updateUIStats();
    const pSelect = document.getElementById('personality') as HTMLSelectElement;
    if (pSelect) pSelect.value = gameState.personality;
  }

  const modal = document.getElementById('onboarding');
  if (modal && gameState.totalRounds < 1 && !gameState.onboardingAnswer) {
    modal.classList.remove('hidden');
  }
}

function saveState() {
  // Don't save transient UI state like isVisionEnabled
  const { isVisionEnabled, lastRoundEndTime, ...persistent } = gameState;
  localStorage.setItem(STATE_KEY, JSON.stringify(persistent));
}

// --- Global Handlers ---

declare global {
  interface Window {
    play: (move: string) => void;
    setStrategy: (answer: string) => void;
    updatePersonality: () => void;
    toggleVision: () => void;
    resetGame: () => void;
  }
}

window.setStrategy = (answer: string) => {
  gameState.onboardingAnswer = answer;
  document.getElementById('onboarding')?.classList.add('hidden');
  saveState();
};

window.updatePersonality = () => {
  const select = document.getElementById('personality') as HTMLSelectElement;
  gameState.personality = select.value;
  saveState();
};

window.resetGame = () => {
  if (confirm("Reset calibration?")) {
    localStorage.removeItem(STATE_KEY);
    location.reload();
  }
};

window.toggleVision = async () => {
  const btn = document.getElementById('btn-vision');
  const container = document.getElementById('vision-container');
  
  if (gameState.isVisionEnabled) {
    // Disable
    visionSystem.stop();
    gameState.isVisionEnabled = false;
    btn?.classList.remove('active');
    if (btn) btn.innerHTML = 'Enable Vision';
    container?.classList.add('hidden');
  } else {
    // Enable
    try {
      await visionSystem.start('webcam-feed');
      gameState.isVisionEnabled = true;
      btn?.classList.add('active');
      if (btn) btn.innerHTML = 'Vision Active';
      container?.classList.remove('hidden');
    } catch (e) {
      // Error handled in class
    }
  }
};

window.play = async (playerMove: string) => {
  // 1. Gather Biometrics BEFORE disabling UI
  const now = Date.now();
  const hesitationMs = now - gameState.lastRoundEndTime;
  const metrics = visionSystem.getMetrics();
  
  // 2. UI Update
  const buttons = document.querySelectorAll('.choice-btn');
  buttons.forEach(b => (b as HTMLButtonElement).disabled = true);
  
  document.getElementById('result-card')?.classList.add('hidden');
  document.getElementById('mind-game-banner')?.classList.add('hidden');
  const predText = document.getElementById('prediction-text');
  if (predText) {
    predText.classList.remove('hidden');
    predText.innerHTML = "Processing Neural Signals...";
  }

  try {
    // 3. API Call
    const minDelay = new Promise(resolve => setTimeout(resolve, 800)); // Sim network
    
    const payload = {
      playerMove,
      history: gameState.history.slice(0, 40),
      stats: gameState.stats,
      personality: gameState.personality,
      onboardingAnswer: gameState.onboardingAnswer,
      biometric: {
        hesitationMs,
        movement: metrics.movement,
        emotion: metrics.inferredEmotion
      }
    };

    const [data] = await Promise.all([
      GameServer.processPlayRequest(payload),
      minDelay
    ]);

    // 4. Update State
    updateLocalStats(playerMove, data.aiMove, data.winner);
    gameState.lastRoundEndTime = Date.now();

    // 5. Reveal
    revealResult(playerMove, data);

  } catch (err) {
    console.error(err);
    alert("System Overload. Try again.");
  } finally {
    buttons.forEach(b => (b as HTMLButtonElement).disabled = false);
  }
};

function updateLocalStats(pMove: string, aiMove: string, winner: string) {
  gameState.totalRounds++;
  if (winner === 'player') {
    gameState.stats.wins++;
    gameState.stats.winStreak++;
    gameState.stats.loseStreak = 0;
  } else if (winner === 'ai') {
    gameState.stats.losses++;
    gameState.stats.loseStreak++;
    gameState.stats.winStreak = 0;
  } else {
    gameState.stats.draws++;
  }
  gameState.history.unshift({ player: pMove, ai: aiMove, winner });
  if (gameState.history.length > 50) gameState.history.pop();
  saveState();
  updateUIStats();
}

function updateUIStats() {
  const winsEl = document.getElementById('score-wins');
  const lossesEl = document.getElementById('score-losses');
  if (winsEl) winsEl.textContent = gameState.stats.wins.toString();
  if (lossesEl) lossesEl.textContent = gameState.stats.losses.toString();
}

function revealResult(playerMove: string, data: any) {
  // 1. Prediction Text
  const predText = document.getElementById('prediction-text');
  if (predText) {
    predText.innerHTML = `Predicted: <span id="pred-move">${capitalize(data.predictedPlayerMove)}</span> (<span id="pred-conf">${data.confidence}</span>%)`;
  }

  // 2. Mind Game Banner
  if (data.mindGameEvent && data.mindGameEvent !== 'none') {
    const banner = document.getElementById('mind-game-banner');
    const bannerText = document.getElementById('mind-game-text');
    if (banner && bannerText) {
      banner.classList.remove('hidden');
      bannerText.textContent = `MIND GAME: ${data.mindGameEvent.replace(/_/g, ' ').toUpperCase()}`;
    }
  }

  // 3. Result Card
  const card = document.getElementById('result-card');
  if (card) card.classList.remove('hidden');

  const title = document.getElementById('result-title');
  if (title) {
    if (data.winner === 'player') {
      title.textContent = "YOU WON";
      title.style.color = 'var(--success)';
    } else if (data.winner === 'ai') {
      title.textContent = "AI WINS";
      title.style.color = 'var(--danger)';
    } else {
      title.textContent = "DRAW";
      title.style.color = 'white';
    }
  }

  document.getElementById('res-player')!.textContent = getEmoji(playerMove);
  document.getElementById('res-ai')!.textContent = getEmoji(data.aiMove);
  document.getElementById('ai-explanation')!.textContent = data.explanation;

  const styleLabel = document.getElementById('style-label');
  if (styleLabel) {
    // Show Style + Emotion
    styleLabel.innerHTML = `${data.playerStyle.toUpperCase()}<br><span style="color:var(--text-muted); font-size:0.7em">${data.emotionalState.toUpperCase()}</span>`;
  }

  const badge = document.getElementById('difficulty-badge');
  if (badge) {
    badge.textContent = data.difficulty.toUpperCase();
    badge.className = `badge ${data.difficulty}`;
  }

  const coachDiv = document.getElementById('coach-tip');
  const tipText = document.getElementById('tip-text');
  if (coachDiv && tipText && data.coachTip) {
    coachDiv.classList.remove('hidden');
    tipText.textContent = data.coachTip;
  }
}

function capitalize(str: string) { return str.charAt(0).toUpperCase() + str.slice(1); }
function getEmoji(move: string) {
  if (move === 'rock') return '🪨';
  if (move === 'paper') return '📄';
  return '✂️';
}

// Start
loadState();
