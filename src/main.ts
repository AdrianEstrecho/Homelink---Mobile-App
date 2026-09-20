import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .then(() => {
    // The pre-boot splash lives inside <app-root> (see index.html) and Angular
    // discards it on bootstrap -- but remove it explicitly rather than relying
    // on that, since a leftover would sit at z-index 200 over the whole app.
    document.getElementById('boot-splash')?.remove();
  })
  .catch((err) => console.error(err));
