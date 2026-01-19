export type CognitiveLevel = 'low' | 'medium' | 'high';
export type MoodLevel = 'low' | 'neutral' | 'high';

type TrackingState = {
  cognitive?: {
    foco?: number | null;
    energia?: number | null;
  } | null;
  emotional?: {
    humor?: number | null;
    humor_auto_reportado?: number | null;
  } | null;
};

export function getCognitiveLevel(value?: number | null): CognitiveLevel {
  if (typeof value !== 'number') return 'medium';
  if (value < 40) return 'low';
  if (value < 70) return 'medium';
  return 'high';
}

export function getMoodLevel(value?: number | null): MoodLevel {
  if (typeof value !== 'number') return 'neutral';
  if (value <= 2.5) return 'low';
  if (value >= 4) return 'high';
  return 'neutral';
}

export function applyCognitiveState(state?: TrackingState | null) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const foco = state?.cognitive?.foco ?? null;
  const energia = state?.cognitive?.energia ?? null;
  const humor = state?.emotional?.humor ?? state?.emotional?.humor_auto_reportado ?? null;

  root.setAttribute('data-cognitive-focus', getCognitiveLevel(foco));
  root.setAttribute('data-cognitive-energy', getCognitiveLevel(energia));
  root.setAttribute('data-cognitive-mood', getMoodLevel(humor));
}
