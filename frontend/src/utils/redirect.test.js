import { describe, it, expect, beforeEach } from 'vitest';
import {
  isSafeRedirectPath,
  saveRedirectPath,
  consumeRedirectPath,
} from './redirect';

describe('isSafeRedirectPath', () => {
  it.each([
    '/invite/abc',
    '/meetings/3?tab=info',
    '/home',
  ])('accepts same-origin relative path %s', (path) => {
    expect(isSafeRedirectPath(path)).toBe(true);
  });

  it.each([
    '//evil.com',
    'https://evil.com',
    'http://evil.com/invite/abc',
    'javascript:alert(1)',
    '/\\evil.com',
    '\\\\evil.com',
    'invite/abc',
    '',
    null,
    undefined,
  ])('rejects unsafe path %s', (path) => {
    expect(isSafeRedirectPath(path)).toBe(false);
  });
});

describe('saveRedirectPath / consumeRedirectPath', () => {
  beforeEach(() => sessionStorage.clear());

  it('returns the saved path once, then clears it', () => {
    saveRedirectPath('/invite/abc');
    expect(consumeRedirectPath()).toBe('/invite/abc');
    expect(consumeRedirectPath()).toBeNull();
  });

  it('ignores unsafe paths when saving', () => {
    saveRedirectPath('//evil.com');
    expect(consumeRedirectPath()).toBeNull();
  });

  it('does not save the login page itself', () => {
    saveRedirectPath('/login');
    expect(consumeRedirectPath()).toBeNull();
  });

  it('rejects a tampered stored value', () => {
    sessionStorage.setItem('postLoginRedirect', 'https://evil.com');
    expect(consumeRedirectPath()).toBeNull();
  });
});
