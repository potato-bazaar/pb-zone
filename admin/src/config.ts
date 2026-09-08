const DEFAULT_API = "https://pbzone-api.potatobazaar.com";

export function quizApiBase() {
  const raw = import.meta.env.VITE_QUIZ_API_BASE_URL || DEFAULT_API;
  return raw.replace(/\/$/, "") || DEFAULT_API;
}

export function adminApiKey() {
  return import.meta.env.VITE_ADMIN_API_KEY || "";
}
