import { useCallback, useEffect, useState } from "react";
import { getLocations } from "../api/locationApi";

const INITIAL_STATE = {
  loading: true,
  locations: [],
  meta: {},
  error: ""
};

export function useLocations() {
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

    return () => {
      window.removeEventListener("ambiance-updated", load);
    };
  }, [load]);

  return {
    ...state,
    reload: load
  };
}