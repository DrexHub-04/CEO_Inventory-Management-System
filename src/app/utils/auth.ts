const TOKEN_KEY = "inventory_auth_token";
const USER_KEY = "inventory_auth_user";

export function setAuth(token: string, username: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, username);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAuth() {
  return { token: localStorage.getItem(TOKEN_KEY), username: localStorage.getItem(USER_KEY) };
}

export function isAuthenticated() {
  return !!localStorage.getItem(TOKEN_KEY);
}

// Get authorization header for API requests
export function getAuthHeader(): HeadersInit {
  const { token } = getAuth();
  return {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : "",
  };
}
