// backend/src/routes/api.ts

// --- Imports ---
import express, { Router, Request, Response, NextFunction } from 'express';
import pool from '../db/config'; // Ensure this path is correct relative to api.ts
// Import the enum from core-logic 
import { AnswerDifficulty } from '../../../core-logic/src/types';

// --- Router Initialization ---
const router: Router = express.Router();

// --- POST /api/cards Route Handler (Step 6 + TODO for Step 7) ---
// --- POST /api/cards Route Handler (UPDATED with Step 7 Logic) ---
router.post('/cards', async (req: Request, res: Response, next: NextFunction) => {
  // 1. Destructure body (Stays the same)
  const { front, back, hint, tags } = req.body || {};

  // 2. Validation (Stays the same)
  if (!front || !back) {
    return res.status(400).json({ error: 'Missing required fields: front and back' });
  }

  // --- Database Interaction with Transaction ---
  let client; // <<< ADD: Declare client variable here

  try {
    // <<< ADD: Get a client connection from the pool >>>
    client = await pool.connect();

    // <<< ADD: Start the transaction >>>
    await client.query('BEGIN');

    // 3. Prepare SQL Query and Values for flashcards table (Query stays the same)
    const insertFlashcardQuery = `
      INSERT INTO flashcards (front, back, hint, tags)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const flashcardValues = [
      front,
      back,
      hint !== undefined ? hint : null,
      tags !== undefined ? tags : null,
    ];

    // <<< CHANGE: Execute flashcard insert USING THE CLIENT >>>
    const flashcardResult = await client.query(insertFlashcardQuery, flashcardValues);

    // Error check (Stays the same)
    if (flashcardResult.rows.length === 0) {
      // We are inside a transaction, so throw error to trigger rollback
      throw new Error('Flashcard insertion failed unexpectedly.');
    }
    const newFlashcard = flashcardResult.rows[0];

    // <<< ADD: Prepare and execute INSERT into card_buckets >>>
    const insertBucketQuery = `
      INSERT INTO card_buckets (card_id, bucket_number, last_practiced_at, updated_at)
      VALUES ($1, $2, $3, NOW())
    `;
    // Use the id from the flashcard we just inserted
    // Bucket is 0, last_practiced_at is NULL
    const bucketValues = [newFlashcard.id, 0, null];
    await client.query(insertBucketQuery, bucketValues);
    // <<< END of card_buckets insert >>>

    // <<< ADD: Commit the transaction >>>
    await client.query('COMMIT');

    // 4. Send Success Response (Stays the same, using newFlashcard)
    res.status(201).json(newFlashcard);

  } catch (err) {
    // 5. Handle Errors
    // <<< ADD: Rollback if client exists >>>
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Error rolling back transaction:', rollbackErr);
      }
    }
    // Log original error and pass to error handler (Stays the same)
    console.error('Database error in POST /api/cards:', err);
    next(err);

  } finally {
    // <<< ADD: Release the client in a finally block >>>
    if (client) {
      client.release(); // Return client to the pool
    }
  }
}); // <<< End of router.post('/cards', ...) function

// --- GET /api/practice Route Handler (Step 9) ---
router.get('/practice', async (req: Request, res: Response, next: NextFunction) => {
  const getDueCardsQuery = `
    SELECT
      f.id, f.front, f.back, f.hint, f.tags, f.created_at, f.updated_at
    FROM
      flashcards f
    JOIN
      card_buckets cb ON f.id = cb.card_id
    WHERE
      (cb.bucket_number = 0 AND cb.last_practiced_at IS NULL)
      OR
      (cb.last_practiced_at IS NOT NULL AND CURRENT_TIMESTAMP >= (cb.last_practiced_at + (INTERVAL '1 day' * POWER(2, cb.bucket_number))))
    ORDER BY
       cb.bucket_number ASC, cb.last_practiced_at ASC NULLS FIRST;
  `;

  try {
    const result = await pool.query(getDueCardsQuery);
    const dueCards = result.rows;
    res.status(200).json(dueCards);

  } catch (err) {
    console.error('Database error in GET /api/practice:', err);
    next(err); // Pass error to handler
  }
});


// --- POST /api/practice/results Route Handler (Step 10) ---
router.post('/practice/results', async (req: Request, res: Response, next: NextFunction) => {
  // 1. Get data from body
  const { cardId, difficulty } = req.body;

  // 2. Validate Input
  // Convert incoming difficulty number to the enum type for comparison/use
  const difficultyValue: AnswerDifficulty | undefined = difficulty as AnswerDifficulty;

  if (
    !cardId ||
    typeof cardId !== 'string' ||
    typeof difficulty !== 'number' ||
    !Object.values(AnswerDifficulty).includes(difficulty)
  ) {
    return res.status(400).json({
      error: 'Invalid input: cardId (string) and difficulty (0, 1, or 2) required.',
    });
  }
  

  const client = await pool.connect(); // Get a client for transaction

  try {
    await client.query('BEGIN'); // Start transaction

    // 3. Fetch current bucket number
    const getBucketQuery = 'SELECT bucket_number FROM card_buckets WHERE card_id = $1 FOR UPDATE'; // Add FOR UPDATE for safety within transaction
    const bucketResult = await client.query(getBucketQuery, [cardId]);

    if (bucketResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Card not found in buckets.' });
    }
    const currentBucket = bucketResult.rows[0].bucket_number;

    // 4. Calculate new bucket
    let newBucket = currentBucket;
    switch (difficultyValue) { // Use the validated enum value
      case AnswerDifficulty.Wrong:
        newBucket = 0;
        break;
      case AnswerDifficulty.Hard:
        newBucket = currentBucket; // Stays the same
        break;
      case AnswerDifficulty.Easy:
        newBucket = currentBucket + 1;
        break;
    }

    // 5. INSERT into practice_log (practice_history)
    const insertLogQuery = `
      INSERT INTO practice_log (user_id, flashcard_id, difficulty_chosen, practiced_at)
      VALUES ($1, $2, $3, NOW()) -- Use NOW() for timestamp
    `;
    // TODO: Replace placeholderUserId with actual authenticated user ID later
    const placeholderUserId = '00000000-0000-0000-0000-000000000000';
    // Get the string representation of the enum key for the database enum type
    const difficultyEnumString = AnswerDifficulty[difficultyValue];
    await client.query(insertLogQuery, [placeholderUserId, cardId, difficultyEnumString]);


    // 6. UPDATE card_buckets
    const updateBucketQuery = `
      UPDATE card_buckets
      SET bucket_number = $1, last_practiced_at = NOW(), updated_at = NOW()
      WHERE card_id = $2
    `;
    await client.query(updateBucketQuery, [newBucket, cardId]);

    // 7. Commit transaction
    await client.query('COMMIT');

    // 8. Send response
    res.status(200).json({ cardId: cardId, previousBucket: currentBucket, newBucketNumber: newBucket });

  } catch (err) {
    await client.query('ROLLBACK'); // Rollback on any error
    console.error('Database error in POST /api/practice/results:', err);
    next(err); // Pass error to handler
  } finally {
    client.release(); // ALWAYS release the client connection back to the pool
  }
});


// --- Export Router ---
export default router;
