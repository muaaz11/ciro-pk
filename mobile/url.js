import Constants from 'expo-constants';

let resolvedUrl = 'https://ciro-pk-production.up.railway.app';

if (__DEV__) {
  // If we are in development mode, resolve the host IP dynamically
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    resolvedUrl = `http://${ip}:4000`;
  } else {
    // Emulator localhost fallback
    resolvedUrl = 'http://10.0.2.2:4000';
  }
}

export const app_url = resolvedUrl;
console.log('[CIRO Config] Resolved backend URL:', app_url);