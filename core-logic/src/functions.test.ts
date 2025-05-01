


/* writing tests for certain cases:
-> 0 letters reveal
-> partial reveal
-> full reveal
 -> multi-word strings
-> Strings with only spaces
-> Empty string answers
-> for invalid inputs
-> Edge case: lettersToReveal > non-space chars  */

// core-logic/src/functions.test.ts
import { getHint, computeProgress, practice, update, toBucketSets, getBucketRange } from './functions';
import { Flashcard, AnswerDifficulty, BucketMap, History, ComputeProgressResult, PracticeRecord } from './types';

describe('Core Logic Functions', () => {
  describe('getHint', () => {
    const card1 = new Flashcard('id1', 'Front', 'Answer One', 'Hint Text', ['tag1']);
    const cardSpaces = new Flashcard('id2', 'Front', ' spaced ', 'Hint Text', ['tag2']);
    const cardEmpty = new Flashcard('id3', 'Front', '', 'Hint Text', ['tag3']);

    it('should return empty string for 0 letters', () => {
      expect(getHint(card1, 0)).toBe('______ ___');
    });

    it('should reveal partial letters', () => {
      expect(getHint(card1, 3)).toBe('Ans___ ___');
    });

    it('should reveal all letters if count matches non-space chars', () => {
        expect(getHint(card1, 9)).toBe('Answer One');
    });

    it('should reveal all letters (cap) if count exceeds non-space chars', () => {
        expect(getHint(card1, 15)).toBe('Answer One'); // Testing the capping
    });

    it('should preserve spaces', () => {
      expect(getHint(cardSpaces, 4)).toBe(' spa_e_ ');
    });

     it('should return empty string for empty answer', () => {
      expect(getHint(cardEmpty, 2)).toBe('');
    });

    it('should throw error for negative lettersToReveal', () => {
      expect(() => getHint(card1, -1)).toThrow(/cannot be negative/);
    });

    
    it('should throw error for invalid card input', () => {
      expect(() => getHint(null, 2)).toThrow(/Invalid flashcard input/);
      expect(() => getHint(undefined, 2)).toThrow(/Invalid flashcard input/);
      // @ts-expect-error Testing invalid type
      expect(() => getHint({ front: 'a', back: 123 }, 2)).toThrow(/Invalid flashcard input/);
    });
  });

  // other functions will be here
  /**
 * Computes the user's progress based on history and bucket state.
 *
 * @param history - Array of practice records.
 * @param buckets - Record representation of flashcard buckets.
 * @returns Object containing statistics about progress.
 */
function computeProgress(
    history: PracticeRecord[],
    buckets: BucketMap
  ): ComputeProgressResult {
    const totalPracticed = new Set<string>(); // Use card.id as unique identifier
    const successCount = new Set<string>();
  
    for (const record of history) {
      for (const [card, difficulty] of record.answers.entries()) {
        totalPracticed.add(card.id);
        if (difficulty === AnswerDifficulty.Easy) {
          successCount.add(card.id);
        }
      }
    }
  
    const bucketArray = toBucketSets(buckets); // Convert to Array<Set<Flashcard>>
    const bucketRange = getBucketRange(bucketArray);
  
    let maxBucket = 0;
    if (bucketRange) {
      maxBucket = bucketRange.maxBucket;
    }
  
    const cardsInMaxBucket = bucketArray[maxBucket] ?? new Set();
    const completeCount = cardsInMaxBucket.size;
  
    return {
    totalPractices: totalPracticed.size,
    successCount: successCount.size,
    completeCount,
    maxBucket,
    totalCards: 0,
    cardsByBucket: {},
    difficultyCounts: {
        [AnswerDifficulty.Wrong]: 0,
        [AnswerDifficulty.Hard]: 0,
        [AnswerDifficulty.Easy]: 0, 
      },
};



  }
  

   // Inside describe('Core Logic Functions', () => { ... });

  describe('practice', () => {
    // --- Test Data ---
    const cardA = new Flashcard('a', 'A?', 'A!', 'H_a', ['tag_a'] );
    const cardB = new Flashcard('b', 'B?', 'B!' , 'H_b', ['tag_b']);
    const cardC = new Flashcard('c', 'C?', 'C!' , 'H_c', ['tag_c']);
    const cardD = new Flashcard('d', 'D?', 'D!' , 'H_d', ['tag_d']);
    const cardE = new Flashcard('e', 'E?', 'E!' , 'H_e', ['tag_e']);

    const bucketsArray: Array<Set<Flashcard>> = [
      /* 0 */ new Set([cardA]),
      /* 1 */ new Set([cardB, cardC]),
      /* 2 */ new Set(), 
      /* 3 */ new Set([cardD]),
      /* 4 */ new Set([cardE]),
    ];
    const emptyBucketsArray: Array<Set<Flashcard>> = [];
    const bucketsWithOnlyEmptySets: Array<Set<Flashcard>> = [new Set(), new Set(), new Set()];

    
    it('should return bucket 0 on day 0', () => {
      const result = practice(bucketsArray, 0);
      expect(result).toEqual(new Set([cardA]));
    });

    it('should return bucket 0 on day 1', () => {
        const result = practice(bucketsArray, 1); // 1 % (2^0) === 0
        expect(result).toEqual(new Set([cardA]));
    });

    it('should return buckets 0 and 1 on day 2', () => {
        const result = practice(bucketsArray, 2); // 2 % (2^0) === 0, 2 % (2^1) === 0
        expect(result).toEqual(new Set([cardA, cardB, cardC]));
    });

     it('should return bucket 0 on day 3', () => {
        const result = practice(bucketsArray, 3); // 3 % (2^0) === 0
        expect(result).toEqual(new Set([cardA]));
    });

    it('should return buckets 0 and 2 on day 4', () => {
        // Day 4 is multiple of 2^0=1 and 2^2=4
        const result = practice(bucketsArray, 4);
        // Note: Bucket 2 is empty in our test data
        expect(result).toEqual(new Set([cardA]));
    });

     it('should return buckets 0, 1, and 3 on day 8', () => {
        // Day 8 is multiple of 2^0=1, 2^1=2, 2^3=8
        const result = practice(bucketsArray, 8);
        expect(result).toEqual(new Set([cardA, cardB, cardC, cardD]));
    });

     it('should return empty set for empty buckets array', () => {
        const result = practice(emptyBucketsArray, 5);
        expect(result).toEqual(new Set());
    });

    it('should return empty set for buckets with only empty sets', () => {
        const result = practice(bucketsWithOnlyEmptySets, 4);
        expect(result).toEqual(new Set());
    });

     it('should throw error for negative day', () => {
        expect(() => practice(bucketsArray, -1)).toThrow(/Day cannot be negative/);
    });
  }); // End describe practice
 
  // Inside describe('Core Logic Functions', () => { ... });

  describe('update', () => {
    // --- Test Data ---
    const cardA = new Flashcard('a', 'A?', 'A!', 'H_a', ['tag_a'] );
    const cardB = new Flashcard('b', 'B?', 'B!' , 'H_b', ['tag_b']);
    const cardC = new Flashcard('c', 'C?', 'C!' , 'H_c', ['tag_c']);

    // Initial state (using Record)
    const initialBuckets: BucketMap = {
      0: new Set([cardA]),
      1: new Set([cardB]),
    };

    // --- Test Cases ---
    it('should move card from bucket 0 to 1 on EASY', () => {
      const newBuckets = update(initialBuckets, cardA, AnswerDifficulty.Easy);
      expect(newBuckets[0]?.has(cardA)).toBe(false); // Removed from 0
      expect(newBuckets[1]?.has(cardA)).toBe(true);  // Added to 1
      expect(newBuckets[1]?.has(cardB)).toBe(true);  // B is still in 1
      expect(Object.keys(newBuckets).length).toBe(2); // Still only buckets 0 and 1 exist (unless 0 became empty)
      // Verify immutability
      expect(initialBuckets[0].has(cardA)).toBe(true); // Original map unchanged
      expect(initialBuckets[1].has(cardA)).toBe(false);
    });

     it('should keep card in same bucket on HARD', () => {
      const newBuckets = update(initialBuckets, cardB, AnswerDifficulty.Hard);
      expect(newBuckets[0]?.has(cardA)).toBe(true);  // A is still in 0
      expect(newBuckets[1]?.has(cardB)).toBe(true);  // B is still in 1
      expect(initialBuckets[1].has(cardB)).toBe(true); // Original map unchanged
    });

    it('should move card from bucket 1 to 0 on WRONG', () => {
      const newBuckets = update(initialBuckets, cardB, AnswerDifficulty.Wrong);
      expect(newBuckets[1]?.has(cardB)).toBe(false); // Removed from 1
      expect(newBuckets[0]?.has(cardB)).toBe(true);  // Added to 0
      expect(newBuckets[0]?.has(cardA)).toBe(true);  // A is still in 0
      expect(initialBuckets[1].has(cardB)).toBe(true); // Original map unchanged
    });

    it('should create a new bucket if needed on EASY', () => {
        const newBuckets = update(initialBuckets, cardB, AnswerDifficulty.Easy); // B moves 1 -> 2
        expect(newBuckets[1]?.has(cardB)).toBe(false); // Removed from 1
        expect(newBuckets[2]).toBeDefined();          // Bucket 2 should exist
        expect(newBuckets[2]?.has(cardB)).toBe(true);  // Added to 2
        expect(initialBuckets[2]).toBeUndefined();    // Original map unchanged
    });

    it('should throw error if card is not found', () => {
      const cardNotInMap = new Flashcard('d', 'D?', 'D!', 'H_d', ['tag_d']);
      expect(() => update(initialBuckets, cardNotInMap, AnswerDifficulty.Easy))
        .toThrow(/Flashcard with id d not found/);
    });

     it('should handle moving card from non-zero bucket to 0 on WRONG', () => {
        const buckets = { 2: new Set([cardC]) };
        const newBuckets = update(buckets, cardC, AnswerDifficulty.Wrong);
        expect(newBuckets[2]?.has(cardC)).toBe(false);
        expect(newBuckets[0]).toBeDefined();
        expect(newBuckets[0]?.has(cardC)).toBe(true);
    });
  }); 

  describe('Bucket Conversion and Range', () => {
    // --- Test Data ---
    const cardA = new Flashcard('id1', 'Front', 'Answer One', 'Hint Text', ['tag1']);
    const cardB= new Flashcard('id2', 'Front', ' spaced ', 'Hint Text', ['tag2']);
    const cardC = new Flashcard('id3', 'Front', '', 'Hint Text', ['tag3']);


    const bucketsRecordEmpty: BucketMap = {};
    const bucketsRecordGaps: BucketMap = {
        0: new Set([cardA]),
        3: new Set([cardB, cardC])
    };
    const bucketsRecordContiguous: BucketMap = {
        0: new Set([cardA]),
        1: new Set([cardB]),
        2: new Set([cardC])
    };

    // --- toBucketSets Tests ---
    describe('toBucketSets', () => {
        it('should handle empty record', () => {
            expect(toBucketSets(bucketsRecordEmpty)).toEqual([]);
        });

        it('should handle gaps correctly', () => {
            const result = toBucketSets(bucketsRecordGaps);
            expect(result.length).toBe(4); // 0, 1, 2, 3
            expect(result[0]).toEqual(new Set([cardA]));
            expect(result[1]).toEqual(new Set()); // Gap filled
            expect(result[2]).toEqual(new Set()); // Gap filled
            expect(result[3]).toEqual(new Set([cardB, cardC]));
        });

         it('should handle contiguous buckets', () => {
            const result = toBucketSets(bucketsRecordContiguous);
            expect(result.length).toBe(3);
            expect(result[0]).toEqual(new Set([cardA]));
            expect(result[1]).toEqual(new Set([cardB]));
            expect(result[2]).toEqual(new Set([cardC]));
        });

        it('should return copies of sets', () => {
            const originalSet = bucketsRecordGaps[0];
            const resultArray = toBucketSets(bucketsRecordGaps);
            const resultSet = resultArray[0];
            expect(resultSet).toEqual(originalSet);
            expect(resultSet).not.toBe(originalSet); 
        });
    });

    // --- getBucketRange Tests ---
     describe('getBucketRange', () => {
         it('should return undefined for empty array', () => {
             expect(getBucketRange([])).toBeUndefined();
         });

          it('should return undefined for array with only empty sets', () => {
             expect(getBucketRange([new Set(), new Set()])).toBeUndefined();
         });

         it('should return correct range for single populated bucket', () => {
            const buckets: Array<Set<Flashcard>> = [new Set(), new Set([cardA]), new Set()];
            expect(getBucketRange(buckets)).toEqual({ minBucket: 1, maxBucket: 1 });
         });

         it('should return correct range for multiple populated buckets', () => {
            const buckets: Array<Set<Flashcard>> = [new Set([cardA]), new Set(), new Set([cardB])];             expect(getBucketRange(buckets)).toEqual({ minBucket: 0, maxBucket: 2 });
         });

          it('should return correct range based on toBucketSets output', () => {
              const bucketsArray = toBucketSets(bucketsRecordGaps); 
              expect(getBucketRange(bucketsArray)).toEqual({ minBucket: 0, maxBucket: 3 });
          });
     });
}); 
});
