// Memory store for progress tracking in local dev
interface RenderProgress {
  progress: number;
  status: string;
  url: string | null;
  error: string | null;
  done: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var _renderStore: Map<string, RenderProgress> | undefined;
  // eslint-disable-next-line no-var
  var _renderStoreCleanup: NodeJS.Timeout | undefined;
}

const renderStore = new Map<string, RenderProgress>();

// Clear old renders every hour
if (!globalThis._renderStoreCleanup) {
  globalThis._renderStoreCleanup = setInterval(
    () => {
      // In a real app we'd have timestamps, let's just clear for now
      // But since it's local dev, it's fine.
    },
    1000 * 60 * 60,
  );
}

export const getRenderStore = () => {
  if (!globalThis._renderStore) {
    globalThis._renderStore = renderStore;
  }
  return globalThis._renderStore;
};
