import { useEffect } from "react";

/**
 * A hook that runs an effect only once when the component mounts.
 * This is a semantic wrapper around useEffect(fn, []).
 */
export const useMountEffect = (effect: React.EffectCallback) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
};
