import Map, { type MapRef, Marker } from 'react-map-gl/maplibre';
import { useRef, useCallback, useEffect, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import './UpdateForm.css';
import type { PhotoData } from '../../types';
import { GoogleLogin } from '@react-oauth/google';
import { navigate } from '../../utils/navigation';

interface ImageMarkerProps {
  photo: PhotoData;
}

function ImageMarker({ photo }: ImageMarkerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <div className={`custom-marker ${isLoaded ? 'loaded' : 'loading'}`}>
      <img
        src={photo.thumb_url || photo.image_url}
        alt={photo.title}
        onLoad={() => setIsLoaded(true)}
        style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
      />
    </div>
  );
}

export default function UpdateForm() {
  const mapRef = useRef<MapRef>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [date, setDate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchPhotos = useCallback(() => {
    const SERVER_URL = import.meta.env.VITE_SERVER_URL;
    if (!SERVER_URL) {
      setError("VITE_SERVER_URL is not defined");
      setIsLoading(false);
      return;
    }
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

  useEffect(() => {
    if (selectedPhoto) {
      setTitle(selectedPhoto.title);
      setDescription(selectedPhoto.description || '');
      setLat(selectedPhoto.location.lat.toString());
      setLng(selectedPhoto.location.lng.toString());
      setDate(selectedPhoto.captured_at ? selectedPhoto.captured_at.split('T')[0] : '');
    }
  }, [selectedPhoto]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) {
      alert("Please sign in first.");
      return;
    }
    if (!selectedPhoto) return;

    setIsUpdating(true);
    const SERVER_URL = import.meta.env.VITE_SERVER_URL;
    try {
      const response = await fetch(`${SERVER_URL}/api/photos/${selectedPhoto.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          description,
          lat,
          lng,
          captured_at: date
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Update failed');
      }

      alert("Updated successfully!");
      setSelectedPhoto(null);
      fetchPhotos(); // Refresh map
    } catch (err) {
      console.error("Update Error:", err);
      alert(`Failed to update: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const onMapLoad = useCallback(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      map.setProjection({ type: 'globe' });
    }
  }, []);

  if (isLoading) {
    return <div className="loading-screen">Loading map data...</div>;
  }

  if (error) {
    return <div className="error-screen">Error: {error}</div>;
  }

  return (
    <div className="update-container">
      <div className="update-header">
        <h2 className="update-title">Update Mode</h2>
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
      
      <div className="update-content">
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
                onClick={e => {
                  e.originalEvent.stopPropagation();
                  setSelectedPhoto(photo);
                }}
              >
                <ImageMarker photo={photo} />
              </Marker>
            ))}
          </Map>
        </div>

        {selectedPhoto && (
          <div className="edit-panel">
            <h3>Edit Details</h3>
            <form onSubmit={handleUpdate} className="edit-form">
              <div className="input-group">
                <label>Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Captured Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="flex-row">
                <div className="input-group">
                  <label>Lat</label>
                  <input value={lat} onChange={e => setLat(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label>Lng</label>
                  <input value={lng} onChange={e => setLng(e.target.value)} required />
                </div>
              </div>
              <div className="button-group">
                <button type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setSelectedPhoto(null)}>Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
