import Map, { type MapRef, Marker, Popup } from 'react-map-gl/maplibre';
import { useRef, useCallback, useEffect, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapView.css';
import type { PhotoData } from '../../types';

const LOADING_SCREEN_MESSAGES = [
  "Checking in the database at the virtual terminal...",
  "Stamping your digital passport. Please wait for the officer.",
  "Folding the map. It never goes back the way it came.",
  "Refilling the server's caffeine levels for the long haul.",
  "Calculating the shortest path to your favorite memories...",
  "Scanning the horizon for a stable signal in the mountains.",
  "Packing the data packets. Almost forgot the travel adapter!",
  "Adjusting the compass. Navigating through the cloud...",
  "Waiting for the 'Follow-Me' car to reach the gate.",
  "Bargaining with the API for a better response rate.",
  "Recalculating the route... the server took a scenic detour.",
  "Packing the data packets. Still trying to fit everything in one carry-on.",
  "Waiting for the digital 'Follow-Me' car to lead us to the gate.",
  "Double-checking the coordinates. We don't want to end up in the middle of the ocean.",
  "Bargaining with the API for a better exchange rate.",
  "The backend is currently in a 'No-Fly Zone'. Navigating around it...",
  "Searching for a stable signal at the top of a virtual mountain.",
  "Inflating the life vest. Safety first, even in the cloud.",
  "Just a second! The server is busy clearing its digital cache at customs.",
  "Final approach initiated. Please ensure your tray tables are in their upright position."
];

interface ImageMarkerProps {
  photo: PhotoData;
}

function ImageMarker({ photo }: ImageMarkerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <div className={`custom-marker ${isLoaded ? 'loaded' : 'loading'}`}>
      <img
        src={photo.image_url}
        alt={photo.title}
        onLoad={() => setIsLoaded(true)}
        style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
      />
    </div>
  );
}

export default function MapView() {
  const mapRef = useRef<MapRef>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [dots, setDots] = useState('.');

  useEffect(() => {
    if (!isLoading) return;

    const intervalId = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % LOADING_SCREEN_MESSAGES.length);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) return;

    const intervalId = setInterval(() => {
      setDots(prev => {
        if (prev === '.') return '..';
        if (prev === '..') return '...';
        return '.';
      });
    }, 500);

    return () => clearInterval(intervalId);
  }, [isLoading]);


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
            onClick={e => {
              e.originalEvent.stopPropagation();
              setSelectedPhoto(photo);
            }}
          >
            <ImageMarker photo={photo} />
          </Marker>
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
              <a href={selectedPhoto.image_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={selectedPhoto.image_url}
                  alt={selectedPhoto.title}
                  className="popup-image"
                />
              </a>

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
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-title">Loading map data{dots}</div>

          <div className="loading-subtitle">{LOADING_SCREEN_MESSAGES[messageIndex]}</div>
        </div>
      )}

    </div>
  );
}