import React from 'react';
import { readFile } from 'fs/promises';
import path from 'path';
import satori from 'satori';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cachedFont: ArrayBuffer | null = null;

const loadFont = async () => {
  if (cachedFont) return cachedFont;
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf');
  const fontBuffer = await readFile(fontPath);
  cachedFont = fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength);
  return cachedFont;
};

const sanitizeText = (value: string | null, fallback: string) =>
  (value || fallback).replace(/\s+/g, ' ').trim();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const headline = sanitizeText(searchParams.get('headline'), 'Novo post para Instagram');
  const body = sanitizeText(
    searchParams.get('body'),
    'Texto automático gerado pela IA. Ajuste o copy e publique com confiança.'
  );
  const cta = sanitizeText(searchParams.get('cta'), 'Saiba mais');
  const brand = sanitizeText(searchParams.get('brand'), 'edro studio');

  const width = 1080;
  const height = 1080;
  const fontData = await loadFont();

  const element = React.createElement(
    'div',
    {
      style: {
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        padding: '88px 92px',
        color: '#ffffff',
        background: 'linear-gradient(135deg, #0f172a 0%, #ff6a00 100%)',
        fontFamily: 'Roboto',
        position: 'relative',
      },
    },
    [
      React.createElement(
        'div',
        { key: 'headline', style: { fontSize: 56, fontWeight: 700, lineHeight: 1.1 } },
        headline
      ),
      React.createElement(
        'div',
        { key: 'body', style: { marginTop: 28, fontSize: 32, lineHeight: 1.4, opacity: 0.92 } },
        body
      ),
      React.createElement(
        'div',
        {
          key: 'footer',
          style: { marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 16 },
        },
        [
          React.createElement(
            'div',
            {
              key: 'cta',
              style: {
                padding: '14px 22px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.18)',
                border: '1px solid rgba(255,255,255,0.4)',
                fontSize: 22,
                textTransform: 'uppercase',
                letterSpacing: 2,
              },
            },
            cta
          ),
          React.createElement(
            'div',
            {
              key: 'brand',
              style: { fontSize: 20, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 1.6 },
            },
            `@${brand}`
          ),
        ]
      ),
    ]
  );

  const svg = await satori(element, {
    width,
    height,
    fonts: [
      {
        name: 'Roboto',
        data: fontData,
        weight: 400,
        style: 'normal',
      },
    ],
  });

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
