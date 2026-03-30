'use client';
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CanvasContextValue = {
  // Multi-select
  selectedNodeIds: string[];
  setSelectedNodeIds: (ids: string[]) => void;

  // Prompt variables — populated by PromptVariablesNode, consumed by any node
  promptVariables: Record<string, string>;
  setPromptVariables: (vars: Record<string, string>) => void;
  resolveVars: (text: string) => string; // replaces {{key}} with value

  // Node runner registry — nodes register their run fn, action bar calls it
  registerNodeRunner: (id: string, fn: () => void) => void;
  unregisterNodeRunner: (id: string) => void;
  runNode: (id: string) => void;

  // Canvas ops (wired by PipelineStudioInner via CanvasProvider props)
  duplicateNode: (id: string) => void;
  deleteNode: (id: string) => void;
};

// ── Context ───────────────────────────────────────────────────────────────────

const CanvasContext = createContext<CanvasContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export interface CanvasProviderProps {
  children: ReactNode;
  onDuplicateNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
}

export function CanvasProvider({
  children,
  onDuplicateNode,
  onDeleteNode,
}: CanvasProviderProps) {
  // Multi-select
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);

  // Prompt variables
  const [promptVariables, setPromptVariables] = useState<Record<string, string>>({});

  // Resolves {{key}} tokens in a string using current promptVariables
  const resolveVars = useCallback(
    (text: string): string => {
      let result = text;
      for (const [key, value] of Object.entries(promptVariables)) {
        result = result.replace(new RegExp('\\{\\{' + key + '\\}\\}', 'g'), value);
      }
      return result;
    },
    [promptVariables],
  );

  // Node runner registry
  const runnersRef = useRef<Map<string, () => void>>(new Map());

  const registerNodeRunner = useCallback((id: string, fn: () => void) => {
    runnersRef.current.set(id, fn);
  }, []);

  const unregisterNodeRunner = useCallback((id: string) => {
    runnersRef.current.delete(id);
  }, []);

  const runNode = useCallback((id: string) => {
    const fn = runnersRef.current.get(id);
    if (fn) fn();
  }, []);

  // ── Context value ────────────────────────────────────────────────────────────

  const value: CanvasContextValue = {
    selectedNodeIds,
    setSelectedNodeIds,
    promptVariables,
    setPromptVariables,
    resolveVars,
    registerNodeRunner,
    unregisterNodeRunner,
    runNode,
    duplicateNode: onDuplicateNode,
    deleteNode: onDeleteNode,
  };

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCanvasContext(): CanvasContextValue {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error('useCanvasContext must be used inside <CanvasProvider>');
  return ctx;
}
