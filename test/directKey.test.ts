import { describe, expect, it } from 'vitest';
import { buildDirectKey } from '../src/directKey';

describe('buildDirectKey', () => {
  it('is independent of argument order', () => {
    expect(buildDirectKey('user_bob', 'user_alice')).toBe(buildDirectKey('user_alice', 'user_bob'));
  });

  it('uses a length-prefixed format', () => {
    expect(buildDirectKey('a', 'b')).toBe('1:a1:b');
  });

  it('does not collide when ids contain a colon', () => {
    expect(buildDirectKey('a:b', 'c')).not.toBe(buildDirectKey('a', 'b:c'));
  });
});
