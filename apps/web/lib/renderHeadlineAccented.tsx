import React from 'react';

/**
 * Renders a headline with an optional accent word highlighted in a different color.
 * Accepts string or already-rendered ReactNode (pass-through when not a string).
 * Case-insensitive search: finds the first occurrence of accentWord in text.
 */
export function renderHeadlineAccented(
  text: string | React.ReactNode,
  accentWord?: string,
  accentColor?: string,
): React.ReactNode {
  if (!accentWord || !accentColor || typeof text !== 'string') return text as React.ReactNode;
  const lower = text.toLowerCase();
  const accentLower = accentWord.toLowerCase();
  const idx = lower.indexOf(accentLower);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: accentColor }}>{text.slice(idx, idx + accentWord.length)}</span>
      {text.slice(idx + accentWord.length)}
    </>
  );
}
