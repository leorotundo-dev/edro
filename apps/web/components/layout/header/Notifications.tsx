'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Popover from '@mui/material/Popover';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import {
  IconBell,
  IconMessage2,
  IconCalendarEvent,
  IconClipboardCheck,
  IconAlertCircle,
  IconCheck,
} from '@tabler/icons-react';
import { apiGet, apiPost } from '@/lib/api';

type InAppNotification = {
  id: string;
  event_type: string;
  title: string;
  body?: string;
  link?: string;
  read_at: string | null;
  created_at: string;
};

const EVENT_ICONS: Record<string, { icon: any; color: string; bgColor: string }> = {
  stage_change: { icon: IconClipboardCheck, color: '#13DEB9', bgColor: '#E6FFFA' },
  briefing_deadline: { icon: IconCalendarEvent, color: '#FFAE1F', bgColor: '#FEF5E5' },
  task_assigned: { icon: IconMessage2, color: '#E85219', bgColor: '#fdeee8' },
  copy_approved: { icon: IconCheck, color: '#13DEB9', bgColor: '#E6FFFA' },
  weekly_digest: { icon: IconClipboardCheck, color: '#E85219', bgColor: '#fdeee8' },
};

const DEFAULT_ICON = { icon: IconAlertCircle, color: '#E85219', bgColor: '#fdeee8' };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `ha ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `ha ${hours}h`;
  const days = Math.floor(hours / 24);
  return `ha ${days}d`;
}

export default function Notifications() {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const open = Boolean(anchorEl);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await apiGet<{ notifications: InAppNotification[]; unreadCount: number }>('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Silent fail — user may not be authenticated yet
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    loadNotifications();
  };

  const handleClickNotification = async (notif: InAppNotification) => {
    if (!notif.read_at) {
      try {
        await apiPost(`/notifications/${notif.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {}
    }
    if (notif.link) {
      setAnchorEl(null);
      router.push(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiPost('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch {}
  };

  return (
    <>
      <IconButton onClick={handleOpen} sx={{ position: 'relative' }}>
        <Badge
          badgeContent={unreadCount}
          color="primary"
          max={9}
          invisible={unreadCount === 0}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.65rem',
              minWidth: 18,
              height: 18,
              ...(unreadCount > 0 && { animation: 'notifPulse 2s ease-in-out infinite' }),
              '@keyframes notifPulse': {
                '0%, 100%': { boxShadow: '0 0 0 0 rgba(93, 135, 255, 0.5)', transform: 'scale(1)' },
                '50%': { boxShadow: '0 0 0 5px rgba(93, 135, 255, 0)', transform: 'scale(1.12)' },
              },
            },
          }}
        >
          <IconBell size={22} stroke={1.5} />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { width: 360, borderRadius: 3, mt: 1, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
          },
        }}
      >
        <Box sx={{ p: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">Notificações</Typography>
            <Typography variant="body2" color="text.secondary">
              {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}
            </Typography>
          </Box>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAllRead}>
              Marcar todas
            </Button>
          )}
        </Box>
        <Divider />
        <Stack sx={{ maxHeight: 360, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Nenhuma notificação.
              </Typography>
            </Box>
          ) : (
            notifications.map((n) => {
              const eventStyle = EVENT_ICONS[n.event_type] || DEFAULT_ICON;
              const NIcon = eventStyle.icon;
              return (
                <Box
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'flex-start',
                    cursor: n.link ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                    bgcolor: n.read_at ? 'transparent' : 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: eventStyle.bgColor,
                      color: eventStyle.color,
                      borderRadius: 2,
                    }}
                  >
                    <NIcon size={20} />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap fontWeight={n.read_at ? 400 : 600}>
                      {n.title}
                    </Typography>
                    {n.body && (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {n.body}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.disabled" display="block">
                      {timeAgo(n.created_at)}
                    </Typography>
                  </Box>
                </Box>
              );
            })
          )}
        </Stack>
        {notifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 1.5, textAlign: 'center' }}>
              <Button
                size="small"
                color="primary"
                onClick={() => { setAnchorEl(null); router.push('/settings/notifications'); }}
              >
                Configurar notificacoes
              </Button>
            </Box>
          </>
        )}
      </Popover>
    </>
  );
}
