'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';

type PostVersion = {
  id: string;
  post_asset_id: string;
  version_number: number;
  content: string;
  content_type?: string;
  edited_by: string;
  edit_reason?: string;
  created_at: string;
  metadata?: Record<string, any>;
};

type PostVersionHistoryProps = {
  postAssetId: string;
  isOpen: boolean;
  onClose: () => void;
};

export default function PostVersionHistory({ postAssetId, isOpen, onClose }: PostVersionHistoryProps) {
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<PostVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<PostVersion | null>(null);
  const [compareVersion, setCompareVersion] = useState<PostVersion | null>(null);

  useEffect(() => {
    if (isOpen && postAssetId) {
      loadVersions();
    }
  }, [isOpen, postAssetId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; versions: PostVersion[] }>(
        `/posts/${postAssetId}/versions`
      );
      if (res?.versions) {
        setVersions(res.versions);
        if (res.versions.length > 0) {
          setSelectedVersion(res.versions[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVersionDiff = (v1: PostVersion, v2: PostVersion) => {
    // Simple character-level diff indicator
    const v1Content = v1.content || '';
    const v2Content = v2.content || '';
    const changedChars = Math.abs(v1Content.length - v2Content.length);
    const totalChars = Math.max(v1Content.length, v2Content.length);
    const changePercent = totalChars > 0 ? Math.round((changedChars / totalChars) * 100) : 0;
    return { changedChars, changePercent };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Version History</h2>
            <p className="text-sm text-slate-600 mt-1">
              {versions.length} version{versions.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
              <div className="mt-4 text-slate-600">Loading versions...</div>
            </div>
          </div>
        ) : versions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">history</span>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Version History</h3>
              <p className="text-slate-600">This post has no edit history yet.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Version List Sidebar */}
            <div className="w-80 border-r border-slate-200 overflow-y-auto bg-slate-50">
              <div className="p-4 space-y-2">
                {versions.map((version) => {
                  const isSelected = selectedVersion?.id === version.id;
                  const isComparing = compareVersion?.id === version.id;

                  return (
                    <div
                      key={version.id}
                      onClick={() => setSelectedVersion(version)}
                      onDoubleClick={() => setCompareVersion(version)}
                      className={`p-4 rounded-lg cursor-pointer transition-colors border ${
                        isSelected
                          ? 'bg-blue-50 border-blue-200'
                          : isComparing
                          ? 'bg-purple-50 border-purple-200'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              version.version_number === versions.length
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            v{version.version_number}
                          </span>
                          {version.version_number === versions.length && (
                            <span className="text-xs text-green-600 font-semibold">Current</span>
                          )}
                        </div>
                        {isComparing && (
                          <span className="text-xs text-purple-600 font-semibold">Comparing</span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 mb-1">
                        {new Date(version.created_at).toLocaleString('pt-BR')}
                      </div>

                      <div className="text-xs text-slate-500 mb-2">
                        By: {version.edited_by}
                      </div>

                      {version.edit_reason && (
                        <div className="text-xs text-slate-600 italic">
                          "{version.edit_reason}"
                        </div>
                      )}

                      {selectedVersion && version.id !== selectedVersion.id && (
                        <div className="text-xs text-slate-500 mt-2">
                          {(() => {
                            const diff = getVersionDiff(version, selectedVersion);
                            return `±${diff.changePercent}% changed`;
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Content Viewer */}
            <div className="flex-1 overflow-y-auto p-6">
              {compareVersion ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">Comparing Versions</h3>
                    <button
                      onClick={() => setCompareVersion(null)}
                      className="text-sm text-slate-600 hover:text-slate-800"
                    >
                      Clear Comparison
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Selected Version */}
                    <div>
                      <div className="bg-blue-50 border border-blue-200 rounded-t-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-blue-900">
                            Version {selectedVersion?.version_number}
                          </span>
                          <span className="text-xs text-blue-700">
                            {selectedVersion && new Date(selectedVersion.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white border border-t-0 border-slate-200 rounded-b-lg p-4 min-h-[200px]">
                        <pre className="text-sm text-slate-900 whitespace-pre-wrap font-sans">
                          {selectedVersion?.content}
                        </pre>
                      </div>
                    </div>

                    {/* Compare Version */}
                    <div>
                      <div className="bg-purple-50 border border-purple-200 rounded-t-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-purple-900">
                            Version {compareVersion.version_number}
                          </span>
                          <span className="text-xs text-purple-700">
                            {new Date(compareVersion.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white border border-t-0 border-slate-200 rounded-b-lg p-4 min-h-[200px]">
                        <pre className="text-sm text-slate-900 whitespace-pre-wrap font-sans">
                          {compareVersion.content}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {selectedVersion && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <div className="text-sm font-medium text-slate-700 mb-2">Change Summary</div>
                      <div className="text-sm text-slate-600">
                        {(() => {
                          const diff = getVersionDiff(selectedVersion, compareVersion);
                          return `Approximately ${diff.changePercent}% of content changed (${diff.changedChars} characters difference)`;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ) : selectedVersion ? (
                <div>
                  <div className="bg-slate-100 border border-slate-200 rounded-t-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-slate-900 text-white rounded text-sm font-semibold">
                          Version {selectedVersion.version_number}
                        </span>
                        {selectedVersion.version_number === versions.length && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                            Current
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const versionIdx = versions.findIndex(v => v.id === selectedVersion.id);
                          if (versionIdx > 0) {
                            setCompareVersion(versions[versionIdx - 1]);
                          }
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Compare with previous
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Edited by:</span>{' '}
                        <span className="text-slate-900 font-medium">{selectedVersion.edited_by}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Date:</span>{' '}
                        <span className="text-slate-900 font-medium">
                          {new Date(selectedVersion.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {selectedVersion.edit_reason && (
                      <div className="mt-3 p-2 bg-white rounded text-sm">
                        <span className="text-slate-600">Reason:</span>{' '}
                        <span className="text-slate-900 italic">{selectedVersion.edit_reason}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-t-0 border-slate-200 rounded-b-lg p-6 min-h-[300px]">
                    <div className="text-sm font-medium text-slate-700 mb-3">Content</div>
                    <pre className="text-sm text-slate-900 whitespace-pre-wrap font-sans">
                      {selectedVersion.content}
                    </pre>
                  </div>

                  {selectedVersion.metadata && Object.keys(selectedVersion.metadata).length > 0 && (
                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="text-sm font-medium text-slate-700 mb-2">Metadata</div>
                      <pre className="text-xs text-slate-600">
                        {JSON.stringify(selectedVersion.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  Select a version to view its content
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
          <div>💡 Tip: Double-click a version to compare it with the selected version</div>
        </div>
      </div>
    </div>
  );
}
