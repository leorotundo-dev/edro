import {
  DEFAULT_SCORING,
  expandEventsForMonth as expandEventsForMonthInternal,
  matchesLocality as matchesLocalityInternal,
  scoreEvent as scoreEventInternal,
  type CalendarEvent,
  type ClientProfile,
  type Platform,
  type ScoringRules,
} from './services/calendarTotal';

type SaturationState = {
  tagCounts: Record<string, number>;
  formatCounts?: Record<string, number>;
};

export { DEFAULT_SCORING };
export const expandEventsForMonth = expandEventsForMonthInternal;
export const matchesLocality = matchesLocalityInternal;

export function scoreEvent(
  ev: CalendarEvent,
  client: ClientProfile,
  platform: Platform,
  rules: ScoringRules,
  saturationState: SaturationState
) {
  return scoreEventInternal(ev, client, platform, rules, [], {
    tagCounts: saturationState.tagCounts ?? {},
    formatCounts: saturationState.formatCounts ?? {},
  });
}
