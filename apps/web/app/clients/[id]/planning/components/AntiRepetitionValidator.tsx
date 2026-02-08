'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconAlertCircle, IconCheck, IconChevronDown, IconChevronUp, IconShieldCheck, IconX } from '@tabler/icons-react';

export type ValidationResult = {
  isOriginal: boolean;
  similarityScore: number;
  matchedCopies: Array<{
    id: string;
    output: string;
    similarity: number;
    created_at: string;
  }>;
  recommendation: 'approve' | 'review' | 'reject';
  reason: string;
  brandSafetyViolations?: string[];
};

type AntiRepetitionValidatorProps = {
  validationResult: ValidationResult | null;
  loading: boolean;
  copyText: string;
  onValidate: () => void;
  onForceApprove?: () => void;
};

function getBadgeConfig(recommendation: string) {
  switch (recommendation) {
    case 'approve':
      return { icon: <IconCheck size={16} />, color: 'success', label: '✅ Original' };
    case 'review':
      return { icon: <IconAlertCircle size={16} />, color: 'warning', label: '⚠️ Similar' };
    case 'reject':
      return { icon: <IconX size={16} />, color: 'error', label: '❌ Repetido' };
    default:
      return { icon: <IconShieldCheck size={16} />, color: 'default', label: 'Não validado' };
  }
}

export default function AntiRepetitionValidator({
  validationResult,
  loading,
  copyText,
  onValidate,
  onForceApprove,
}: AntiRepetitionValidatorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [autoValidated, setAutoValidated] = useState(false);

  // Auto-validate on copyText change (debounced)
  useEffect(() => {
    if (!copyText || copyText.trim().length < 50) return;
    setAutoValidated(false);

    const timer = setTimeout(() => {
      onValidate();
      setAutoValidated(true);
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [copyText, onValidate]);

  if (!copyText || copyText.trim().length < 50) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconShieldCheck size={20} />
            <Typography variant="body2" color="text.secondary">
              Digite pelo menos 50 caracteres para validar
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Validando copy...
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (!validationResult) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Button variant="outlined" size="small" onClick={onValidate} startIcon={<IconShieldCheck size={16} />}>
            Validar Copy
          </Button>
        </CardContent>
      </Card>
    );
  }

  const badge = getBadgeConfig(validationResult.recommendation);
  const hasSimilarCopies = validationResult.matchedCopies.length > 0;
  const hasViolations = validationResult.brandSafetyViolations && validationResult.brandSafetyViolations.length > 0;

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor:
          validationResult.recommendation === 'approve'
            ? 'success.main'
            : validationResult.recommendation === 'review'
              ? 'warning.main'
              : 'error.main',
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          {/* Header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Badge
                badgeContent={badge.icon}
                color={badge.color as any}
                overlap="circular"
                sx={{ '& .MuiBadge-badge': { p: 0.5 } }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: `${badge.color}.light`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {badge.icon}
                </Box>
              </Badge>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {badge.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Similaridade: {Math.round(validationResult.similarityScore * 100)}%
                </Typography>
              </Box>
            </Stack>

            {hasSimilarCopies && (
              <IconButton size="small" onClick={() => setShowDetails(!showDetails)}>
                {showDetails ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
              </IconButton>
            )}
          </Stack>

          {/* Reason */}
          <Alert severity={badge.color as any} sx={{ py: 0.5 }}>
            {validationResult.reason}
          </Alert>

          {/* Brand Safety Violations */}
          {hasViolations && (
            <Alert severity="error" sx={{ py: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                🚫 Violação de Brand Safety
              </Typography>
              <Typography variant="caption">
                Palavras proibidas detectadas: {validationResult.brandSafetyViolations!.join(', ')}
              </Typography>
            </Alert>
          )}

          {/* Similar Copies Details */}
          <Collapse in={showDetails}>
            {hasSimilarCopies && (
              <>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Copies similares encontradas:
                  </Typography>
                  <Stack spacing={1}>
                    {validationResult.matchedCopies.slice(0, 3).map((match) => (
                      <Box
                        key={match.id}
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          bgcolor: 'grey.100',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Chip size="small" label={`${Math.round(match.similarity * 100)}% similar`} />
                          <Typography variant="caption" color="text.disabled">
                            {new Date(match.created_at).toLocaleDateString('pt-BR')}
                          </Typography>
                        </Stack>
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            fontSize: '0.75rem',
                            color: 'text.secondary',
                          }}
                        >
                          {match.output}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </>
            )}
          </Collapse>

          {/* Actions */}
          {validationResult.recommendation === 'review' && onForceApprove && (
            <Button
              variant="outlined"
              size="small"
              color="warning"
              onClick={onForceApprove}
              startIcon={<IconCheck size={14} />}
            >
              Forçar Aprovação
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
