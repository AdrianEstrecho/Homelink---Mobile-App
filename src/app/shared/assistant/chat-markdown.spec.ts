import { parseInline, toBlocks } from './chat-markdown';

describe('ChatMarkdown parsing', () => {
  it('turns site paths into in-app links and drops links it cannot follow', () => {
    expect(parseInline('See [Tapo C200](/products/tapo-c200) or [docs](https://example.com) or [x](javascript:alert(1))')).toEqual([
      { kind: 'text', text: 'See ' },
      { kind: 'route', label: 'Tapo C200', href: '/products/tapo-c200' },
      { kind: 'text', text: ' or ' },
      { kind: 'external', label: 'docs', href: 'https://example.com' },
      { kind: 'text', text: ' or ' },
      { kind: 'text', text: 'x' },
      { kind: 'text', text: ')' },
    ]);
  });

  it('never treats markup in a reply as HTML', () => {
    expect(parseInline('<img src=x onerror=alert(1)>')).toEqual([{ kind: 'text', text: '<img src=x onerror=alert(1)>' }]);
  });

  it('groups bullets into one list across blank lines and folds indented lines into the item', () => {
    const blocks = toBlocks('Options:\n- **One**\n\n- Two\n  more about two\nDone');
    expect(blocks.map((b) => b.type)).toEqual(['p', 'ul', 'p']);
    const list = blocks[1] as { type: 'ul'; items: unknown[][] };
    expect(list.items.length).toBe(2);
    expect(list.items[1].length).toBe(2);
  });
});
