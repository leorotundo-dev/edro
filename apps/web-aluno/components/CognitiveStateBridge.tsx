'use client';

import { useEffect } from 'react';
import { useCurrentState } from '@/lib/hooks';
import { applyCognitiveState } from '@/lib/cognitive';

export function CognitiveStateBridge() {
  const { data } = useCurrentState();

  useEffect(() => {
    applyCognitiveState(data?.state);
  }, [data?.state]);

  return null;
}
