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
      {collaborations.map((collaboration) => {
        const badge = statusBadge(collaboration);
        const match = matchBadge(collaboration);
        return (
          <button
            className={`collaboration-row ${selectedId === collaboration.id ? "selected" : ""}`}
            key={collaboration.id}
            onClick={() => onSelect(collaboration.id)}
            type="button"
          >
            <span>
              <strong>{collaboration.title}</strong>
              <small>
                {collaboration.post_type} by {collaboration.owner.name}
              </small>
              <small>
                {collaboration.event_datetime
                  ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
                      new Date(collaboration.event_datetime),
                    )
                  : "Date not set"}
              </small>
              {collaboration.skill_match_count > 0 && <small>{collaboration.skill_match_count} skill matches</small>}
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
          </button>
        );
      })}
      {collaborations.length === 0 && <p className="muted">No collaborations yet.</p>}
    </section>
  );
}
