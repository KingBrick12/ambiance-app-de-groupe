import { useEffect, useMemo, useState } from "react";
import { getLocations } from "../api/locationApi";
import { getCurrentAmbiance, getQuietHours } from "../api/ambianceApi";
import AmbianceBadge from "../components/AmbianceBadge";
import { ErrorState, LoadingState } from "../components/StateMessage";

export default function CompareLocationsPage() {
  const [locations, setLocations] = useState([]);
  const [firstSlug, setFirstSlug] = useState("");
  const [secondSlug, setSecondSlug] = useState("");
  const [comparison, setComparison] = useState(null);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getLocations()
      .then(({ locations }) => setLocations(locations))
      .catch((error) => setError(error.message || "Impossible de charger les lieux."))
      .finally(() => setLoadingLocations(false));
  }, []);

  const firstOptions = useMemo(
    () => locations.filter((location) => location.slug !== secondSlug),
    [locations, secondSlug]
  );

  const secondOptions = useMemo(
    () => locations.filter((location) => location.slug !== firstSlug),
    [locations, firstSlug]
  );

  async function compareLocations(event) {
    event.preventDefault();

    if (!firstSlug || !secondSlug) {
      setError("Veuillez choisir deux lieux à comparer.");
      return;
    }

    if (firstSlug === secondSlug) {
      setError("Veuillez choisir deux lieux différents.");
      return;
    }

    setLoadingComparison(true);
    setError("");
    setComparison(null);

    try {
      const [firstCurrent, secondCurrent, firstQuiet, secondQuiet] = await Promise.all([
        getCurrentAmbiance(firstSlug),
        getCurrentAmbiance(secondSlug),
        getQuietHours(firstSlug),
        getQuietHours(secondSlug)
      ]);

      const firstLocation = locations.find((location) => location.slug === firstSlug);
      const secondLocation = locations.find((location) => location.slug === secondSlug);

      setComparison({
        first: {
          location: firstLocation,
          current: firstCurrent.data,
          quiet: firstQuiet.data
        },
        second: {
          location: secondLocation,
          current: secondCurrent.data,
          quiet: secondQuiet.data
        }
      });
    } catch (error) {
      setError(error.message || "Impossible de comparer ces lieux pour le moment.");
    } finally {
      setLoadingComparison(false);
    }
  }

  function getRecommendation() {
    if (!comparison) return "";

    const firstNoise = comparison.first.current?.averageNoise;
    const secondNoise = comparison.second.current?.averageNoise;

    const firstHasNoise = typeof firstNoise === "number";
    const secondHasNoise = typeof secondNoise === "number";

    if (!firstHasNoise && !secondHasNoise) {
      return "Aucune mesure récente ne permet de départager ces deux lieux.";
    }

    if (!firstHasNoise) {
      return `${comparison.second.location.name} est le meilleur choix selon les données disponibles.`;
    }

    if (!secondHasNoise) {
      return `${comparison.first.location.name} est le meilleur choix selon les données disponibles.`;
    }

    if (firstNoise === secondNoise) {
      return "Les deux lieux ont actuellement un niveau sonore similaire.";
    }

    const quieter = firstNoise < secondNoise ? comparison.first : comparison.second;
    return `${quieter.location.name} est actuellement le choix le plus calme.`;
  }

  if (loadingLocations) {
    return (
      <main className="public-page">
        <LoadingState message="Chargement des lieux…" />
      </main>
    );
  }

  return (
    <main className="public-page">
      <section className="page-intro">
        <p className="eyebrow">Comparateur d&apos;ambiance</p>
        <h1>Quel lieu choisir ?</h1>
        <p>
          Comparez deux parcs selon leur ambiance actuelle, la fraîcheur de leurs
          mesures et leurs meilleurs créneaux calmes.
        </p>
      </section>

      <form className="compare-form" onSubmit={compareLocations}>
        <label>
          Premier lieu
          <select value={firstSlug} onChange={(event) => setFirstSlug(event.target.value)}>
            <option value="">Choisir un lieu…</option>
            {firstOptions.map((location) => (
              <option key={location.slug} value={location.slug}>
                {location.name}
              </option>
            ))}
          </select>
        </label>

        <span className="compare-versus" aria-hidden="true">VS</span>

        <label>
          Deuxième lieu
          <select value={secondSlug} onChange={(event) => setSecondSlug(event.target.value)}>
            <option value="">Choisir un lieu…</option>
            {secondOptions.map((location) => (
              <option key={location.slug} value={location.slug}>
                {location.name}
              </option>
            ))}
          </select>
        </label>

        <button className="primary compare-submit" type="submit" disabled={loadingComparison}>
          {loadingComparison ? "Comparaison…" : "Comparer"}
        </button>
      </form>

      {error && <ErrorState message={error} />}
      {loadingComparison && <LoadingState message="Analyse des deux lieux…" />}

      {comparison && !loadingComparison && (
        <>
          <section className="comparison-recommendation" aria-live="polite">
            <p className="eyebrow">Recommandation</p>
            <h2>{getRecommendation()}</h2>
            <p>La recommandation se base sur l&apos;amplitude moyenne actuelle disponible.</p>
          </section>

          <section className="comparison-grid" aria-label="Résultat de la comparaison">
            <LocationComparisonCard data={comparison.first} />
            <LocationComparisonCard data={comparison.second} />
          </section>
        </>
      )}
    </main>
  );
}

function LocationComparisonCard({ data }) {
  const { location, current, quiet } = data;
  const bestQuietHour = quiet?.slots?.[0];
  const hasNoise = typeof current?.averageNoise === "number";

  return (
    <article className="comparison-card">
      <div className="comparison-card-header">
        <div>
          <p className="eyebrow">Lieu</p>
          <h2>{location?.name || current?.location || "Lieu"}</h2>
        </div>
        <AmbianceBadge
          classification={current?.classification}
          status={current?.status}
        />
      </div>

      <dl className="comparison-data">
        <div>
          <dt>Ambiance actuelle</dt>
          <dd>{current?.classification?.label || "Indisponible"}</dd>
        </div>

        <div>
          <dt>Niveau moyen</dt>
          <dd>
            {hasNoise
              ? `${current.averageNoise} ${current.scale?.unit || ""}`.trim()
              : "Indisponible"}
          </dd>
        </div>

        <div>
          <dt>Fraîcheur</dt>
          <dd>{current?.freshness?.isRecent ? "Mesure récente" : "Donnée ancienne ou absente"}</dd>
        </div>

        <div>
          <dt>Dernière mesure</dt>
          <dd>
            {current?.measuredAt
              ? new Date(current.measuredAt).toLocaleString("fr-CA")
              : "Aucune"}
          </dd>
        </div>

        <div>
          <dt>Meilleur créneau calme</dt>
          <dd>{bestQuietHour ? `${bestQuietHour.start} – ${bestQuietHour.end}` : "Aucun identifié"}</dd>
          {bestQuietHour && (
            <small>
              Moyenne : {bestQuietHour.averageNoise} {quiet.scale?.unit || ""}
            </small>
          )}
        </div>
      </dl>
    </article>
  );
}
