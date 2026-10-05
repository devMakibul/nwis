import api from "@/services/api";
import type { LoginRequest, TokenResponse } from "@/types";

export const authService = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>("/api/auth/login", data);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get("/api/auth/me");
    return response.data;
  },
};
