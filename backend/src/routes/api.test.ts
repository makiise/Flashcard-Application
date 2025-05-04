// backend/src/routes/api.test.ts
import request from 'supertest';
import app from '../server';
import pool from '../db/config';
// Import the enum for use in practice results tests
import { AnswerDifficulty } from '../../../core-logic/src/types'; // Adjust path if needed!

describe('Flashcard API Endpoints', () => {

    const cardIdsToDelete: string[] = [];

    afterAll(async () => {
        // Basic Cleanup - tries to delete cards created
        try {
            if (cardIdsToDelete.length > 0) {
                await pool.query('DELETE FROM practice_log WHERE card_id = ANY($1::uuid[])', [cardIdsToDelete]);
                await pool.query('DELETE FROM card_buckets WHERE card_id = ANY($1::uuid[])', [cardIdsToDelete]);
                await pool.query('DELETE FROM flashcards WHERE id = ANY($1::uuid[])', [cardIdsToDelete]);
                console.log(`Cleaned up ${cardIdsToDelete.length} test cards.`);
            }
        } catch (err) { console.error("Error during test cleanup:", err); }
        finally { await pool.end(); }
    });

    // --- Tests for POST /api/cards (Keep your existing tests here) ---
    describe('POST /api/cards', () => {
        // Your existing tests for POST /api/cards go here...
        // Make sure they add created card IDs to cardIdsToDelete array
         it('should create a new flashcard and bucket entry, returning 201', async () => {
            const newCardData = { /* ... */ };
            const response = await request(app).post('/api/cards').send(newCardData).expect(201);
            expect(response.body).toHaveProperty('id');
            const createdCardId = response.body.id;
            cardIdsToDelete.push(createdCardId); // Important for cleanup
            const bucketResult = await pool.query(/* ... check card_buckets ... */ [createdCardId]);
            expect(bucketResult.rows.length).toBe(1);
            expect(bucketResult.rows[0].bucket_number).toBe(0);
        });
         it('should return 400 if required fields are missing', async () => { /* ... */ });
    });


    // --- START: Add Tests for GET /api/practice (Replace TODO Comment) ---
    describe('GET /api/practice', () => {
        let cardNewId: string;
        let cardDueB1Id: string;
        let cardNotDueB1Id: string;

        beforeAll(async () => {
            // Seed specific data just for this test suite
            // Card 1: New card (bucket 0, null practice date) -> DUE
            let res = await pool.query("INSERT INTO flashcards(front, back) VALUES('GET /practice New', 'Get Practice New Back') RETURNING id");
            cardNewId = res.rows[0].id; cardIdsToDelete.push(cardNewId);
            await pool.query("INSERT INTO card_buckets(card_id, bucket_number) VALUES($1, 0)", [cardNewId]);

            // Card 2: Bucket 1, practiced 3 days ago (2^1=2 days interval) -> DUE
            res = await pool.query("INSERT INTO flashcards(front, back) VALUES('GET /practice Due B1', 'Get Practice Due B1 Back') RETURNING id");
            cardDueB1Id = res.rows[0].id; cardIdsToDelete.push(cardDueB1Id);
            await pool.query("INSERT INTO card_buckets(card_id, bucket_number, last_practiced_at) VALUES($1, 1, NOW() - INTERVAL '3 days')", [cardDueB1Id]);

            // Card 3: Bucket 1, practiced 1 hour ago -> NOT DUE
            res = await pool.query("INSERT INTO flashcards(front, back) VALUES('GET /practice NotDue B1', 'Get Practice NotDue B1 Back') RETURNING id");
            cardNotDueB1Id = res.rows[0].id; cardIdsToDelete.push(cardNotDueB1Id);
            await pool.query("INSERT INTO card_buckets(card_id, bucket_number, last_practiced_at) VALUES($1, 1, NOW() - INTERVAL '1 hour')", [cardNotDueB1Id]);
        });

        it('should return only the cards due for practice', async () => {
            const response = await request(app)
                .get('/api/practice')
                .expect('Content-Type', /json/)
                .expect(200);

            const dueCards: any[] = response.body;
            expect(dueCards).toHaveLength(2); // Only cardNew and cardDueB1

            const dueCardIds = dueCards.map(card => card.id);
            expect(dueCardIds).toContain(cardNewId);
            expect(dueCardIds).toContain(cardDueB1Id);
            expect(dueCardIds).not.toContain(cardNotDueB1Id);
        });
    });
    // --- END: Tests for GET /api/practice ---


    // --- START: Add Tests for POST /api/practice/results (Replace TODO Comment) ---
    describe('POST /api/practice/results', () => {
        let testCardId: string;

        // Seed a card before each test in this block
        beforeEach(async () => {
            const res = await pool.query("INSERT INTO flashcards(front, back) VALUES('POST Results Test Front', 'POST Results Test Back') RETURNING id");
            testCardId = res.rows[0].id;
            cardIdsToDelete.push(testCardId);
            // Start in bucket 1, practiced 3 days ago (so it's due)
            await pool.query("INSERT INTO card_buckets(card_id, bucket_number, last_practiced_at) VALUES($1, 1, NOW() - INTERVAL '3 days')", [testCardId]);
            await pool.query("DELETE FROM practice_log WHERE card_id = $1", [testCardId]); // Clear logs for this card
        });

        it('should update bucket to 2 and log EASY result', async () => {
            const response = await request(app)
                .post('/api/practice/results')
                .send({ cardId: testCardId, difficulty: AnswerDifficulty.EASY }) // Use enum
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.newBucketNumber).toBe(2); // 1 -> 2

            // Verify DB state
            const bucketRes = await pool.query('SELECT bucket_number FROM card_buckets WHERE card_id = $1', [testCardId]);
            expect(bucketRes.rows[0].bucket_number).toBe(2);
            const logRes = await pool.query('SELECT difficulty_chosen FROM practice_log WHERE card_id = $1', [testCardId]);
            expect(logRes.rows.length).toBe(1);
            expect(logRes.rows[0].difficulty_chosen).toBe('EASY');
        });

         it('should keep bucket at 1 and log HARD result', async () => {
             const response = await request(app)
                .post('/api/practice/results')
                .send({ cardId: testCardId, difficulty: AnswerDifficulty.HARD }) // Use enum
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.newBucketNumber).toBe(1); // 1 -> 1

            // Verify DB state
            const bucketRes = await pool.query('SELECT bucket_number FROM card_buckets WHERE card_id = $1', [testCardId]);
            expect(bucketRes.rows[0].bucket_number).toBe(1);
             const logRes = await pool.query('SELECT difficulty_chosen FROM practice_log WHERE card_id = $1', [testCardId]);
            expect(logRes.rows[0].difficulty_chosen).toBe('HARD');
        });

         it('should update bucket to 0 and log WRONG result', async () => {
             const response = await request(app)
                .post('/api/practice/results')
                .send({ cardId: testCardId, difficulty: AnswerDifficulty.WRONG }) // Use enum
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.newBucketNumber).toBe(0); // 1 -> 0

            // Verify DB state
            const bucketRes = await pool.query('SELECT bucket_number FROM card_buckets WHERE card_id = $1', [testCardId]);
            expect(bucketRes.rows[0].bucket_number).toBe(0);
            const logRes = await pool.query('SELECT difficulty_chosen FROM practice_log WHERE card_id = $1', [testCardId]);
            expect(logRes.rows[0].difficulty_chosen).toBe('WRONG');
        });

         it('should return 404 if cardId is not found', async () => {
            const nonExistentCardId = '11111111-1111-1111-1111-111111111111';
             await request(app)
                .post('/api/practice/results')
                .send({ cardId: nonExistentCardId, difficulty: AnswerDifficulty.EASY })
                .expect('Content-Type', /json/)
                .expect(404);
         });

        it('should return 400 if difficulty is invalid', async () => {
             await request(app)
                .post('/api/practice/results')
                .send({ cardId: testCardId, difficulty: 99 }) // Invalid number
                .expect('Content-Type', /json/)
                .expect(400);
        });
    });
    // --- END: Tests for POST /api/practice/results ---

}); // End main describe block