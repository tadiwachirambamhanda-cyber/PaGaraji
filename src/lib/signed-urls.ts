import { useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * Request photos are private, so each is shown through a short-lived link (one hour).
 * Returns the links in the same order as `paths`; entries are empty until they load.
 */
export function useSignedRequestPhotoUrls(paths: readonly string[]): string[] {
  const key = paths.join('|');
  const list = useMemo(() => (key === '' ? [] : key.split('|')), [key]);
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!supabase || list.length === 0) return;
    let cancelled = false;
    supabase.storage
      .from('request-photos')
      .createSignedUrls(list, 3600)
      .then(({ data }) => {
        if (!cancelled && data) setUrls(data.map((entry) => entry.signedUrl ?? ''));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [list]);

  return list.length === 0 ? [] : urls;
}
