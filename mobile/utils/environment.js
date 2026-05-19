import Constants from 'expo-constants';

/**
 * Checks if the application is currently running inside the Expo Go app.
 * Expo SDK 53+ removed remote notifications support from Expo Go on Android,
 * so we bypass native push registrations in Expo Go.
 * 
 * @returns {boolean} True if running in Expo Go, false otherwise.
 */
export const isExpoGo = () => {
  return Constants.appOwnership === 'expo';
};

/**
 * Returns the current application ownership type.
 * @returns {string} 'expo' (Expo Go), 'standalone' (Production/Dev Client), or 'guest'.
 */
export const getAppOwnership = () => {
  return Constants.appOwnership || 'standalone';
};
