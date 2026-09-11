import { LatLng } from '../shared/tracking-map/tracking-map';

export interface TrackingTimelineEntry {
  status: string;
  at: string;
  note: string;
}

export interface TrackingTechnician {
  name: string;
  phone: string | null;
}

export interface TrackingData {
  status: string;
  cancelReason: string | null;
  steps: string[];
  timeline: TrackingTimelineEntry[];
  origin: LatLng | null;
  destination: LatLng | null;
  etaDays?: number;
  estimatedDeliveryDate?: string;
  technician?: TrackingTechnician | null;
  technicianLocation?: (LatLng & { updatedAt: string | null }) | null;
}
