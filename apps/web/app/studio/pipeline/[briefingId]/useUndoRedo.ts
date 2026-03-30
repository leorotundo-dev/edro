'use client';
import { useCallback, useReducer, useRef } from 'react';
import {
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_HISTORY = 50;
const DEBOUNCE_MS = 400;

// ── Snapshot type ─────────────────────────────────────────────────────────────

type Snapshot = {
  nodes: Node[];
  edges: Edge[];
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useUndoRedo(initialNodes: Node[], initialEdges: Edge[]) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const historyRef = useRef<Snapshot[]>([]);
  const cursorRef = useRef<number>(0);
  const isPushingRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // useReducer counter triggers re-renders when undo/redo state changes; refs alone don't.
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  // Refs track latest nodes/edges so debounced callbacks don't close over stale state.
  const nodesRef = useRef<Node[]>(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef<Edge[]>(edges);
  edgesRef.current = edges;

  const pushSnapshot = useCallback(() => {
    if (isPushingRef.current) return;

    const snapshot: Snapshot = {
      nodes: structuredClone(nodesRef.current),
      edges: structuredClone(edgesRef.current),
    };

    // Truncate any redo history beyond the current cursor
    historyRef.current = historyRef.current.slice(0, cursorRef.current);

    // Enforce ring-buffer cap
    if (historyRef.current.length >= MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      cursorRef.current += 1;
    }

    historyRef.current.push(snapshot);
    forceUpdate();
  }, []);

  const debouncedPushSnapshot = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      pushSnapshot();
    }, DEBOUNCE_MS);
  }, [pushSnapshot]);

  // ── Custom onNodesChange ────────────────────────────────────────────────────

  const customOnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!isPushingRef.current) {
        const hasPosition = changes.some(
          (c) => c.type === 'position' && (c as { dragging?: boolean }).dragging === true,
        );
        const hasNonPosition = changes.some(
          (c) => c.type !== 'position' && c.type !== 'select',
        );

        if (hasNonPosition) {
          pushSnapshot();
        } else if (hasPosition) {
          debouncedPushSnapshot();
        }
      }

      onNodesChange(changes);
    },
    [onNodesChange, pushSnapshot, debouncedPushSnapshot],
  );

  // ── Undo ────────────────────────────────────────────────────────────────────

  const undo = useCallback(() => {
    if (cursorRef.current <= 0) return;

    // Cancel any pending debounced snapshot so it doesn't clobber the redo stack
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    cursorRef.current -= 1;
    const snapshot = historyRef.current[cursorRef.current];

    isPushingRef.current = true;
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
    isPushingRef.current = false;

    forceUpdate();
  }, [setNodes, setEdges]);

  // ── Redo ────────────────────────────────────────────────────────────────────

  const redo = useCallback(() => {
    if (cursorRef.current >= historyRef.current.length - 1) return;

    cursorRef.current += 1;
    const snapshot = historyRef.current[cursorRef.current];

    isPushingRef.current = true;
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
    isPushingRef.current = false;

    forceUpdate();
  }, [setNodes, setEdges]);

  // ── Derived booleans (reactive via forceUpdate) ──────────────────────────────

  const canUndo = cursorRef.current > 0;
  const canRedo = cursorRef.current < historyRef.current.length - 1;

  // ── Return value ─────────────────────────────────────────────────────────────

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange: customOnNodesChange,
    onEdgesChange,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
