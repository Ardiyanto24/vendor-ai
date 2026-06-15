import { apiFetch } from './client';
import { User } from 'types';

export interface FrontendUser extends Omit<User, 'avatar_url'> {
  avatarUrl?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: FrontendUser;
}

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logoutUser(): Promise<void> {
  return apiFetch<void>('/api/v1/auth/logout', {
    method: 'POST',
  });
}

export async function refreshToken(): Promise<{ accessToken: string }> {
  return apiFetch<{ accessToken: string }>('/api/v1/auth/refresh', {
    method: 'POST',
  });
}

export async function getMe(): Promise<FrontendUser> {
  return apiFetch<FrontendUser>('/api/v1/users/me');
}
