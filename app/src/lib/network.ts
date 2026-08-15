import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

// React Query's built-in online detection listens for the browser's
// `online`/`offline` window events, which simply don't exist in React
// Native -- so without this the client believed it was always online.
// Every request on a dead connection therefore ran its full retry/timeout
// cycle instead of pausing, and nothing auto-refetched when signal came
// back. Wiring onlineManager to NetInfo fixes both directions.
//
// `isInternetReachable` (not just `isConnected`) is what's actually
// checked: on mobile networks a device very often holds a connection that
// routes nowhere -- captive portals, exhausted data bundles, a tower with
// no backhaul. Those are common conditions for this app's users, and
// `isConnected` alone reports them as online. It can be null while the
// reachability probe is still in flight, in which case fall back to
// `isConnected` rather than declaring the app offline on a brief unknown.
// setEventListener itself returns void -- React Query keeps the unsubscribe
// the setup callback returns and calls it when a new listener replaces this
// one, so there is nothing for the caller to clean up.
export function startNetworkWatcher(): void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(state.isInternetReachable ?? state.isConnected ?? true);
    })
  );
}

/** Live connectivity for UI (the offline banner). Mirrors onlineManager so
 *  the banner can never disagree with what React Query believes. */
export function useIsOnline(): boolean {
  const [online, setOnline] = useState(() => onlineManager.isOnline());
  useEffect(() => onlineManager.subscribe(setOnline), []);
  return online;
}
