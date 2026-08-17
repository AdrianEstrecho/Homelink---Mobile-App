import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.homelink.mobile',
  appName: 'HomeLink',
  webDir: 'dist/mobile/browser',
  plugins: {
    SplashScreen: {
      backgroundColor: '#0f2b5b',
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
