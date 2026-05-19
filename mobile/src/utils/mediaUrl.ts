import { Platform } from 'react-native';

import { API_BASE_URL } from '../config/apiConfig';

const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const DEV_PORT = 8000;

/** Rewrites Laravel localhost storage URLs so the Android emulator can load them. */
export function resolveMediaUrl(
  url: string | null | undefined,
): string | null {
  if (url == null || url === '') {
    return null;
  }
  if (__DEV__ && Platform.OS === 'android') {
    return url
      .replace('http://localhost:8000', `http://${DEV_HOST}:${DEV_PORT}`)
      .replace('http://127.0.0.1:8000', `http://${DEV_HOST}:${DEV_PORT}`);
  }
  if (url.startsWith('/')) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
}
