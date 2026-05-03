import { useState } from "react";

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
    <form className="post-form stack" onSubmit={submit}>
      <div>
        <p className="eyebrow">New Collaboration</p>
        <h2>Create a post</h2>
      </div>
      <label>
        Title
        <input name="title" value={form.title} onChange={updateField} required />
      </label>
      <label>
        Post type
        <select name="post_type" value={form.post_type} onChange={updateField}>
          {postTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label>
        Description
        <textarea name="description" value={form.description} onChange={updateField} required />
      </label>
      <label>
        Required skills
        <input
          name="required_skills"
          value={form.required_skills}
          onChange={updateField}
          placeholder="FastAPI, NLP, Figma"
        />
      </label>
      <label>
        Slots
        <input name="slots" type="number" min="1" max="50" value={form.slots} onChange={updateField} required />
      </label>
      <label>
        Event date and time
        <input name="event_datetime" type="datetime-local" value={form.event_datetime} onChange={updateField} />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="primary" type="submit">
        Publish
      </button>
    </form>
  );
}
