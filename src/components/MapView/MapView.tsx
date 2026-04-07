import Map, { type MapRef, Marker, Popup } from 'react-map-gl/maplibre';
import { useRef, useCallback, useEffect, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapView.css';
import type { PhotoData } from '../../types';

export default function MapView() {
  const mapRef = useRef<MapRef>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from the Go backend
  useEffect(() => {
    const SERVER_URL = import.meta.env.VITE_SERVER_URL;
    if (!SERVER_URL) {
      setError("VITE_SERVER_URL is not defined");
      setIsLoading(false);
      return;
    }
    fetch(`${SERVER_URL}/api/photos`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch photos");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setPhotos(data);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch photos:", err);
        setError(err.message || "Failed to load photos");
        setIsLoading(false);
      });
  }, []);

  const onMapLoad = useCallback(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      map.setProjection({ type: 'globe' });
    }
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white', backgroundColor: '#0a0a0a', fontFamily: 'system-ui, sans-serif' }}>
        Loading map data...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#ff5252', backgroundColor: '#0a0a0a', fontFamily: 'system-ui, sans-serif' }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div className="map-container">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 78.9629,
          latitude: 20.5937,
          zoom: 3
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        onLoad={onMapLoad}
      >
        {photos.map((photo) => (
          <Marker
            key={photo.id}
            longitude={photo.location.lng}
            latitude={photo.location.lat}
            color="#e8638b"
            onClick={e => {
              e.originalEvent.stopPropagation();
              setSelectedPhoto(photo);
            }}
          />
        ))}

        {selectedPhoto && (
          <Popup
            longitude={selectedPhoto.location.lng}
            latitude={selectedPhoto.location.lat}
            anchor="bottom"
            onClose={() => setSelectedPhoto(null)}
            className="map-popup"
          >
            <div className="popup-content">
              <img
                src={selectedPhoto.image_url}
                alt={selectedPhoto.title}
                className="popup-image"
              />

              <div className="popup-details">
                <h3 className="popup-title">
                  {selectedPhoto.title}
                </h3>

                <p className="popup-description">
                  {selectedPhoto.description || "No description provided."}
                </p>

                <div className="popup-date">
                  {new Date(selectedPhoto.captured_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}