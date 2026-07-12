export type SafeRemoveAction = 'hard_deleted' | 'soft_deleted' | 'cancelled';

export interface SafeRemoveResult {
  action: SafeRemoveAction;
  affectedCount: number;
  disruptionId?: string;
}
