import type { ComponentType } from 'react';
import type { ImageSourcePropType } from 'react-native';

/** Stored in `description` when a seller writes nothing, so the detail page can hide the section. */
export const NO_DESCRIPTION = 'No further details provided.';

export type Condition = 'New' | 'Used' | 'Refurb';
export type Origin = 'Local' | 'Dubai' | 'China';

export type Listing = {
  id: string;
  categoryId: string;
  title: string;
  fitment: string;
  price: number;
  condition: Condition;
  location: string;
  origin: Origin;
  Icon: ComponentType<{ size?: number; color?: string }>;
  /** Real product photo, when a seller has one. Falls back to an icon-on-gradient treatment when absent. */
  image?: ImageSourcePropType;
  /** Photos the seller added, as file names saved by lib/photos. Shown ahead of `image`. */
  photos?: string[];
  description: string;
  sellerName: string;
  sellerInitials: string;
  /** Only set when real ratings exist. Listings you post yourself have none. */
  sellerRating?: number;
  /** How many reviews `sellerRating` is averaged from. */
  sellerReviewCount?: number;
  sellerPhone: string;
  leadTime: string;
  /** Set by the seller: hidden from the feed but kept in their own list. */
  sold?: boolean;
  /** True for listings stored online. `photos` then holds storage paths instead of on-device file names. */
  remote?: boolean;
  /** Account id of the seller, for online listings. */
  sellerId?: string;
  /** Import listing from an approved supplier (the server only accepts these from approved suppliers). */
  verified?: boolean;
};
