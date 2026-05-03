import { useState } from "react";

import { useAuth } from "../state/AuthContext.jsx";

export default function AuthPanel() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      if (mode === "signup") {
        await signup(form);
      } else {
        await login({ email: form.email, password: form.password });
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-copy">
        <p className="eyebrow">CollabSphere</p>
        <h1>Find the right students for the work worth building.</h1>
        <p>
          Create project, hackathon, and research collaborations, review applicants, and keep slots
          accurate as teammates join.
        </p>
      </section>
      <form className="panel auth-panel" onSubmit={submit}>
        <div className="segmented">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            Login
          </button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>
            Signup
          </button>
        </div>
        {mode === "signup" && (
          <label>
            Name
            <input name="name" value={form.name} onChange={updateField} required />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={updateField} required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            minLength="8"
            value={form.password}
            onChange={updateField}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit">
          {mode === "signup" ? "Create Account" : "Login"}
        </button>
      </form>
    </main>
  );
}
