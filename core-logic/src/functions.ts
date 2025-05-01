

// Inside core-logic/src/functions.ts
// Add this line at the top of core-logic/src/functions.ts
import { Flashcard, AnswerDifficulty, BucketMap, History, ComputeProgressResult, PracticeRecord } from './types';

/**
 * Converts a Record representation of learning buckets into an Array-of-Set representation.
 * (Update JSDoc if changing from Map to Record)
 /**
 * Converts a Record representation of learning buckets into an Array-of-Set representation.
 * @param buckets Record where keys are bucket numbers and values are sets of Flashcards.
 * @returns Array of Sets, where element at index i is the set of flashcards in bucket i.
 */
export function toBucketSets(buckets: BucketMap): Array<Set<Flashcard>> {
    const array_of_sets: Array<Set<Flashcard>> = [];
    // Get numeric keys from the Record, find max
    const keys = Object.keys(buckets).map(Number);
    const max = keys.length > 0 ? Math.max(...keys) : -1; // Handle empty buckets object
  
    for (let i = 0; i <= max; i++) {
      const bucketSet = buckets[i]; // Access using numeric index with Record
      if (bucketSet instanceof Set) { // Check if it exists and is a Set
        array_of_sets[i] = new Set(bucketSet); // Copy the set
      } else {
        array_of_sets[i] = new Set(); // Add empty set for gaps
      }
    }
    // Ensure array length covers up to max, even if higher buckets were empty
    while (array_of_sets.length <= max) {
        array_of_sets.push(new Set());
    }
    return array_of_sets;
  }
  

  /**
 * Finds the range of buckets that contain flashcards, as a rough measure of progress.
 *
 * @param buckets Array-of-Set representation of buckets.
 * @returns object with minBucket and maxBucket properties representing the range,
 *          or undefined if no buckets contain cards.
 * @spec.requires buckets is a valid Array-of-Set representation of flashcard buckets.
 */
 export function getBucketRange(
    buckets: Array<Set<Flashcard>>
  ): { minBucket: number; maxBucket: number } | undefined {
    const range: number[] = [];
  
    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];
      if (bucket && bucket.size > 0 ) {
        range.push(i);
      }
    }
  
    if (range.length === 0) {
      return undefined;
    }
  
    const minBucket = Math.min(...range);
    const maxBucket = Math.max(...range);
  
    return { minBucket, maxBucket };
  }

  
  // Inside core-logic/src/functions.ts

/**
 * Selects cards to practice on a particular day based on the Modified-Leitner algorithm.
 * Cards in bucket i are practiced on days d where d % (2^i) == 0.
 *
 * @param buckets Array-of-Set representation of buckets.
 * @param day current day number (starting from 0).
 * @returns a Set of Flashcards that should be practiced on day `day`.
 * @throws {Error} if day is negative.
 */
export function practice(
    buckets: Array<Set<Flashcard>>,
    day: number
  ): Set<Flashcard> {
    if (day < 0) {
      throw new Error("Day cannot be negative.");
    }
  
    const practice_cards = new Set<Flashcard>();
  
    // Iterate through each bucket (index i corresponds to bucket number)
    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];
      if (!bucket || bucket.size === 0) {
        continue; // Skip empty buckets
      }
  
      // Calculate the practice interval for this bucket
      const interval = Math.pow(2, i);
  
      // Check if this bucket is due for practice today
      if (day % interval === 0) {
        // Add all cards from this bucket to the practice set
        bucket.forEach(card => practice_cards.add(card));
      }
    }
  
    return practice_cards;
  }


  // Inside core-logic/src/functions.ts

/**
 * Updates the bucket placement for a card based on practice difficulty.
 * Returns a NEW BucketMap, leaving the original unchanged (immutability).
 *
 * @param buckets The current state of buckets as a Record.
 * @param card The Flashcard that was practiced.
 * @param difficulty The difficulty reported for the practice trial.
 * @returns A new BucketMap reflecting the card's updated position.
 * @throws {Error} if the card is not found in the input buckets.
 */
export function update(
    buckets: BucketMap, // Assumes Record<number, Set<Flashcard>>
    card: Flashcard,
    difficulty: AnswerDifficulty
  ): BucketMap {
    let currentBucket = -1;
    let cardFound = false;
  
    // Find the card and its current bucket
    for (const bucketNumStr in buckets) {
        const bucketNum = parseInt(bucketNumStr, 10);
        if (buckets[bucketNum].has(card)) {
            currentBucket = bucketNum;
            cardFound = true;
            break;
        }
    }
  
    if (!cardFound) {
      // Or handle differently - maybe add it to bucket 0? Depends on requirements.
      throw new Error(`Flashcard with id ${card.id} not found in provided buckets.`);
    }
  
    // Determine the new bucket number
    let newBucket = currentBucket;
    switch (difficulty) {
      case AnswerDifficulty.Wrong: // Use the enum from types.ts
        newBucket = 0;
        break;
      case AnswerDifficulty.Hard:
        // Stays in the same bucket (or move back one? Check algorithm rules)
        // Assuming stays same for now.
        newBucket = currentBucket;
        break;
      case AnswerDifficulty.Easy:
        newBucket = currentBucket + 1; // No upper limit defined here, maybe add later
        break;
    }
  
    // Create a deep copy of the buckets
    const newBuckets: BucketMap = {};
    for (const bucketNumStr in buckets) {
        const bucketNum = parseInt(bucketNumStr, 10);
        // Copy each Set within the Record
        newBuckets[bucketNum] = new Set(buckets[bucketNum]);
    }
  
  
    // Remove the card from its original bucket in the copy
    if (newBuckets[currentBucket]) {
        newBuckets[currentBucket].delete(card);
        // Optional: delete the bucket if it becomes empty
        // if (newBuckets[currentBucket].size === 0) {
        //   delete newBuckets[currentBucket];
        // }
    }
  
  
    // Add the card to its new bucket in the copy
    if (!newBuckets[newBucket]) {
      newBuckets[newBucket] = new Set(); // Create the bucket if it doesn't exist
    }
    newBuckets[newBucket].add(card);
  
  
    return newBuckets;
  }


  // Inside core-logic/src/functions.ts
// (Paste the correct getHint function here - the one taking
// flashcard and lettersToReveal, and generating underscores)

/**
 * Generates a hint string for a flashcard's answer (back side)...
 * (Include the full JSDoc comment from the previous example)
 * @param flashcard The flashcard object containing the 'back' text.
 * @param lettersToReveal The number of non-space letters to reveal...
 * @returns The hint string...
 * @throws {Error} If input is invalid...
 */
 export function getHint(card: Flashcard | null | undefined, lettersToReveal: number): string {
    if (!card || typeof card !== 'object' || typeof card.back !== 'string') {
      throw new Error('Invalid flashcard input.');
    }
    if (lettersToReveal < 0) {
      throw new Error('lettersToReveal cannot be negative.');
    }
  
    const answer = card.back;
    if (answer.length === 0) {
      return '';
    }
  
    const nonSpaceChars = answer.replace(/ /g, '');
    const totalNonSpaceChars = nonSpaceChars.length;
  
    const revealCount = Math.min(lettersToReveal, totalNonSpaceChars);
  
    let revealed = '';
    let revealedSoFar = 0;
  
    for (let i = 0; i < answer.length; i++) {
      const char = answer[i];
      if (char === ' ') {
        revealed += ' ';
      } else if (revealedSoFar < revealCount) {
        revealed += char;
        revealedSoFar++;
      } else {
        revealed += '_';
      }
    }
  
    return revealed;
  }
  
/**
 * Computes statistics about the user's learning progress.
 *
 * @param buckets representation of learning buckets (BucketMap: Record<number, Set<Flashcard>>).
 * @param history representation of user's answer history (Array of PracticeRecord).
 * @returns statistics about learning progress (ComputeProgressResult).
 * @throws {Error} if buckets or history is null/undefined.
 */
export function computeProgress(
    buckets: BucketMap | null | undefined, // Allow null/undefined check
    history: History | null | undefined    // Allow null/undefined check
  ): ComputeProgressResult { // Use the type alias from types.ts
  
    if (!buckets) {
      throw new Error("Buckets input cannot be null or undefined.");
    }
     if (!history) {
      throw new Error("History input cannot be null or undefined.");
    }
  
    let totalCards = 0;
    const cardsByBucket: Record<number, number> = {}; // Match ComputeProgressResult type
  
    // Calculate total cards and cards per bucket
    for (const bucketNumStr in buckets) {
      const bucketNum = parseInt(bucketNumStr, 10);
      const count = buckets[bucketNum]?.size || 0; // Use optional chaining and default size
      cardsByBucket[bucketNum] = count;
      totalCards += count;
    }
  
    // Initialize difficulty counts
    const difficultyCounts: Record<AnswerDifficulty, number> = {
        [AnswerDifficulty.Wrong]: 0,
        [AnswerDifficulty.Hard]: 0,
        [AnswerDifficulty.Easy]: 0,
    };
    let totalPractices = 0;
  
    // Tally difficulties from history
    if (history.length > 0) {
        totalPractices = history.length;
        for (const record of history) {
            if (difficultyCounts[record.difficulty] !== undefined) {
                difficultyCounts[record.difficulty]++;
            }
        }
    }
     // Add an optional message or calculate ratios if needed,
     // but the target ComputeProgressResult only required counts.
    // const easyRatio = totalPractices > 0 ? difficultyCounts[AnswerDifficulty.EASY] / totalPractices : 0;
  
    return {
      totalCards,
      cardsByBucket,
      totalPractices,
      difficultyCounts,
      // message: totalPractices > 0 ? "Progress calculated." : "No practice history found."
    };
  }