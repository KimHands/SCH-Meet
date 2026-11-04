import { describe, it, expect } from 'vitest';
import { formatDuration } from './duration';

describe('formatDuration', () => {
  it.each([
    [30, '30분'],
    [60, '1시간'],
    [90, '1시간 30분'],
    [180, '3시간'],
    [undefined, '-'],
  ])('%s → %s', (minutes, label) => {
    expect(formatDuration(minutes)).toBe(label);
  });
});
