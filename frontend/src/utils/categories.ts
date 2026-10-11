import { Car, Hammer, Home, Laptop, Package, type LucideIcon } from 'lucide-react';
import type { PurchaseCategory } from '@/types/api';

export const categories: { value: PurchaseCategory; label: string; icon: LucideIcon }[] = [
  { value: 'vehicle', label: 'Vehículo', icon: Car },
  { value: 'home', label: 'Hogar y electrodomésticos', icon: Home },
  { value: 'renovation', label: 'Reforma', icon: Hammer },
  { value: 'electronics', label: 'Tecnología', icon: Laptop },
  { value: 'other', label: 'Otra compra', icon: Package },
];

export function getCategory(value: PurchaseCategory) {
  return categories.find(c => c.value === value) ?? categories[categories.length - 1];
}
