const STATUS_LABELS = {
  stale: "Données anciennes",
  empty: "Aucune donnée"
};

export default function AmbianceBadge({
  classification,
  status = "empty"
}) {
  if (status !== "recent") {
    return (
      <span className="badge badge--unknown">
        {STATUS_LABELS[status] || "Données indisponibles"}
      </span>
    );
  }

  if (!classification?.code || !classification?.label) {
    return (
      <span className="badge badge--unknown">
        Classification inconnue
      </span>
    );
  }

  return (
    <span
      className={`badge badge--${classification.code}`}
      title={classification.description || classification.label}
    >
      {classification.label}
    </span>
  );
}
