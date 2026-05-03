import { useState } from "react";

import { api } from "../api/client.js";
import { useAuth } from "../state/AuthContext.jsx";
import { listToText, parseList } from "../utils/lists.js";

export default function ProfileForm() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name,
    mobile_number: user.mobile_number ?? "",
    skills: listToText(user.skills),
    interests: listToText(user.interests),
    contributions: listToText(user.contributions),
  });
  const [message, setMessage] = useState("");

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    const updated = await api.updateMe({
      name: form.name,
      mobile_number: form.mobile_number,
      skills: parseList(form.skills),
      interests: parseList(form.interests),
      contributions: parseList(form.contributions),
    });
    setUser(updated);
    setMessage("Profile saved");
  }

  return (
    <form className="panel stack" onSubmit={submit}>
      <div className="profile-hero">
        <div className="avatar-orb">{user.name.charAt(0).toUpperCase()}</div>
        <p className="eyebrow">Profile</p>
        <h2>{user.name}</h2>
        <p>{user.email}</p>
      </div>
      <label>
        Name
        <input name="name" value={form.name} onChange={updateField} required />
      </label>
      <label>
        Mobile number
        <input name="mobile_number" value={form.mobile_number} onChange={updateField} placeholder="+91 98765 43210" />
      </label>
      <label>
        Skills
        <input name="skills" value={form.skills} onChange={updateField} placeholder="React, Python, ML" />
      </label>
      <label>
        Interests
        <input name="interests" value={form.interests} onChange={updateField} placeholder="Research, SaaS" />
      </label>
      <label>
        Contributions
        <textarea
          name="contributions"
          value={form.contributions}
          onChange={updateField}
          placeholder="Backend APIs, UI design, datasets"
        />
      </label>
      {message && <p className="success">{message}</p>}
      <button className="primary" type="submit">
        Save Profile
      </button>
    </form>
  );
}
