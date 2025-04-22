Okay, here is a todo.md checklist based on the detailed steps outlined previously. This covers the implementation from setting up the project structure to the final end-to-end testing.

# Flashcard App - Project TODO Checklist

This checklist outlines the steps required to build the Flashcard application based on the provided specification and development plan. Mark items as complete as you progress.

## Phase 0: Project Setup & Configuration

-   [ ] Choose project structure (monorepo or separate folders for core, backend, frontend, extension).
-   [ ] Initialize Git repository.
-   [ ] Set up preferred IDE/editor configurations (ESLint, Prettier, etc.).

## Phase 1: Core Logic Module (TypeScript)

-   [ ] **Step 1: Core Types Definition**
    -   [ ] Create `src/core-logic/types.ts`.
    -   [ ] Define `Flashcard` class (with constructor, readonly properties).
    *   [ ] Define `AnswerDifficulty` enum.
    *   [ ] Define `BucketMap` type alias.
    *   [ ] Define `PracticeRecord` type alias.
    *   [ ] Define `History` type alias.
    *   [ ] Define `ComputeProgressResult` type alias.
    -   [ ] Add JSDoc comments.
    -   [ ] Export all types/enums/classes.
    -   [ ] Create placeholder test file (`types.test.ts`) with basic instantiation checks.
-   [ ] **Step 2: Core `getHint` Implementation & Test**
    -   [ ] Create `src/core-logic/functions.ts`.
    -   [ ] Implement `getHint` function signature and logic (validation, string processing).
    -   [ ] Export `getHint`.
    -   [ ] Create test file (`functions.test.ts`) using Jest/Vitest.
    -   [ ] Write unit tests covering all specified cases (0 letters, partial, full, multi-word, spaces, empty, invalid input).
-   [ ] **Step 3: Core `computeProgress` Implementation & Test**
    -   [ ] Add `computeProgress` function to `src/core-logic/functions.ts`.
    -   [ ] Implement function signature and logic (init result, process buckets, process history, optional message).
    -   [ ] Export `computeProgress`.
    -   [ ] Add unit tests to `functions.test.ts` covering specified cases (empty inputs, populated buckets/history, mixed).

## Phase 2: Backend Development (Node.js/Express/TypeScript/PostgreSQL)

-   [ ] **Step 4: Backend Project Setup**
    -   [ ] Initialize Node.js project (`npm init`).
    -   [ ] Install dependencies (`express`, `typescript`, `@types/*`, `ts-node-dev`, `dotenv`, `pg`, `@types/pg`, `node-pg-migrate`).
    -   [ ] Configure `tsconfig.json`.
    -   [ ] Create `src/server.ts` with basic Express app setup, port from `.env`, `express.json()` middleware.
    -   [ ] Implement `GET /` health check route (`{ "status": "OK" }`).
    -   [ ] Add `build`, `start`, `dev` scripts to `package.json`.
    -   [ ] Create `.env` and `.gitignore`.
    -   [ ] Verify server runs and `/` endpoint works.
-   [ ] **Step 5: PostgreSQL Integration & `flashcards` Table**
    -   [ ] Configure DB connection (`src/db/config.ts`, read from `.env`).
    -   [ ] Configure `node-pg-migrate` (scripts in `package.json`).
    -   [ ] Create migration `create_flashcards_table` (schema: `id`, `front`, `back`, `hint`, `tags`, `created_at`, enable `uuid-ossp`).
    -   [ ] Run `npm run migrate:up`.
    -   [ ] Verify `flashcards` table exists in DB.
    -   [ ] (Optional) Implement `GET /health/db` endpoint testing DB connection.
-   [ ] **Step 6: `POST /api/cards` - Basic Flashcard Creation & Test**
    -   [ ] Install testing dependencies (`supertest`, `jest`/`vitest`, `ts-jest`). Configure testing framework.
    -   [ ] Create API router (`src/routes/api.ts`) and mount in `server.ts`.
    -   [ ] Implement `POST /api/cards` endpoint:
        -   [ ] Accept JSON body (`front`, `back`, `hint?`, `tags?`).
        -   [ ] Validate `front`, `back` (return 400 on error).
        -   [ ] Use DB pool, execute parameterized INSERT into `flashcards`.
        -   [ ] Use `RETURNING *` to get created card data.
        -   [ ] Return 201 Created with card object.
        -   [ ] Add DB error handling (return 500).
    -   [ ] Write integration test (`api.test.ts`):
        -   [ ] Test successful creation (201, response body).
        -   [ ] Test validation errors (400).
        -   [ ] (Optional) Verify DB state using a test database.
-   [ ] **Step 7: `card_buckets` Table & Link to Card Creation & Test**
    -   [ ] Create migration `create_card_buckets_table` (schema: `card_id`, `bucket_number`, `updated_at`, `last_practiced_at`, FK, indexes).
    -   [ ] Run `npm run migrate:up`.
    -   [ ] Modify `POST /api/cards` logic:
        -   [ ] Use DB client and `BEGIN`/`COMMIT`/`ROLLBACK`.
        -   [ ] Insert into `flashcards`.
        -   [ ] Insert into `card_buckets` (`card_id`, `bucket_number=0`, `last_practiced_at=NULL`).
        -   [ ] Ensure atomicity and error handling.
    -   [ ] Update integration test for `POST /api/cards`:
        -   [ ] Verify record creation in *both* `flashcards` and `card_buckets`.
        -   [ ] (Optional) Test transaction rollback on simulated error.
-   [ ] **Step 8: `practice_history` Table**
    -   [ ] Create migration `create_practice_history_table` (schema: `id`, `card_id`, `practice_date`, `difficulty`, `previous_bucket`, `new_bucket`, FK, index).
    -   [ ] Run `npm run migrate:up`.
    -   [ ] Verify table structure in DB.
-   [ ] **Step 9: `GET /api/practice` - Fetching Due Cards & Test**
    -   [ ] Implement `GET /api/practice` endpoint:
        -   [ ] Join `flashcards` and `card_buckets`.
        -   [ ] Implement `WHERE` clause for SRS logic (bucket 0 + NULL OR due date calculation using `power(2, bucket_number)` and interval).
        -   [ ] Select required `flashcards` fields.
        -   [ ] Return 200 OK with array of cards (or `[]`).
        -   [ ] Add DB error handling (500).
    -   [ ] Write integration test:
        -   [ ] Seed test DB with cards in various states (new, due, not due across different buckets).
        -   [ ] Call endpoint and assert correct cards are returned.
-   [ ] **Step 10: `POST /api/practice/results` - Updating Card State & Test**
    -   [ ] Implement `POST /api/practice/results` endpoint:
        -   [ ] Accept JSON body (`cardId`, `difficulty`).
        -   [ ] Validate input (UUID format, difficulty 0/1/2) -> 400 error.
        -   [ ] Use DB client and transaction.
        -   [ ] Fetch current `bucket_number` from `card_buckets` -> 404 error if not found.
        -   [ ] Calculate `newBucket` based on `difficulty`.
        -   [ ] INSERT into `practice_history` (all fields).
        -   [ ] UPDATE `card_buckets` (`bucket_number`, `last_practiced_at`, `updated_at`).
        -   [ ] Commit transaction.
        -   [ ] Return 200 OK with `{ newBucketNumber: ... }`.
        -   [ ] Add DB error handling (500, rollback).
    -   [ ] Write integration test:
        -   [ ] Seed test card.
        -   [ ] Test each difficulty (Easy, Hard, Wrong), assert 200 response and correct `newBucketNumber`.
        -   [ ] Verify DB state changes (`card_buckets` update, `practice_history` insert).
        -   [ ] Test error cases (400, 404).
        -   [ ] (Optional) Test transactionality.

## Phase 3: Frontend Development (HTML/CSS/TypeScript)

-   [ ] **Step 11: Frontend Project Setup**
    -   [ ] Create `frontend/` directory.
    -   [ ] Initialize project (e.g., Vite `vanilla-ts`).
    -   [ ] Create `index.html`, `src/main.ts`, `src/style.css`.
    -   [ ] Set up `dev`/`build` scripts in `package.json`.
    -   [ ] Configure `tsconfig.json` for browser environment.
    -   [ ] Verify basic page loads via dev server.
-   [ ] **Step 12: Frontend Card Creation Form UI**
    -   [ ] Add card creation section and `<form id="create-card-form">` to `index.html`.
    -   [ ] Add inputs/textareas (`#card-front`, `#card-back`, `#card-hint`, `#card-tags`) with labels.
    -   [ ] Add submit button.
    -   [ ] Add basic CSS for form layout/usability.
-   [ ] **Step 13: Frontend Card Creation Logic**
    -   [ ] In `main.ts`, get form/input references.
    -   [ ] Add `submit` event listener to form.
    -   [ ] Implement listener logic:
        -   [ ] `preventDefault()`.
        -   [ ] Get input values (parse tags string to array).
        -   [ ] Construct request body.
        -   [ ] Use `fetch` to `POST` to `/api/cards` (handle backend URL).
        -   [ ] Handle success (201): show message, clear form.
        -   [ ] Handle error: show error message.
        -   [ ] Add network error handling.
    -   [ ] (Optional) Add status message element (`#form-status`) in HTML and update TS to use it.
    -   [ ] Test creating a card via UI -> Verify DB update & UI feedback.
-   [ ] **Step 14: Frontend Practice View Structure**
    -   [ ] Add practice section (`#practice-section`, initially hidden) to `index.html`.
    -   [ ] Add elements: `#start-practice-btn`, `#card-display` (`#card-front-text`, `#card-back-text`, `#card-hint-display`), control buttons (`#show-answer-btn`, `#hint-btn`, `.feedback-btn`), `#practice-message`, (optional `#webcam-container`).
    -   [ ] Add basic CSS, ensure initially hidden elements are hidden.
-   [ ] **Step 15: Frontend Fetch & Display Practice Card**
    -   [ ] In `main.ts`, get practice element references.
    -   [ ] Add state variables (`practiceCards`, `currentCardIndex`).
    -   [ ] Add listener to `#start-practice-btn`.
    -   [ ] Implement listener logic:
        -   [ ] Show practice section, display "Loading...".
        -   [ ] `fetch` GET `/api/practice`.
        -   [ ] On success (cards): store cards, set index, call `displayCurrentCard()`, show controls.
        -   [ ] On success (no cards): show "No cards due".
        -   [ ] On error: show error message.
    -   [ ] Implement `displayCurrentCard()` function: display front, clear back/hint, reset button states.
    -   [ ] Test starting practice -> Verify API call, first card display or "No cards due" message.
-   [ ] **Step 16: Frontend Show Answer, Hint Logic & Next Card (Button Prep)**
    -   [ ] Ensure core logic (`Flashcard` type, `getHint` function) is available/imported in frontend.
    -   [ ] Add `lettersToReveal` state variable, reset in `displayCurrentCard()`.
    -   [ ] Add listener to `#show-answer-btn`: reveal back text, hide self, show feedback buttons.
    -   [ ] Add listener to `#hint-btn`: increment `lettersToReveal`, call `getHint`, display result.
    -   [ ] Modify `displayCurrentCard()` to reset hint display and `lettersToReveal`.
    -   [ ] Test Show Answer and Hint buttons work correctly.
-   [ ] **Step 17: Frontend Practice Loop (Buttons)**
    -   [ ] Define `handleFeedback(difficulty)` function.
    -   [ ] Implement `handleFeedback`: get card, disable buttons, `fetch` POST `/api/practice/results`, handle success (increment index, call `displayCurrentCard()` or `endPracticeSession()`), handle error, re-enable buttons if needed.
    -   [ ] Add listeners to feedback buttons (`#wrong-btn`, `#hard-btn`, `#easy-btn`) calling `handleFeedback` with correct `AnswerDifficulty`.
    -   [ ] Implement `endPracticeSession()` function: show completion message, hide card area, reset state.
    -   [ ] Test full practice loop using buttons only.
-   [ ] **Step 18: Frontend Webcam/MediaPipe Setup**
    -   [ ] `npm install @mediapipe/tasks-vision`.
    -   [ ] Ensure WASM files are served correctly.
    -   [ ] Import `HandLandmarker`, `FilesetResolver`.
    -   [ ] Implement `createHandLandmarker()` (async loading, init instance). Call on load.
    -   [ ] Implement `enableCam()`: check instance, request `getUserMedia`, handle success (set `srcObject`, add `loadeddata` listener, start `predictWebcam`), handle failure (show error, ensure fallback).
    -   [ ] Call `enableCam()` only when needed (e.g., after "Show Answer").
    -   [ ] Test permission request flow and fallback.
-   [ ] **Step 19: Frontend Gesture Detection Loop**
    -   [ ] Implement `predictWebcam()`: check mode, get time, call `handLandmarker.detectForVideo()`, log results, call self via `requestAnimationFrame`.
    -   [ ] Start loop from `enableCam`'s `loadeddata` listener.
    -   [ ] Implement logic to stop loop (`webcamRunning = false`) and stream when feedback given/session ends.
    -   [ ] Test webcam feed appears and results are logged to console.
-   [ ] **Step 20: Frontend Gesture Interpretation & Debounce**
    -   [ ] In `predictWebcam`, add logic to interpret `results.landmarks` -> `currentFrameGesture` (Easy/Hard/Wrong).
    -   [ ] Implement debounce/hold logic using state variables (`lastDetectedGesture`, `gestureStartTime`, `requiredHoldTime`).
    -   [ ] Set confirmed `detectedGesture` only after hold time.
    -   [ ] Provide visual feedback for currently detected vs confirmed gestures.
    -   [ ] Reset `detectedGesture = null` after use.
    -   [ ] Manually test gesture classification and hold logic robustness.
-   [ ] **Step 21: Frontend Gesture Integration with API**
    -   [ ] In `predictWebcam`, when `detectedGesture` is confirmed:
        -   [ ] Call `handleFeedback(detectedGesture)`.
        -   [ ] Reset `detectedGesture = null`.
        -   [ ] Stop detection loop (`webcamRunning = false`, stop stream).
        -   [ ] Hide webcam container.
    -   [ ] Ensure fallback buttons still work and also stop the detection loop if clicked.
    -   [ ] Test completing practice session using gestures.

## Phase 4: Browser Extension (Chrome)

-   [ ] **Step 22: Extension Basic Setup**
    -   [ ] Create `extension/` directory.
    -   [ ] Create `manifest.json` (v3, name, version, permissions: `activeTab`, `scripting`, content script match `google.com/search*`, basic `action`).
    -   [ ] Create empty `content.js` with initial `console.log`.
    -   [ ] Load unpacked extension in Chrome, verify console log on Google Search.
-   [ ] **Step 23: Extension Selection Listener & Button Injection**
    -   [ ] In `content.js`, add `mouseup` listener.
    -   [ ] Implement listener: get selection, remove old button, if text selected -> create button, style button (position near selection), store text in `dataset`, append to body, store button reference.
    -   [ ] Add `mousedown`/`selectionchange` listener to remove button.
    -   [ ] Test button appears/disappears correctly on text selection.
-   [ ] **Step 24: Extension Button Action**
    -   [ ] Add click listener to injected button in `content.js`.
    -   [ ] Implement listener: get text from `dataset`, URL-encode text, construct target URL (`http://<frontend-dev-url>/add?description=...`), open URL (`window.open`).
    -   [ ] Remove button after click.
    -   [ ] Test clicking button opens correct URL in new tab.

## Phase 5: Wiring & Final Testing

-   [ ] **Step 25: Frontend `/add` Route Handling**
    -   [ ] In `main.ts`, add logic running on page load.
    -   [ ] Use `URLSearchParams` to get `description` query parameter.
    -   [ ] If parameter exists, decode it and set the value of `#card-front` input.
    -   [ ] (Optional) Focus `#card-back`.
    -   [ ] Test navigating manually to `/add?description=...` populates form.
-   [ ] **Step 26: End-to-End Extension Flow Test**
    -   [ ] Run backend and frontend servers.
    -   [ ] Load extension.
    -   [ ] Select text on Google Search -> Verify button.
    -   [ ] Click button -> Verify new tab opens with correct URL.
    -   [ ] Verify form is pre-filled.
    -   [ ] Fill 'Back', Save Card -> Verify success message.
    -   [ ] Verify card exists in DB.
-   [ ] **General Testing & Refinement**
    -   [ ] Review all code for best practices, error handling, comments.
    -   [ ] Perform manual testing across different browsers (if applicable beyond Chrome for web app).
    -   [ ] Test edge cases (empty inputs, rapid clicks, slow network simulation).
    -   [ ] Refine UI/UX based on testing.
    -   [ ] Consider adding more robust logging.
    -   [ ] Update database schema/migrations if any issues found.
    -   [ ] Ensure configuration (DB URL, Frontend URL in extension) is handled appropriately for potential deployment.

## Phase 6: Documentation & Deployment (Future)

-   [ ] Write README files for backend, frontend, extension.
-   [ ] Document build/run instructions.
-   [ ] Plan deployment strategy (hosting, database).
-   [ ] Implement deployment scripts/CI/CD.
