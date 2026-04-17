export interface PhotoData {
  id: string;
  title: string;
  description: string;
  image_url: string;
  thumb_url: string;
  location: {
    lat: number;
    lng: number;
  };
  captured_at: string;
}
