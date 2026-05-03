import { useState } from "react";
import { motion } from "framer-motion";

import { api } from "../api/client.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const [settings, setSettings] = useState({
    department: user.department ?? "",
    graduation_year: user.graduation_year ?? "",
    portfolio_url: user.portfolio_url ?? "",
    email_notifications: user.email_notifications,
  });
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function updateSetting(event) {
    const { name, value, type, checked } = event.target;
    setSettings((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function updatePassword(event) {
    const { name, value } = event.target;
    setPasswords((current) => ({ ...current, [name]: value }));
  }

  async function saveSettings(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    const updated = await api.updateMe({
      department: settings.department,
      graduation_year: settings.graduation_year ? Number(settings.graduation_year) : null,
      portfolio_url: settings.portfolio_url,
      email_notifications: settings.email_notifications,
    });
    setUser(updated);
    setNotice("Settings saved");
  }

  async function changePassword(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await api.changePassword(passwords);
      setPasswords({ current_password: "", new_password: "" });
      setNotice("Password changed");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="settings-grid">
      <motion.form className="glass-panel stack settings-card" onSubmit={saveSettings} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <p className="eyebrow">Preferences</p>
          <h2>Student settings</h2>
        </div>
        <label>
          <span>Department</span>
          <input name="department" value={settings.department} onChange={updateSetting} placeholder="Computer Science" />
        </label>
        <label>
          <span>Graduation year</span>
          <input
            name="graduation_year"
            type="number"
            min="2024"
            max="2040"
            value={settings.graduation_year}
            onChange={updateSetting}
          />
        </label>
        <label>
          <span>Portfolio link</span>
          <input name="portfolio_url" value={settings.portfolio_url} onChange={updateSetting} placeholder="https://..." />
        </label>
        <label className="toggle-row">
          <span>Email notifications</span>
          <input
            name="email_notifications"
            type="checkbox"
            checked={settings.email_notifications}
            onChange={updateSetting}
          />
        </label>
        {notice && <p className="success">{notice}</p>}
        <button className="primary" type="submit">
          Save Settings
        </button>
      </motion.form>

      <motion.form
        className="glass-panel stack settings-card password-card"
        onSubmit={changePassword}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <div>
          <p className="eyebrow">Security</p>
          <h2>Change password</h2>
        </div>
        <label>
          <span>Current password</span>
          <input
            name="current_password"
            type="password"
            value={passwords.current_password}
            onChange={updatePassword}
            required
          />
        </label>
        <label>
          <span>New password</span>
          <input
            name="new_password"
            type="password"
            minLength="8"
            maxLength="72"
            value={passwords.new_password}
            onChange={updatePassword}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        {notice && <p className="success">{notice}</p>}
        <button className="primary" type="submit">
          Update Password
        </button>
      </motion.form>
    </section>
  );
}
