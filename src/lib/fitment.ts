import type { Listing } from '@/data/listings';
import type { Vehicle } from '@/store/vehicle';

type YearSpan = [number, number];

function fullYear(value: string, startYear: number): number {
  if (value.length === 4) return Number(value);
  // "2015-20" → 2020: borrow the century from the start year.
  return Math.floor(startYear / 100) * 100 + Number(value);
}

/** Pulls "2015-2020" style ranges and lone years out of free text. */
function yearSpans(text: string): YearSpan[] {
  const spans: YearSpan[] = [];
  const withoutRanges = text.replace(/\b((?:19|20)\d{2})\s*(?:-|–|—|to)\s*(\d{4}|\d{2})\b/g, (_, start: string, end: string) => {
    spans.push([Number(start), fullYear(end, Number(start))]);
    return ' ';
  });
  for (const match of withoutRanges.matchAll(/\b(?:19|20)\d{2}\b/g)) {
    spans.push([Number(match[0]), Number(match[0])]);
  }
  return spans;
}

/**
 * True only when the listing text names the owner's model and, if it names years,
 * the owner's year falls inside them. "Fits most sedans" never counts — a wrong
 * "fits your car" is worse than no label.
 */
export function fitsVehicle(listing: Pick<Listing, 'title' | 'fitment'>, vehicle: Vehicle | null): boolean {
  if (!vehicle) return false;
  const model = vehicle.model.trim().toLowerCase();
  if (model.length < 2) return false;

  const text = `${listing.title} ${listing.fitment}`.toLowerCase();
  const escaped = model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text)) return false;

  const year = Number(vehicle.year);
  if (!year) return true;
  const spans = yearSpans(text);
  return spans.length === 0 || spans.some(([from, to]) => year >= from && year <= to);
}
