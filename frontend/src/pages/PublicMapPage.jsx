import { Link } from "react-router-dom";
import AmbianceMap from "../components/AmbianceMap";
import AmbianceBadge from "../components/AmbianceBadge";
import {
  EmptyState,
  ErrorState,
  LoadingState
} from "../components/StateMessage";
import { useLocations } from "../hooks/useLocations";

export default function PublicMapPage() {
  const {
    loading,
    locations,
    meta,
    error,
    reload
  } = useLocations();

  const freshnessThreshold =
    meta.freshnessThresholdMinutes ?? 30;

  return (
    <main className="public-page">
      <section className="page-intro">
        <p className="eyebrow">Portrait public</p>

        <h1>
          L&apos;ambiance des lieux, en un coup d&apos;œil
        </h1>

        <p>
          Les classifications et l&apos;interprétation des mesures sont
          calculées par l&apos;API. Une mesure est considérée récente pendant{" "}
          {freshnessThreshold} minutes.
        </p>
      </section>

      {loading ? (
        <LoadingState message="Chargement de la carte…" />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={reload}
        />
      ) : locations.length === 0 ? (
        <EmptyState message="Aucun lieu n'est encore disponible." />
      ) : (
        <>
          <AmbianceMap locations={locations} />

          <section
            className="location-list"
            aria-label="Liste des lieux"
          >
            {locations.map((location) => (
              <LocationCard
                key={location.slug}
                location={location}
              />
            ))}
          </section>
        </>
      )}
    </main>
  );
}

function LocationCard({ location }) {
  const current = location.currentAmbiance;

  return (
    <article>
      <div>
        <h2>{location.name}</h2>

        <p>
          {location.description ||
            "Aucune description disponible."}
        </p>

        <p>
          {location.sessionCount} session(s) collectée(s)
        </p>

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
}