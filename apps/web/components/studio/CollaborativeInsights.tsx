'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Collapse from '@mui/material/Collapse';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconBrain, IconChevronDown, IconChevronUp } from '@tabler/icons-react';

type AnalysisJson = {
  key_hooks?: string[];
  restrictions?: string[];
  creative_direction?: string;
  ideal_tone?: string;
  approval_checklist?: Array<{ id: string; rule: string; weight: string }>;
};

type Props = {
  analysisJson: AnalysisJson | null | undefined;
};

export default function CollaborativeInsights({ analysisJson }: Props) {
  const [open, setOpen] = useState(false);

  if (!analysisJson) return null;
  const hasContent =
    analysisJson.creative_direction ||
    (analysisJson.key_hooks?.length ?? 0) > 0 ||
    (analysisJson.restrictions?.length ?? 0) > 0;
  if (!hasContent) return null;

  return (
    <Card variant="outlined" sx={{ mb: 2, bgcolor: 'rgba(232,82,25,0.03)', borderColor: 'rgba(232,82,25,0.15)' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          onClick={() => setOpen((v) => !v)}
          sx={{ cursor: 'pointer' }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <IconBrain size={16} color="#E85219" />
            <Typography variant="caption" fontWeight={700} color="#E85219">
              Análise do Gemini
            </Typography>
          </Stack>
          <IconButton size="small" sx={{ p: 0.25 }}>
            {open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </IconButton>
        </Stack>

        <Collapse in={open}>
          <Box sx={{ mt: 1.5 }}>
            {analysisJson.creative_direction && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: 0.5 }}>
                  Direção criativa
                </Typography>
                <Typography variant="caption" color="text.primary" sx={{ lineHeight: 1.5 }}>
                  {analysisJson.creative_direction}
                </Typography>
              </Box>
            )}

            {(analysisJson.ideal_tone) && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: 0.5 }}>
                  Tom ideal
                </Typography>
                <Chip size="small" label={analysisJson.ideal_tone}
                  sx={{ fontSize: '0.65rem', height: 20, bgcolor: 'rgba(232,82,25,0.08)', color: '#E85219' }} />
              </Box>
            )}

            {(analysisJson.key_hooks?.length ?? 0) > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: 0.5 }}>
                  Ganchos identificados
                </Typography>
                <Stack direction="row" flexWrap="wrap" spacing={0.5} useFlexGap>
                  {analysisJson.key_hooks!.map((hook, i) => (
                    <Chip key={i} size="small" label={hook}
                      sx={{ fontSize: '0.65rem', height: 20, bgcolor: 'rgba(232,82,25,0.08)' }} />
                  ))}
                </Stack>
              </Box>
            )}

            {(analysisJson.restrictions?.length ?? 0) > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: 0.5 }}>
                  Restrições da marca
                </Typography>
                {analysisJson.restrictions!.map((r, i) => (
                  <Typography key={i} variant="caption" color="error.main" sx={{ display: 'block', lineHeight: 1.5 }}>
                    ✕ {r}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}
