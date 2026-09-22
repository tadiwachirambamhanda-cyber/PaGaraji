import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { backendEnabled, supabase } from '@/lib/supabase';

const STORAGE_KEY = 'pagaraji.supplier';

export type SupplierCountry = 'Dubai' | 'China' | 'Zimbabwe';
/** The two supplier countries that mean "imported": the ones a listing's `origin` can be. */
export type ImportCountry = Exclude<SupplierCountry, 'Zimbabwe'>;
export type SupplierStatus = 'pending' | 'approved' | 'rejected';

export type Supplier = {
  business: string;
  country: SupplierCountry;
  /** City or trading area the parts ship from, e.g. "Al Quoz", "Guangzhou" or "Harare". */
  city: string;
  categoryId: string;
  /** Typical time to reach a buyer, e.g. "8-12 days" for an import or "Same day" for local stock. */
  leadTime: string;
  whatsapp: string;
  submittedAt: number;
  /** Set when the application is stored online. Without a backend there is no review, so it stays undefined. */
  status?: SupplierStatus;
};

/** Approved online, or saved on this phone where no review exists. */
export function isApprovedSupplier(supplier: Supplier | null): supplier is Supplier {
  return supplier !== null && (supplier.status === undefined || supplier.status === 'approved');
}

type SupplierRow = {
  business: string;
  country: SupplierCountry;
  city: string;
  category_id: string;
  lead_time: string;
  whatsapp: string;
  status: SupplierStatus;
  created_at: string;
};

let supplier: Supplier | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function fromRow(row: SupplierRow): Supplier {
  return {
    business: row.business,
    country: row.country,
    city: row.city,
    categoryId: row.category_id,
    leadTime: row.lead_time,
    whatsapp: row.whatsapp,
    submittedAt: Date.parse(row.created_at),
    status: row.status,
  };
}

/** Online: reads your application (and whether it's been approved). Signed out: none. */
export async function refreshSupplier(): Promise<void> {
  if (!supabase) return;
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) {
    supplier = null;
    emitChange();
    return;
  }
  const { data, error } = await supabase.from('suppliers').select('*').eq('user_id', userId).maybeSingle();
  if (error) return;
  supplier = data ? fromRow(data as SupplierRow) : null;
  emitChange();
}

if (backendEnabled) {
  // With accounts, the server is the source of truth, so nothing is read from this phone.
  if (supabase) {
    refreshSupplier();
    // Deferred: Supabase asks that its own calls are not made inside this callback.
    supabase.auth.onAuthStateChange((event) => {
      if (event !== 'TOKEN_REFRESHED') setTimeout(refreshSupplier, 0);
    });
  }
} else {
  AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (!raw) return;
      supplier = JSON.parse(raw);
      emitChange();
    })
    .catch(() => {
      // Nothing saved yet, or storage unavailable — not a supplier.
    });
}

export function getSupplier() {
  return supplier;
}

/**
 * Saves an application. Online it goes to the server as "pending" for review;
 * returns an error message, or null on success.
 */
export async function saveSupplier(next: Omit<Supplier, 'status'>): Promise<string | null> {
  if (!backendEnabled) {
    supplier = next;
    emitChange();
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(supplier)).catch(() => {});
    return null;
  }
  if (!supabase) return 'Couldn’t reach the server. Try again.';
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return 'Sign in first.';
  if (supplier?.status === 'approved') return 'Your details are approved. Contact us to change them.';

  const { error } = await supabase.from('suppliers').upsert({
    user_id: userId,
    business: next.business,
    country: next.country,
    city: next.city,
    category_id: next.categoryId,
    lead_time: next.leadTime,
    whatsapp: next.whatsapp,
    status: 'pending',
  });
  if (error) return error.message;
  await refreshSupplier();
  return null;
}

export function resetSupplier() {
  if (backendEnabled) return; // an online application belongs to the account, not this phone
  supplier = null;
  emitChange();
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSupplier() {
  return useSyncExternalStore(subscribe, () => supplier);
}
