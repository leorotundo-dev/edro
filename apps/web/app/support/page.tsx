'use client';

import AppShell from '@/components/AppShell';
import WorkspaceHero from '@/components/shared/WorkspaceHero';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { IconArrowRight, IconLifebuoy, IconLockAccess, IconMail, IconSparkles } from '@tabler/icons-react';

export default function SupportPage() {
  return (
    <AppShell
      title="Suporte"
      meta="Tickets e ajuda operacional"
      topbarLeft={
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.12em' }}>
          Support
        </Typography>
      }
    >
      <Stack spacing={3}>
        <WorkspaceHero
          eyebrow="Tickets"
          title="Suporte da plataforma"
          description="O ponto de entrada para incidentes operacionais, pedidos de acesso e melhorias do sistema, sem precisar caçar o time certo."
          leftChips={[
            { label: 'Incidentes, acessos e melhorias' },
          ]}
        />

        <Grid container spacing={2}>
          {[
            {
              eyebrow: 'Incidente',
              title: 'Algo quebrou agora',
              copy: 'Use quando a operação travar, uma integração cair ou um fluxo parar de funcionar.',
              action: 'Abrir incidente',
              icon: <IconLifebuoy size={18} />,
              tone: '#FA896B',
            },
            {
              eyebrow: 'Acesso',
              title: 'Pedido de permissão',
              copy: 'Solicite criação de usuário, mudança de role ou ajuste de acesso em cliente e ferramenta.',
              action: 'Pedir acesso',
              icon: <IconLockAccess size={18} />,
              tone: '#5D87FF',
            },
            {
              eyebrow: 'Melhoria',
              title: 'Sugestão de produto',
              copy: 'Registre uma ideia de melhoria para Studio, Jarvis, Operações ou qualquer parte do sistema.',
              action: 'Enviar melhoria',
              icon: <IconSparkles size={18} />,
              tone: '#13DEB9',
            },
          ].map((item) => (
            <Grid key={item.title} size={{ xs: 12, md: 4 }}>
              <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ p: '20px !important' }}>
                  <Stack spacing={1.75}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                        {item.eyebrow}
                      </Typography>
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: 2,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: alpha(item.tone, 0.1),
                          color: item.tone,
                        }}
                      >
                        {item.icon}
                      </Box>
                    </Stack>
                    <Typography variant="h6" fontWeight={800}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.copy}
                    </Typography>
                    <Button
                      variant="text"
                      size="small"
                      endIcon={<IconArrowRight size={16} />}
                      sx={{ mt: 'auto', fontWeight: 700, alignSelf: 'flex-start' }}
                    >
                      {item.action}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}

          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: '20px !important' }}>
                <Typography variant="overline" color="text.disabled" sx={{ fontWeight: 600 }}>
                  Base de conhecimento
                </Typography>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1.5 }}>
                  Guias rápidos
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Boas práticas de calendário, triagem de clipping, uso do Studio e fluxo do Jarvis.
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  endIcon={<IconArrowRight size={16} />}
                  sx={{ mt: 2, fontWeight: 600 }}
                >
                  Abrir docs
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: '20px !important' }}>
                <Typography variant="overline" color="text.disabled" sx={{ fontWeight: 600 }}>
                  Contato direto
                </Typography>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1.5 }}>
                  Operações da plataforma
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Acione o time interno para incidentes da plataforma, mudanças de acesso ou bloqueios críticos.
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  endIcon={<IconMail size={16} />}
                  sx={{ mt: 2, fontWeight: 600 }}
                >
                  Enviar pedido
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </AppShell>
  );
}
