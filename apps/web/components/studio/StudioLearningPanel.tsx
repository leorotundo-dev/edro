'use client';

import { useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { IconBrain, IconChevronDown, IconExternalLink } from '@tabler/icons-react';
import { apiGet } from '@/lib/api';

type LearningRule = {
  rule_name: string;
  effective_pattern: string;
  uplift_metric: string;
  uplift_value: number;
  confidence_score: number;
  sample_size: number;
  segment_definition?: { type?: 'amd' | 'trigger' | 'platform'; value?: string };
};

type Props = {
  clientId: string;
  clientName?: string;
};

const SEGMENT_COLORS: Record<string, string> = {
  amd: '#7c3aed',
  trigger: '#0284c7',
  platform: '#059669',
};

const METRIC_LABELS: Record<string, string> = {
  save_rate: 'save rate',
  click_rate: 'cliques',
  eng_rate: 'engajamento',
  conversion_rate: 'conversão',
};

function confidenceColor(score: number): 'success' | 'warning' | 'default' {
  if (score >= 0.7) return 'success';
  if (score >= 0.4) return 'warning';
  return 'default';
}

export default function StudioLearningPanel({ clientId, clientName }: Props) {
  const [rules, setRules] = useState<LearningRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchRules = async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const response = await apiGet<{ success: boolean; data?: LearningRule[] }>(`/clients/${clientId}/learning-rules`);
      setRules(Array.isArray(response?.data) ? response.data.slice(0, 8) : []);
    } catch {
      setRules([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  const byType = rules.reduce<Record<string, LearningRule[]>>((acc, rule) => {
    const type = rule.segment_definition?.type ?? 'platform';
    acc[type] = [...(acc[type] ?? []), rule];
    return acc;
  }, {});

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => {
        setExpanded(isExpanded);
        if (isExpanded) fetchRules();
      }}
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '12px !important',
        '&:before': { display: 'none' },
        mb: 2,
      }}
    >
      <AccordionSummary expandIcon={<IconChevronDown size={18} />}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconBrain size={18} color="#7c3aed" />
          <Typography variant="body2" fontWeight={600}>
            O que o sistema aprendeu
            {clientName ? ` sobre ${clientName}` : ''}
          </Typography>
          {rules.length > 0 && (
            <Chip
              size="small"
              label={`${rules.length} regra${rules.length !== 1 ? 's' : ''}`}
              sx={{ bgcolor: '#7c3aed15', color: '#7c3aed', fontWeight: 600, height: 20, fontSize: 11 }}
            />
          )}
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        {loading && (
          <Stack spacing={1}>
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} variant="rounded" height={36} />
            ))}
          </Stack>
        )}

        {!loading && rules.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Ainda não há dados suficientes para gerar regras. Continue aprovando, rejeitando e publicando copies.
          </Typography>
        )}

        {!loading && rules.length > 0 && (
          <Stack spacing={2}>
            {(['amd', 'trigger', 'platform'] as const)
              .filter((type) => byType[type]?.length > 0)
              .map((type) => (
                <Box key={type}>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{ textTransform: 'uppercase', color: SEGMENT_COLORS[type], letterSpacing: 0.5 }}
                  >
                    {type === 'amd' ? 'Momento de decisão' : type === 'trigger' ? 'Gatilhos' : 'Plataforma'}
                  </Typography>
                  <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                    {byType[type].map((rule) => (
                      <Tooltip
                        key={rule.rule_name}
                        title={`Confiança: ${Math.round(rule.confidence_score * 100)}% · Amostra: ${rule.sample_size} briefings`}
                        placement="right"
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" sx={{ flex: 1, fontSize: 12.5 }}>
                            {rule.effective_pattern}
                          </Typography>
                          <Chip
                            size="small"
                            label={`+${Math.round(rule.uplift_value)}% ${METRIC_LABELS[rule.uplift_metric] ?? rule.uplift_metric}`}
                            color={confidenceColor(rule.confidence_score)}
                            sx={{ height: 20, fontSize: 10, fontWeight: 600 }}
                          />
                        </Stack>
                      </Tooltip>
                    ))}
                  </Stack>
                </Box>
              ))}

            <Box sx={{ textAlign: 'right' }}>
              <Chip
                size="small"
                icon={<IconExternalLink size={12} />}
                label="Ver análise completa"
                component="a"
                href={`/clients/${clientId}/inteligencia`}
                target="_blank"
                clickable
                sx={{ fontSize: 11 }}
              />
            </Box>
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
