import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLocations } from "../api/locationApi";
import AmbianceMap from "../components/AmbianceMap";
import AmbianceBadge from "../components/AmbianceBadge";
import {
  EmptyState,
  ErrorState,
  LoadingState
} from "../components/StateMessage";

const INITIAL_STATE = {
  loading: true,
  locations: [],
  meta: {},
  error: ""
};

export default function PublicMapPage() {
  const [state, setState] = useState(INITIAL_STATE);

  const load = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: true,
      error: ""
    }));

    try {
      const { locations, meta } = await getLocations();

      setState({
        loading: false,
        locations,
        meta,
        error: ""
      });
    } catch (error) {
      setState({
        loading: false,
        locations: [],
        meta: {},
        error:
          error instanceof Error
            ? error.message
            : "Impossible de charger les lieux."
      });
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("ambiance-updated", load);
    return () => window.removeEventListener("ambiance-updated", load);
  }, [load]);

  const freshnessThreshold =
    state.meta.freshnessThresholdMinutes ?? 30;

  return (
    <main className="public-page">
      <section className="page-intro">
        <p className="eyebrow">Portrait public</p>
        <h1>L&apos;ambiance des lieux, en un coup d&apos;œil</h1>
        <p>
          Les classifications et l&apos;interprétation des mesures sont
          calculées par l&apos;API. Une mesure est considérée récente pendant{" "}
          {freshnessThreshold} minutes.
        </p>
      </section>

      {state.loading ? (
        <LoadingState message="Chargement de la carte…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={load} />
      ) : state.locations.length === 0 ? (
        <EmptyState message="Aucun lieu n'est encore disponible." />
      ) : (
        <>
          <AmbianceMap locations={state.locations} />

          <section
            className="location-list"
            aria-label="Liste des lieux"
          >
            {state.locations.map((location) => {
              const current = location.currentAmbiance;

              return (
                <article key={location.slug}>
                  <div>
                    <h2>{location.name}</h2>
                    <p>{
                      location.description ||
                      "Aucune description disponible."
                    }</p>
                    <p>{location.sessionCount} session(s) collectée(s)</p>
                    <p className="location-status">
                      {current?.message ||
                        "Aucune information d'ambiance disponible."}
                    </p>
                  </div>

                  <div className="location-actions">
                    <AmbianceBadge
                      classification={current?.classification}
                      status={current?.status}
                    />
                    <Link to={`/lieux/${location.slug}`}>
                      Voir le portrait
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
    </main>
  );
}
