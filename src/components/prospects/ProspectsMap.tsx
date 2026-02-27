"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface ProspectMapInput {
  id: string;
  company: string;
  city: string | null;
  address: string | null;
  googleMapsUrl: string | null;
  scoreGlobal: number | null;
}

interface ProspectPoint {
  id: string;
  company: string;
  city: string | null;
  address: string | null;
  scoreGlobal: number | null;
  lat: number;
  lng: number;
}

interface ProspectsMapProps {
  prospects: ProspectMapInput[];
  loading?: boolean;
}

type LeafletWithMap = typeof window & {
  L?: {
    map: (el: HTMLElement) => LeafletMap;
    tileLayer: (url: string, opts: Record<string, unknown>) => { addTo: (m: LeafletMap) => void };
    layerGroup: () => LeafletLayerGroup;
    marker: (coords: [number, number]) => LeafletMarker;
    latLngBounds: (coords: [number, number][]) => { isValid: () => boolean };
  };
};

interface LeafletMap {
  setView: (coords: [number, number], zoom: number) => void;
  fitBounds: (bounds: { isValid: () => boolean }, options?: { padding?: [number, number]; maxZoom?: number }) => void;
  remove: () => void;
}

interface LeafletLayerGroup {
  addTo: (m: LeafletMap) => void;
  clearLayers: () => void;
}

interface LeafletMarker {
  addTo: (g: LeafletLayerGroup) => LeafletMarker;
  bindTooltip: (text: string) => LeafletMarker;
}

const FALLBACK_CENTER: [number, number] = [46.6034, 1.8883];
const MAX_GEOCODE_ITEMS = 30;

let leafletLoader: Promise<void> | null = null;

function loadLeaflet(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const typedWindow = window as LeafletWithMap;
  if (typedWindow.L) return Promise.resolve();
  if (leafletLoader) return leafletLoader;

  leafletLoader = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet="true"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.crossOrigin = "";
      link.setAttribute("data-leaflet", "true");
      document.head.appendChild(link);
    }

    const existing = document.querySelector('script[data-leaflet="true"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Leaflet load failed")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.crossOrigin = "";
    script.setAttribute("data-leaflet", "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Leaflet load failed"));
    document.body.appendChild(script);
  });

  return leafletLoader;
}

function extractCoordsFromGoogleMapsUrl(url: string | null): { lat: number; lng: number } | null {
  if (!url) return null;

  const patterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (!match) continue;
    const lat = Number.parseFloat(match[1]);
    const lng = Number.parseFloat(match[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }

  return null;
}

async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  const endpoint = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(endpoint);
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = Number.parseFloat(data[0].lat);
  const lng = Number.parseFloat(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export default function ProspectsMap({ prospects, loading = false }: ProspectsMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const layerGroupRef = useRef<LeafletLayerGroup | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [points, setPoints] = useState<ProspectPoint[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    let active = true;
    void loadLeaflet()
      .then(() => {
        if (active) setLeafletReady(true);
      })
      .catch(() => {
        if (active) setLeafletReady(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const run = async () => {
      const immediatePoints: ProspectPoint[] = prospects
        .map((p) => {
          const coords = extractCoordsFromGoogleMapsUrl(p.googleMapsUrl);
          if (!coords) return null;
          return {
            id: p.id,
            company: p.company,
            city: p.city,
            address: p.address,
            scoreGlobal: p.scoreGlobal,
            lat: coords.lat,
            lng: coords.lng,
          };
        })
        .filter((p): p is ProspectPoint => p !== null);

      const mappedIds = new Set(immediatePoints.map((p) => p.id));
      const geocodeTargets = prospects
        .filter((p) => !mappedIds.has(p.id))
        .filter((p) => Boolean(p.address || p.city))
        .slice(0, MAX_GEOCODE_ITEMS);

      if (geocodeTargets.length === 0) {
        if (active) setPoints(immediatePoints);
        return;
      }

      if (active) setIsGeocoding(true);
      const geocoded = await Promise.all(
        geocodeTargets.map(async (p) => {
          const query = [p.address, p.city, "France"].filter(Boolean).join(", ");
          try {
            const coords = await geocodeAddress(query);
            if (!coords) return null;
            return {
              id: p.id,
              company: p.company,
              city: p.city,
              address: p.address,
              scoreGlobal: p.scoreGlobal,
              lat: coords.lat,
              lng: coords.lng,
            } as ProspectPoint;
          } catch {
            return null;
          }
        })
      );

      if (active) {
        setPoints([...immediatePoints, ...geocoded.filter((p): p is ProspectPoint => p !== null)]);
        setIsGeocoding(false);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [prospects]);

  useEffect(() => {
    if (!leafletReady || !mapRef.current) return;

    const typedWindow = window as LeafletWithMap;
    if (!typedWindow.L) return;

    if (!leafletMapRef.current) {
      leafletMapRef.current = typedWindow.L.map(mapRef.current);
      typedWindow.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(leafletMapRef.current);
      leafletMapRef.current.setView(FALLBACK_CENTER, 6);
      layerGroupRef.current = typedWindow.L.layerGroup();
      layerGroupRef.current.addTo(leafletMapRef.current);
    }

    const map = leafletMapRef.current;
    const layerGroup = layerGroupRef.current;
    const L = typedWindow.L;
    if (!map || !layerGroup || !L) return;

    layerGroup.clearLayers();

    for (const point of points) {
      L.marker([point.lat, point.lng]).addTo(layerGroup).bindTooltip(point.company);
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    } else {
      map.setView(FALLBACK_CENTER, 6);
    }

  }, [leafletReady, points]);

  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      layerGroupRef.current = null;
    };
  }, []);

  const stats = useMemo(() => {
    return {
      total: prospects.length,
      mapped: points.length,
      unmapped: Math.max(0, prospects.length - points.length),
    };
  }, [points.length, prospects.length]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">Chargement de la carte...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
        <span className="px-2 py-1 rounded bg-gray-900 border border-gray-800">{stats.total} prospects affichés</span>
        <span className="px-2 py-1 rounded bg-emerald-900/30 text-emerald-300 border border-emerald-900/50">{stats.mapped} géolocalisés</span>
        <span className="px-2 py-1 rounded bg-gray-900 border border-gray-800">{stats.unmapped} sans position</span>
        {isGeocoding && <span className="px-2 py-1 rounded bg-blue-900/40 text-blue-300 border border-blue-900/50">Géocodage en cours...</span>}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <div ref={mapRef} className="h-[560px] w-full" />
      </div>

      <p className="text-xs text-gray-500">
        Les positions sont extraites depuis les URLs Google Maps puis complétées par géocodage de l&apos;adresse.
      </p>
    </div>
  );
}
