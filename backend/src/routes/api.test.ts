// backend/src/routes/api.test.ts
import request from 'supertest';
import app from '../server';
import pool from '../db/config';
// Import the enum for use in practice results tests
import { AnswerDifficulty } from '../../../core-logic/src/types';

// --- Test Suite ---
describe('Flashcard API Endpoints', () => {

    // List of card IDs created during tests for cleanup
    const cardIdsToDelete: string[] = [];
    const userIdsToDelete: string[] = []; // If testing user creation later
    const practiceLogIdsToDelete: string[] = []; // If needed

    // --- Database Cleanup Hook ---
    afterAll(async () => {
        // Clean up any data created specifically during these tests
        // Using Promise.all for potentially faster parallel deletion
        try {
            if (cardIdsToDelete.length > 0) {
                // Delete associated logs and buckets first due to FK constraints
                await pool.query('DELETE FROM practice_log WHERE card_id = ANY($1::uuid[])', [cardIdsToDelete]);
                await pool.query('DELETE FROM card_buckets WHERE card_id = ANY($1::uuid[])', [cardIdsToDelete]);
                await pool.query('DELETE FROM flashcards WHERE id = ANY($1::uuid[])', [cardIdsToDelete]);
                console.log(`Cleaned up ${cardIdsToDelete.length} test cards.`);
            }
            // Add user cleanup if needed later
            // if (userIdsToDelete.length > 0) {
            //     await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIdsToDelete]);
            // }
        } catch (err) {
            console.error("Error during test cleanup:", err);
        } finally {
            // Close the database connection pool
            await pool.end();
        }
    });

    // --- Tests for POST /api/cards ---
    describe('POST /api/cards', () => {
        it('should create a new flashcard and bucket entry, returning 201', async () => {
            const newCardData = {
                front: 'Test Card Front (Integration Test)',
                back: 'Test Card Back (Integration Test)',
                hint: 'A hint from test',
                tags: ['integration', 'jest'],
            };

            const response = await request(app)
                .post('/api/cards')
                .send(newCardData)
                .expect('Content-Type', /json/)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            const createdCardId = response.body.id;
            cardIdsToDelete.push(createdCardId); // Add to cleanup list

            expect(response.body.id).toEqual(expect.any(String));
            expect(response.body).toMatchObject({
                front: newCardData.front,
                back: newCardData.back,
                hint: newCardData.hint,
                tags: newCardData.tags,
            });
            expect(response.body).toHaveProperty('created_at');

            // Assert database state (Verify Step 7 logic)
            const bucketResult = await pool.query(
                'SELECT bucket_number, last_practiced_at FROM card_buckets WHERE card_id = $1',
                [createdCardId]
            );
            expect(bucketResult.rows.length).toBe(1);
            expect(bucketResult.rows[0].bucket_number).toBe(0);
            expect(bucketResult.rows[0].last_practiced_at).toBeNull();
        });

        it('should return 400 if required field "back" is missing', async () => {
            const incompleteData = {
                front: 'Test Card Front - Missing Back',
                tags: ['error'],
            };

            const response = await request(app)
                .post('/api/cards')
                .send(incompleteData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Missing required fields');
        });

        it('should return 400 if required field "front" is missing', async () => {
            const incompleteData = {
                back: 'Test Card Back - Missing Front',
            };

            const response = await request(app)
                .post('/api/cards')
                .send(incompleteData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Missing required fields');
        });

        it('should return 400 if required field "back" is empty', async () => {
            const emptyData = {
                front: 'Valid Front',
                back: '', // Empty back
            };

            const response = await request(app)
                .post('/api/cards')
                .send(emptyData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Missing required fields');
        });

    }); // End describe POST /api/cards


    // --- Tests for GET /api/practice ---
    describe('GET /api/practice', () => {
        let cardNewId: string;
        let cardDueBucket1Id: string;
        let cardNotDueBucket1Id: string;
        let cardDueBucket2Id: string;

        // Seed data before tests in this block run
        beforeAll(async () => {
            // Card 1: New card (bucket 0, never practiced) 
            let res = await pool.query("INSERT INTO flashcards(front, back) VALUES('New Front', 'New Back') RETURNING id");
            cardNewId = res.rows[0].id;
            cardIdsToDelete.push(cardNewId);
            await pool.query("INSERT INTO card_buckets(card_id, bucket_number, last_practiced_at) VALUES($1, 0, NULL)", [cardNewId]);

            // Card 2: Bucket 1, practiced > 2 days ago (2^1 days) 
            res = await pool.query("INSERT INTO flashcards(front, back) VALUES('Due B1 Front', 'Due B1 Back') RETURNING id");
            cardDueBucket1Id = res.rows[0].id;
            cardIdsToDelete.push(cardDueBucket1Id);
            await pool.query("INSERT INTO card_buckets(card_id, bucket_number, last_practiced_at) VALUES($1, 1, NOW() - INTERVAL '3 days')", [cardDueBucket1Id]);

            // Card 3: Bucket 1, practiced < 2 days ago 
            res = await pool.query("INSERT INTO flashcards(front, back) VALUES('Not Due B1 Front', 'Not Due B1 Back') RETURNING id");
            cardNotDueBucket1Id = res.rows[0].id;
            cardIdsToDelete.push(cardNotDueBucket1Id);
            await pool.query("INSERT INTO card_buckets(card_id, bucket_number, last_practiced_at) VALUES($1, 1, NOW() - INTERVAL '1 hour')", [cardNotDueBucket1Id]);

            // Card 4: Bucket 2, practiced > 4 days ago (2^2 days)
            res = await pool.query("INSERT INTO flashcards(front, back) VALUES('Due B2 Front', 'Due B2 Back') RETURNING id");
            cardDueBucket2Id = res.rows[0].id;
            cardIdsToDelete.push(cardDueBucket2Id);
            await pool.query("INSERT INTO card_buckets(card_id, bucket_number, last_practiced_at) VALUES($1, 2, NOW() - INTERVAL '5 days')", [cardDueBucket2Id]);
        });

        it('should return only the cards due for practice', async () => {
            const response = await request(app)
                .get('/api/practice')
                .expect('Content-Type', /json/)
                .expect(200);

            const dueCards: any[] = response.body; 

            // Check how many cards were returned
            expect(dueCards).toHaveLength(3); // CardNew, CardDueB1, CardDueB2

            // Check that the correct card IDs are present
            const dueCardIds = dueCards.map(card => card.id);
            expect(dueCardIds).toContain(cardNewId);
            expect(dueCardIds).toContain(cardDueBucket1Id);
            expect(dueCardIds).toContain(cardDueBucket2Id);

            // Check that the not-due card ID is NOT present
            expect(dueCardIds).not.toContain(cardNotDueBucket1Id);
        });

         it('should return an empty array if no cards are due', async () => {
            // Temporarily update seeded cards to be not due
             await pool.query("UPDATE card_buckets SET last_practiced_at = NOW() WHERE card_id = ANY($1::uuid[])", [[cardNewId, cardDueBucket1Id, cardDueBucket2Id]]);

             const response = await request(app)
                .get('/api/practice')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toEqual([]); // Expect an empty array

           
        });

    }); // End describe GET /api/practice


    // --- Tests for POST /api/practice/results ---
    describe('POST /api/practice/results', () => {
        let testCardId: string;

        // Seed a card before each test in this block
        beforeEach(async () => {
            const res = await pool.query("INSERT INTO flashcards(front, back) VALUES('Practice Test Front', 'Practice Test Back') RETURNING id");
            testCardId = res.rows[0].id;
            cardIdsToDelete.push(testCardId); // Add to global cleanup list
            // Start it in bucket 1, practiced 3 days ago (so it's due)
            await pool.query("INSERT INTO card_buckets(card_id, bucket_number, last_practiced_at) VALUES($1, 1, NOW() - INTERVAL '3 days')", [testCardId]);
            // Clear practice log for this card before each test for clarity
            await pool.query("DELETE FROM practice_log WHERE card_id = $1", [testCardId]);
        });

        it('should move card to bucket 2 on EASY difficulty', async () => {
            const response = await request(app)
                .post('/api/practice/results')
                .send({ cardId: testCardId, difficulty: AnswerDifficulty.Easy }) // Use enum value
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toEqual({
                cardId: testCardId,
                previousBucket: 1,
                newBucketNumber: 2 // 1 + 1 = 2
            });

            // Verify DB state
            const bucketRes = await pool.query('SELECT bucket_number, last_practiced_at FROM card_buckets WHERE card_id = $1', [testCardId]);
            expect(bucketRes.rows[0].bucket_number).toBe(2);
            expect(bucketRes.rows[0].last_practiced_at).not.toBeNull(); // Should be updated

            const logRes = await pool.query('SELECT difficulty_chosen FROM practice_log WHERE card_id = $1 ORDER BY practiced_at DESC LIMIT 1', [testCardId]);
            expect(logRes.rows.length).toBe(1);
            expect(logRes.rows[0].difficulty_chosen).toBe('EASY'); // Check enum string
        });

        it('should keep card in bucket 1 on HARD difficulty', async () => {
             const response = await request(app)
                .post('/api/practice/results')
                .send({ cardId: testCardId, difficulty: AnswerDifficulty.Hard })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.newBucketNumber).toBe(1); // Stays in bucket 1

            // Verify DB state
             const bucketRes = await pool.query('SELECT bucket_number, last_practiced_at FROM card_buckets WHERE card_id = $1', [testCardId]);
            expect(bucketRes.rows[0].bucket_number).toBe(1); // Still 1
            expect(bucketRes.rows[0].last_practiced_at).not.toBeNull(); // Updated

            const logRes = await pool.query('SELECT difficulty_chosen FROM practice_log WHERE card_id = $1 ORDER BY practiced_at DESC LIMIT 1', [testCardId]);
            expect(logRes.rows[0].difficulty_chosen).toBe('HARD');
        });

        it('should move card to bucket 0 on WRONG difficulty', async () => {
             const response = await request(app)
                .post('/api/practice/results')
                .send({ cardId: testCardId, difficulty: AnswerDifficulty.Wrong })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.newBucketNumber).toBe(0); // Moves to bucket 0

            // Verify DB state
             const bucketRes = await pool.query('SELECT bucket_number, last_practiced_at FROM card_buckets WHERE card_id = $1', [testCardId]);
            expect(bucketRes.rows[0].bucket_number).toBe(0); // Now 0
            expect(bucketRes.rows[0].last_practiced_at).not.toBeNull(); // Updated

            const logRes = await pool.query('SELECT difficulty_chosen FROM practice_log WHERE card_id = $1 ORDER BY practiced_at DESC LIMIT 1', [testCardId]);
            expect(logRes.rows[0].difficulty_chosen).toBe('WRONG');
        });

         it('should return 404 if cardId is not found', async () => {
            const nonExistentCardId = '00000000-0000-0000-0000-000000000001'; // Example invalid UUID
             await request(app)
                .post('/api/practice/results')
                .send({ cardId: nonExistentCardId, difficulty: AnswerDifficulty.Easy })
                .expect('Content-Type', /json/)
                .expect(404);
         });

        it('should return 400 if difficulty is invalid', async () => {
             await request(app)
                .post('/api/practice/results')
                .send({ cardId: testCardId, difficulty: 5 }) // Invalid difficulty number
                .expect('Content-Type', /json/)
                .expect(400);
        });

         it('should return 400 if cardId is missing', async () => {
             await request(app)
                .post('/api/practice/results')
                .send({ difficulty: AnswerDifficulty.Easy }) // Missing cardId
                .expect('Content-Type', /json/)
                .expect(400);
        });


    }); // End describe POST /api/practice/results


}); // End main describe block