// backend/src/routes/api.test.ts
import request from 'supertest';
import app from '../server';
import pool from '../db/config';

describe('Flashcard API Endpoints', () => {

    afterAll(async () => {
        // TODO: Clean up test data created during tests
        // Example: await pool.query("DELETE FROM flashcards WHERE front LIKE 'Test Card Front%'");
        // A better approach involves transactions or a separate test DB.
        await pool.end();
    });

    // --- Tests for POST /api/cards ---
    describe('POST /api/cards', () => {
        let createdCardId: string | null = null; // To potentially use in other tests

        it('should create a new flashcard and bucket entry, returning 201', async () => {
          // 1. Define test data
          const newCardData = {
            front: 'Test Card Front (Integration Test)',
            back: 'Test Card Back (Integration Test)',
            hint: 'A hint from test',
            tags: ['integration', 'jest'],
          };

          // 2. Send the request using supertest
          const response = await request(app) // Pass your Express app to supertest
            .post('/api/cards')         // Target the endpoint
            .send(newCardData)          // Send the data as JSON body
            .expect('Content-Type', /json/) // Assert response header
            .expect(201);               // Assert status code

          // 3. Assert response body contents
          expect(response.body).toHaveProperty('id');
          expect(response.body.id).toEqual(expect.any(String));
          expect(response.body).toMatchObject({ // Check specific fields
              front: newCardData.front,
              back: newCardData.back,
              hint: newCardData.hint,
              tags: newCardData.tags,
          });
          expect(response.body).toHaveProperty('created_at');

          createdCardId = response.body.id; // Store ID if needed

          // 4. Assert database state (Verify Step 7 logic)
          // Check card_buckets table for the corresponding entry
          const bucketResult = await pool.query(
              'SELECT bucket_number, last_practiced_at FROM card_buckets WHERE card_id = $1',
              [createdCardId]
          );
          expect(bucketResult.rows.length).toBe(1); // Exactly one entry found
          expect(bucketResult.rows[0].bucket_number).toBe(0); // Should be in bucket 0
          expect(bucketResult.rows[0].last_practiced_at).toBeNull(); // Should not be practiced
        });

        // Add more tests for POST /api/cards below (e.g., validation errors)

    }); // End describe POST /api/cards


    // --- TODO: Add describe blocks for GET /api/practice ---


    // --- TODO: Add describe blocks for POST /api/practice/results ---


}); // End main describe block