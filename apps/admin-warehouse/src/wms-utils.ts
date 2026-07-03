export interface PlacementRec {
  cell_code: string;
  zone: string;
  sku_id: string;
  barcode: string;
}

const STORAGE_KEY = 'wms_placements';

export function savePlacementsLocal(items: PlacementRec[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function loadPlacementsLocal(): PlacementRec[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PlacementRec[]) : [];
  } catch {
    return [];
  }
}

export function statusChipClass(status: string): string {
  const key = status.replace(/[^a-z_]/gi, '_').toLowerCase();
  return `wms-chip wms-chip--${key}`;
}

export function defaultExpiryDate(minDays = 14): string {
  const d = new Date();
  d.setDate(d.getDate() + minDays);
  return d.toISOString().slice(0, 10);
}

export const DEMO_ASL = '0104600123456789';
