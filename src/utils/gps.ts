import exifr from 'exifr';

export async function extractLocationFromExif(imageFile: File): Promise<{ lat: string; lng: string } | null> {
  try {
    const gps = await exifr.gps(imageFile);
    if (gps) {
      return { lat: gps.latitude.toString(), lng: gps.longitude.toString() };
    }
  } catch (err) {
    console.warn("EXIF extraction failed:", err);
  }
  return null;
}

export function getBrowserLocation(): Promise<{ lat: string; lng: string }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() }),
      (err) => reject(err),
      { enableHighAccuracy: true }
    );
  });
}
