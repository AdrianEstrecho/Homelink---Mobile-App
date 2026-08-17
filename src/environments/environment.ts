// Production config — this is what gets baked into the Capacitor/Android build.
// Confirmed (Phase 8) by reading the deployed web frontend's own JS bundle for
// its configured VITE_API_URL, then verified live via GET /api/health — this is
// the real Render URL, not render.yaml's service-name guess (Render appended a
// disambiguating suffix that isn't visible in the source repo).
export const environment = {
  production: true,
  apiUrl: 'https://homelink-backend-vwg8.onrender.com/api',
  paymongoPublicKey: 'pk_test_fSZmDSLvA8mWyjqG8B1LxFEs',
};
