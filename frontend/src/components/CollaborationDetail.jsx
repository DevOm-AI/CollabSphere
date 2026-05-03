import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { api, collaborationSocketUrl } from "../api/client.js";
import { useAuth } from "../state/AuthContext.jsx";
import { listToText, parseList } from "../utils/lists.js";

const postTypes = ["Event", "Hackathon", "Ideathon", "Conference", "Research", "Project"];

function formatDateTime(value) {
  if (!value) return "Date not set";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

export default function CollaborationDetail({ id, appliedStatus, onChanged, onDeleted, onApplicationChanged }) {
  const { user } = useAuth();
  const [collaboration, setCollaboration] = useState(null);
  const [applications, setApplications] = useState([]);
  const [message, setMessage] = useState("");
  const [offeredSkills, setOfferedSkills] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);

  useEffect(() => {
    if (!id) return;
    setError("");
    setNotice("");
    setIsEditing(false);
    api.getCollaboration(id).then(setCollaboration).catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (!id || !collaboration || collaboration.owner.id !== user.id) return;
    api.listApplications(id).then(setApplications).catch((err) => setError(err.message));
  }, [id, collaboration, user.id]);

  useEffect(() => {
    if (!id) return;
    const socket = new WebSocket(collaborationSocketUrl(id));
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (!data.payload) return;
      setCollaboration((current) => (current ? { ...current, ...data.payload } : current));
      onChanged((items) => items.map((item) => (item.id === id ? { ...item, ...data.payload } : item)));
    };
    return () => socket.close();
  }, [id, onChanged]);

  if (!id) {
    return (
      <section className="glass-panel empty-state">
        <h2>Select a post</h2>
        <p>Open a collaboration to apply, review students, or manage your team slots.</p>
      </section>
    );
  }

  if (!collaboration) {
    return <section className="glass-panel">Loading...</section>;
  }

  const isOwner = collaboration.owner.id === user.id;
  const isArchived = collaboration.is_archived;
  const messageLength = message.length;

  function beginEdit() {
    setEditForm({
      title: collaboration.title,
      post_type: collaboration.post_type,
      description: collaboration.description,
      required_skills: listToText(collaboration.required_skills),
      slots: collaboration.slots,
      event_datetime: toDateTimeLocal(collaboration.event_datetime),
    });
    setIsEditing(true);
  }

  function updateEditField(event) {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  }

  async function saveEdit(event) {
    event.preventDefault();
    setError("");
    const updated = await api.updateCollaboration(collaboration.id, {
      title: editForm.title,
      post_type: editForm.post_type,
      description: editForm.description,
      required_skills: parseList(editForm.required_skills),
      slots: Number(editForm.slots),
      event_datetime: editForm.event_datetime || null,
    });
    setCollaboration(updated);
    onChanged((items) => items.map((item) => (item.id === updated.id ? updated : item)));
    setIsEditing(false);
    setNotice("Post updated");
  }

  async function deletePost() {
    setError("");
    await api.deleteCollaboration(collaboration.id);
    onDeleted(collaboration.id);
  }

  async function apply(event) {
    event.preventDefault();
    setNotice("");
    setError("");
    try {
      await api.apply(collaboration.id, {
        message,
        offered_skills: parseList(offeredSkills),
      });
      setMessage("");
      setOfferedSkills("");
      setNotice("Application sent");
      onApplicationChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  function applyButtonLabel() {
    if (isArchived) return "Archived";
    if (appliedStatus === "accepted") return "Applied";
    if (appliedStatus === "pending") return "Application Pending";
    return "Apply";
  }

  async function kick(applicationId) {
    await decide(applicationId, "rejected");
  }

  async function decide(applicationId, status) {
    setError("");
    try {
      const updated = await api.decideApplication(collaboration.id, applicationId, status);
      setApplications((items) => items.map((item) => (item.id === applicationId ? updated : item)));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <motion.section
      className="glass-panel detail stack"
      initial={{ opacity: 0, x: 34 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28 }}
    >
      {isArchived && <div className="archived-banner">Archived collaboration. Applications and owner actions are closed.</div>}
      <div className="detail-head">
        <div>
          <p className="eyebrow">{isArchived ? "Archived Post" : "Open Post"}</p>
          <h2>{collaboration.title}</h2>
          <p className="muted">
            {collaboration.post_type} by {collaboration.owner.name}
          </p>
        </div>
        <span className={isArchived ? "badge archived" : collaboration.is_full ? "badge full" : "badge"}>
          {isArchived ? "Archived" : collaboration.is_full ? "Full" : `${collaboration.slots_available} Slots Available`}
        </span>
      </div>

      {error && <p className="error">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      {isEditing ? (
        <form className="edit-card stack" onSubmit={saveEdit}>
          <label>
            Title
            <input name="title" value={editForm.title} onChange={updateEditField} required />
          </label>
          <label>
            Post type
            <select name="post_type" value={editForm.post_type} onChange={updateEditField}>
              {postTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Description
            <textarea name="description" value={editForm.description} onChange={updateEditField} required />
          </label>
          <label>
            Required skills
            <input name="required_skills" value={editForm.required_skills} onChange={updateEditField} />
          </label>
          <div className="split-fields">
            <label>
              Slots
              <input name="slots" type="number" min="1" max="50" value={editForm.slots} onChange={updateEditField} />
            </label>
            <label>
              Event date and time
              <input
                name="event_datetime"
                type="datetime-local"
                value={editForm.event_datetime}
                onChange={updateEditField}
              />
            </label>
          </div>
          <div className="inline-actions">
            <button className="primary" type="submit">
              Save Changes
            </button>
            <button type="button" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="event-strip">
            <span>{collaboration.post_type}</span>
            <strong>{formatDateTime(collaboration.event_datetime)}</strong>
          </div>
          {typeof collaboration.match_score === "number" && (
            <div className="match-panel">
              <div
                className="score-ring"
                style={{ "--score": `${collaboration.match_score * 3.6}deg` }}
                aria-label={`${collaboration.match_score}% match`}
              >
                <strong>{collaboration.match_score}</strong>
                <span>%</span>
              </div>
              <div>
                <p className="eyebrow">Team Match</p>
                <h3>{collaboration.match_score >= 80 ? "Strong alignment" : "Promising fit"}</h3>
                {collaboration.match_reason && <p className="match-callout">{collaboration.match_reason}</p>}
              </div>
            </div>
          )}
          <p className="description">{collaboration.description}</p>
          <div className="tags">
            {collaboration.required_skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </>
      )}

      {isOwner && !isEditing && !isArchived && (
        <div className="inline-actions">
          <button type="button" onClick={beginEdit}>
            Modify Post
          </button>
          <button className="danger" type="button" onClick={deletePost}>
            Delete Post
          </button>
        </div>
      )}

      {!isOwner && !isArchived && (
        <form className="stack compact apply-card" onSubmit={apply}>
          <h3>Apply to join</h3>
          <label>
            Skills you will provide
            <input
              value={offeredSkills}
              onChange={(event) => setOfferedSkills(event.target.value)}
              placeholder="Backend APIs, pitch deck, UI polish"
            />
          </label>
          <label>
            Message
            <textarea
              maxLength="1000"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Tell the creator how you can help"
            />
            <small className="char-count">{messageLength}/1000</small>
          </label>
          <button
            className={appliedStatus === "accepted" ? "applied-button" : "primary pulse-action"}
            type="submit"
            disabled={isArchived || collaboration.is_full || Boolean(appliedStatus)}
          >
            {applyButtonLabel()}
          </button>
        </form>
      )}

      {isOwner && (
        <div className="stack compact">
          <h3>Applicant details</h3>
          {applications.map((application) => (
            <article className={`applicant ${application.status}`} key={application.id}>
              <div>
                <strong>{application.applicant.name}</strong>
                <small>{application.applicant.email}</small>
                <small>{application.applicant.mobile_number || "Mobile not provided"}</small>
                <p>{application.message || "No message provided."}</p>
                <div className="tags tiny">
                  {(application.offered_skills.length ? application.offered_skills : application.applicant.skills).map(
                    (skill) => (
                      <span key={skill}>{skill}</span>
                    ),
                  )}
                </div>
              </div>
              <div className="decision">
                {application.status === "accepted" && (
                  <>
                    <span className="status-mark accepted-mark">Accepted</span>
                    {!isArchived && (
                      <button className="kick-button" type="button" onClick={() => kick(application.id)}>
                        Kick
                      </button>
                    )}
                  </>
                )}
                {application.status === "rejected" && <span className="status-mark rejected-mark">Rejected</span>}
                {application.status === "pending" && (
                  <>
                    <span className="badge muted-badge">pending</span>
                    {!isArchived && (
                      <>
                        <button type="button" onClick={() => decide(application.id, "accepted")}>
                          Accept
                        </button>
                        <button type="button" onClick={() => decide(application.id, "rejected")}>
                          Reject
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
          {applications.length === 0 && <p className="muted">No applicants yet.</p>}
        </div>
      )}
    </motion.section>
  );
}
