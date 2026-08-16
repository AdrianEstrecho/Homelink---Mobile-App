// Production config — this is what gets baked into the Capacitor/Android build.
//
// TODO(confirm before Phase 8 / shipping a build): apiUrl is a best guess based on
// render.yaml's service name ("homelink-backend") and Render's standard
// <service-name>.onrender.com convention. A direct probe returned an unexplained
// 403 from Render's edge (not a DNS/routing failure — it resolves to a real Render
// service) rather than a clean /api/health response, so this could not be
// confirmed read-only. Verify the exact URL from the Render dashboard
// (Service -> Settings) before building the APK that ships to a device.
export const environment = {
  production: true,
  apiUrl: 'https://homelink-backend.onrender.com/api',
  paymongoPublicKey: 'pk_test_fSZmDSLvA8mWyjqG8B1LxFEs',
};
