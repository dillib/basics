import { useQuery } from "@tanstack/react-query";

interface AppConfig {
  monetizationEnabled: boolean;
}

/**
 * Public runtime configuration (feature flags). Defaults to monetization OFF
 * until the server responds, so the free/early-access UI is shown optimistically
 * rather than briefly flashing pricing.
 */
export function useAppConfig(): AppConfig {
  const { data } = useQuery<AppConfig>({
    queryKey: ["/api/config"],
    staleTime: 5 * 60 * 1000,
  });

  return { monetizationEnabled: data?.monetizationEnabled ?? false };
}
