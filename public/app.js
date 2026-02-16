// State Management
const STATE_KEY = 'rps_2026_state';
let gameState = {
    history: [],
    stats: { wins: 0, losses: 0, draws: 0, winStreak: 0, loseStreak: 0 },
    personality: 'Friendly',
    totalRounds: 0
};

// Initialization
function init() {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) {
        gameState = JSON.parse(saved);
        // Reset streaks/history on reload is optional, keeping persistence for behavior analysis
        updateUI();
        document.getElementById('personality').value = gameState.personality;
    }
}

// Global Handlers
window.updatePersonality = () => {
    gameState.personality = document.getElementById('personality').value;
    saveState();
};

window.resetGame = () => {
    if(confirm("Clear all neural data?")) {
        localStorage.removeItem(STATE_KEY);
        location.reload();
    }
};

window.play = async (playerMove) => {
    // UI Loading State
    const buttons = document.querySelectorAll('.choice-btn');
    buttons.forEach(b => b.disabled = true);
    
    document.getElementById('result-card').classList.add('hidden');
    const predArea = document.getElementById('prediction-text');
    predArea.classList.remove('hidden');
    predArea.innerHTML = `NEURAL NET THINKING...`;

    try {
        // Prepare Payload
        const payload = {
            playerMove,
            history: gameState.history.slice(0, 40), // Send last 40 rounds
            stats: gameState.stats,
            personality: gameState.personality
        };

        // Call Backend
        const response = await fetch('/api/play', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();

        // Update State
        updateStats(data.winner);
        addToHistory(playerMove, data.ai_move, data.winner);
        saveState();

        // Reveal
        revealResult(playerMove, data);

    } catch (error) {
        console.error('Game Error:', error);
        alert('Connection to Neural Core failed. Please try again.');
        predArea.classList.add('hidden');
    } finally {
        buttons.forEach(b => b.disabled = false);
    }
};

function updateStats(winner) {
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
        // Streaks usually break on draw, or maintain. Let's maintain.
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
    document.getElementById('score-wins').textContent = gameState.stats.wins;
    document.getElementById('score-losses').textContent = gameState.stats.losses;
}

function revealResult(pMove, data) {
    updateUI();
    
    // Prediction Text
    const predEl = document.getElementById('prediction-text');
    predEl.innerHTML = `PREDICTED: <span class="glow-text">${data.predicted_player_move.toUpperCase()}</span> <span class="confidence-pill">${data.prediction_confidence}% CONF</span>`;

    // Difficulty Badge
    const badge = document.getElementById('difficulty-badge');
    badge.textContent = data.difficulty_level.toUpperCase();
    badge.className = `badge ${data.difficulty_level}`;

    // Result Card
    const card = document.getElementById('result-card');
    card.classList.remove('hidden');
    
    const title = document.getElementById('result-title');
    if (data.winner === 'player') {
        title.textContent = "YOU WON";
        title.style.color = "var(--success)";
    } else if (data.winner === 'ai') {
        title.textContent = "AI WINS";
        title.style.color = "var(--danger)";
    } else {
        title.textContent = "DRAW";
        title.style.color = "white";
    }

    document.getElementById('res-player').textContent = getEmoji(pMove);
    document.getElementById('res-ai').textContent = getEmoji(data.ai_move);
    document.getElementById('ai-explanation').textContent = data.explanation;
    document.getElementById('style-label').textContent = data.player_style.toUpperCase().replace('-', ' ');

    const coachTip = document.getElementById('coach-tip');
    if (data.coach_tip) {
        coachTip.classList.remove('hidden');
        document.getElementById('tip-text').textContent = data.coach_tip;
    } else {
        coachTip.classList.add('hidden');
    }
}

function getEmoji(move) {
    if (move === 'rock') return '🪨';
    if (move === 'paper') return '📄';
    return '✂️';
}

init();
