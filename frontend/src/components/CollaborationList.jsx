export default function CollaborationList({ collaborations, selectedId, onSelect }) {
  return (
    <section className="list">
      {collaborations.map((collaboration) => (
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
          </span>
          <span className={collaboration.is_full ? "badge full" : "badge"}>
            {collaboration.is_full ? "Full" : `${collaboration.slots_available} Slots Available`}
          </span>
        </button>
      ))}
      {collaborations.length === 0 && <p className="muted">No collaborations yet.</p>}
    </section>
  );
}
