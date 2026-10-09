import { describe, it, expect, beforeEach } from 'vitest';
import { extractGmailEmail, getGmailMessageId } from '../src/content/adapters/gmail.js';
import { deriveImportFields } from '../src/content/ui/ImportModal.tsx';

describe('extractGmailEmail', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('extracts subject, sender (name + email), and body from an open email', () => {
    document.body.innerHTML = `
      <h2 class="hP">Yêu cầu cập nhật màn hình A</h2>
      <span class="gD" name="Tanaka" email="tanaka@example.co.jp">Tanaka</span>
      <div class="a3s aiL">Nội dung email cần làm rõ điều kiện tìm kiếm.</div>
    `;

    const result = extractGmailEmail(document);
    expect(result.subject).toBe('Yêu cầu cập nhật màn hình A');
    expect(result.sender).toBe('Tanaka <tanaka@example.co.jp>');
    expect(result.body).toBe('Nội dung email cần làm rõ điều kiện tìm kiếm.');
  });

  it('uses the last message body in a thread', () => {
    document.body.innerHTML = `
      <h2 class="hP">Re: Thread</h2>
      <span class="gD" email="a@b.com"></span>
      <div class="a3s aiL">Tin nhắn cũ</div>
      <div class="a3s aiL">Tin nhắn mới nhất</div>
    `;

    const result = extractGmailEmail(document);
    expect(result.body).toBe('Tin nhắn mới nhất');
    // sender falls back to email when no name attribute is present
    expect(result.sender).toBe('a@b.com');
  });

  it('returns empty strings when nothing matches', () => {
    const result = extractGmailEmail(document);
    expect(result).toEqual({ subject: '', sender: '', body: '' });
  });

  it('falls back to resilient selectors (span[email] without .gD)', () => {
    document.body.innerHTML = `
      <div class="ha"><h2>Fallback subject</h2></div>
      <span email="x@y.com" name="X">X</span>
      <div data-message-id="m1"><div class="a3s">Fallback body</div></div>
    `;
    const result = extractGmailEmail(document);
    expect(result.subject).toBe('Fallback subject');
    expect(result.sender).toBe('X <x@y.com>');
    expect(result.body).toBe('Fallback body');
  });
});

describe('getGmailMessageId', () => {
  it('extracts a long opaque conversation id from the URL hash', () => {
    window.location.hash = '#inbox/FMfcgzGxSBmqLpRebnZQ';
    expect(getGmailMessageId()).toBe('FMfcgzGxSBmqLpRebnZQ');
  });

  it('ignores plain folder names', () => {
    window.location.hash = '#inbox';
    expect(getGmailMessageId()).toBe('');
  });
});

describe('deriveImportFields', () => {
  it('derives Jira fields (title, question, background, project)', () => {
    const fields = deriveImportFields({
      source: 'jira',
      key: 'PROJ-12',
      title: 'Thêm filter',
      desc: 'Mô tả ticket',
      comments: [{ author: 'Khách', text: 'Cần gấp' }],
      url: 'https://x.atlassian.net/browse/PROJ-12',
    });

    expect(fields.recordTitle).toBe('[PROJ-12] Thêm filter');
    expect(fields.question).toBe('Mô tả ticket');
    expect(fields.background).toBe('Khách: Cần gấp');
    expect(fields.project).toBe('PROJ');
    expect(fields.sourceKey).toBe('PROJ-12');
  });

  it('derives Gmail fields with sender in the background', () => {
    const fields = deriveImportFields({
      source: 'gmail',
      title: 'Hỏi về deadline',
      subject: 'Hỏi về deadline',
      sender: 'Tanaka <t@e.jp>',
      body: 'Khi nào xong?',
      url: 'https://mail.google.com/x',
    });

    expect(fields.recordTitle).toBe('[Email] Hỏi về deadline');
    expect(fields.question).toBe('Hỏi về deadline');
    expect(fields.background).toBe('From: Tanaka <t@e.jp>\n\nKhi nào xong?');
    expect(fields.project).toBe('Email');
    expect(fields.sourceKey).toBe('');
  });

  it('uses a gmail: prefixed sourceKey when a messageId is present', () => {
    const fields = deriveImportFields({
      source: 'gmail',
      title: 'Hỏi',
      subject: 'Hỏi',
      messageId: 'FMfcgzABC123',
      url: 'https://mail.google.com/x',
    });
    expect(fields.sourceKey).toBe('gmail:FMfcgzABC123');
  });
});
