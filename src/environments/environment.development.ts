// Dev config, used by `ng serve`. `/api` is proxied to the locally running
// backend (see proxy.conf.json), mirroring frontend/vite.config.js's dev proxy.
export const environment = {
  production: false,
  apiUrl: '/api',
  paymongoPublicKey: 'pk_test_fSZmDSLvA8mWyjqG8B1LxFEs',
};
