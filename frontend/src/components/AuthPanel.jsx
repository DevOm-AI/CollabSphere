import { useEffect, useState } from "react";

import { api } from "../api/client.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function AuthPanel() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", college: "", invite_code: "" });
  const [colleges, setColleges] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "signup") return;
    const timer = setTimeout(() => {
      api
        .listColleges({ q: form.college, limit: 80 })
        .then(setColleges)
        .catch(() => setColleges([]));
    }, 160);
    return () => clearTimeout(timer);
  }, [mode, form.college]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      if (mode === "signup") {
        await signup({
          name: form.name,
          email: form.email,
          password: form.password,
          college: form.college,
          invite_code: form.invite_code || null,
        });
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
          <>
            <label>
              Name
              <input name="name" value={form.name} onChange={updateField} required />
            </label>
            <label>
              College
              <input
                list="college-options"
                name="college"
                value={form.college}
                onChange={updateField}
                placeholder="Search your college"
                required
              />
              <datalist id="college-options">
                {colleges.map((college) => (
                  <option key={college} value={college} />
                ))}
              </datalist>
            </label>
            <label>
              Invite code
              <input
                name="invite_code"
                value={form.invite_code}
                onChange={updateField}
                placeholder="Optional campus code"
              />
            </label>
          </>
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
