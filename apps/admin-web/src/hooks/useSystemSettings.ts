import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type SystemSettings,
  type SystemSettingsInput,
} from '@amaravathi/shared-types';
import { api, endpoints } from '../lib/api';

export const systemSettingsQueryKey = [endpoints.systemSettings] as const;

export function useSystemSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: systemSettingsQueryKey,
    queryFn: () => api<SystemSettings>(endpoints.systemSettings),
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: (payload: SystemSettingsInput) =>
      api<SystemSettings>(endpoints.systemSettings, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: async (settings) => {
      queryClient.setQueryData(systemSettingsQueryKey, settings);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['batches'] }),
        queryClient.invalidateQueries({ queryKey: ['batchesList'] }),
        queryClient.invalidateQueries({ queryKey: [endpoints.customerTeaFormulas] }),
        queryClient.invalidateQueries({ queryKey: ['count', '/add-purchase-batch'] }),
        queryClient.invalidateQueries({ queryKey: ['count', '/customers'] }),
      ]);
    },
  });

  return {
    ...query,
    saveSystemSettings: mutation.mutateAsync,
    isSaving: mutation.isPending,
    saveError: mutation.error,
  };
}
