export function LoadingState({ message = "Chargement…" }) { return <div className="state-card" aria-live="polite">{message}</div>; }
export function ErrorState({ message, onRetry }) { return <div className="state-card state-card--error" role="alert"><p>{message}</p>{onRetry && <button onClick={onRetry}>Réessayer</button>}</div>; }
export function EmptyState({ message }) { return <div className="state-card"><p>{message}</p></div>; }
