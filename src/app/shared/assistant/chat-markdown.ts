import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Port of frontend/src/components/assistant/ChatMarkdown.jsx. Just the markdown the assistant
 * is told to write — paragraphs, bullet/numbered lists, bold, italics and links — parsed into
 * plain data and rendered by the template, never injected as HTML, so nothing in a reply can
 * ever become markup. Site paths ("/products/...") navigate in-app; http(s) links open in a
 * new tab; anything else renders as plain text.
 */
export type InlineNode =
  | { kind: 'text'; text: string }
  | { kind: 'strong' | 'em'; children: InlineNode[] }
  | { kind: 'route' | 'external'; label: string; href: string };

/** One rendered line; a paragraph or list item holds several, joined by line breaks. */
type Line = InlineNode[];

export type Block = { type: 'p'; lines: Line[] } | { type: 'ul' | 'ol'; items: Line[][] };

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g;
const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)$/;

export function parseInline(text: string): InlineNode[] {
  return text
    .split(INLINE)
    .filter(Boolean)
    .map((part): InlineNode => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return { kind: 'strong', children: parseInline(part.slice(2, -2)) };
      }
      const link = part.match(LINK);
      if (link) {
        const [, label, href] = link;
        if (href.startsWith('/') && !href.startsWith('//')) return { kind: 'route', label, href };
        if (/^https?:\/\//i.test(href)) return { kind: 'external', label, href };
        return { kind: 'text', text: label };
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return { kind: 'em', children: parseInline(part.slice(1, -1)) };
      }
      return { kind: 'text', text: part };
    });
}

export function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  // Asserted, not annotated: flushList() resets it from inside a closure, which TypeScript's
  // narrowing can't see, so a plain `= null` would leave it typed as never inside the loop.
  let list = null as { type: 'ul' | 'ol'; items: string[] } | null;
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'p', lines: paragraph.map(parseInline) });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push({ type: list.type, items: list.items.map((item) => item.split('\n').map(parseInline)) });
    list = null;
  };

  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flushParagraph();
      const type = bullet ? 'ul' : 'ol';
      if (list?.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list!.items.push((bullet || numbered)![1]);
    } else if (!line) {
      // A list carries on across blank lines between its items; text that follows ends it.
      flushParagraph();
    } else if (list && /^\s/.test(raw)) {
      // An indented line under a bullet is more of that item, not the end of the list.
      const items: string[] = list.items;
      items[items.length - 1] += `\n${line}`;
    } else {
      flushList();
      // Headings aren't part of the chat's style; one that slips through reads fine as bold.
      const heading = line.match(/^#{1,6}\s+(.*)$/);
      paragraph.push(heading ? `**${heading[1]}**` : line);
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

@Component({
  selector: 'app-chat-markdown',
  imports: [NgTemplateOutlet],
  templateUrl: './chat-markdown.html',
})
export class ChatMarkdown {
  private router = inject(Router);

  readonly text = input.required<string>();
  /** Fires when a site link is followed, so the full-screen chat can get out of the way. */
  readonly navigate = output<void>();

  protected readonly blocks = computed(() => toBlocks(this.text()));

  protected follow(event: MouseEvent, href: string): void {
    event.preventDefault();
    this.navigate.emit();
    this.router.navigateByUrl(href);
  }
}
