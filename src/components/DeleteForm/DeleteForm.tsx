import Map, { type MapRef, Marker } from 'react-map-gl/maplibre';
import { useRef, useCallback, useEffect, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import './DeleteForm.css';
import type { PhotoData } from '../../types';
import { GoogleLogin } from '@react-oauth/google';
import { navigate } from '../../utils/navigation';

export default function DeleteForm() {
  const mapRef = useRef<MapRef>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const fetchPhotos = useCallback(() => {
    const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8080';
    setIsLoading(true);
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

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleDelete = async (photo: PhotoData) => {
    if (!authToken) {
      alert("Please sign in using the Google button at the top first to delete entries.");
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete "${photo.title}"?`);
    if (!confirmed) return;

    const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8080';
    try {
      const response = await fetch(`${SERVER_URL}/api/photos/${photo.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Delete failed');
      }

      alert("Deleted successfully!");
      fetchPhotos(); // Refresh map
    } catch (err) {
      console.error("Delete Error:", err);
      alert(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

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
    <div className="delete-container">
      <div className="delete-header">
        <h2 className="delete-title">Delete Mode</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => navigate('/')} className="back-button">Back to Map</button>
          {!authToken ? (
            <GoogleLogin
              onSuccess={credentialResponse => {
                if (credentialResponse.credential) {
                  setAuthToken(credentialResponse.credential);
                }
              }}
              onError={() => console.error("Google Login Failed")}
            />
          ) : (
            <span className="auth-status">Authenticated</span>
          )}
        </div>
      </div>
      
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
                handleDelete(photo);
              }}
            />
          ))}
        </Map>
      </div>
    </div>
  );
}
