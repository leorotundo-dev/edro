'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconChecklist, IconInfoCircle } from '@tabler/icons-react';

type Props = {
  fields: string[];
};

const FIELD_LABELS: Record<string, string> = {
  brand_directives: 'Diretrizes inegociaveis',
  forbidden_content: 'Conteudos proibidos',
  good_copy_examples: 'Exemplos de boa copy',
  bad_copy_examples: 'Exemplos a evitar',
  logo_url: 'Logo oficial',
  brand_colors: 'Cores da marca',
};

export default function ManualFieldsChecklist({ fields }: Props) {
  if (!fields.length) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconChecklist size={18} color="#16a34a" />
            <Typography variant="subtitle2" fontWeight={700}>
              Campos manuais completos
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Nenhum campo obrigatorio de revisao humana pendente.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <IconInfoCircle size={18} color="#d97706" />
          <Typography variant="subtitle2" fontWeight={700}>
            Precisamos de você
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
          Estes campos são somente manuais e não devem ser inferidos pela IA.
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {fields.map((field) => (
            <Chip
              key={field}
              size="small"
              label={FIELD_LABELS[field] || field}
              sx={{ bgcolor: 'rgba(255,174,31,0.12)', color: '#b45309' }}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

