export type StudySessionTopic = {
  discipline: string;
  topic: string;
  nivel?: number;
  prioridade?: number;
};

export type StudySessionItem = {
  itemId: string;
  dropId: string;
  title?: string;
  discipline?: string;
  topic?: string;
  topicCode?: string;
};

export type StudySession = {
  date: string;
  planId?: string | null;
  items: StudySessionItem[];
  currentIndex: number;
  questionTarget: number;
  questionsPerTopic: number;
  questionsPerContent?: number;
  topics: StudySessionTopic[];
  editalId?: string | null;
  examBoard?: string | null;
};

const SESSION_KEY = 'edro_study_session';

export const loadStudySession = (): StudySession | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StudySession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const saveStudySession = (session: StudySession) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearStudySession = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_KEY);
};

export const updateStudySession = (updater: (session: StudySession) => StudySession | null) => {
  const session = loadStudySession();
  if (!session) return;
  const next = updater(session);
  if (!next) {
    clearStudySession();
    return;
  }
  saveStudySession(next);
};
