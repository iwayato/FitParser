import {
    MapContainer, 
    TileLayer, 
    useMap, 
    Marker, 
    Popup,
    Polyline,
    Circle,
    SVGOverlay
} from 'react-leaflet'
import L from 'leaflet';
import "leaflet/dist/leaflet.css";

const Map = ({ points }) => {    
    return (
        <MapContainer 
            center={[
                points.reduce((acc, cv) => acc + cv[0], 0) / points.length, 
                points.reduce((acc, cv) => acc + cv[1], 0) / points.length
            ]} 
            zoom={13} 
            scrollWheelZoom={true} 
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer url='https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png' />
            <Polyline 
                pathOptions={{color: 'blue', weight: 5}} 
                positions={points} 
            />
            <Circle 
                center={points[0]} 
                pathOptions={{color: 'green', fillOpacity: 1, weight: 20}}
            />
            <Circle 
                center={points[points.length - 1]}
                pathOptions={{color: 'red', fillOpacity: 1, weight: 20}}
            />
        </MapContainer>
    )
}

export default Map;