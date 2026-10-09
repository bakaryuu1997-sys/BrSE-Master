import { describe, it, expect } from 'vitest';

describe('OCR.js Runtime Test under JSDOM', () => {
  it('should import OCR.js successfully without throwing runtime exceptions', async () => {
    try {
      const ocrModule = await import('../src/content/ui/OCR.js');
      expect(ocrModule).toBeDefined();
      expect(ocrModule.startOcrCapture).toBeTypeOf('function');
      console.log("OCR.js imported successfully!");
    } catch (err) {
      console.error("OCR.js Import Failed with Runtime Error:", err);
      throw err;
    }
  });

  it('does not use code column layout for normal GitHub file-list OCR text', async () => {
    const { buildOriginalOcrText, looksLikeCodeCapture } = await import('../src/content/ui/OCR.js');
    const translations = [
      { text: 'docs/mockup', leftPercent: 1, topPercent: 1, hPercent: 4 },
      { text: 'public', leftPercent: 68, topPercent: 2, hPercent: 4 },
      { text: 'src', leftPercent: 68, topPercent: 8, hPercent: 4 },
      { text: '.gitignore', leftPercent: 68, topPercent: 14, hPercent: 4 },
      { text: 'package.json', leftPercent: 68, topPercent: 20, hPercent: 4 },
    ];

    const result = buildOriginalOcrText(translations);

    expect(result.isCodeCapture).toBe(false);
    expect(looksLikeCodeCapture(result.text)).toBe(false);
    expect(result.text).toBe('docs/mockup public\nsrc\n.gitignore\npackage.json');
  });

  it('keeps code OCR in code-copy mode when syntax is detected', async () => {
    const { buildOriginalOcrText } = await import('../src/content/ui/OCR.js');
    const translations = [
      { text: 'export default defineConfig([', leftPercent: 1, topPercent: 1, hPercent: 4 },
      { text: "globalIgnores(['dist']),", leftPercent: 6, topPercent: 7, hPercent: 4 },
      { text: '{', leftPercent: 6, topPercent: 13, hPercent: 4 },
      { text: "files: ['**/*.{ts,tsx}'],", leftPercent: 10, topPercent: 19, hPercent: 4 },
      { text: '}', leftPercent: 6, topPercent: 25, hPercent: 4 },
      { text: '])', leftPercent: 1, topPercent: 31, hPercent: 4 },
    ];

    const result = buildOriginalOcrText(translations);

    expect(result.isCodeCapture).toBe(true);
    expect(result.text).toContain('export default defineConfig([');
    expect(result.text).toContain("files: ['**/*.{ts,tsx}'],");
  });
});
