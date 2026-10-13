'use client';
import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { LoaderCircle, WifiOff } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import type { SavedLocation } from '@/lib/types';
import { useTripStore } from '@/store/use-trip-store';
export function MapView({
  locations,
  selectedId,
  onSelect,
  picking,
  onPick,
}: {
  locations: SavedLocation[];
  selectedId?: string;
  onSelect: (id: string) => void;
  picking?: boolean;
  onPick: (latitude: number, longitude: number) => void;
}) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<Leaflet.Map | null>(null),
    layer = useRef<Leaflet.LayerGroup | null>(null),
    tiles = useRef<Leaflet.TileLayer | null>(null),
    [ready, setReady] = useState(false),
    [unavailable, setUnavailable] = useState(false);
  const theme = useTripStore((s) => s.theme),
    callbacks = useRef({ onSelect, onPick, picking });
  callbacks.current = { onSelect, onPick, picking };
  useEffect(() => {
    let cancelled = false;
    let resize: ResizeObserver | undefined;
    import('leaflet')
      .then((L) => {
        if (cancelled || !container.current || map.current) return;
        const instance = L.map(container.current, {
          center: [35.6892, 51.389],
          zoom: 6,
          zoomControl: false,
          scrollWheelZoom: false,
          attributionControl: true,
        });
        map.current = instance;
        L.control
          .zoom({ position: 'bottomleft', zoomInTitle: 'بزرگ‌نمایی', zoomOutTitle: 'کوچک‌نمایی' })
          .addTo(instance);
        const dark = !document.documentElement.classList.contains('light');
        tiles.current = L.tileLayer(
          `https://{s}.basemaps.cartocdn.com/${dark ? 'dark_nolabels' : 'light_nolabels'}/{z}/{x}/{y}{r}.png`,
          {
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> · <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
            maxZoom: 19,
          },
        ).addTo(instance);
        instance.attributionControl.setPrefix(false);
        let errors = 0;
        tiles.current.on('tileerror', () => {
          if (++errors > 2) setUnavailable(true);
        });
        tiles.current.on('tileload', () => setUnavailable(false));
        layer.current = L.layerGroup().addTo(instance);
        instance.on('click', (e: Leaflet.LeafletMouseEvent) => {
          if (callbacks.current.picking)
            callbacks.current.onPick(
              Number(e.latlng.lat.toFixed(6)),
              Number(e.latlng.lng.toFixed(6)),
            );
        });
        resize = new ResizeObserver(() => instance.invalidateSize());
        resize.observe(container.current);
        setReady(true);
      })
      .catch(() => setUnavailable(true));
    return () => {
      cancelled = true;
      resize?.disconnect();
      map.current?.remove();
      map.current = null;
      layer.current = null;
      tiles.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !map.current || !layer.current) return;
    import('leaflet').then((L) => {
      if (!map.current || !layer.current) return;
      layer.current.clearLayers();
      locations.forEach((location) => {
        const active = location.id === selectedId;
        const icon = L.divIcon({
          className: 'custom-map-marker',
          html: `<div class="map-pin${active ? ' selected' : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></div>`,
          iconSize: [36, 42],
          iconAnchor: [18, 36],
        });
        const marker = L.marker([location.latitude, location.longitude], {
          icon,
          title: location.name || 'نشانی انتخابی',
          zIndexOffset: active ? 1000 : 0,
          alt: location.name,
          keyboard: true,
        }).addTo(layer.current!);
        const tooltip = document.createElement('span');
        tooltip.textContent = location.name;
        marker.bindTooltip(tooltip, {
          direction: 'top',
          className: 'persian-map-tooltip',
          offset: [0, -28],
        });
        marker.on('click', () => callbacks.current.onSelect(location.id));
      });
    });
  }, [locations, ready, selectedId]);
  const initialBounds = useRef(false);
  useEffect(() => {
    if (!ready || !map.current || initialBounds.current) return;
    if (locations.length > 1)
      map.current.fitBounds(
        locations.map((l) => [l.latitude, l.longitude] as [number, number]),
        { padding: [65, 65], maxZoom: 12 },
      );
    else if (locations.length === 1)
      map.current.setView([locations[0].latitude, locations[0].longitude], 13);
    initialBounds.current = true;
  }, [ready, locations]);
  useEffect(() => {
    const location = locations.find((l) => l.id === selectedId);
    if (!location || !map.current) return;
    map.current.setView(
      [location.latitude, location.longitude],
      Math.max(14, map.current.getZoom()),
      { animate: !matchMedia('(prefers-reduced-motion: reduce)').matches },
    );
  }, [selectedId, ready]);
  useEffect(() => {
    if (tiles.current) {
      const dark = !document.documentElement.classList.contains('light');
      tiles.current.setUrl(
        `https://{s}.basemaps.cartocdn.com/${dark ? 'dark_nolabels' : 'light_nolabels'}/{z}/{x}/{y}{r}.png`,
      );
    }
  }, [theme, ready]);
  return (
    <>
      <div
        className={picking ? 'leaflet-map picking' : 'leaflet-map'}
        ref={container}
        role="region"
        aria-label="نقشه مکان‌های سفر"
      />
      {!ready && (
        <div className="map-loading">
          <LoaderCircle size={23} className="spin" />
          <p>نقشه در حال باز شدن است…</p>
        </div>
      )}
      {unavailable && (
        <div className="map-unavailable" role="status">
          <WifiOff size={14} />
          تصویر آنلاین نقشه در دسترس نیست؛ نشانی‌ها و نشان‌ها محفوظ‌اند.
        </div>
      )}
    </>
  );
}
