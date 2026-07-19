import { MapContainer, Marker, Popup, TileLayer, Tooltip } from "react-leaflet";
import { Link } from "react-router-dom";
import L from "leaflet";

function markerIcon(location) {
  const current = location.currentAmbiance;
  const label = current?.status === "recent" ? current.classification?.label : current?.status === "stale" ? "Ancienne" : "Aucune donnée";
  const code = current?.status === "recent" ? current.classification?.code : "unknown";
  return L.divIcon({ className: "ambiance-marker-wrapper", html: `<div class="ambiance-marker ambiance-marker--${code}"><strong>${location.name}</strong><span>${label}</span></div>`, iconSize: [150, 52], iconAnchor: [75, 26] });
}

export default function AmbianceMap({ locations }) {
  const first = locations[0]?.coordinates;
  return <MapContainer center={first ? [first.latitude, first.longitude] : [45.52, -73.58]} zoom={12} className="map" scrollWheelZoom>
    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    {locations.map(location => <Marker key={location.slug} position={[location.coordinates.latitude, location.coordinates.longitude]} icon={markerIcon(location)}>
      <Tooltip direction="top" offset={[0,-24]}>{location.name}</Tooltip>
      <Popup><strong>{location.name}</strong><p>{location.currentAmbiance?.status === "recent" ? location.currentAmbiance.classification.description : location.currentAmbiance?.status === "stale" ? "La dernière mesure n’est plus récente." : "Aucune mesure disponible."}</p><Link to={`/lieux/${location.slug}`}>Voir le portrait d’ambiance</Link></Popup>
    </Marker>)}
  </MapContainer>;
}
