import type { ComponentType } from 'react';

import { BoltIcon, CarIcon, GridIcon, MirrorIcon, TireIcon, WrenchIcon } from '@/components/icons';

export type Category = {
  id: string;
  label: string;
  Icon: ComponentType<{ size?: number; color?: string }>;
};

export const categories: Category[] = [
  { id: 'all', label: 'All Parts', Icon: GridIcon },
  { id: 'tyres', label: 'Tyres & Wheels', Icon: TireIcon },
  { id: 'electrical', label: 'Electrical', Icon: BoltIcon },
  { id: 'engine', label: 'Engine', Icon: WrenchIcon },
  { id: 'body', label: 'Body & Mirrors', Icon: MirrorIcon },
  { id: 'exterior', label: 'Exterior', Icon: CarIcon },
];

export function iconForCategory(categoryId: string) {
  return categories.find((c) => c.id === categoryId)?.Icon ?? WrenchIcon;
}
