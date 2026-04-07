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

export async function extractMetadataFromExif(imageFile: File): Promise<{ lat?: string; lng?: string; date?: string } | null> {
  try {
    const data = await exifr.parse(imageFile);
    const result: { lat?: string; lng?: string; date?: string } = {};

    if (data && data.latitude !== undefined && data.longitude !== undefined) {
      result.lat = data.latitude.toString();
      result.lng = data.longitude.toString();
    }

    const dateTag = data?.DateTimeOriginal || data?.CreateDate || data?.ModifyDate;
    if (dateTag) {
      let dateObj: Date;
      if (typeof dateTag === 'string') {
        // EXIF dates are often "YYYY:MM:DD HH:MM:SS"
        // Replace first two colons with hyphens to make it parseable
        const formatted = dateTag.replace(/:/g, (match, offset) => offset < 10 ? '-' : match);
        dateObj = new Date(formatted);
      } else if (dateTag instanceof Date) {
        dateObj = dateTag;
      } else {
        dateObj = new Date(dateTag);
      }
      
      if (!isNaN(dateObj.getTime())) {
        result.date = dateObj.toISOString().split('T')[0];
      }
    }

    return result;
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
