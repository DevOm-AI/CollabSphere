export default function CollaborationList({ collaborations, selectedId, onSelect }) {
  function statusBadge(collaboration) {
    if (collaboration.is_archived) return { className: "badge archived", label: "Archived" };
    if (collaboration.is_full) return { className: "badge full", label: "Full" };
    return { className: "badge", label: `${collaboration.slots_available} Slots Available` };
  }

  return (
    <section className="list">
      {collaborations.map((collaboration) => {
        const badge = statusBadge(collaboration);
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
            <span className={badge.className}>{badge.label}</span>
          </button>
        );
      })}
      {collaborations.length === 0 && <p className="muted">No collaborations yet.</p>}
    </section>
  );
}
