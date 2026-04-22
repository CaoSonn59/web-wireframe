import { useState, useCallback, useRef } from 'react';

const MAX = 50;

export function useHistory(init) {
  const [present, _set] = useState(init);
  const presentRef = useRef(init);
  const pastRef    = useRef([]);
  const futureRef  = useRef([]);
  const [, bump]   = useState(0);

  const _push = (snap) => {
    pastRef.current  = [...pastRef.current, snap].slice(-MAX);
    futureRef.current = [];
    bump(n => n + 1);
  };

  // Committed set — saves prev to history
  const set = useCallback((fn) => {
    _set(prev => {
      _push(prev);
      const next = typeof fn === 'function' ? fn(prev) : fn;
      presentRef.current = next;
      return next;
    });
  }, []);

  // Transient set — no history (used during drag)
  const setT = useCallback((fn) => {
    _set(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      presentRef.current = next;
      return next;
    });
  }, []);

  // Push an explicit "before" snapshot (called on drag-end)
  const commit = useCallback((snapshot) => {
    pastRef.current  = [...pastRef.current, snapshot].slice(-MAX);
    futureRef.current = [];
    bump(n => n + 1);
  }, []);

  const undo = useCallback(() => {
    if (!pastRef.current.length) return;
    _set(curr => {
      const prev = pastRef.current[pastRef.current.length - 1];
      futureRef.current = [curr, ...futureRef.current].slice(0, MAX);
      pastRef.current   = pastRef.current.slice(0, -1);
      presentRef.current = prev;
      bump(n => n + 1);
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    if (!futureRef.current.length) return;
    _set(curr => {
      const next = futureRef.current[0];
      pastRef.current   = [...pastRef.current, curr].slice(-MAX);
      futureRef.current = futureRef.current.slice(1);
      presentRef.current = next;
      bump(n => n + 1);
      return next;
    });
  }, []);

  return {
    present, presentRef, set, setT, commit, undo, redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
