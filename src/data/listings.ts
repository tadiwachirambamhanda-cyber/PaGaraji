import type { ComponentType } from 'react';
import type { ImageSourcePropType } from 'react-native';

import { BoltIcon, CarIcon, MirrorIcon, TireIcon } from '@/components/icons';

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

export const listings: Listing[] = [
  {
    id: '1',
    categoryId: 'engine',
    title: 'Brake Pads (Front)',
    fitment: 'Fits Toyota Hilux 2015-2020',
    price: 45,
    condition: 'Used',
    location: 'Msasa, Harare',
    origin: 'Local',
    Icon: CarIcon,
    image: require('@/assets/images/listings/brake-pads.jpg'),
    description:
      'Genuine front brake pad set, removed from a low-mileage Hilux during a brake upgrade. Roughly 60% pad life remaining. Fits 2015-2020 models with standard (non-sport) brakes.',
    sellerName: 'Tino’s Auto Spares',
    sellerInitials: 'TA',
    sellerRating: 4.8,
    sellerPhone: '263771234567',
    leadTime: 'Ready now · pickup or local delivery',
  },
  {
    id: '2',
    categoryId: 'tyres',
    title: 'Tyre 195/65R15',
    fitment: 'Fits most sedans',
    price: 60,
    condition: 'New',
    location: 'Guangzhou · 12 days',
    origin: 'China',
    Icon: TireIcon,
    image: require('@/assets/images/listings/tyre.jpg'),
    description:
      'Brand new 195/65R15 all-season tyre, factory sealed. Sold individually. Ships from our Guangzhou warehouse with customs handled on arrival in Harare.',
    sellerName: 'Guangzhou Auto Trading',
    sellerInitials: 'GT',
    sellerRating: 4.6,
    sellerPhone: '8613800001234',
    leadTime: 'Imported · ~12 days to Harare',
  },
  {
    id: '3',
    categoryId: 'electrical',
    title: 'Alternator 90A',
    fitment: 'Fits Honda Fit 2010+',
    price: 85,
    condition: 'Refurb',
    location: 'Graniteside, Harare',
    origin: 'Local',
    Icon: BoltIcon,
    image: require('@/assets/images/listings/alternator.jpg'),
    description:
      'Professionally reconditioned 90A alternator, bench-tested and load-checked. Comes with a 3-month workshop warranty. Core exchange available for a discount.',
    sellerName: 'Msasa Motor Parts',
    sellerInitials: 'MM',
    sellerRating: 4.9,
    sellerPhone: '263772345678',
    leadTime: 'Ready now · 3-month warranty',
  },
  {
    id: '4',
    categoryId: 'body',
    title: 'Side Mirror (L)',
    fitment: 'Fits Isuzu KB 2018+',
    price: 28,
    condition: 'New',
    location: 'Dubai · 9 days',
    origin: 'Dubai',
    Icon: MirrorIcon,
    image: require('@/assets/images/listings/side-mirror.jpg'),
    description:
      'New OEM-spec left-side mirror assembly, electric adjust, unpainted. Ships from our Al Barsha warehouse in Dubai. Minimum lead time reflects air freight and customs clearance.',
    sellerName: 'Al Barsha Spares Dubai',
    sellerInitials: 'AB',
    sellerRating: 4.7,
    sellerPhone: '971501234567',
    leadTime: 'Imported · ~9 days to Harare',
  },
];
