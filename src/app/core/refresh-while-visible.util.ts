import { DestroyRef, inject } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';

/**
 * Re-runs `reload` whenever the screen comes back into view (the APK resumed, the browser tab
 * shown again) and, with `everyMs`, on a timer while it's in view — so an order or booking a
 * customer just paid for turns up on an admin list that's already open. Call it from a
 * constructor (it needs an injection context); it stops when the component is destroyed.
 */
export function refreshWhileVisible(reload: () => void, everyMs = 0): void {
  const destroyRef = inject(DestroyRef);
  const visible = () => document.visibilityState === 'visible';

  let handle: Promise<PluginListenerHandle> | null = null;
  const onVisibility = () => visible() && reload();
  if (Capacitor.isNativePlatform()) {
    handle = App.addListener('resume', reload);
  } else {
    document.addEventListener('visibilitychange', onVisibility);
  }
  const timer = everyMs ? setInterval(() => visible() && reload(), everyMs) : null;

  destroyRef.onDestroy(() => {
    handle?.then((h) => h.remove());
    document.removeEventListener('visibilitychange', onVisibility);
    if (timer) clearInterval(timer);
  });
}
