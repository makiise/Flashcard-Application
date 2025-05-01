


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
import { getHint, computeProgress,  } from './functions';
import { Flashcard, AnswerDifficulty, /* other types */ } from './types';

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

  // Add describe blocks and tests for other functions (computeProgress, practice, etc.)
});