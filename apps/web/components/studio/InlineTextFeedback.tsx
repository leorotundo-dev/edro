'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { IconMessage, IconThumbDown, IconThumbUp } from '@tabler/icons-react';
import { apiGet, apiPost } from '@/lib/api';

type SegmentFeedback = {
  id?: string;
  segment_text: string;
  char_start: number;
  char_end: number;
  sentiment: 'like' | 'dislike' | 'neutral';
  note?: string;
  suggested_fix?: string;
};

type Props = {
  copyId: string;
  text: string;
  onFeedbackSaved?: (segment: SegmentFeedback) => void;
};

export default function InlineTextFeedback({ copyId, text, onFeedbackSaved }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');
  const [suggestedFix, setSuggestedFix] = useState('');
  const [segments, setSegments] = useState<SegmentFeedback[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!copyId) return;
    apiGet<{ success: boolean; segments?: SegmentFeedback[] }>(`/edro/copies/${copyId}/segments/feedback`)
      .then((response) => setSegments(Array.isArray(response?.segments) ? response.segments : []))
      .catch(() => setSegments([]));
  }, [copyId]);

  const visibleSegments = useMemo(
    () =>
      segments.filter(
        (segment) =>
          segment.char_end <= text.length &&
          text.slice(segment.char_start, segment.char_end) === segment.segment_text
      ),
    [segments, text]
  );

  const closePopover = useCallback(() => {
    setAnchorEl(null);
    setSelection(null);
    setShowNoteInput(false);
    setNote('');
    setSuggestedFix('');
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) return;

    const range = sel.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;

    const preRange = document.createRange();
    preRange.setStart(containerRef.current, 0);
    preRange.setEnd(range.startContainer, range.startOffset);
    const charStart = preRange.toString().length;
    const selectedText = sel.toString();
    const charEnd = charStart + selectedText.length;
    if (charEnd <= charStart || !selectedText.trim()) return;

    setSelection({ start: charStart, end: charEnd, text: selectedText });

    const rect = range.getBoundingClientRect();
    const fakeEl = document.createElement('div');
    fakeEl.style.position = 'fixed';
    fakeEl.style.top = `${rect.top}px`;
    fakeEl.style.left = `${rect.left + rect.width / 2}px`;
    fakeEl.style.width = '1px';
    fakeEl.style.height = `${rect.height}px`;
    document.body.appendChild(fakeEl);
    setAnchorEl(fakeEl);
    setTimeout(() => {
      if (document.body.contains(fakeEl)) document.body.removeChild(fakeEl);
    }, 100);
  }, []);

  const saveFeedback = useCallback(async (sentiment: 'like' | 'dislike' | 'neutral') => {
    if (!selection) return;
    setSaving(true);
    try {
      await apiPost(`/edro/copies/${copyId}/segments/feedback`, {
        segment_text: selection.text,
        char_start: selection.start,
        char_end: selection.end,
        sentiment,
        note: note.trim() || undefined,
        suggested_fix: suggestedFix.trim() || undefined,
      });

      const newSegment: SegmentFeedback = {
        segment_text: selection.text,
        char_start: selection.start,
        char_end: selection.end,
        sentiment,
        note: note.trim() || undefined,
        suggested_fix: suggestedFix.trim() || undefined,
      };
      setSegments((prev) => [...prev, newSegment]);
      onFeedbackSaved?.(newSegment);
    } finally {
      setSaving(false);
      closePopover();
    }
  }, [closePopover, copyId, note, onFeedbackSaved, selection, suggestedFix]);

  const renderHighlightedText = () => {
    if (visibleSegments.length === 0) return text;

    const parts: React.ReactNode[] = [];
    let cursor = 0;
    const _sortedSegs = [...visibleSegments].sort((a, b) => a.char_start - b.char_start);
    for (let index = 0; index < _sortedSegs.length; index++) {
      const segment = _sortedSegs[index];
      if (segment.char_start > cursor) {
        parts.push(text.slice(cursor, segment.char_start));
      }
      parts.push(
        <Tooltip key={`${segment.char_start}-${segment.char_end}-${index}`} title={segment.note || segment.sentiment} placement="top">
          <Box
            component="span"
            sx={{
              bgcolor: segment.sentiment === 'like' ? 'success.50' : segment.sentiment === 'dislike' ? 'error.50' : 'grey.100',
              borderBottom: '2px solid',
              borderColor: segment.sentiment === 'like' ? 'success.main' : segment.sentiment === 'dislike' ? 'error.main' : 'grey.400',
              cursor: 'help',
            }}
          >
            {segment.segment_text}
          </Box>
        </Tooltip>
      );
      cursor = segment.char_end;
    }
    if (cursor < text.length) parts.push(text.slice(cursor));
    return parts;
  };

  return (
    <>
      <Box
        ref={containerRef}
        onMouseUp={handleMouseUp}
        sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, userSelect: 'text', cursor: 'text', p: 0, fontSize: 13 }}
      >
        {renderHighlightedText()}
      </Box>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={closePopover}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        elevation={4}
      >
        <Paper sx={{ p: 1 }}>
          {!showNoteInput ? (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Gostei deste trecho">
                <IconButton size="small" color="success" onClick={() => saveFeedback('like')} disabled={saving}>
                  <IconThumbUp size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Não gostei">
                <IconButton size="small" color="error" onClick={() => saveFeedback('dislike')} disabled={saving}>
                  <IconThumbDown size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Adicionar nota">
                <IconButton size="small" onClick={() => setShowNoteInput(true)} disabled={saving}>
                  <IconMessage size={18} />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            <Stack spacing={1} sx={{ p: 0.5, minWidth: 260 }}>
              <Typography variant="caption" fontWeight={600}>
                "{selection?.text?.slice(0, 40)}{(selection?.text?.length ?? 0) > 40 ? '…' : ''}"
              </Typography>
              <TextField
                size="small"
                label="O que está errado?"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                multiline
                minRows={2}
                autoFocus
              />
              <TextField
                size="small"
                label="Como melhorar (opcional)"
                value={suggestedFix}
                onChange={(event) => setSuggestedFix(event.target.value)}
              />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <IconButton size="small" color="success" onClick={() => saveFeedback('like')} disabled={saving}>
                  <IconThumbUp size={16} />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => saveFeedback('dislike')} disabled={saving}>
                  <IconThumbDown size={16} />
                </IconButton>
              </Stack>
            </Stack>
          )}
        </Paper>
      </Popover>
    </>
  );
}
