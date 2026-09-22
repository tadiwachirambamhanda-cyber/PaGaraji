import { clearAllPhotos } from '@/lib/photos';
import { resetConversations } from '@/store/conversations';
import { resetMyListings } from '@/store/my-listings';
import { resetRequests } from '@/store/my-requests';
import { clearRecentSearches } from '@/store/recent-searches';
import { resetProfile } from '@/store/profile';
import { resetSaved } from '@/store/saved-listings';
import { resetSettings } from '@/store/settings';
import { resetSupplier } from '@/store/supplier';
import { resetVehicle } from '@/store/vehicle';

export function resetAllData() {
  resetSaved();
  resetMyListings();
  resetRequests();
  resetConversations();
  resetProfile();
  resetSettings();
  resetSupplier();
  resetVehicle();
  clearRecentSearches();
  clearAllPhotos();
}
