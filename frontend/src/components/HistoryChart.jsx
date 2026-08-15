import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "./StateMessage";

export default function HistoryChart({ points, scale }) {
  const data = useMemo(() => (points || []).map(p => ({ ...p, timeLabel: new Date(p.timestamp).toLocaleString("fr-CA", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }) })), [points]);
  if (!points?.length) return <EmptyState message="Aucune mesure dans cette période." />;
  return <div className="chart-wrap"><ResponsiveContainer width="100%" height={320}><LineChart data={data} margin={{ top:10,right:20,left:0,bottom:10 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="timeLabel" minTickGap={25} /><YAxis domain={[scale.minimum, scale.maximum]} /><Tooltip formatter={(value)=>[`${value} ${scale.unit}`, scale.label]} /><Line type="monotone" dataKey="value" name={scale.label} strokeWidth={3} dot={{ r:3 }} /></LineChart></ResponsiveContainer><p className="scale-note">Échelle : {scale.minimum} à {scale.maximum} {scale.unit}</p></div>;
}
