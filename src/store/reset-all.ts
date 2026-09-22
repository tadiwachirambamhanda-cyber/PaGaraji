import { clearAllPhotos } from '@/lib/photos';
import { resetMyListings } from '@/store/my-listings';
import { resetRequests } from '@/store/my-requests';
import { clearRecentSearches } from '@/store/recent-searches';
import { resetProfile } from '@/store/profile';
import { resetSaved } from '@/store/saved-listings';
import { resetSettings } from '@/store/settings';
import { resetSupplier } from '@/store/supplier';
import { resetVehicle } from '@/store/vehicle';

// Chat lives entirely on the server now — nothing local to clear, same as listings and requests.
export function resetAllData() {
  resetSaved();
  resetMyListings();
  resetRequests();
  resetProfile();
  resetSettings();
  resetSupplier();
  resetVehicle();
  clearRecentSearches();
  clearAllPhotos();
}
