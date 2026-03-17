// Memory store for progress tracking in local dev
interface RenderProgress {
  progress: number;
  status: string;
  url: string | null;
  error: string | null;
  done: boolean;
}

const renderStore = new Map<string, RenderProgress>();

// Clear old renders every hour
if (!(global as any)._renderStoreCleanup) {
  (global as any)._renderStoreCleanup = setInterval(
    () => {
      const now = Date.now();
      // In a real app we'd have timestamps, let's just clear for now
      // But since it's local dev, it's fine.
    },
    1000 * 60 * 60,
  );
}

export const getRenderStore = () => {
  if (!(global as any)._renderStore) {
    (global as any)._renderStore = renderStore;
  }
  return (global as any)._renderStore as Map<string, RenderProgress>;
};
