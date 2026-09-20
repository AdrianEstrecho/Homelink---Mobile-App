import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.homelink.mobile',
  appName: 'HomeLink',
  webDir: 'dist/mobile/browser',
  plugins: {
    SplashScreen: {
      backgroundColor: '#0f2b5b',
      androidScaleType: 'CENTER_CROP',
      // The app hides this itself, one frame after the in-app splash paints
      // (see App.runSplash) -- on a timer the two would either overlap or
      // leave a white webview gap between them.
      launchAutoHide: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
  },
};

export default config;
