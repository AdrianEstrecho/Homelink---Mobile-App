import { Component, ElementRef, afterNextRender, effect, input, viewChild } from '@angular/core';
import L from 'leaflet';

// frontend/src/components/TrackingMap.jsx uses Leaflet's default pin icon (a PNG image) for
// origin/destination markers, pointing Icon.Default at explicit asset URLs so Vite can resolve
// them. Angular's builder doesn't support that same override (a `new URL('leaflet/dist/...',
// import.meta.url)` call there resolves to a real but nonexistent runtime URL, since unlike
// Vite it won't statically rewrite that pattern for a bare package path). Leaflet's own
// fallback path-detection (reading the URL leaflet.css's .leaflet-default-icon-path rule
// resolves to) partially works under Angular's CSS bundling, but only for the exact file the
// CSS references -- marker-shadow.png, derived from that path by Leaflet at runtime rather
// than referenced directly, still 404s. Sidestepping the whole mechanism: every marker here
// is a plain inline-SVG divIcon, so there's no external image asset to resolve at all.
function pinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,.4))">
      <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.3 21.7 0 14 0z" fill="${color}"/>
      <circle cx="14" cy="14" r="5.5" fill="white"/>
    </svg>`,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -34],
  });
}

const officeIcon = pinIcon('#0f2b5b');
const destinationIcon = pinIcon('#f97316');

const technicianIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const movingIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#0d9488;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Ported from frontend/src/components/TrackingMap.jsx.
 * origin/destination: HomeLink office and the shipping/service address.
 * movingPoint: interpolated in-transit position for product orders.
 * technicianLocation: the installer's last-reported live position.
 */
@Component({
  selector: 'app-tracking-map',
  templateUrl: './tracking-map.html',
  styleUrl: './tracking-map.css',
})
export class TrackingMap {
  readonly origin = input<LatLng | null>(null);
  readonly destination = input<LatLng | null>(null);
  readonly movingPoint = input<LatLng | null>(null);
  readonly technicianLocation = input<LatLng | null>(null);

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('container');
  private map: L.Map | null = null;
  private layer: L.LayerGroup | null = null;

  constructor() {
    afterNextRender(() => {
      const map = L.map(this.container().nativeElement, { scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      this.map = map;
      this.redraw();
    });

    effect(() => {
      this.origin();
      this.destination();
      this.movingPoint();
      this.technicianLocation();
      this.redraw();
    });
  }

  private redraw(): void {
    const map = this.map;
    if (!map) return;

    this.layer?.remove();
    const layer = L.layerGroup().addTo(map);
    this.layer = layer;

    const origin = this.origin();
    const destination = this.destination();
    const movingPoint = this.movingPoint();
    const technicianLocation = this.technicianLocation();

    const points: L.LatLngTuple[] = [];
    if (origin) {
      L.marker([origin.lat, origin.lng], { icon: officeIcon }).addTo(layer).bindPopup('HomeLink Office');
      points.push([origin.lat, origin.lng]);
    }
    if (destination) {
      L.marker([destination.lat, destination.lng], { icon: destinationIcon }).addTo(layer).bindPopup('Delivery Address');
      points.push([destination.lat, destination.lng]);
    }
    if (origin && destination) {
      L.polyline([[origin.lat, origin.lng], [destination.lat, destination.lng]], { color: '#94a3b8', dashArray: '6 6', weight: 2 }).addTo(layer);
    }
    if (movingPoint) {
      L.marker([movingPoint.lat, movingPoint.lng], { icon: movingIcon }).addTo(layer).bindPopup('Your order');
      points.push([movingPoint.lat, movingPoint.lng]);
    }
    if (technicianLocation) {
      L.marker([technicianLocation.lat, technicianLocation.lng], { icon: technicianIcon }).addTo(layer).bindPopup('Technician');
      points.push([technicianLocation.lat, technicianLocation.lng]);
    }

    if (points.length === 1) map.setView(points[0], 14);
    else if (points.length > 1) map.fitBounds(points, { padding: [30, 30] });
    else map.setView([14.5995, 120.9842], 11);

    setTimeout(() => map.invalidateSize(), 0);
  }
}
