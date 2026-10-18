import { Injectable, computed, effect, signal } from '@angular/core';

import { TEAMS } from './about.data';

const TEAM_KEY = 'homelink_dev_team';

/**
 * Which of TEAMS the Developers page shows, and the About hub's team strip with it. Kept in
 * localStorage so the choice holds when you leave the page and when the app is reopened.
 */
@Injectable({ providedIn: 'root' })
export class TeamChoiceService {
  readonly index = signal(this.load());
  readonly team = computed(() => TEAMS[this.index()].members);

  constructor() {
    effect(() => {
      localStorage.setItem(TEAM_KEY, String(this.index()));
    });
  }

  private load(): number {
    try {
      const saved = Number(localStorage.getItem(TEAM_KEY));
      return Number.isInteger(saved) && saved >= 0 && saved < TEAMS.length ? saved : 0;
    } catch {
      return 0;
    }
  }
}
