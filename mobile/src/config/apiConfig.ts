import { Platform } from 'react-native';

/** Host machine from Android emulator; use your LAN IP for a physical device. */
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

/** Laravel `php artisan serve` defaults to port 8000; change if yours differs. */
const DEV_PORT = 8000;

export const API_BASE_URL = __DEV__
  ? `http://${DEV_HOST}:${DEV_PORT}`
  : 'https://your-api.example.com';
