// backend/src/routes/api.ts

// --- Imports ---
import express, { Router, Request, Response, NextFunction } from 'express';
import pool from '../db/config'; // Ensure this path is correct relative to api.ts

// --- Router Initialization ---
const router: Router = express.Router();

// --- POST /api/cards Route Handler ---
// Using async/await and explicitly typed parameters (often helps IntelliSense)
router.post('/cards', async (req: Request, res: Response, next: NextFunction) => {
  // 1. Destructure body - providing default empty object if body is undefined
  const { front, back, hint, tags } = req.body || {};

  // 2. Validation
  if (!front || !back) {
    // Send error response directly for validation issues
    return res.status(400).json({ error: 'Missing required fields: front and back' });
  }

  // 3. Prepare SQL Query and Values for flashcards table
  const insertFlashcardQuery = `
    INSERT INTO flashcards (front, back, hint, tags)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  // Provide null as default if optional fields are undefined
  const flashcardValues = [
    front,
    back,
    hint !== undefined ? hint : null,
    tags !== undefined ? tags : null, // Assuming 'tags' column accepts null or text[]
  ];

  // --- Database Interaction ---
  try {
    // Execute the query to insert into flashcards
    const flashcardResult = await pool.query(insertFlashcardQuery, flashcardValues);

    // Check if insertion was successful and returned data
    if (flashcardResult.rows.length === 0) {
        // This shouldn't happen with RETURNING * if insert worked, but good to check
        throw new Error('Flashcard insertion failed or did not return data.');
    }

    const newFlashcard = flashcardResult.rows[0];

    // TODO: Add insertion into card_buckets here later (Step 7 logic)
    // For now, just return the created flashcard

    // 4. Send Success Response
    res.status(201).json(newFlashcard);

  } catch (err) {
    // 5. Handle Errors - Pass to error handling middleware
    console.error('Database error in POST /api/cards:', err); // Log the error server-side
    next(err); // Pass the error to the next middleware (likely Express default error handler)
  }
});


// --- Add other routes below ---
// Example: router.get('/practice', ...);


// --- Export Router ---
export default router;