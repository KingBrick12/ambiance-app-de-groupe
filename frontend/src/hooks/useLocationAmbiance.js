import {
  useCallback,
  useEffect,
  useState
} from "react";
import { getLocation } from "../api/locationApi";
import {
  getAmbianceHistory,
  getCurrentAmbiance,
  getQuietHours
} from "../api/ambianceApi";

const INITIAL_STATE = {
  loading: true,
  error: "",
  location: null,
  current: null,
  history: null,
  quiet: null
};

export function useLocationAmbiance(slug, period) {
  const [state, setState] = useState(INITIAL_STATE);

  const load = useCallback(async (force = false) => {
    setState((current) => ({
      ...current,
      loading: true,
      error: ""
    }));

    try {
      const [
        location,
        current,
        history,
        quiet
      ] = await Promise.all([
        getLocation(slug, { force }),
        getCurrentAmbiance(slug, { force }),
        getAmbianceHistory(slug, period, { force }),
        getQuietHours(slug, { force })
      ]);

      setState({
        loading: false,
        error: "",
        location,
        current: current.data,
        history: history.data,
        quiet: quiet.data
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Impossible de charger le portrait."
      }));
    }
  }, [slug, period]);

  useEffect(() => {
    load();

    function refresh(event) {
      if (
        !event.detail?.location ||
        event.detail.location === slug
      ) {
        load();
      }
    }

    window.addEventListener(
      "ambiance-updated",
      refresh
    );

    return () => {
      window.removeEventListener(
        "ambiance-updated",
        refresh
      );
    };
  }, [load, slug]);

  return {
    ...state,
    reload: () => load(true)
  };
}
