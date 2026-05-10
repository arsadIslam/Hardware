import axios from 'axios';

import { API_BASE_URL } from '../config/apiConfig';

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export const httpClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

httpClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});
