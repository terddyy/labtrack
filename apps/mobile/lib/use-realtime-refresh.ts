import { useEffect, useRef } from "react";

import { supabase } from "@/lib/supabase";

type RealtimeTarget = { table: string; filter?: string };

let channelInstance = 0;

export function useRealtimeRefresh(channelKey: string, targets: readonly RealtimeTarget[], refresh: () => void | Promise<void>, enabled = true) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const targetsKey = JSON.stringify(targets);

  useEffect(() => {
    if (!supabase || !enabled) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void refreshRef.current(), 150);
    };
    // Realtime reuses channels with the same topic. React can remount an effect
    // before the async cleanup has removed the previous subscribed channel, so
    // give every subscription its own topic instead of trying to add callbacks
    // to the still-subscribed channel.
    channelInstance += 1;
    const channel = targets.reduce(
      (nextChannel, target) => nextChannel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: target.table, ...(target.filter ? { filter: target.filter } : {}) },
        scheduleRefresh
      ),
      supabase.channel(`${channelKey}:${channelInstance}`)
    ).subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase?.removeChannel(channel);
    };
  }, [channelKey, enabled, targetsKey]);
}
