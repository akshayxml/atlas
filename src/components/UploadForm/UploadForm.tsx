import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import './UploadForm.css';
import { extractLocationFromExif, getBrowserLocation } from '../../utils/gps';
import { navigate } from '../../utils/navigation';

type Status = 'idle' | 'locating' | 'uploading' | 'success' | 'error' | 'using-photo-gps';

export default function UploadForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [authToken, setAuthToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');

    if (!authToken) {
      setErrorMessage("Please sign in first.");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);

    const manualLat = formData.get('lat_manual') as string;
    const manualLng = formData.get('lng_manual') as string;

    if (manualLat && manualLng) {
      await performUpload(formData, manualLat, manualLng, form);
    } else {
      const imageFile = formData.get('image') as File;
      if (imageFile) {
        setStatus('locating');
        const gps = await extractLocationFromExif(imageFile);
        if (gps) {
          setStatus('using-photo-gps');
          await new Promise(resolve => setTimeout(resolve, 1500));
          await performUpload(formData, gps.lat, gps.lng, form);
          return;
        }
      }

      setStatus('locating');
      try {
        const coords = await getBrowserLocation();
        await performUpload(formData, coords.lat, coords.lng, form);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Location access denied. Please enter coordinates manually.");
        setStatus('error');
      }
    }
  };

  const performUpload = async (formData: FormData, lat: string, lng: string, form: HTMLFormElement) => {
    setStatus('uploading');

    formData.append('lat', lat);
    formData.append('lng', lng);

    try {
      const SERVER_URL = import.meta.env.VITE_SERVER_URL;
      if (!SERVER_URL) {
        throw new Error("VITE_SERVER_URL is not defined");
      }
      const response = await fetch(`${SERVER_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Upload failed');
      }

      setStatus('success');
      form.reset();
      setTimeout(() => {
        setStatus('idle');
      }, 2000);

    } catch (err) {
      console.error("Upload Error:", err);
      setErrorMessage(err instanceof Error ? err.message : 'Server error');
      setStatus('error');
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="upload-title">Add to Atlas</h2>
          <button onClick={() => navigate('/')} className="back-button">Back to Map</button>
        </div>
        <p className="upload-subtitle">Create a new memory on your map</p>

        {!authToken ? (
          <div className="login-prompt">
            <p className="login-text">
              Authentication required to modify the Atlas.
            </p>
            <GoogleLogin
              onSuccess={credentialResponse => {
                if (credentialResponse.credential) {
                  setAuthToken(credentialResponse.credential);
                  setErrorMessage('');
                }
              }}
              onError={() => setErrorMessage("Google Login Failed")}
            />
            {errorMessage && <p className="error-text">{errorMessage}</p>}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="upload-form">
            <div className="input-group">
              <label className="label">Title</label>
              <input name="title" placeholder="e.g., Backwaters of Alleppey" required className="input" />
            </div>

            <div className="input-group">
              <label className="label">Description</label>
              <textarea name="description" placeholder="What happened here?" className="textarea" />
            </div>

            <div className="input-group">
              <label className="label">Captured Date (Optional)</label>
              <input type="date" name="captured_at" className="input" />
            </div>

            <div className="flex-row">
              <div className="input-group flex-1">
                <label className="label">Lat (Manual)</label>
                <input name="lat_manual" placeholder="12.97" className="input" />
              </div>
              <div className="input-group flex-1">
                <label className="label">Lng (Manual)</label>
                <input name="lng_manual" placeholder="77.59" className="input" />
              </div>
            </div>
            <p className="hint">Leave coordinates blank to extract from photo or use GPS.</p>

            <div className="input-group">
              <label className="label">Photo</label>
              <input type="file" name="image" accept="image/*" required className="file-input" />
            </div>

            <button
              type="submit"
              disabled={status === 'uploading' || status === 'locating'}
              className={`upload-button ${status === 'success' ? 'is-success' : ''}`}
              style={{ marginTop: '10px' }}
            >
              {status === 'locating' && 'Getting GPS...'}
              {status === 'using-photo-gps' && 'Using location from photo...'}
              {status === 'uploading' && 'Uploading...'}
              {status === 'success' && 'Saved!'}
              {status === 'idle' || status === 'error' ? 'Save to Atlas' : ''}
            </button>

            {errorMessage && <p className="error-text">{errorMessage}</p>}
          </form>
        )}
      </div>
    </div>
  );
}