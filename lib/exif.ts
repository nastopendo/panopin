import exifr from "exifr";

export interface PhotoExif {
  lat: number | null;
  lng: number | null;
  altitude: number | null;
  capturedAt: Date | null;
  heading: number | null; // GPano:PoseHeadingDegrees or GPS track
  width: number | null;
  height: number | null;
}

export async function extractExif(file: File): Promise<PhotoExif> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = await exifr.parse(file, { gps: true, exif: true, xmp: true } as any);

  if (!parsed) {
    return { lat: null, lng: null, altitude: null, capturedAt: null, heading: null, width: null, height: null };
  }

  const lat = parsed.latitude ?? null;
  const lng = parsed.longitude ?? null;
  const altitude = parsed.GPSAltitude ?? null;
  const capturedAt = parsed.DateTimeOriginal ?? parsed.CreateDate ?? null;

  // GPano XMP tag (Google Street View / Insta360 / Ricoh Theta)
  const heading =
    parsed.PoseHeadingDegrees ??
    parsed.GPSImgDirection ??
    parsed.GPSTrack ??
    null;

  const width = parsed.PixelXDimension ?? parsed.ImageWidth ?? null;
  const height = parsed.PixelYDimension ?? parsed.ImageHeight ?? null;

  return { lat, lng, altitude, capturedAt, heading, width, height };
}
