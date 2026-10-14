import Constants from 'expo-constants';

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];

export const API_BASE_URL = (
  configuredBaseUrl || `http://${expoHost || 'localhost'}:8000`
).replace(/\/+$/, '');
