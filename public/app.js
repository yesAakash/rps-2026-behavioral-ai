
// State Management
const STATE_KEY = 'rps_2026_state_v3';
let gameState = {
    history: [],
    stats: { wins: 0, losses: 0, draws: 0, winStreak: 0, loseStreak: 0 },
    personality: 'Coach',
};

// --- Sound System (Web Audio API) ---
const SoundSystem = {
    ctx: null,
    muted: false,

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    },

    playOscillator(freq, type, duration, startTime = 0, vol = 0.1) {
        if (this.muted || !this.ctx) return;
        
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
            
            gain.gain.setValueAtTime(vol, this.ctx.currentTime + startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + duration);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(this.ctx.currentTime + startTime);
            osc.stop(this.ctx.currentTime + startTime + duration);
        } catch (e) {
            console.warn("Audio play failed", e);
        }
    },

    // FX Presets
    playClick() {
        this.init();
        // Short high blip
        this.playOscillator(800, 'sine', 0.1, 0, 0.1);
    },

    playScan() {
        this.init();
        // Computing chirp
        this.playOscillator(1200, 'square', 0.05, 0, 0.02);
        this.playOscillator(1500, 'square', 0.05, 0.05, 0.02);
        this.playOscillator(800, 'square', 0.1, 0.1, 0.02);
    },

    playWin() {
        this.init();
        // Major Arpeggio (C Major)
        this.playOscillator(523.25, 'sine', 0.2, 0, 0.1); // C5
        this.playOscillator(659.25, 'sine', 0.2, 0.1, 0.1); // E5
        this.playOscillator(783.99, 'sine', 0.4, 0.2, 0.1); // G5
        this.playOscillator(1046.50, 'triangle', 0.6, 0.3, 0.08); // C6
    },

    playLoss() {
        this.init();
        // Dissonant descending
        this.playOscillator(392.00, 'sawtooth', 0.2, 0, 0.05); // G4
        this.playOscillator(370.00, 'sawtooth', 0.2, 0.15, 0.05); // F#4
        this.playOscillator(330.00, 'sawtooth', 0.5, 0.3, 0.05); // E4
    },

    playDraw() {
        this.init();
        // Flat double tone
        this.playOscillator(440, 'triangle', 0.15, 0, 0.08);
        this.playOscillator(440, 'triangle', 0.3, 0.2, 0.08);
    },
    
    playHover() {
        this.init();
        // Very subtle tick
        this.playOscillator(200, 'sine', 0.03, 0, 0.02);
    }
};

// Keyboard Accessibility
document.addEventListener('keydown', (e) => {
    // Ignore keys if focusing on inputs
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
    
    const key = e.key.toLowerCase();
    if (key === 'r') window.play('rock');
    if (key === 'p') window.play('paper');
    if (key === 's') window.play('scissors');
});

// Initialization
function init() {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) {
        try {
            gameState = JSON.parse(saved);
        } catch(e) { console.error("Save corrupted"); }
    }
    updateUI();
    const pSelect = document.getElementById('personality');
    if(pSelect && gameState.personality) pSelect.value = gameState.personality;

    // Attach hover sounds
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('mouseenter', () => SoundSystem.playHover());
    });
}

// Handlers
window.toggleSound = () => {
    const isMuted = SoundSystem.toggleMute();
    const btn = document.getElementById('btn-sound');
    if (btn) {
        btn.innerHTML = isMuted ? '<span class="icon">🔇</span> OFF' : '<span class="icon">🔊</span> ON';
        btn.classList.toggle('muted', isMuted);
    }
};

window.updatePersonality = () => {
    SoundSystem.playClick();
    const el = document.getElementById('personality');
    if (el) {
        gameState.personality = el.value;
        saveState();
    }
};

window.resetGame = () => {
    SoundSystem.playClick();
    if(confirm("Are you sure you want to reset all stats?")) {
        localStorage.removeItem(STATE_KEY);
        location.reload();
    }
};

window.play = async (playerMove) => {
    // Initialize Audio Context on user gesture if needed
    SoundSystem.playClick();
    SoundSystem.playScan(); // Start thinking sound

    const buttons = document.querySelectorAll('.choice-btn');
    buttons.forEach(b => b.disabled = true);
    
    const predStatus = document.getElementById('prediction-status');
    const predDetail = document.getElementById('prediction-detail');
    const aiDisplay = document.getElementById('ai-move-display');
    const resultCard = document.getElementById('result-card');

    if(resultCard) resultCard.classList.add('hidden');
    if(predStatus) predStatus.textContent = "Analysing behavioral patterns...";
    if(predDetail) predDetail.classList.add('hidden');
    if(aiDisplay) aiDisplay.innerHTML = '<span class="emoji">🔄</span>';
    
    try {
        const payload = {
            playerMove,
            history: gameState.history.slice(0, 40),
            stats: gameState.stats,
            personality: gameState.personality || 'Coach'
        };

        const response = await fetch('/api/play', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('API Error');
        const data = await response.json();

        updateStats(data.winner);
        addToHistory(playerMove, data.ai_move, data.winner);
        saveState();

        setTimeout(() => {
            revealResult(playerMove, data);
            buttons.forEach(b => b.disabled = false);
        }, 600);

    } catch (error) {
        console.error('Game Error:', error);
        if(predStatus) predStatus.textContent = "Connection Lost - Offline Mode";
        buttons.forEach(b => b.disabled = false);
    }
};

function updateStats(winner) {
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
}

function addToHistory(pMove, aiMove, winner) {
    gameState.history.unshift({ player: pMove, ai: aiMove, winner });
    if (gameState.history.length > 50) gameState.history.pop();
}

function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify(gameState));
}

function updateUI() {
    setText('score-wins', gameState.stats.wins);
    setText('score-losses', gameState.stats.losses);
    setText('score-draws', gameState.stats.draws);
    
    const streakVal = gameState.stats.winStreak > 1 ? `Win ${gameState.stats.winStreak}` 
                    : (gameState.stats.loseStreak > 1 ? `Loss ${gameState.stats.loseStreak}` : '0');
    setText('streak-val', streakVal);
}

function setText(id, val) {
    const el = document.getElementById(id);
    if(el) el.textContent = val;
}

function revealResult(pMove, data) {
    updateUI();
    
    // Play sound based on result
    if (data.winner === 'player') SoundSystem.playWin();
    else if (data.winner === 'ai') SoundSystem.playLoss();
    else SoundSystem.playDraw();

    setText('prediction-status', `Predicted: ${capitalize(data.predicted_player_move)}`);
    setText('pred-conf', data.prediction_confidence);
    
    const detail = document.getElementById('prediction-detail');
    if(detail) detail.classList.remove('hidden');

    const badge = document.getElementById('difficulty-badge');
    if(badge) {
        badge.textContent = data.difficulty_level.toUpperCase();
        badge.className = `badge ${data.difficulty_level}`;
    }

    const aiDisplay = document.getElementById('ai-move-display');
    if(aiDisplay) aiDisplay.innerHTML = `<span class="emoji">${getEmoji(data.ai_move)}</span>`;

    const resultCard = document.getElementById('result-card');
    const resultTitle = document.getElementById('result-title');
    
    if(resultCard) resultCard.classList.remove('hidden');
    
    if(resultTitle) {
        if (data.winner === 'player') {
            resultTitle.textContent = "You Won!";
            resultTitle.className = "text-win";
        } else if (data.winner === 'ai') {
            resultTitle.textContent = "AI Wins";
            resultTitle.className = "text-lose";
        } else {
            resultTitle.textContent = "Draw!";
            resultTitle.className = "text-draw";
        }
    }

    setText('ai-explanation', data.explanation);
    
    const styleVal = document.getElementById('style-val');
    if(styleVal) styleVal.textContent = data.player_style.toUpperCase().replace('-', ' ');

    const tipContainer = document.getElementById('coach-tip-container');
    if (tipContainer) {
        if (data.coach_tip) {
            tipContainer.classList.remove('hidden');
            setText('coach-tip-text', data.coach_tip);
        } else {
            tipContainer.classList.add('hidden');
        }
    }
}

function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }
function getEmoji(move) {
    if (move === 'rock') return '🪨';
    if (move === 'paper') return '✋';
    return '✌️';
}

init();
