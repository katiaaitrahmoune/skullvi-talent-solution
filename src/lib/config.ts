// Backend base URL. Accepts "https://host", "https://host/" or "https://host/api/".
// Set NEXT_PUBLIC_API_URL in the hosting dashboard; the fallback is the deployed SKULLVI API.
const raw = process.env.NEXT_PUBLIC_API_URL || "https://skullvi-talent-solution.onrender.com";
export const API_BASE = raw.replace(/\/+$/, "").replace(/\/api$/, "");
export const TOKEN_COOKIE = "skv_token";
