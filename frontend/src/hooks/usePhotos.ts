import { useState, useEffect, useCallback } from 'react';
import type { PhotoData } from '../types';

export function usePhotos() {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return { photos, isLoading, error, refetch: fetchPhotos };
}
