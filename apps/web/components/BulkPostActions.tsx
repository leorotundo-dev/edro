'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/api';

type BulkActionRule = {
  field: 'status' | 'platform' | 'date_range' | 'category';
  operator: 'equals' | 'contains' | 'starts_with' | 'between';
  value: any;
};

type BulkAction = {
  action: 'approve' | 'reject' | 'archive' | 'publish' | 'delete' | 'change_status';
  target_status?: string;
};

type BulkPostActionsProps = {
  calendarId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function BulkPostActions({ calendarId, isOpen, onClose, onSuccess }: BulkPostActionsProps) {
  const [rules, setRules] = useState<BulkActionRule[]>([
    { field: 'status', operator: 'equals', value: 'pending' },
  ]);
  const [action, setAction] = useState<BulkAction>({ action: 'approve' });
  const [preview, setPreview] = useState<{ count: number; posts: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<string>('');

  const addRule = () => {
    setRules([...rules, { field: 'status', operator: 'equals', value: '' }]);
    setPreview(null);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
    setPreview(null);
  };

  const updateRule = (index: number, updates: Partial<BulkActionRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setRules(newRules);
    setPreview(null);
  };

  const previewAction = async () => {
    setLoading(true);
    setResult('');
    try {
      const res = await apiPost<{ success: boolean; count: number; posts: any[] }>(
        `/calendars/${calendarId}/posts/bulk-by-rule`,
        {
          rules,
          action,
          dry_run: true,
        }
      );
      if (res) {
        setPreview({ count: res.count || 0, posts: res.posts || [] });
      }
    } catch (error: any) {
      setResult(`Preview error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async () => {
    setExecuting(true);
    setResult('');
    try {
      const res = await apiPost<{ success: boolean; updated: number; message?: string }>(
        `/calendars/${calendarId}/posts/bulk-by-rule`,
        {
          rules,
          action,
          dry_run: false,
        }
      );
      setResult(`Success! Updated ${res?.updated || 0} posts.`);
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-xl font-bold text-ink">Bulk Post Actions</h2>
            <p className="text-sm text-muted mt-1">Apply actions to multiple posts at once</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-muted">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Rules Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-ink">Filter Rules</h3>
              <button
                onClick={addRule}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Add Rule
              </button>
            </div>

            <div className="space-y-3">
              {rules.map((rule, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-paper rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <select
                      value={rule.field}
                      onChange={(e) =>
                        updateRule(index, {
                          field: e.target.value as BulkActionRule['field'],
                        })
                      }
                      className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="status">Status</option>
                      <option value="platform">Platform</option>
                      <option value="date_range">Date Range</option>
                      <option value="category">Category</option>
                    </select>

                    <select
                      value={rule.operator}
                      onChange={(e) =>
                        updateRule(index, {
                          operator: e.target.value as BulkActionRule['operator'],
                        })
                      }
                      className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="equals">Equals</option>
                      <option value="contains">Contains</option>
                      <option value="starts_with">Starts With</option>
                      {rule.field === 'date_range' && <option value="between">Between</option>}
                    </select>

                    {rule.field === 'date_range' && rule.operator === 'between' ? (
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={rule.value?.start || ''}
                          onChange={(e) =>
                            updateRule(index, {
                              value: { ...rule.value, start: e.target.value },
                            })
                          }
                          className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="date"
                          value={rule.value?.end || ''}
                          onChange={(e) =>
                            updateRule(index, {
                              value: { ...rule.value, end: e.target.value },
                            })
                          }
                          className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={rule.value || ''}
                        onChange={(e) => updateRule(index, { value: e.target.value })}
                        placeholder="Value..."
                        className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>

                  <button
                    onClick={() => removeRule(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Section */}
          <div>
            <h3 className="font-semibold text-ink mb-4">Action to Perform</h3>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={action.action}
                onChange={(e) => setAction({ action: e.target.value as BulkAction['action'] })}
                className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="approve">Approve Posts</option>
                <option value="reject">Reject Posts</option>
                <option value="archive">Archive Posts</option>
                <option value="publish">Publish Posts</option>
                <option value="delete">Delete Posts</option>
                <option value="change_status">Change Status</option>
              </select>

              {action.action === 'change_status' && (
                <input
                  type="text"
                  value={action.target_status || ''}
                  onChange={(e) => setAction({ ...action, target_status: e.target.value })}
                  placeholder="Target status..."
                  className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          </div>

          {/* Preview Button */}
          <button
            onClick={previewAction}
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                Loading Preview...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">preview</span>
                Preview Affected Posts
              </>
            )}
          </button>

          {/* Preview Results */}
          {preview && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-blue-600">info</span>
                <h4 className="font-semibold text-blue-900">Preview Results</h4>
              </div>
              <div className="text-sm text-blue-800 mb-4">
                This action will affect <strong>{preview.count}</strong> post(s)
              </div>

              {preview.posts.length > 0 && (
                <div className="bg-card rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="text-xs font-medium text-muted mb-2">Sample Posts:</div>
                  <div className="space-y-1">
                    {preview.posts.slice(0, 10).map((post: any, idx: number) => (
                      <div key={idx} className="text-xs text-muted flex items-center gap-2">
                        <span className="material-symbols-outlined text-xs">description</span>
                        <span className="flex-1 truncate">{post.title || post.content?.slice(0, 50)}</span>
                        <span className="px-2 py-0.5 bg-card-strong text-muted rounded">
                          {post.status}
                        </span>
                      </div>
                    ))}
                    {preview.posts.length > 10 && (
                      <div className="text-xs text-muted italic">
                        ...and {preview.posts.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {preview.count > 0 && (
                <button
                  onClick={executeAction}
                  disabled={executing}
                  className="mt-4 w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {executing ? (
                    <>
                      <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">bolt</span>
                      Execute Action on {preview.count} Post(s)
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Result Message */}
          {result && (
            <div
              className={`p-4 rounded-lg ${
                result.startsWith('Error')
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}
            >
              {result}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-paper">
          <div className="flex items-start gap-2 text-xs text-muted">
            <span className="material-symbols-outlined text-sm">warning</span>
            <div>
              <strong>Warning:</strong> Bulk actions are irreversible. Always preview before executing.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
