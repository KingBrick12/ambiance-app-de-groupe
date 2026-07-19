import { EmptyState } from "./StateMessage";
export default function QuietHours({ slots, scale }) {
  if (!slots?.length) return <EmptyState message="Aucun créneau calme n’a encore été identifié." />;
  return <div className="quiet-grid">{slots.map(slot => <article key={`${slot.start}-${slot.end}`}><strong>{slot.start}–{slot.end}</strong><span>{slot.averageNoise} {scale.unit}</span><small>{slot.classification.label}</small></article>)}</div>;
}
