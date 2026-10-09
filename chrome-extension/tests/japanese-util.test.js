import { describe, it, expect } from 'vitest';
import { extractJapaneseSegment, hasJapanese, isJapaneseChar } from '../src/content/utils/japanese.js';

describe('hasJapanese / isJapaneseChar', () => {
  it('detects Japanese characters', () => {
    expect(hasJapanese('ログイン')).toBe(true);
    expect(hasJapanese('設定 settings')).toBe(true);
    expect(hasJapanese('hello world')).toBe(false);
    expect(isJapaneseChar('あ')).toBe(true);
    expect(isJapaneseChar('A')).toBe(false);
  });
});

describe('extractJapaneseSegment', () => {
  it('returns the contiguous JP run around the offset', () => {
    const text = 'メニュー: 設定画面を開く';
    // offset on 設 (index of 設)
    const idx = text.indexOf('設');
    expect(extractJapaneseSegment(text, idx)).toBe('設定画面を開く');
  });

  it('returns the word when hovering within a leading JP token', () => {
    expect(extractJapaneseSegment('ログインボタン', 2)).toBe('ログインボタン');
  });

  it('returns empty when the offset is on latin/space', () => {
    const text = 'OK 設定';
    expect(extractJapaneseSegment(text, 0)).toBe('');
  });

  it('snaps back one char when offset points just past the word', () => {
    const text = '保存';
    expect(extractJapaneseSegment(text, 2)).toBe('保存');
  });

  it('is safe on empty input', () => {
    expect(extractJapaneseSegment('', 0)).toBe('');
  });
});
