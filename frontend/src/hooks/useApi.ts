import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  vehiclesApi, leasingOffersApi, comparisonsApi,
  type Vehicle, type LeasingOffer, type Comparison, type ComparisonCreate, type ComparisonResult
} from '@/services/api';

// Vehicles
export function useVehicles() {
  return useQuery({ queryKey: ['vehicles'], queryFn: vehiclesApi.list });
}

export function useVehicle(id: string) {
  return useQuery({ queryKey: ['vehicles', id], queryFn: () => vehiclesApi.get(id), enabled: !!id });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehiclesApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Vehicle> }) => vehiclesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles', id] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehiclesApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

// Leasing Offers
export function useLeasingOffers(vehicleId?: string) {
  return useQuery({ 
    queryKey: ['leasing-offers', vehicleId], 
    queryFn: () => leasingOffersApi.list({ vehicle_id: vehicleId }),
    enabled: !!vehicleId,
  });
}

export function useLeasingOffer(id: string) {
  return useQuery({ queryKey: ['leasing-offers', id], queryFn: () => leasingOffersApi.get(id), enabled: !!id });
}

export function useCreateLeasingOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leasingOffersApi.create,
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ['leasing-offers', vars.vehicle_id] }),
  });
}

export function useUpdateLeasingOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LeasingOffer> }) => leasingOffersApi.update(id, data),
    onSuccess: (_, { id }) => queryClient.invalidateQueries({ queryKey: ['leasing-offers', id] }),
  });
}

export function useDeleteLeasingOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leasingOffersApi.delete,
    onSuccess: (_, id) => queryClient.invalidateQueries({ queryKey: ['leasing-offers', id] }),
  });
}

// Comparisons
export function useCalculateComparison() {
  return useMutation({ mutationFn: comparisonsApi.calculate });
}

export function useCreateComparison() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: comparisonsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comparisons'] }),
  });
}

export function useComparisons() {
  return useQuery({ queryKey: ['comparisons'], queryFn: comparisonsApi.list });
}

export function useComparison(id: string) {
  return useQuery({ queryKey: ['comparisons', id], queryFn: () => comparisonsApi.get(id), enabled: !!id });
}

export function usePublicComparison(slug: string) {
  return useQuery({ queryKey: ['comparisons', 'public', slug], queryFn: () => comparisonsApi.getPublic(slug), enabled: !!slug });
}

export function useDeleteComparison() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: comparisonsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comparisons'] }),
  });
}
