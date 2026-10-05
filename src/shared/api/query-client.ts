import { QueryClient, type DefaultOptions } from "@tanstack/react-query";

export const QUERY_STALE_TIME_MS = 30_000;

const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: QUERY_STALE_TIME_MS,
    retry: false,
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry: false,
  },
};

export const createQueryClient = (): QueryClient => new QueryClient({ defaultOptions });

export const queryClient = createQueryClient();
