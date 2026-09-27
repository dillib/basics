import { describe, it, expect } from 'vitest';
import { topicMotif } from '../../client/src/lib/topicMotif';

// Cover art should show what a lesson is ABOUT. Pins the obvious matches and
// the traps where a broad word would pick the wrong picture.
describe('topicMotif', () => {
  const cases: [string, string | null][] = [
    ['how-bridges-stay-up', 'arch'],
    ['how-water-filtration-works', 'drops'],
    ['how-rockets-work', 'trajectory'],
    ['how-dna-works', 'helix'],
    ['how-the-heart-works', 'pulse'],
    ['how-encryption-works', 'lock'],
    ['how-blockchain-works', 'chain'],
    ['how-the-stock-market-works', 'candles'],
    ['how-elections-work', 'ballot'],
    ['how-magnets-work', 'magnet'],
    ['how-atoms-work', 'orbits'],
    ['what-is-infinity', 'infinity'],
    // Traps
    ['how-time-management-works', 'clock'],            // not gears ("management")
    ['how-search-engines-work', 'constellation'],      // not gears ("engines")
    ['how-computer-memory-works', 'circuit'],          // not neurons ("memory")
    ['how-thunder-and-lightning-work', 'bolt'],        // not rays ("light")
    ['how-compound-interest-works', 'spiral'],         // compounding, not coins
    ['how-rainbows-form', 'rays'],                     // not drops ("rain")
    // No fit -> category motif
    ['how-mental-models-work', null],
  ];
  for (const [slug, motif] of cases) it(slug, () => expect(topicMotif(slug)).toBe(motif));
});
