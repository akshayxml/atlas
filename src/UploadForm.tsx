import React, { useState } from 'react';
import EXIF from 'exif-js';

type Status = 'idle' | 'locating' | 'uploading' | 'success' | 'error' | 'using-photo-gps';

// Helper to extract GPS from image EXIF
const getExifGps = (file: File): Promise<{lat: number, lng: number} | null> => {
  return new Promise((resolve) => {
    EXIF.getData(file as any, function(this: any) {
      const lat = EXIF.getTag(this, "GPSLatitude");
      const latRef = EXIF.getTag(this, "GPSLatitudeRef");
      const lng = EXIF.getTag(this, "GPSLongitude");
      const lngRef = EXIF.getTag(this, "GPSLongitudeRef");

      if (lat && latRef && lng && lngRef) {
        const convertDMSToDD = (dms: any[], ref: string) => {
          let dd = dms[0] + dms[1] / 60 + dms[2] / 3600;
          if (ref === "S" || ref === "W") {
            dd = -dd;
          }
          return dd;
        };

        const latitude = convertDMSToDD(lat, latRef);
        const longitude = convertDMSToDD(lng, lngRef);
        resolve({ lat: latitude, lng: longitude });
      } else {
        resolve(null);
      }
    });
  });
};

export default function UploadForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');

    const form = e.currentTarget;
    const formData = new FormData(form);

    // 1. Check for manual coordinate overrides
    const manualLat = formData.get('lat_manual') as string;
    const manualLng = formData.get('lng_manual') as string;

    if (manualLat && manualLng) {
      // Use manual coordinates directly
      await performUpload(formData, manualLat, manualLng);
    } else {
      // 2. Try to get location from Photo EXIF
      const imageFile = formData.get('image') as File;
      if (imageFile) {
        setStatus('locating');
        const gps = await getExifGps(imageFile);
        if (gps) {
          setStatus('using-photo-gps');
          await new Promise(resolve => setTimeout(resolve, 1500)); // Show message for 1.5 seconds
          await performUpload(formData, gps.lat.toString(), gps.lng.toString());
          return; // Skip browser geolocation
        }
      }

      // 3. Fallback to Browser Geolocation
      setStatus('locating');
      if (!navigator.geolocation) {
        setErrorMessage("Geolocation is not supported. Please enter coordinates manually.");
        setStatus('error');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          performUpload(formData, pos.coords.latitude.toString(), pos.coords.longitude.toString());
        },
        (err) => {
          setErrorMessage("Location access denied. Please enter coordinates manually.");
          setStatus('error');
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const performUpload = async (formData: FormData, lat: string, lng: string) => {
    setStatus('uploading');

    // Attach the final coordinates to the payload
    formData.append('lat', lat);
    formData.append('lng', lng);

    try {
      const response = await fetch('http://localhost:8080/api/upload', {
        method: 'POST',
        headers: {
          'X-Atlas-Auth': password // The secret key from your input field
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Upload failed');
      }

      setStatus('success');
      // Redirect back to the map after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (err) {
      console.error("Upload Error:", err);
      setErrorMessage(err instanceof Error ? err.message : 'Server error');
      setStatus('error');
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={titleStyle}>Add to Atlas</h2>
        <p style={subtitleStyle}>Create a new memory on your map</p>

        <form onSubmit={handleSubmit} style={formStyle}>
          {/* Main Info */}
          <div style={inputGroup}>
            <label style={labelStyle}>Title</label>
            <input name="title" placeholder="e.g., Backwaters of Alleppey" required style={inputStyle} />
          </div>

          <div style={inputGroup}>
            <label style={labelStyle}>Description</label>
            <textarea name="description" placeholder="What happened here?" style={textareaStyle} />
          </div>

          {/* Date Override */}
          <div style={inputGroup}>
            <label style={labelStyle}>Captured Date (Optional)</label>
            <input type="date" name="captured_at" style={inputStyle} />
          </div>

          {/* Location Overrides */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ ...inputGroup, flex: 1 }}>
              <label style={labelStyle}>Lat (Manual)</label>
              <input name="lat_manual" placeholder="12.97" style={inputStyle} />
            </div>
            <div style={{ ...inputGroup, flex: 1 }}>
              <label style={labelStyle}>Lng (Manual)</label>
              <input name="lng_manual" placeholder="77.59" style={inputStyle} />
            </div>
          </div>
          <p style={hintStyle}>Leave coordinates blank to use your current GPS location.</p>

          {/* File & Auth */}
          <div style={inputGroup}>
            <label style={labelStyle}>Photo</label>
            <input type="file" name="image" accept="image/*" required style={fileInputStyle} />
          </div>

          <div style={inputGroup}>
            <label style={labelStyle}>Secret Key</label>
            <input
              type="password"
              placeholder="Enter Admin Key"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={status === 'uploading' || status === 'locating'}
            style={{
              ...buttonStyle,
              backgroundColor: status === 'success' ? '#4caf50' : '#00f2fe'
            }}
          >
            {status === 'locating' && 'Getting GPS...'}
            {status === 'using-photo-gps' && 'Using location from photo...'}
            {status === 'uploading' && 'Uploading...'}
            {status === 'success' && 'Saved!'}
            {status === 'idle' || status === 'error' ? 'Save to Atlas' : ''}
          </button>

          {errorMessage && <p style={errorText}>{errorMessage}</p>}
        </form>
      </div>
    </div>
  );
}

// --- Minimalist Dark Theme Styles ---

const containerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  backgroundColor: '#0a0a0a',
  color: '#fff',
  padding: '20px',
  fontFamily: 'system-ui, sans-serif'
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '480px',
  backgroundColor: '#1a1a1a',
  padding: '30px',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
};

const titleStyle: React.CSSProperties = { margin: '0 0 5px 0', color: '#00f2fe' };
const subtitleStyle: React.CSSProperties = { margin: '0 0 25px 0', color: '#888', fontSize: '14px' };
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '18px' };
const inputGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px' };
const labelStyle: React.CSSProperties = { fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' };
const hintStyle: React.CSSProperties = { fontSize: '11px', color: '#555', margin: '-10px 0 0 0' };

const inputStyle: React.CSSProperties = {
  padding: '12px',
  backgroundColor: '#2a2a2a',
  border: '1px solid #333',
  borderRadius: '6px',
  color: 'white',
  fontSize: '15px'
};

const textareaStyle: React.CSSProperties = { ...inputStyle, minHeight: '80px', resize: 'vertical' };
const fileInputStyle: React.CSSProperties = { color: '#888', fontSize: '14px', padding: '5px 0' };
const errorText: React.CSSProperties = { color: '#ff5252', fontSize: '14px', marginTop: '10px' };

const buttonStyle: React.CSSProperties = {
  padding: '14px',
  border: 'none',
  borderRadius: '6px',
  color: '#000',
  fontWeight: 'bold',
  fontSize: '16px',
  cursor: 'pointer',
  transition: 'background 0.2s'
};