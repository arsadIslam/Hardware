import { httpClient } from './httpClient';

export type LoginResponse = {
  token: string;
  token_type: string;
  user: {
    id: number;
    name: string;
    phone: string;
  };
};

export async function login(
  phone: string,
  password: string,
): Promise<LoginResponse> {
  const { data } = await httpClient.post<LoginResponse>('/login', {
    phone,
    password,
  });
  return data;
}
