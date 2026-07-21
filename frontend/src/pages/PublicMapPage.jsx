import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLocations } from "../api/locationApi";
import AmbianceMap from "../components/AmbianceMap";
import AmbianceBadge from "../components/AmbianceBadge";
import { EmptyState, ErrorState, LoadingState } from "../components/StateMessage";

export default function PublicMapPage() {
  const [state, setState] = useState({ loading: true, data: [], error: "" });

  const load = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    getLocations()
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((error) => setState({ loading: false, data: [], error: error.message }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="public-page">
      <section className="page-intro">
        <p className="eyebrow">Portrait public</p>
        <h1>L'ambiance des lieux, en un coup d'œil</h1>
        <p>
          Les classifications sont calculées par l'API. Une mesure est considérée
          récente pendant 30 minutes.
        </p>
      </section>

      {state.loading ? (
        <LoadingState message="Chargement de la carte…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={load} />
      ) : state.data.length === 0 ? (
        <EmptyState message="Aucun lieu n'est encore disponible." />
      ) : (
        <>
          <AmbianceMap locations={state.data} />
          <section className="location-list" aria-label="Liste des lieux">
            {state.data.map((location) => (
              <article key={location.slug}>
                <div>
                  <h2>{location.name}</h2>
                  <p>{location.description}</p>
                  <p className="location-status">{location.currentAmbiance?.message}</p>
                </div>
                <div className="location-actions">
                  <AmbianceBadge
                    classification={location.currentAmbiance?.classification}
                    status={location.currentAmbiance?.status}
                  />
                  <Link to={`/lieux/${location.slug}`}>Voir le portrait</Link>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
