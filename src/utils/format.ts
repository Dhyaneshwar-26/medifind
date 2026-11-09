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

export function availabilityFromQuantity(quantity: number): MedicineAvailability {
  if (!Number.isFinite(quantity) || quantity <= 0) return 'out_of_stock';
  if (quantity <= 10) return 'low_stock';
  return 'in_stock';
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
