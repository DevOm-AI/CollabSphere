import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
      <motion.div
        className="auth-orb"
        animate={{ x: [0, 36, -18, 0], y: [0, -24, 20, 0], scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.section className="auth-copy" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <motion.div
          className="logo-mark"
          animate={{ rotate: [0, 8, -8, 0], boxShadow: ["0 0 18px rgba(124,58,237,.35)", "0 0 34px rgba(6,182,212,.45)", "0 0 18px rgba(124,58,237,.35)"] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <p className="eyebrow">CollabSphere</p>
        <h1>Find the right students for the work worth building.</h1>
        <p>
          Create project, hackathon, and research collaborations, review applicants, and keep slots
          accurate as teammates join.
        </p>
      </motion.section>
      <motion.form
        className="panel auth-panel"
        onSubmit={submit}
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42 }}
      >
        <div className="segmented">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            Login
          </button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>
            Signup
          </button>
        </div>
        <AnimatePresence initial={false}>
        {mode === "signup" && (
          <motion.div
            className="signup-fields"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <label>
              <span>Name</span>
              <input name="name" value={form.name} onChange={updateField} required />
            </label>
            <label>
              <span>College</span>
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
              <span>Invite code</span>
              <input
                name="invite_code"
                value={form.invite_code}
                onChange={updateField}
                placeholder="Optional campus code"
              />
            </label>
          </motion.div>
        )}
        </AnimatePresence>
        <label>
          <span>Email</span>
          <input name="email" type="email" value={form.email} onChange={updateField} required />
        </label>
        <label>
          <span>Password</span>
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
      </motion.form>
    </main>
  );
}
