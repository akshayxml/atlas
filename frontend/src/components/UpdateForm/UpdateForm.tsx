import Map, { type MapRef, Marker } from 'react-map-gl/maplibre';
import { useRef, useCallback, useEffect, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import './UpdateForm.css';
import type { PhotoData } from '../../types';
import { GoogleLogin } from '@react-oauth/google';
import { navigate } from '../../utils/navigation';
import { usePhotos } from '../../hooks/usePhotos';
import PhotoMarker from '../PhotoMarker/PhotoMarker';

export default function UpdateForm() {
  const mapRef = useRef<MapRef>(null);
  const { photos, isLoading, error, refetch } = usePhotos();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [date, setDate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);



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
      refetch(); // Refresh map
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
                <PhotoMarker photo={photo} />
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
