import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { api } from "../api/client.js";
import { useAuth } from "../state/AuthContext.jsx";
import { listToText, parseList } from "../utils/lists.js";

export default function ProfileForm() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name,
    mobile_number: user.mobile_number ?? "",
    skills: user.skills ?? [],
    interests: listToText(user.interests),
    contributions: listToText(user.contributions),
  });
  const [expanded, setExpanded] = useState(false);
  const [skillDraft, setSkillDraft] = useState("");
  const [message, setMessage] = useState("");

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    const updated = await api.updateMe({
      name: form.name,
      mobile_number: form.mobile_number,
      skills: form.skills,
      interests: parseList(form.interests),
      contributions: parseList(form.contributions),
    });
    setUser(updated);
    setMessage("Profile saved");
  }

  function addSkill(event) {
    event.preventDefault();
    const skill = skillDraft.trim();
    if (!skill || form.skills.some((item) => item.toLowerCase() === skill.toLowerCase())) return;
    setForm((current) => ({ ...current, skills: [...current.skills, skill] }));
    setSkillDraft("");
  }

  function removeSkill(skill) {
    setForm((current) => ({ ...current, skills: current.skills.filter((item) => item !== skill) }));
  }

  return (
    <section className="panel stack">
      <button className="secondary collapse-trigger" type="button" onClick={() => setExpanded((value) => !value)}>
        Edit Profile
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.form
            className="stack"
            onSubmit={submit}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="profile-hero">
              <div className="avatar-orb">{user.name.charAt(0).toUpperCase()}</div>
              <p className="eyebrow">Profile</p>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
            </div>
            <label>
              <span>Name</span>
              <input name="name" value={form.name} onChange={updateField} required />
            </label>
            <label>
              <span>Mobile number</span>
              <input name="mobile_number" value={form.mobile_number} onChange={updateField} placeholder="+91 98765 43210" />
            </label>
            <div className="stack">
              <span className="label-text">Skills</span>
              <div className="tags editable-tags">
                {form.skills.map((skill) => (
                  <span key={skill}>
                    {skill}
                    <button type="button" onClick={() => removeSkill(skill)} aria-label={`Remove ${skill}`}>
                      x
                    </button>
                  </span>
                ))}
              </div>
              <div className="inline-actions">
                <input value={skillDraft} onChange={(event) => setSkillDraft(event.target.value)} placeholder="Add a skill" />
                <button className="secondary" type="button" onClick={addSkill}>
                  Add
                </button>
              </div>
            </div>
            <label>
              <span>Interests</span>
              <input name="interests" value={form.interests} onChange={updateField} placeholder="Research, SaaS" />
            </label>
            <label>
              <span>Contributions</span>
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
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  );
}
