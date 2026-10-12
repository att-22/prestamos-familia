import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { purchasesApi, financingOffersApi, comparisonsApi, adminApi } from '@/services/api';
import type { PurchaseCreate, FinancingOfferCreate, ComparisonCreate } from '@/types/api';

// Purchases
export function usePurchases() {
  return useQuery({ queryKey: ['purchases'], queryFn: () => purchasesApi.list().then(r => r.data) });
}

export function usePurchase(id: string) {
  return useQuery({
    queryKey: ['purchases', id],
    queryFn: () => purchasesApi.get(id).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PurchaseCreate) => purchasesApi.create(data).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchases'] }),
  });
}

export function useUpdatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PurchaseCreate> }) =>
      purchasesApi.update(id, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      // El precio al contado cambia el resultado de las comparativas
      queryClient.invalidateQueries({ queryKey: ['comparisons'] });
    },
  });
}

export function useDeletePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchasesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['financing-offers'] });
      queryClient.invalidateQueries({ queryKey: ['comparisons'] });
    },
  });
}

// Financing Offers
export function useFinancingOffers(purchaseId?: string) {
  return useQuery({
    queryKey: ['financing-offers', 'list', purchaseId],
    queryFn: () => financingOffersApi.list({ purchase_id: purchaseId }).then(r => r.data),
    enabled: !!purchaseId,
  });
}

export function useFinancingOffer(id: string) {
  return useQuery({
    queryKey: ['financing-offers', 'detail', id],
    queryFn: () => financingOffersApi.get(id).then(r => r.data),
    enabled: !!id,
  });
}

function useInvalidateOffers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['financing-offers'] });
    queryClient.invalidateQueries({ queryKey: ['comparisons'] });
  };
}

export function useCreateFinancingOffer() {
  const invalidate = useInvalidateOffers();
  return useMutation({
    mutationFn: (data: FinancingOfferCreate) => financingOffersApi.create(data).then(r => r.data),
    onSuccess: invalidate,
  });
}

export function useUpdateFinancingOffer() {
  const invalidate = useInvalidateOffers();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FinancingOfferCreate> }) =>
      financingOffersApi.update(id, data).then(r => r.data),
    onSuccess: invalidate,
  });
}

export function useDeleteFinancingOffer() {
  const invalidate = useInvalidateOffers();
  return useMutation({
    mutationFn: (id: string) => financingOffersApi.delete(id),
    onSuccess: invalidate,
  });
}

// Comparisons
export function useComparisonPreview(data: ComparisonCreate) {
  return useQuery({
    queryKey: ['comparisons', 'calculate', data],
    queryFn: () => comparisonsApi.calculate(data).then(r => r.data),
    enabled: !!data.purchase_id && !!data.financing_offer_id,
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

// Admin
export function useAdminSettings() {
  return useQuery({ queryKey: ['admin', 'settings'], queryFn: () => adminApi.settings().then(r => r.data) });
}

export function useAllowedEmails() {
  return useQuery({
    queryKey: ['admin', 'allowed-emails'],
    queryFn: () => adminApi.listAllowedEmails().then(r => r.data),
  });
}

export function useAddAllowedEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entry: string) => adminApi.addAllowedEmail(entry).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'allowed-emails'] }),
  });
}

export function useRemoveAllowedEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.removeAllowedEmail(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'allowed-emails'] }),
  });
}

export function useAdminUsers() {
  return useQuery({ queryKey: ['admin', 'users'], queryFn: () => adminApi.listUsers().then(r => r.data) });
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminApi.resetPassword(userId).then(r => r.data),
    // También cambia el estado «Cuenta creada» de la lista de correos
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });
}
