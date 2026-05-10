import axios from 'axios';

export function getApiErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Try again.',
): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const data = err.response.data as Record<string, unknown>;
    const errors = data.errors;
    if (errors && typeof errors === 'object') {
      const record = errors as Record<string, string[]>;
      for (const key of Object.keys(record)) {
        const msgs = record[key];
        if (Array.isArray(msgs) && typeof msgs[0] === 'string') {
          return msgs[0];
        }
      }
    }
    if (typeof data.message === 'string') {
      return data.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}
