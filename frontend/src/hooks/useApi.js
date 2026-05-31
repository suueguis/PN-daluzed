import { useQuery, useMutation } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';

export function useApiQuery(key, url, options = {}) {
  return useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: async () => {
      const { data } = await axiosClient.get(url, { params: options.params });
      return data?.results ?? data;
    },
    ...options,
  });
}

export function useApiMutation({ url, method = 'post', onSuccess, onError } = {}) {
  return useMutation({
    mutationFn: async (payload) => {
      const target = typeof url === 'function' ? url(payload) : url;
      const { data } = await axiosClient.request({
        url: target,
        method,
        data: payload,
      });
      return data;
    },
    onSuccess,
    onError,
  });
}
