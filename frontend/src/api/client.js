const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:8000/ws";

function authHeaders() {
  const token = localStorage.getItem("collabsphere_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...options.headers,
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.detail ?? "Something went wrong");
  }

  return data;
}

export const api = {
  signup: (payload) => request("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  listColleges: ({ q = "", limit = 50 } = {}) => {
    const params = new URLSearchParams({ q, limit });
    return request(`/colleges?${params.toString()}`);
  },
  me: () => request("/users/me"),
  updateMe: (payload) => request("/users/me", { method: "PUT", body: JSON.stringify(payload) }),
  myPortfolio: () => request("/users/me/portfolio"),
  changePassword: (payload) => request("/users/me/password", { method: "PUT", body: JSON.stringify(payload) }),
  listCollaborations: ({ limit = 20, offset = 0, scope = "college", matchMySkills = false, minSkillMatches = 1 } = {}) => {
    const params = new URLSearchParams({ limit, offset, scope });
    if (matchMySkills) {
      params.set("match_my_skills", "true");
      params.set("min_skill_matches", minSkillMatches);
    }
    return request(`/collaborations?${params.toString()}`);
  },
  createCollaboration: (payload) =>
    request("/collaborations", { method: "POST", body: JSON.stringify(payload) }),
  updateCollaboration: (id, payload) =>
    request(`/collaborations/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCollaboration: (id) => request(`/collaborations/${id}`, { method: "DELETE" }),
  getCollaboration: (id) => request(`/collaborations/${id}`),
  apply: (id, payload) =>
    request(`/collaborations/${id}/apply`, { method: "POST", body: JSON.stringify(payload) }),
  listApplications: (id) => request(`/collaborations/${id}/applications`),
  myCollaborations: () => request("/users/me/collaborations"),
  generateInvite: () => request("/invite/generate", { method: "POST" }),
  decideApplication: (collaborationId, applicationId, status) =>
    request(`/collaborations/${collaborationId}/applications/${applicationId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

export function collaborationSocketUrl(id) {
  return `${WS_BASE_URL}/collaborations/${id}`;
}
