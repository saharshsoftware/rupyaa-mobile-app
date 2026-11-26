import { useQuery } from "@tanstack/react-query";
import { userService } from "../services/user";
import { useEffect } from "react";
import { UserStage } from "../config/userStages";
import { devConfig } from "../config/dev";
import { useFlowStore } from "../store";
import { REACT_QUERY_KEYS } from "../constants/data";
import { consoleLogDev } from "../utils/common-helper";
import { applyUserStageResultToStore } from "@/src/services/user/useUserStage";

/** While backend reports retryStage=true it is still resolving the stage — keep polling. */
const RETRY_STAGE_REFETCH_INTERVAL_MS = 1000;

/**
 * React Query hook to fetch and sync user stage from backend.
 * Automatically syncs with flow store when data is fetched.
 * Re-fetches every second while the backend reports `retryStage: true`, so callers
 * (e.g. home screen) can show a "still checking" loading state via `query.data?.retryStage`.
 */
export function useUserStage(
  enabled: boolean = true,
  refetchInterval: number | false = false,
) {
    const syncFromUserStage = useFlowStore((s) => s.syncFromUserStage);

    const query = useQuery({
      queryKey: REACT_QUERY_KEYS.USER_STAGE_USER,
      queryFn: async () => {
        const response = await userService.getUserStage();
        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to fetch user stage');
        }
        return response.data;
      },
      staleTime: 0,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      refetchInterval: (query) =>
        query.state.data?.retryStage === true ? RETRY_STAGE_REFETCH_INTERVAL_MS : refetchInterval,
      retry: 1,
      enabled,
    });
  
    // Sync flow store when stage data is successfully fetched
    useEffect(() => {
      if (query.data?.stage) {
        const stage = query.data.stage as UserStage;
        if (devConfig.enableDebugLogs) {
          consoleLogDev(`[useUserStage] Syncing flow store with backend stage: ${stage}`);
        }
        syncFromUserStage(stage, query.data?.sectionsCompleted, query.data?.context);
      }
    }, [
      query.data?.context,
      query.data?.sectionsCompleted,
      query.data?.stage,
      syncFromUserStage,
    ]);
  
    useEffect(() => {
      if (query.data) applyUserStageResultToStore(query.data);
    }, [query.data]);

    return query;
  }
