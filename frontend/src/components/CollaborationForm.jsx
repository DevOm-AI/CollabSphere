import { useState } from "react";
import { motion } from "framer-motion";

import { api } from "../api/client.js";
import { parseList } from "../utils/lists.js";

const postTypes = ["Event", "Hackathon", "Ideathon", "Conference", "Research", "Project"];

export default function CollaborationForm({ onCreated }) {
  const [form, setForm] = useState({
    title: "",
    post_type: "Event",
    description: "",
    required_skills: "",
    slots: 2,
    event_datetime: "",
  });
  const [error, setError] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const created = await api.createCollaboration({
        title: form.title,
        post_type: form.post_type,
        description: form.description,
        required_skills: parseList(form.required_skills),
        slots: Number(form.slots),
        event_datetime: form.event_datetime || null,
      });
      setForm({ title: "", post_type: "Event", description: "", required_skills: "", slots: 2, event_datetime: "" });
      onCreated(created);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <motion.form className="post-form stack" onSubmit={submit} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <p className="eyebrow">New Collaboration</p>
        <h2>Create a post</h2>
      </div>
      <label>
        <span>Title</span>
        <input name="title" value={form.title} onChange={updateField} required />
      </label>
      <label>
        <span>Post type</span>
        <select name="post_type" value={form.post_type} onChange={updateField}>
          {postTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Description</span>
        <textarea name="description" value={form.description} onChange={updateField} required />
      </label>
      <label>
        <span>Required skills</span>
        <input
          name="required_skills"
          value={form.required_skills}
          onChange={updateField}
          placeholder="FastAPI, NLP, Figma"
        />
      </label>
      <label>
        <span>Slots</span>
        <input name="slots" type="number" min="1" max="50" value={form.slots} onChange={updateField} required />
      </label>
      <label>
        <span>Event date and time</span>
        <input name="event_datetime" type="datetime-local" value={form.event_datetime} onChange={updateField} />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="primary" type="submit">
        Publish
      </button>
    </motion.form>
  );
}
