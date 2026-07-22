import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getLocation } from "../api/locationApi";
import {
  getAmbianceHistory,
  getCurrentAmbiance,
  getQuietHours
} from "../api/ambianceApi";
import AmbianceBadge from "../components/AmbianceBadge";
import HistoryChart from "../components/HistoryChart";
import QuietHours from "../components/QuietHours";
import { ErrorState, LoadingState } from "../components/StateMessage";

export default function LocationDetailsPage() {
  const { slug } = useParams();
  const [period, setPeriod] = useState("all");
  const [state, setState] = useState({
    loading: true,
    error: "",
    location: null,
    current: null,
    history: null,
    quiet: null
  });

  const load = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    Promise.all([
      getLocation(slug),
      getCurrentAmbiance(slug),
      getAmbianceHistory(slug, period),
      getQuietHours(slug)
    ])
      .then(([location, current, history, quiet]) => {
        setState({
          loading: false,
          error: "",
          location,
          current: current.data,
          history: history.data,
          quiet: quiet.data
        });
      })
      .catch((error) => {
        setState((current) => ({ ...current, loading: false, error: error.message }));
      });
  }, [slug, period]);

  useEffect(() => {
    load();
    const refresh = (event) => { if (!event.detail?.location || event.detail.location === slug) load(); };
    window.addEventListener("ambiance-updated", refresh);
    return () => window.removeEventListener("ambiance-updated", refresh);
  }, [load, slug]);

  if (state.loading) {
    return <main className="public-page"><LoadingState message="Chargement du portrait…" /></main>;
  }

  if (state.error) {
    return <main className="public-page"><ErrorState message={state.error} onRetry={load} /></main>;
  }

  const { location, current, history, quiet } = state;

  return (
    <main className="public-page">
      <Link className="back-link" to="/">← Retour à la carte</Link>

      <section className="detail-hero">
        <div>
          <p className="eyebrow">Portrait d'ambiance</p>
          <h1>{location.name}</h1>
          <p>{location.description}</p>
          <p>{location.sessionCount} session(s) collectée(s)</p>
        </div>
        <AmbianceBadge classification={current.classification} status={current.status} />
      </section>

      <section className="summary-grid">
        <article>
          <h2>Ambiance actuelle</h2>
          <p>{current.message}</p>
          <strong>
            {current.averageNoise === null
              ? "Aucune amplitude récente"
              : `${current.averageNoise} ${current.scale.unit}`}
          </strong>
        </article>
        <article>
          <h2>Fraîcheur</h2>
          <p>{current.freshness.isRecent ? "Mesure récente" : "Donnée ancienne ou absente"}</p>
          <span>Seuil : {current.freshness.thresholdMinutes} minutes</span>
        </article>
        <article>
          <h2>Dernière mesure</h2>
          <p>
            {current.measuredAt
              ? new Date(current.measuredAt).toLocaleString("fr-CA")
              : "Aucune"}
          </p>
        </article>
      </section>

      <section className="detail-section">
        <div className="section-heading">
          <h2>Historique des sessions collectées</h2>
          <label>Période
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option value="24h">Dernières 24 heures</option>
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="all">Toutes les données antérieures</option>
            </select>
          </label>
        </div>
        <HistoryChart points={history.points} scale={history.scale} />
      </section>

      <section className="detail-section">
        <h2>Créneaux calmes</h2>
        <p>{quiet.threshold.description}</p>
        <QuietHours slots={quiet.slots} scale={quiet.scale} />
      </section>
    </main>
  );
}
