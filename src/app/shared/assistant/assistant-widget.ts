import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import {
  LucideChevronRight,
  LucideCircleAlert,
  LucideRotateCcw,
  LucideSend,
  LucideSparkles,
  LucideX,
} from '@lucide/angular';
import { filter, map } from 'rxjs/operators';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { PricePipe } from '../../core/price.pipe';
import { isChromelessRoute } from '../../core/shell-route.util';
import { SafeImage } from '../safe-image/safe-image';
import { ChatMarkdown } from './chat-markdown';

/**
 * Port of frontend/src/components/assistant/AssistantWidget.jsx — the Gemini-backed shopping
 * assistant, talking to the same backend/routes/assistant.js. Mobile differences: the chat is
 * always full screen (the web only goes full screen under its sm breakpoint), and with no hover
 * on a phone, the speech bubble beside the mascot slides out once by itself shortly after launch
 * instead of on hover.
 */

// The server only ever looks at this many recent messages, so there's no point sending more.
const HISTORY_SENT = 16;
const MAX_CHARS = 2000;

const SUGGESTIONS = [
  'Best CCTV setup for ₱10,000?',
  'Aircon plus installation under ₱40,000',
  'Tell me about HomeLink',
  'What payment methods do you accept?',
];

// What the speech bubble beside the closed chat button cycles through, under "Ask HomeLink AI".
const LAUNCHER_HINTS = ['Find the best fit for your budget', 'Products, installation & more', 'Delivery, payments & promos'];

/**
 * The assistant's mascot. The full figure is the chat button and changes pose with the chat:
 * standing at rest, waving (hi) while his speech bubble is out, jumping as he's tapped, thinking
 * while the chat is open or the customer is typing, and lighting up (answer) once a reply lands.
 * Every pose shares one frame, so swapping them never shifts his feet. The heads are his avatar
 * inside the chat.
 */
type Pose = 'standing' | 'hi' | 'jump' | 'thinking' | 'answer';
const MASCOT_POSES: Pose[] = ['standing', 'hi', 'jump', 'thinking', 'answer'];
const HOP_MS = 800;
/** The chat covers the whole screen, so it opens just after he takes off — otherwise nobody sees the jump. */
const OPEN_DELAY_MS = 380;
/** The intro bubble waits for the launch splash (~2.65s, see App.runSplash) to clear first. */
const INTRO_DELAY_MS = 3400;
const INTRO_HINT_MS = 2600;
const INTRO_HINTS_SHOWN = 3;

/** Detail pages pin a buy/book bar to the bottom edge; the mascot stands on top of it there. */
const BOTTOM_BAR_ROUTE = /^\/(products|services)\/[^/]+$/;

export interface AssistantItem {
  type: 'product' | 'service';
  name: string;
  slug: string;
  price: number;
  image?: string | null;
  category?: string | null;
  url: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  items?: AssistantItem[];
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const mascotPose = (pose: Pose) => `/mascot/${pose}.webp`;
export const mascotHead = (pose: 'hi' | 'thinking' | 'answer') => `/mascot/${pose}-head.webp`;

@Component({
  selector: 'app-assistant-widget',
  imports: [
    RouterLink,
    SafeImage,
    PricePipe,
    ChatMarkdown,
    LucideChevronRight,
    LucideCircleAlert,
    LucideRotateCcw,
    LucideSend,
    LucideSparkles,
    LucideX,
  ],
  templateUrl: './assistant-widget.html',
  styleUrl: './assistant-widget.css',
})
export class AssistantWidget {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  protected readonly MASCOT_POSES = MASCOT_POSES;
  protected readonly MAX_CHARS = MAX_CHARS;
  protected readonly LAUNCHER_HINTS = LAUNCHER_HINTS;
  protected readonly mascotPose = mascotPose;
  protected readonly mascotHead = mascotHead;

  private readonly scrollList = viewChild<ElementRef<HTMLDivElement>>('scrollList');
  private readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');

  protected readonly enabled = signal(false);
  protected readonly open = signal(false);
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly input = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Counts taps on the mascot; each new value remounts him with the jump animation. */
  protected readonly hops = signal(0);
  protected readonly jumping = signal(false);
  /** True from the moment a reply lands until the customer starts typing again. */
  protected readonly answered = signal(false);
  protected readonly hint = signal(0);
  /** The speech bubble's one unprompted appearance per app session. */
  protected readonly introducing = signal(false);
  /** Set only while the on-screen keyboard shrinks the visual viewport (see syncViewport). */
  protected readonly viewport = signal<{ top: number; height: number } | null>(null);

  // Bumped by every request and by "new chat", so a reply that lands after the conversation it
  // belonged to was cleared can't write itself back in.
  private requestId = 0;
  private openTimer?: ReturnType<typeof setTimeout>;
  private jumpTimer?: ReturnType<typeof setTimeout>;
  private introTimers: ReturnType<typeof setTimeout>[] = [];
  private introPlayed = false;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split(/[?#]/)[0]),
    ),
    { initialValue: this.router.url.split(/[?#]/)[0] },
  );

  /** Kept mounted (just hidden) on the auth screens, so a guest the assistant sends off to log in
   *  comes back to the same conversation. Also hidden in the staff portal, like the web. */
  protected readonly hidden = computed(() => isChromelessRoute(this.url()));
  protected readonly overBottomBar = computed(() => BOTTOM_BAR_ROUTE.test(this.url()));

  protected readonly isCustomer = computed(() => this.auth.user()?.role === 'customer');
  protected readonly suggestions = computed(() =>
    this.isCustomer() ? [...SUGGESTIONS.slice(0, 3), 'Where is my latest order?'] : SUGGESTIONS,
  );
  protected readonly greeting = computed(() => {
    const user = this.auth.user();
    const name = this.isCustomer() && user?.firstName ? ` ${user.firstName}` : '';
    return `Hi${name}! I'm the HomeLink Assistant. Tell me your budget and what you need, and I'll suggest products and services that fit. I can also answer questions about HomeLink, delivery, payments and our policies.`;
  });

  protected readonly pose = computed<Pose>(() => {
    if (this.jumping()) return 'jump';
    if (!this.open()) return this.introducing() ? 'hi' : 'standing';
    return this.answered() && !this.loading() ? 'answer' : 'thinking';
  });
  /** Inside the chat his avatar only ever thinks or answers; keyed on that, so it pops on each change. */
  protected readonly headPose = computed<'thinking' | 'answer'>(() => (this.pose() === 'answer' ? 'answer' : 'thinking'));
  protected readonly hopKey = computed(() => [this.hops()]);
  protected readonly headKey = computed(() => [this.headPose()]);
  protected readonly hintKey = computed(() => [this.hint()]);

  constructor() {
    const destroyRef = inject(DestroyRef);

    // The chat button only appears once the backend confirms a Gemini key is configured.
    this.api
      .get<{ enabled?: boolean }>('/assistant/status')
      .then((data) => this.enabled.set(!!data.enabled))
      .catch(() => {});

    // Signing out wipes the conversation: it can hold that customer's orders and bookings, and
    // the next person on this phone shouldn't see them. Signing in keeps it, so a guest sent off
    // to log in picks up where they left off.
    let previousUserId = this.auth.user()?.id ?? null;
    effect(() => {
      const userId = this.auth.user()?.id ?? null;
      if (previousUserId && !userId) untracked(() => this.resetChat());
      previousUserId = userId;
    });

    effect(() => {
      if (this.enabled() && !this.hidden() && !this.introPlayed) untracked(() => this.scheduleIntro());
    });

    // A new reply is brought in from its first line, so a long answer with cards under it isn't
    // scrolled past; anything else (a sent message, the typing dots, an error) pins to the bottom.
    effect(() => {
      this.messages();
      const loading = this.loading();
      const error = this.error();
      if (!this.open()) return;
      requestAnimationFrame(() => {
        const list = this.scrollList()?.nativeElement;
        if (!list) return;
        const latest = list.querySelector<HTMLElement>('[data-latest-reply]');
        const top = latest && !loading && !error ? latest.offsetTop - 12 : list.scrollHeight;
        list.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      });
    });

    // Keep the chat clear of the on-screen keyboard. Where the WebView itself resizes, `inset-0`
    // already does this and the visual viewport matches the window, so nothing is set; where the
    // keyboard only shrinks the visual viewport, the panel is pinned to that instead.
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (vv) {
      const sync = () => this.syncViewport(vv);
      vv.addEventListener('resize', sync);
      vv.addEventListener('scroll', sync);
      destroyRef.onDestroy(() => {
        vv.removeEventListener('resize', sync);
        vv.removeEventListener('scroll', sync);
      });
    }

    destroyRef.onDestroy(() => {
      clearTimeout(this.openTimer);
      clearTimeout(this.jumpTimer);
      this.clearIntro();
    });
  }

  private syncViewport(vv: VisualViewport): void {
    if (!this.open()) return;
    const covered = window.innerHeight - vv.height > 80;
    this.viewport.set(covered ? { top: vv.offsetTop, height: vv.height } : null);
  }

  /** Slides the bubble out once, cycling its hints with him waving, then tucks it away. */
  private scheduleIntro(): void {
    this.introPlayed = true;
    const cycles = prefersReducedMotion() ? 1 : INTRO_HINTS_SHOWN;
    this.introTimers.push(
      setTimeout(() => {
        if (this.open() || this.hidden()) return;
        this.hint.set(0);
        this.introducing.set(true);
        for (let i = 1; i < cycles; i++) {
          this.introTimers.push(setTimeout(() => this.hint.set(i % LAUNCHER_HINTS.length), i * INTRO_HINT_MS));
        }
        this.introTimers.push(setTimeout(() => this.introducing.set(false), Math.max(cycles, 2) * INTRO_HINT_MS));
      }, INTRO_DELAY_MS),
    );
  }

  private clearIntro(): void {
    this.introTimers.forEach(clearTimeout);
    this.introTimers = [];
    this.introducing.set(false);
  }

  private async ask(history: ChatMessage[]): Promise<void> {
    const id = ++this.requestId;
    this.loading.set(true);
    this.error.set(null);
    try {
      const { reply, items } = await this.api.post<{ reply: string; items?: AssistantItem[] }>('/assistant/chat', {
        messages: history.slice(-HISTORY_SENT).map(({ role, content }) => ({ role, content })),
      });
      if (id === this.requestId) {
        this.messages.set([...history, { role: 'assistant', content: reply, items }]);
        this.answered.set(true);
      }
    } catch (err) {
      if (id === this.requestId) this.error.set((err as Error).message || 'Something went wrong. Please try again.');
    } finally {
      if (id === this.requestId) this.loading.set(false);
    }
  }

  protected send(text: string): void {
    const content = text.trim();
    if (!content || this.loading()) return;
    const history: ChatMessage[] = [...this.messages(), { role: 'user', content }];
    this.messages.set(history);
    this.setInput('');
    this.ask(history);
  }

  protected retry(): void {
    this.ask(this.messages());
  }

  protected resetChat(): void {
    this.requestId++;
    this.messages.set([]);
    this.error.set(null);
    this.loading.set(false);
    this.answered.set(false);
    this.setInput('');
  }

  /** Every tap makes the mascot jump; the chat opens just after he takes off. */
  protected toggleOpen(): void {
    this.hops.update((h) => h + 1);
    this.jumping.set(true);
    clearTimeout(this.jumpTimer);
    this.jumpTimer = setTimeout(() => this.jumping.set(false), HOP_MS);
    clearTimeout(this.openTimer);
    this.clearIntro();
    if (this.open()) {
      this.close();
      return;
    }
    // Opening starts him off thinking, even on a conversation he'd already answered.
    this.answered.set(false);
    this.openTimer = setTimeout(() => this.open.set(true), prefersReducedMotion() ? 0 : OPEN_DELAY_MS);
  }

  protected close(): void {
    this.open.set(false);
    this.viewport.set(null);
  }

  protected onInput(event: Event): void {
    this.setInput((event.target as HTMLTextAreaElement).value);
    this.answered.set(false);
  }

  protected onEnter(event: Event): void {
    const e = event as KeyboardEvent;
    if (e.shiftKey || e.isComposing) return;
    e.preventDefault();
    this.send(this.input());
  }

  private setInput(value: string): void {
    this.input.set(value);
    // Grow the textarea with its content, up to about five lines.
    requestAnimationFrame(() => {
      const el = this.textarea()?.nativeElement;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
    });
  }
}
