export default function AmbianceBadge({ classification, status = "recent" }) {
  if (status !== "recent" || !classification) {
    return <span className="badge badge--unknown">Données non récentes</span>;
  }
  return <span className={`badge badge--${classification.code}`}>{classification.label}</span>;
}
