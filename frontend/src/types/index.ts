/**
 * TypeScript types shared across the application.
 */

export interface Role {
  id: number;
  name: "Admin" | "Drilling Engineer" | "Management";
  description?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}
