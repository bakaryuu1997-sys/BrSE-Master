import { describe, expect, it } from 'vitest';
import { formatChatMessage } from '../src/sidepanel/chatFormatting.js';

describe('sidepanel chat formatting', () => {
  it('renders markdown tables while sanitizing AI supplied HTML', () => {
    const div = document.createElement('div');
    div.innerText = [
      '| Term | Meaning |',
      '| --- | --- |',
      '| <img src=x onerror=alert(1)> | **safe** |',
      '<script>alert(2)</script>'
    ].join('\n');

    formatChatMessage(div);

    expect(div.querySelector('table')).toBeTruthy();
    expect(div.innerHTML).toContain('&lt;img');
    expect(div.innerHTML).toContain('<b>safe</b>');
    expect(div.innerHTML).not.toContain('<script');
    expect(div.querySelector('img')).toBeNull();
  });
});
