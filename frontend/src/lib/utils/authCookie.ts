export const authCookie = {
  setToken(token: string) {
    if (typeof document !== "undefined") {
      document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;
    }
  },
  clearToken() {
    if (typeof document !== "undefined") {
      document.cookie = "token=; path=/; max-age=0; SameSite=Lax";
    }
  },
  getToken(): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
    return match ? match[1] : null;
  },
};
