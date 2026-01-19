export type UserPlan = 'FREE' | 'PRO' | 'TURBO';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
