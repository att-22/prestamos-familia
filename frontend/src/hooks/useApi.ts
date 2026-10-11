import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { vehiclesApi, leasingOffersApi, comparisonsApi } from '@/services/api';
import type { VehicleCreate, LeasingOfferCreate, ComparisonCreate } from '@/types/api';

// Vehicles
export function useVehicles() {
  return useQuery({ queryKey: ['vehicles'], queryFn: () => vehiclesApi.list().then(r => r.data) });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: ['vehicles', id],
    queryFn: () => vehiclesApi.get(id).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: VehicleCreate) => vehiclesApi.create(data).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VehicleCreate> }) =>
      vehiclesApi.update(id, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      // El precio al contado cambia el resultado de las comparativas
      queryClient.invalidateQueries({ queryKey: ['comparisons'] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vehiclesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['leasing-offers'] });
      queryClient.invalidateQueries({ queryKey: ['comparisons'] });
    },
  });
}

// Leasing Offers
export function useLeasingOffers(vehicleId?: string) {
  return useQuery({
    queryKey: ['leasing-offers', 'list', vehicleId],
    queryFn: () => leasingOffersApi.list({ vehicle_id: vehicleId }).then(r => r.data),
    enabled: !!vehicleId,
  });
}

export function useLeasingOffer(id: string) {
  return useQuery({
    queryKey: ['leasing-offers', 'detail', id],
    queryFn: () => leasingOffersApi.get(id).then(r => r.data),
    enabled: !!id,
  });
}

function useInvalidateOffers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['leasing-offers'] });
    queryClient.invalidateQueries({ queryKey: ['comparisons'] });
  };
}

export function useCreateLeasingOffer() {
  const invalidate = useInvalidateOffers();
  return useMutation({
    mutationFn: (data: LeasingOfferCreate) => leasingOffersApi.create(data).then(r => r.data),
    onSuccess: invalidate,
  });
}

export function useUpdateLeasingOffer() {
  const invalidate = useInvalidateOffers();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LeasingOfferCreate> }) =>
      leasingOffersApi.update(id, data).then(r => r.data),
    onSuccess: invalidate,
  });
}

export function useDeleteLeasingOffer() {
  const invalidate = useInvalidateOffers();
  return useMutation({
    mutationFn: (id: string) => leasingOffersApi.delete(id),
    onSuccess: invalidate,
  });
}

// Comparisons
export function useComparisonPreview(data: ComparisonCreate) {
  return useQuery({
    queryKey: ['comparisons', 'calculate', data],
    queryFn: () => comparisonsApi.calculate(data).then(r => r.data),
    enabled: !!data.vehicle_id && !!data.leasing_offer_id,
    placeholderData: keepPreviousData,
  });
}

export function useCreateComparison() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ComparisonCreate) => comparisonsApi.create(data).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comparisons', 'list'] }),
  });
}

export function useComparisons() {
  return useQuery({
    queryKey: ['comparisons', 'list'],
    queryFn: () => comparisonsApi.list().then(r => r.data),
  });
}

export function usePublicComparison(slug: string) {
  return useQuery({
    queryKey: ['comparisons', 'public', slug],
    queryFn: () => comparisonsApi.getPublic(slug).then(r => r.data),
    enabled: !!slug,
    retry: false,
  });
}

export function useDeleteComparison() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => comparisonsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comparisons', 'list'] }),
  });
}
