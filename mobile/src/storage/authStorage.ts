import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@hardware_auth';

export type StoredAuth = {
  token: string;
  user: {
    id: number;
    name: string;
    phone: string;
  };
};

export async function loadStoredAuth(): Promise<StoredAuth | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export async function saveStoredAuth(auth: StoredAuth): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(auth));
}

export async function clearStoredAuth(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
