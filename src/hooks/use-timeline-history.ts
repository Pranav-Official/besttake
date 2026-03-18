import { useState, useCallback, useRef } from "react";
import { Timeline, Clip } from "../types/constants";

type HistoryState = {
  history: Clip[][];
  pointer: number;
};

export function useTimelineHistory(
  initialTimelines: Timeline[],
  capacity: number = 20,
) {
  const [timelines, setTimelines] = useState<Timeline[]>(initialTimelines);
  const [activeTimelineId, setActiveTimelineId] = useState<string>(
    initialTimelines[0]?.id || "default",
  );

  // A map storing the history for each timeline by ID
  const historyMap = useRef<Map<string, HistoryState>>(new Map());

  // Initialize history for a timeline if it doesn't exist
  const getTimelineHistory = useCallback(
    (timelineId: string, initialClips: Clip[]) => {
      if (!historyMap.current.has(timelineId)) {
        historyMap.current.set(timelineId, {
          history: [initialClips],
          pointer: 0,
        });
      }
      return historyMap.current.get(timelineId)!;
    },
    [],
  );

  // Initialize histories for all initial timelines
  if (historyMap.current.size === 0) {
    initialTimelines.forEach((t) => getTimelineHistory(t.id, t.clips));
  }

  const addTimeline = useCallback(
    (newTimeline: Timeline) => {
      setTimelines((prev) => [...prev, newTimeline]);
      getTimelineHistory(newTimeline.id, newTimeline.clips);
      setActiveTimelineId(newTimeline.id);
    },
    [getTimelineHistory],
  );

  const activeHistory = getTimelineHistory(
    activeTimelineId,
    timelines.find((t) => t.id === activeTimelineId)?.clips || [],
  );

  const setClips = useCallback(
    (nextState: Clip[] | ((prev: Clip[]) => Clip[])) => {
      setTimelines((prev) => {
        const activeIdx = prev.findIndex((t) => t.id === activeTimelineId);
        if (activeIdx === -1) return prev;

        const currentClips = prev[activeIdx].clips;
        const resolvedNextState =
          typeof nextState === "function"
            ? (nextState as (prev: Clip[]) => Clip[])(currentClips)
            : nextState;

        const isEqual =
          JSON.stringify(resolvedNextState) === JSON.stringify(currentClips);
        if (isEqual) {
          return prev;
        }

        const hist = getTimelineHistory(activeTimelineId, currentClips);

        // Cut off any "redo" history
        const newHistoryList = hist.history.slice(0, hist.pointer + 1);
        newHistoryList.push(resolvedNextState);

        // Enforce capacity
        if (newHistoryList.length > capacity) {
          newHistoryList.shift();
        } else {
          hist.pointer++;
        }

        hist.history = newHistoryList;

        const newTimelines = [...prev];
        newTimelines[activeIdx] = {
          ...newTimelines[activeIdx],
          clips: resolvedNextState,
        };
        return newTimelines;
      });
    },
    [activeTimelineId, capacity, getTimelineHistory],
  );

  const undo = useCallback(() => {
    const hist = getTimelineHistory(
      activeTimelineId,
      timelines.find((t) => t.id === activeTimelineId)?.clips || [],
    );
    if (hist.pointer > 0) {
      hist.pointer--;
      const prevState = hist.history[hist.pointer];
      setTimelines((prev) => {
        const activeIdx = prev.findIndex((t) => t.id === activeTimelineId);
        if (activeIdx === -1) return prev;
        const newTimelines = [...prev];
        newTimelines[activeIdx] = {
          ...newTimelines[activeIdx],
          clips: prevState,
        };
        return newTimelines;
      });
      return prevState;
    }
    return null;
  }, [activeTimelineId, getTimelineHistory, timelines]);

  const redo = useCallback(() => {
    const hist = getTimelineHistory(
      activeTimelineId,
      timelines.find((t) => t.id === activeTimelineId)?.clips || [],
    );
    if (hist.pointer < hist.history.length - 1) {
      hist.pointer++;
      const nextState = hist.history[hist.pointer];
      setTimelines((prev) => {
        const activeIdx = prev.findIndex((t) => t.id === activeTimelineId);
        if (activeIdx === -1) return prev;
        const newTimelines = [...prev];
        newTimelines[activeIdx] = {
          ...newTimelines[activeIdx],
          clips: nextState,
        };
        return newTimelines;
      });
      return nextState;
    }
    return null;
  }, [activeTimelineId, getTimelineHistory, timelines]);

  const canUndo = activeHistory.pointer > 0;
  const canRedo = activeHistory.pointer < activeHistory.history.length - 1;

  const activeClips =
    timelines.find((t) => t.id === activeTimelineId)?.clips || [];

  return {
    timelines,
    activeTimelineId,
    setActiveTimelineId,
    addTimeline,
    clips: activeClips,
    setClips,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
