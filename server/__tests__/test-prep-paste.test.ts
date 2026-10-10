import { describe, it, expect } from 'vitest';
import { looksLikeQuestionSet } from '../../client/src/lib/pasteContent';

describe('looksLikeQuestionSet', () => {
  it('spots a numbered set of questions', () => {
    expect(looksLikeQuestionSet('1. What is a ratio?\n2. Simplify 6:8.\n3. What is 25% of 80?\n4. Find the unit rate.\n5. Solve x/4 = 3.')).toBe(true);
  });

  it('spots questions with lettered options', () => {
    expect(looksLikeQuestionSet('Which planet is largest?\na) Mars\nb) Jupiter\nc) Venus\nWhat gas do plants absorb?\na) Oxygen\nb) Carbon dioxide')).toBe(true);
  });

  it('spots Q-numbered questions', () => {
    expect(looksLikeQuestionSet('Q1 Define photosynthesis\nQ2 Name its inputs\nQ3 Name its outputs')).toBe(true);
  });

  it.each(['how do volcanoes work', 'solve 2x+3=7', 'What is a black hole?', 'explain photosynthesis to my 7 year old'])('leaves a normal search alone: %s', (q) => {
    expect(looksLikeQuestionSet(q)).toBe(false);
  });
});
