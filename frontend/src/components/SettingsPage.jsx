import { useState } from "react";

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
      <form className="glass-panel stack settings-card" onSubmit={saveSettings}>
        <div>
          <p className="eyebrow">Preferences</p>
          <h2>Student settings</h2>
        </div>
        <label>
          Department
          <input name="department" value={settings.department} onChange={updateSetting} placeholder="Computer Science" />
        </label>
        <label>
          Graduation year
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
          Portfolio link
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
      </form>

      <form className="glass-panel stack settings-card password-card" onSubmit={changePassword}>
        <div>
          <p className="eyebrow">Security</p>
          <h2>Change password</h2>
        </div>
        <label>
          Current password
          <input
            name="current_password"
            type="password"
            value={passwords.current_password}
            onChange={updatePassword}
            required
          />
        </label>
        <label>
          New password
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
      </form>
    </section>
  );
}
