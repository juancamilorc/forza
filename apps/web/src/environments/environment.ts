const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';

export const environment = {
  production: !isLocal,
  apiUrl: isLocal
    ? 'http://localhost:3000/api'
    : 'https://forza-production-cac6.up.railway.app/api',
};
