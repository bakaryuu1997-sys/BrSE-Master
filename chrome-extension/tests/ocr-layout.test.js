import { describe, it, expect } from 'vitest';
import {
  buildGlossaryTermsFromOcr,
  buildOriginalOcrText,
  buildTranslatedText,
  extractJapaneseTerms,
  looksLikeCodeCapture,
} from '../src/shared/ocrLayout.js';

const regions = [
  { text: 'ログイン', translation_ja: 'ログイン', translation_vi: 'Đăng nhập', translation_en: 'Login', leftPercent: 1, topPercent: 1, hPercent: 4 },
  { text: 'パスワード', translation_ja: 'パスワード', translation_vi: 'Mật khẩu', translation_en: 'Password', leftPercent: 1, topPercent: 8, hPercent: 4 },
];

describe('buildTranslatedText', () => {
  it('lays out the chosen language field per row', () => {
    expect(buildTranslatedText(regions, 'vi')).toBe('Đăng nhập\nMật khẩu');
    expect(buildTranslatedText(regions, 'en')).toBe('Login\nPassword');
    expect(buildTranslatedText(regions, 'ja')).toBe('ログイン\nパスワード');
  });

  it('falls back to Vietnamese for an unknown language', () => {
    expect(buildTranslatedText(regions, 'zz')).toBe('Đăng nhập\nMật khẩu');
  });
});

describe('extractJapaneseTerms', () => {
  it('pulls distinct CJK/kana terms from regions', () => {
    const terms = extractJapaneseTerms(regions);
    expect(terms).toContain('ログイン');
    expect(terms).toContain('パスワード');
  });

  it('dedupes and ignores latin-only text', () => {
    const terms = extractJapaneseTerms([
      { text: '設定' }, { text: '設定' }, { text: 'Submit' },
    ]);
    expect(terms).toEqual(['設定']);
  });
});

describe('buildGlossaryTermsFromOcr', () => {
  it('builds terms from short JP regions and skips sentences/latin', () => {
    const terms = buildGlossaryTermsFromOcr([
      { text: 'ログイン', translation_vi: 'Đăng nhập', translation_en: 'Login' },
      { text: '設定画面を開いてください。', translation_vi: 'Hãy mở màn hình cài đặt.' }, // sentence -> skip
      { text: 'Submit', translation_vi: 'Gửi' }, // latin -> skip
    ]);
    expect(terms).toHaveLength(1);
    expect(terms[0]).toMatchObject({
      japanese: 'ログイン',
      vietnamese: 'Đăng nhập',
      english: 'Login',
      category: 'Business',
      roles: ['BrSE'],
    });
    expect(terms[0].id).toMatch(/^ocr-login-0$/);
  });

  it('dedupes repeated regions', () => {
    const terms = buildGlossaryTermsFromOcr([{ text: '保存' }, { text: '保存' }]);
    expect(terms).toHaveLength(1);
    expect(terms[0].english).toBe('保存');
  });
});

describe('buildOriginalOcrText (via shared module)', () => {
  it('keeps plain layout for non-code text', () => {
    const result = buildOriginalOcrText(regions);
    expect(result.isCodeCapture).toBe(false);
    expect(looksLikeCodeCapture(result.text)).toBe(false);
  });
});
