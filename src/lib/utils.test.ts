import { describe, expect, it } from 'vitest';
import { formatDuration, calculateContextPercent, extractSessionId } from './utils.js';

describe('formatDuration', () => {
  it('formats minutes under 60', () => {
    expect(formatDuration(5)).toBe('5m');
    expect(formatDuration(30)).toBe('30m');
  });

  it('formats hours with minutes', () => {
    expect(formatDuration(65)).toBe('1h5m');
    expect(formatDuration(90)).toBe('1h30m');
  });

  it('formats exact hours', () => {
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(120)).toBe('2h');
  });
});

describe('calculateContextPercent', () => {
  it('returns 0 when no context window', () => {
    expect(calculateContextPercent({})).toBe(0);
    expect(calculateContextPercent({ context_window: undefined })).toBe(0);
  });

  it('calculates percentage', () => {
    expect(
      calculateContextPercent({
        context_window: { used: 50, total: 100 },
      }),
    ).toBe(50);
  });

  it('handles zero total', () => {
    expect(
      calculateContextPercent({
        context_window: { used: 50, total: 0 },
      }),
    ).toBe(0);
  });
});

describe('extractSessionId', () => {
  it('extracts UUID from path', () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    expect(extractSessionId(`/path/${uuid}.jsonl`)).toBe(uuid);
    expect(extractSessionId(`/path/${uuid}`)).toBe(uuid);
  });

  it('returns null for invalid', () => {
    expect(extractSessionId(undefined)).toBe(null);
    expect(extractSessionId('/path/to/file.txt')).toBe(null);
  });
});
