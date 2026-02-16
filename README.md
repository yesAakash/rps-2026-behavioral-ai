# RPS 2026 – Behavioral AI

A modern Rock-Paper-Scissors web app that uses Google Vertex AI (Gemini) to analyze player patterns, predict moves, and adapt difficulty dynamically.

## Vertical & Persona
**Game + Behavioral Assistant**: The AI acts not just as an opponent, but as an analyzer that adapts its difficulty (probability of using the optimal counter vs random) based on player performance streaks.

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

## Tests
Run unit tests for logic and validation:
`cd server && npm test`

## Deployment (Cloud Run)
1. Build container:
   `docker build -t rps-2026 .`
2. Deploy (ensure you have authenticated with gcloud):
   `gcloud run deploy rps-2026 --source . --region us-central1 --allow-unauthenticated --set-env-vars GCP_PROJECT_ID=your-project-id`

## Assumptions
- The Google Cloud Project has Vertex AI API enabled.
- The Cloud Run Service Account has `Vertex AI User` role.
