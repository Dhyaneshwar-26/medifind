import type { AvailabilityStatus } from '../types/database';
import type { MedicineAvailability } from '../types/pharmacy';

export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return 'Not recorded';
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return 'Not recorded';

  const diffMs = Date.now() - timestamp.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return timestamp.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats stock timestamps coming from Supabase (ISO strings) while preserving
 * already-human-readable sample values such as "15 mins ago".
 */
export function formatLastUpdated(value: string | null | undefined): string {
  if (!value) return 'Not recorded';
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return value;
  return formatRelativeTime(value);
}

export const DEFAULT_LOW_STOCK_THRESHOLD = 10;
export const EXPIRY_WARNING_DAYS = 30;

export function availabilityFromQuantity(
  quantity: number,
  lowStockThreshold: number = DEFAULT_LOW_STOCK_THRESHOLD
): MedicineAvailability {
  if (!Number.isFinite(quantity) || quantity <= 0) return 'out_of_stock';
  if (quantity <= Math.max(0, lowStockThreshold)) return 'low_stock';
  return 'in_stock';
}

/** Returns the local calendar date at midnight for stable day comparisons. */
function startOfDay(value: Date): Date {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function parseExpiryDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value.trim()}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isValidExpiryDate(value: string): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const parsed = parseExpiryDate(trimmed);
  if (!parsed) return false;
  const [year, month, day] = trimmed.split('-').map(Number);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

export function isExpiredDate(value: string | null | undefined, now: Date = new Date()): boolean {
  const expiry = parseExpiryDate(value);
  if (!expiry) return false;
  return startOfDay(expiry).getTime() < startOfDay(now).getTime();
}

export function isExpiringSoonDate(
  value: string | null | undefined,
  warningDays: number = EXPIRY_WARNING_DAYS,
  now: Date = new Date()
): boolean {
  const expiry = parseExpiryDate(value);
  if (!expiry) return false;
  const today = startOfDay(now).getTime();
  const expiryTime = startOfDay(expiry).getTime();
  if (expiryTime < today) return false;
  return expiryTime - today <= warningDays * 24 * 60 * 60 * 1000;
}

export type ExpiryWarningLevel = 'expired' | 'critical' | 'warning' | 'soon' | null;

/**
 * Tiered expiry warning used by the owner dashboard:
 * expired, <= 7 days (critical), <= 15 days (warning), <= 30 days (soon).
 */
export function getExpiryWarningLevel(
  value: string | null | undefined,
  now: Date = new Date()
): ExpiryWarningLevel {
  const expiry = parseExpiryDate(value);
  if (!expiry) return null;
  const today = startOfDay(now).getTime();
  const expiryTime = startOfDay(expiry).getTime();
  if (expiryTime < today) return 'expired';
  const daysLeft = Math.round((expiryTime - today) / (24 * 60 * 60 * 1000));
  if (daysLeft <= 7) return 'critical';
  if (daysLeft <= 15) return 'warning';
  if (daysLeft <= 30) return 'soon';
  return null;
}

export function expiryWarningLabel(level: ExpiryWarningLevel): string {
  switch (level) {
    case 'expired':
      return 'Expired';
    case 'critical':
      return 'Expires within 7 days';
    case 'warning':
      return 'Expires within 15 days';
    case 'soon':
      return 'Expires within 30 days';
    default:
      return '';
  }
}

export function formatExpiryDate(value: string | null | undefined): string {
  const parsed = parseExpiryDate(value);
  if (!parsed) return 'Not provided';
  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function availabilityLabel(status: AvailabilityStatus | MedicineAvailability | undefined): string {
  switch (status) {
    case 'in_stock':
      return 'In stock';
    case 'low_stock':
      return 'Low stock';
    case 'out_of_stock':
      return 'Out of stock';
    default:
      return 'Availability unknown';
  }
}

export function availabilityClasses(status: AvailabilityStatus | MedicineAvailability | undefined): string {
  switch (status) {
    case 'in_stock':
      return 'bg-[#D1FAE5] text-[#065F46] dark:bg-[#064E3B] dark:text-[#6EE7B7]';
    case 'low_stock':
      return 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#451A03] dark:text-[#FCD34D]';
    default:
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
  }
}

export function isInStock(quantity: number, status?: AvailabilityStatus | MedicineAvailability): boolean {
  if (status === 'out_of_stock') return false;
  if (status === 'in_stock' || status === 'low_stock') return quantity > 0;
  return quantity > 0;
}

export function safeNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
