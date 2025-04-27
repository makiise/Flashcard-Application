// This file should NOT be modified.
// It is a placeholder to ensure the project structure is complete.
// You will work with the Flashcard, AnswerDifficulty, and BucketMap types
// defined here in your implementation and tests.

/**
 * changed some details in ps1
 */
 export class Flashcard {
    // You can explore the properties of Flashcard, but do NOT modify this class.
    // Your implementation should work with the Flashcard class as given.
    readonly id : string;
    readonly front: string;
    readonly back: string;
    readonly hint?: string; // weak hint - you will strengthen the spec for getHint()
    readonly tags?: ReadonlyArray<string>;
  
    constructor(
        id: string,
      front: string,
      back: string,
      hint: string,
      tags: ReadonlyArray<string>
    ) {
        if (!id || !front || !back) {
            throw new Error("Flashcard requires id, front, and back properties.");
        }
        this.id = id;
        this.front = front;
        this.back = back;
        this.hint = hint;
        this.tags = tags;
      }
    }
  
  
  /**
   * Represents the user's answer difficulty for a flashcard practice trial.
   */
  export enum AnswerDifficulty {
    Wrong = 0,
    Hard = 1,
    Easy = 2,
  }
  
  /**
   * Represents the learning buckets as a Map.
   * Keys are bucket numbers (0, 1, 2, ...).
   * Values are Sets of Flashcards in that bucket.
   */
   export type BucketMap = Record<number, Set<Flashcard>>; // <-- Using Record

   
   export type PracticeRecord = { 
     cardId: string;
     timestamp: Date; 
     difficulty: AnswerDifficulty;
     previousBucket?: number;
     newBucket: number;
   };
   
   
   export type History = PracticeRecord[]; 
   
   
   export type ComputeProgressResult = { 
     totalCards: number;
     cardsByBucket: Record<number, number>;
     totalPractices: number;
     difficultyCounts: Record<AnswerDifficulty, number>;
     message?: string;
   };
  