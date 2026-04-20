const API_URL = "https://api.base44.com/auth";

// 🔐 LOGIN
export async function login(email, password) {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Login failed");
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));

  return data.user;
}

// 🚪 LOGOUT
export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

// 👤 GET USER
export function getUser() {
  return JSON.parse(localStorage.getItem("user"));
}

// 🔒 CHECK LOGIN
export function isAuthenticated() {
  return !!localStorage.getItem("token");
}