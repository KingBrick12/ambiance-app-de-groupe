import { useCallback, useEffect, useState } from "react";
import { getLocations } from "../api/locationApi";
import AmbianceMap from "../components/AmbianceMap";
import AmbianceBadge from "../components/AmbianceBadge";
import { EmptyState, ErrorState, LoadingState } from "../components/StateMessage";

export default function PublicMapPage() {
  const [state,setState]=useState({loading:true,data:[],error:""});
  const load=useCallback(()=>{setState(s=>({...s,loading:true,error:""}));getLocations().then(data=>setState({loading:false,data,error:""})).catch(e=>setState({loading:false,data:[],error:e.message}));},[]);
  useEffect(()=>{load();},[load]);
  return <main className="public-page"><section className="page-intro"><p className="eyebrow">Portrait public</p><h1>L’ambiance des lieux, en un coup d’œil</h1><p>Les classifications sont calculées par l’API. Une mesure est considérée récente pendant 30 minutes.</p></section>
    {state.loading ? <LoadingState message="Chargement de la carte…" /> : state.error ? <ErrorState message={state.error} onRetry={load} /> : !state.data.length ? <EmptyState message="Aucun lieu n’est encore disponible." /> : <><AmbianceMap locations={state.data}/><section className="location-list">{state.data.map(l=><article key={l.slug}><div><h2>{l.name}</h2><p>{l.description}</p></div><AmbianceBadge classification={l.currentAmbiance.classification} status={l.currentAmbiance.status}/></article>)}</section></>}
  </main>;
}
