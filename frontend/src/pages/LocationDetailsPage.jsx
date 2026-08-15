import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import AmbianceBadge from "../components/AmbianceBadge";
import HistoryChart from "../components/HistoryChart";
import QuietHours from "../components/QuietHours";
import {
  ErrorState,
  LoadingState
} from "../components/StateMessage";

import { useLocationAmbiance } from "../hooks/useLocationAmbiance";

export default function LocationDetailsPage() {
  const { slug } = useParams();
  const [period, setPeriod] = useState("all");

  const {
    loading,
    error,
    location,
    current,
    history,
    quiet,
    reload
  } = useLocationAmbiance(slug, period);

  if (loading) {
    return (
      <main className="public-page">
        <LoadingState message="Chargement du portrait…" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="public-page">
        <ErrorState
          message={error}
          onRetry={reload}
        />
      </main>
    );
  }

  if (!location) {
    return (
      <main className="public-page">
        <ErrorState message="Ce lieu est introuvable." />
      </main>
    );
  }

  return (
    <main className="public-page">
      <Link to="/" className="back-link">
        ← Retour à la carte
      </Link>

      <section className="page-intro">
        <p className="eyebrow">Portrait d'ambiance</p>

        <div className="location-title">
          <div>
            <h1>{location.name}</h1>

            {location.description && (
              <p>{location.description}</p>
            )}
          </div>

          <AmbianceBadge
            classification={current?.classification}
            status={current?.status}
          />
        </div>
      </section>

      <section className="current-ambiance card">
        <div>
          <p className="eyebrow">
            Ambiance actuelle
          </p>

          <h2>
            {current?.classification?.label ||
              "Indisponible"}
          </h2>

          <p>
            {current?.message ||
              "Aucune mesure récente n'est disponible pour ce lieu."}
          </p>
        </div>

        <div className="ambiance-details">
          <div>
            <span>Niveau moyen</span>

            <strong>
              {typeof current?.averageNoise === "number"
                ? `${current.averageNoise} ${
                    current.scale?.unit || ""
                  }`
                : "Indisponible"}
            </strong>
          </div>

          <div>
            <span>Fraîcheur</span>

            <strong>
              {current?.freshness?.isRecent
                ? "Mesure récente"
                : "Donnée ancienne"}
            </strong>
          </div>

          <div>
            <span>Dernière mesure</span>

            <strong>
              {current?.measuredAt
                ? new Date(
                    current.measuredAt
                  ).toLocaleString("fr-CA")
                : "Aucune"}
            </strong>
          </div>
        </div>
      </section>

      <section className="history-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Historique</p>
            <h2>Évolution de l'ambiance</h2>
          </div>

          <label>
            Période
            <select
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value)
              }
            >
              <option value="all">
                Toutes les données
              </option>

              <option value="24h">
                Dernières 24 heures
              </option>

              <option value="7d">
                7 derniers jours
              </option>
            </select>
          </label>
        </div>

        <HistoryChart points={history?.points} scale={history?.scale} />
      </section>

      <section className="quiet-section">
        <div>
          <p className="eyebrow">
            Moments recommandés
          </p>

          <h2>Créneaux calmes</h2>

          <p>
            Les créneaux sont calculés à partir des
            mesures recueillies pour ce lieu.
          </p>
        </div>

        <QuietHours slots={quiet?.slots} scale={quiet?.scale} />
      </section>
    </main>
  );
}
