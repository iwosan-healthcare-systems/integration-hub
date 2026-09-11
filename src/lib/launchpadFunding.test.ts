import { describe, expect, it } from 'vitest';
import { parseLaunchpadFunding } from './launchpadFunding';

describe('LaunchPad funding entry', () => {
  it.each(['20000', '20000.00', '20000.50', '19999.96', '0', '0.01', '100000', '100000.01', '150000.50', '1.10'])('preserves %s through JSON submission', value => {
    expect(JSON.parse(JSON.stringify({ funding: parseLaunchpadFunding(value) })).funding).toBe(Number(value));
  });
  it.each(['', ' ', '-1', '999999999999999999', '1.001', '2e4', '20,000', 'NaN', 'Infinity'])('rejects invalid amounts instead of rounding: %s', value => {
    expect(() => parseLaunchpadFunding(value)).toThrow();
  });
});
