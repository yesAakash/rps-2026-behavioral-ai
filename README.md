# RPS 2026 – Behavioral AI

A modern Rock-Paper-Scissors web app that uses Google Vertex AI (Gemini) to analyze player patterns, predict moves, and adapt difficulty dynamically.

## Vertical & Persona
**Game + Behavioral Assistant**: The AI acts not just as an opponent, but as an analyzer that adapts its difficulty (probability of using the optimal counter vs random) based on player performance streaks.

## Google Services Used
- **Google Cloud Run**: Serverless deployment for the Node.js backend.
- **Vertex AI (Gemini 1.5 Flash)**: Generates behavioral analysis, prediction, and natural language explanations.
- **Service Account**: Used for secure, keyless authentication (ADC).

## Test Plan
This project uses `node:test` for lightweight, dependency-free unit testing.
Run tests: `cd server && npm test`

**Coverage:**
1. **Game Logic**: Verifies winner determination (Rock vs Scissors = Player, etc.) and counter-move logic.
2. **Validation**: Ensures API rejects invalid moves, large history arrays, and malformed stats.
3. **Difficulty Scaling**: Tests streak thresholds (2 wins -> Hard, 2 losses -> Easy).
4. **Vertex AI Integration**: Tests JSON parsing safety and ensures fallback logic triggers correctly when AI output is malformed or unavailable.

## How it Works
1. **Frontend**: Stores session history/stats in `localStorage`. Sends play data to backend.
2. **Backend (Node.js)**: 
   - Validates input.
   - Calculates **Difficulty** (Easy/Medium/Hard) based on win/loss streaks.
   - Calls **Vertex AI (Gemini 1.5 Flash)** to analyze history and predict the player's *next* move.
   - Decides whether to use the optimal counter-move or a random move based on the difficulty level.
3. **Response**: Returns the result, prediction, explanation, and a coach tip.

## Local Run
1. `cd server`
2. `npm install`
3. Set environment variable: `export GCP_PROJECT_ID=your-project-id` (Needs ADC or Service Account locally)
4. `npm start`
5. Open `http://localhost:8080`

## Deployment (Cloud Run)
1. Build container:
   `docker build -t rps-2026 .`
2. Deploy (ensure you have authenticated with gcloud):
   `gcloud run deploy rps-2026 --source . --region us-central1 --allow-unauthenticated --set-env-vars GCP_PROJECT_ID=your-project-id`

## Assumptions
- The Google Cloud Project has Vertex AI API enabled.
- The Cloud Run Service Account has `Vertex AI User` role.
