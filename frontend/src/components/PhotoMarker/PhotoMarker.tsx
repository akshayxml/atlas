import { useState } from 'react';
import type { PhotoData } from '../../types';
import './PhotoMarker.css';

interface PhotoMarkerProps {
  photo: PhotoData;
}

export default function PhotoMarker({ photo }: PhotoMarkerProps) {
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
