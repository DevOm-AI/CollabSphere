import { motion } from "framer-motion";

export default function CollaborationList({ collaborations, selectedId, onSelect }) {
  function statusBadge(collaboration) {
    if (collaboration.is_archived) return { className: "badge archived", label: "Archived" };
    if (collaboration.is_full) return { className: "badge full", label: "Full" };
    return { className: "badge", label: `${collaboration.slots_available} Slots Available` };
  }

  function matchBadge(collaboration) {
    if (typeof collaboration.match_score !== "number" || collaboration.match_score < 60) return null;
    if (collaboration.match_score >= 80) {
      return { className: "match-badge high", label: `${collaboration.match_score}% match` };
    }
    return { className: "match-badge medium", label: `${collaboration.match_score}% match` };
  }

  return (
    <section className="list">
      {collaborations.map((collaboration, index) => {
        const badge = statusBadge(collaboration);
        const match = matchBadge(collaboration);
        return (
          <motion.button
            className={`collaboration-row ${selectedId === collaboration.id ? "selected" : ""} ${collaboration.is_archived ? "archived-card" : ""}`}
            key={collaboration.id}
            onClick={() => onSelect(collaboration.id)}
            type="button"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ delay: index * 0.05 }}
          >
            <span>
              <strong>{collaboration.title}</strong>
              <small className="card-line">
                <span className={`post-type-chip type-${collaboration.post_type.toLowerCase()}`}>
                  {collaboration.post_type}
                </span>
                <span>by {collaboration.owner.name}</span>
              </small>
              <small>
                {collaboration.event_datetime
                  ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
                      new Date(collaboration.event_datetime),
                    )
                  : "Date not set"}
              </small>
              {collaboration.skill_match_count > 0 && <small>{collaboration.skill_match_count} skill matches</small>}
              <span className="tags tiny card-skills">
                {collaboration.required_skills.slice(0, 4).map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </span>
            </span>
            <span className="row-meta">
              {match && (
                <span className="match-wrap">
                  <span className={match.className}>{match.label}</span>
                  {collaboration.match_reason && <small>{collaboration.match_reason}</small>}
                </span>
              )}
              <span className={badge.className}>{badge.label}</span>
            </span>
          </motion.button>
        );
      })}
      {collaborations.length === 0 && <p className="muted empty-illustration">No collaborations yet.</p>}
    </section>
  );
}
