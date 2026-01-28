'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { InstagramFeedMockup } from '@/components/mockups/instagram/InstagramFeedMockup';
import { InstagramStoryMockup } from '@/components/mockups/instagram/InstagramStoryMockup';
import { InstagramProfileMockup } from '@/components/mockups/instagram/InstagramProfileMockup';
import { InstagramGridMockup } from '@/components/mockups/instagram/InstagramGridMockup';
import { mockupRegistry, normalizeMockupKey } from '@/components/mockups/mockupRegistry';
import { buildCatalogKey, mockupCatalogMap } from '@/components/mockups/mockupCatalogMap';

type InventoryItem = {
  id?: string;
  platform?: string;
  platformId?: string;
  format?: string;
  name?: string;
};

type MockupItem = {
  id: string;
  platform: string;
  format: string;
  generated: boolean;
  createdAt: string;
  serverId?: string;
  status?: string | null;
  title?: string | null;
};

type ServerMockup = {
  id: string;
  briefing_id?: string | null;
  client_id?: string | null;
  platform?: string | null;
  format?: string | null;
  production_type?: string | null;
  status?: string | null;
  title?: string | null;
  html_key?: string | null;
  json_key?: string | null;
  metadata?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
};

const STUDIO_NAV = [
  { label: 'Meus Projetos', href: '/clients' },
  { label: 'Biblioteca', href: '/clients/azul/library' },
];

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return (JSON.parse(value) as T) ?? fallback;
  } catch {
    return fallback;
  }
};

const safeGet = (key: string) => {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null && value !== undefined) return value;
  } catch {
    // ignore
  }
  try {
    if (window.top && window.top !== window) {
      return window.top.localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return null;
};

const safeSet = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
  try {
    if (window.top && window.top !== window) {
      window.top.localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
};

const wrapText = (text: string, maxChars = 24, maxLines = 5) => {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
};

const createSvgDataUri = (text: string, width: number, height: number, accent = '#ff6600') => {
  const safeText = text || 'Preview';
  const lines = wrapText(safeText, 26, 6);
  const lineHeight = Math.round(height / 8);
  const startY = Math.round(height / 2 - (lines.length * lineHeight) / 2);
  const textNodes = lines
    .map(
      (line, index) =>
        `<tspan x="50%" y="${startY + index * lineHeight}" text-anchor="middle">${line}</tspan>`
    )
    .join('');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#111827"/>
          <stop offset="100%" stop-color="${accent}"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      <text x="50%" y="50%" font-size="${Math.round(width / 18)}" fill="#ffffff" font-family="Inter, sans-serif">
        ${textNodes}
      </text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const getCopyMap = () => safeParse<Record<string, string>>(safeGet('edro_copy_by_platform_format'), {});

const getContext = () => safeParse<Record<string, any>>(safeGet('edro_studio_context'), {});

const getCopyFor = (platform: string, format: string, context: Record<string, any>) => {
  const map = getCopyMap();
  const key = `${platform}::${format}`;
  const raw = map[key] ?? context?.message ?? context?.event ?? '';
  return typeof raw === 'string' ? raw : String(raw);
};

const buildMockups = (inventory: InventoryItem[]): MockupItem[] =>
  inventory.map((item, index) => ({
    id: item.id || `${item.platform || 'platform'}-${item.format || item.name || 'format'}-${index}`,
    platform: item.platform || item.platformId || 'Instagram',
    format: item.format || item.name || 'Post',
    generated: false,
    createdAt: new Date().toISOString(),
  }));

const extractServerList = (payload: any): ServerMockup[] => {
  if (Array.isArray(payload)) return payload as ServerMockup[];
  if (Array.isArray(payload?.data)) return payload.data as ServerMockup[];
  if (Array.isArray(payload?.items)) return payload.items as ServerMockup[];
  return [];
};

const extractCopyText = (payload: any): string => {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  if (typeof payload?.copy === 'string') return payload.copy;
  if (typeof payload?.captionText === 'string') return payload.captionText;
  if (typeof payload?.caption === 'string') return payload.caption;
  if (typeof payload?.text === 'string') return payload.text;
  if (typeof payload?.description === 'string') return payload.description;
  return '';
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildHtmlDocument = (inner: string, data: Record<string, any>) => {
  const serialized = escapeHtml(JSON.stringify(data ?? {}));
  const body = inner || '<div></div>';
  return `<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Edro Mockup</title>
    <style>
      body { margin: 0; padding: 24px; font-family: Inter, Arial, sans-serif; background: #f8fafc; }
      .edro-mockup-shell { display: flex; align-items: center; justify-content: center; }
    </style>
  </head>
  <body>
    <script type="application/json" id="edro-mockup-data">${serialized}</script>
    <div class="edro-mockup-shell">${body}</div>
  </body>
</html>`;
};

const rebuildInventory = () => {
  const stored = safeParse<Record<string, string[]>>(safeGet('edro_selected_formats_by_platform'), {});
  const entries = Object.entries(stored).filter(([, list]) => Array.isArray(list) && list.length);
  const inventory: InventoryItem[] = [];
  entries.forEach(([platform, formats]) => {
    formats.forEach((format) => {
      inventory.push({ id: `${platform}-${format}`.toLowerCase(), platform, format });
    });
  });
  if (inventory.length) {
    safeSet('edro_selected_inventory', JSON.stringify(inventory));
    safeSet('edro_selected_platforms', JSON.stringify(entries.map(([platform]) => platform)));
  }
  return inventory;
};

export default function Page() {
  const [mockups, setMockups] = useState<MockupItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [displayMap, setDisplayMap] = useState<Record<string, string>>({});
  const [context, setContext] = useState<Record<string, any>>({});
  const [clientLogo, setClientLogo] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(0.92);
  const [syncing, setSyncing] = useState<boolean>(false);

  const resolveClientId = (ctx?: Record<string, any>) => {
    return ctx?.clientId || ctx?.client_id || safeGet('edro_client_id') || '';
  };

  const buildSnapshotPayload = (item: MockupItem) => {
    const productionType =
      context?.productionType ||
      context?.production_type ||
      safeGet('edro_studio_production_type') ||
      '';
    const copy = getCopyFor(item.platform, item.format, context);
    const captionLines = copy.split('\n').filter(Boolean);
    const captionText = captionLines.join(' ').trim();
    const shortText = captionLines[0] || captionText || `${item.platform} ${item.format}`;
    const payload = {
      platform: item.platform,
      format: item.format,
      productionType,
      copy: captionText || copy,
      shortText,
      client: context?.client || context?.clientName || '',
      event: context?.event || '',
      updatedAt: new Date().toISOString(),
    };

    let htmlBody = '';
    if (typeof document !== 'undefined') {
      const node = document.querySelector(`[data-mockup-id="${item.id}"] [data-export-root]`) as HTMLElement | null;
      if (node) {
        htmlBody = node.outerHTML;
      }
    }
    if (!htmlBody) {
      htmlBody = `<div style="padding:24px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">
  <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">${escapeHtml(item.platform)} • ${escapeHtml(item.format)}</h2>
  <p style="margin:0;font-size:14px;color:#475569;white-space:pre-line;">${escapeHtml(
        captionText || copy || 'Mockup gerado no Creative Studio.'
      )}</p>
</div>`;
    }

    return {
      payload,
      html: buildHtmlDocument(htmlBody, payload),
      copy: captionText || copy,
      productionType,
    };
  };

  const syncRemoteMockups = async (inventory: InventoryItem[], ctx?: Record<string, any>) => {
    const briefingId = safeGet('edro_briefing_id');
    const clientId = resolveClientId(ctx || context);
    if (!briefingId && !clientId) return;
    const params = new URLSearchParams();
    if (briefingId) params.set('briefing_id', briefingId);
    if (clientId) params.set('client_id', clientId);

    setSyncing(true);
    try {
      const response = await api.get(`/mockups?${params.toString()}`);
      const items = extractServerList(response);
      if (!items.length) return;

      const serverMap = new Map<string, ServerMockup>();
      items.forEach((item) => {
        const platform = item.platform || 'Instagram';
        const format = item.format || 'Post';
        serverMap.set(`${platform}::${format}`, item);
      });

      const copyMap = { ...getCopyMap() };
      items.forEach((item) => {
        const platform = item.platform || 'Instagram';
        const format = item.format || 'Post';
        const key = `${platform}::${format}`;
        const metaCopy = extractCopyText(item.metadata);
        if (metaCopy) {
          copyMap[key] = metaCopy;
        }
      });

      const missingCopy = items.filter((item) => item.json_key);
      await Promise.allSettled(
        missingCopy.map(async (item) => {
          const platform = item.platform || 'Instagram';
          const format = item.format || 'Post';
          const key = `${platform}::${format}`;
          if (copyMap[key]) return;
          try {
            const jsonResponse = await api.get(`/mockups/${item.id}/json`);
            const payload = jsonResponse?.data ?? jsonResponse;
            const jsonCopy = extractCopyText(payload);
            if (jsonCopy) {
              copyMap[key] = jsonCopy;
            }
          } catch {
            // ignore
          }
        })
      );
      safeSet('edro_copy_by_platform_format', JSON.stringify(copyMap));

      const inventoryItems = inventory.length ? buildMockups(inventory) : [];
      const inventoryMap = new Map(
        inventoryItems.map((item) => [`${item.platform}::${item.format}`, item])
      );

      setMockups((prev) => {
        const prevMap = new Map(prev.map((item) => [`${item.platform}::${item.format}`, item]));
        const keys = new Set<string>([
          ...Array.from(prevMap.keys()),
          ...Array.from(inventoryMap.keys()),
          ...Array.from(serverMap.keys()),
        ]);
        const merged: MockupItem[] = [];

        keys.forEach((key) => {
          const [platform, format] = key.split('::');
          const base =
            prevMap.get(key) ||
            inventoryMap.get(key) || {
              id: `mockup-${platform}-${format}`.toLowerCase(),
              platform: platform || 'Instagram',
              format: format || 'Post',
              generated: false,
              createdAt: new Date().toISOString(),
            };

          const serverItem = serverMap.get(key);
          if (serverItem) {
            merged.push({
              ...base,
              platform: serverItem.platform || base.platform,
              format: serverItem.format || base.format,
              serverId: serverItem.id,
              status: serverItem.status ?? base.status,
              title: serverItem.title ?? base.title,
              createdAt: serverItem.created_at
                ? new Date(serverItem.created_at).toISOString()
                : base.createdAt,
              generated: true,
            });
            return;
          }

          merged.push(base);
        });

        return merged;
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const storedContext = getContext();
    setContext(storedContext);

    const map = safeParse<Record<string, string>>(safeGet('edro_platform_display_map'), {});
    setDisplayMap(map);

    let inventory = safeParse<InventoryItem[]>(safeGet('edro_selected_inventory'), []);
    if (!inventory.length) {
      inventory = rebuildInventory();
    }

    const storedMockups = safeParse<MockupItem[]>(safeGet('edro_mockups'), []);
    if (storedMockups.length) {
      setMockups(storedMockups);
    } else {
      const next = buildMockups(inventory);
      setMockups(next);
      safeSet('edro_mockups', JSON.stringify(next));
    }

    const clientId = resolveClientId(storedContext);
    if (clientId) {
      api.get(`/clients/${clientId}`)
        .then((data: any) => {
          const client = data?.data || data;
          const logo =
            client?.logo_url ||
            client?.profile?.logo_url ||
            client?.profile?.branding?.logo ||
            client?.profile?.knowledge_base?.logo ||
            '';
          if (logo) setClientLogo(logo);
        })
        .catch(() => null);
    }

    syncRemoteMockups(inventory, storedContext).catch(() => null);
  }, []);

  useEffect(() => {
    if (!mockups.length) return;
    safeSet('edro_mockups', JSON.stringify(mockups));
  }, [mockups]);

  useEffect(() => {
    if (!selectedIds.length) return;
    setSelectedIds((prev) => prev.filter((id) => mockups.some((item) => item.id === id)));
  }, [mockups, selectedIds.length]);

  useEffect(() => {
    const hydrateFromBriefing = async () => {
      const briefingId = safeGet('edro_briefing_id');
      if (!briefingId) return;
      try {
        const response = await api.get(`/edro/briefings/${briefingId}`);
        const payload = response?.data || response;
        const stages = Array.isArray(payload?.stages) ? payload.stages : [];
        const alignment = stages.find((stage: any) => stage?.stage === 'alinhamento');
        const metadata = alignment?.metadata || {};
        if (metadata?.inventory) {
          safeSet('edro_selected_inventory', JSON.stringify(metadata.inventory));
        }
        if (metadata?.formatsByPlatform) {
          safeSet('edro_selected_formats_by_platform', JSON.stringify(metadata.formatsByPlatform));
        }
        if (metadata?.activePlatform) {
          safeSet('edro_active_platform', metadata.activePlatform);
        }
        if (metadata?.activeFormat) {
          safeSet('edro_active_format', metadata.activeFormat);
        }

        const inventory = metadata?.inventory?.length
          ? metadata.inventory
          : safeParse<InventoryItem[]>(safeGet('edro_selected_inventory'), []);
        if (inventory.length) {
          const storedMockups = safeParse<MockupItem[]>(safeGet('edro_mockups'), []);
          const storedMap = new Map(
            storedMockups.map((item) => [`${item.platform}::${item.format}`, item])
          );
          const next = inventory.map((item: InventoryItem, index: number) => {
            const platform = item.platform || item.platformId || 'Instagram';
            const format = item.format || item.name || 'Post';
            const key = `${platform}::${format}`;
            const existing = storedMap.get(key);
            return existing
              ? { ...existing, platform, format }
              : {
                  id: item.id || `${platform}-${format}-${index}`,
                  platform,
                  format,
                  generated: false,
                  createdAt: new Date().toISOString(),
                };
          });
          setMockups(next);
          safeSet('edro_mockups', JSON.stringify(next));
          syncRemoteMockups(inventory, getContext()).catch(() => null);
        }
      } catch {
        // ignore
      }
    };

    hydrateFromBriefing();
  }, []);

  useEffect(() => {
    const briefingId = safeGet('edro_briefing_id');
    if (!briefingId) return;
    api.patch(`/edro/briefings/${briefingId}/stages/producao`, { status: 'in_progress' }).catch(() => null);
  }, []);

  const orderedMockups = useMemo(
    () =>
      [...mockups].sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      }),
    [mockups]
  );
  const generatedCount = useMemo(() => mockups.filter((item) => item.generated).length, [mockups]);
  const platformsCount = useMemo(() => new Set(mockups.map((item) => item.platform)).size, [mockups]);
  const selectedCount = selectedIds.length;

  const username = useMemo(() => {
    const raw = context?.client || context?.clientName || 'sua_marca';
    return String(raw).toLowerCase().replace(/\s+/g, '');
  }, [context]);

  const displayName = useMemo(() => context?.client || 'sua_marca', [context]);

  const persistMockup = async (item: MockupItem, statusOverride?: string) => {
    const briefingId = safeGet('edro_briefing_id');
    const clientId = resolveClientId();
    const { payload, html, copy, productionType } = buildSnapshotPayload(item);
    const status = statusOverride ?? (item.generated ? 'saved' : 'draft');
    const title = item.title || resolveLabel(item.platform, item.format);
    const metadata = {
      copy: copy || payload.copy || '',
      shortText: payload.shortText || '',
      platform: item.platform,
      format: item.format,
      productionType: productionType || undefined,
      client: payload.client || '',
      updatedAt: payload.updatedAt,
      source: 'creative-studio',
    };

    const key = `${item.platform}::${item.format}`;
    if (copy) {
      const copyMap = { ...getCopyMap(), [key]: copy };
      safeSet('edro_copy_by_platform_format', JSON.stringify(copyMap));
    }

    if (item.serverId) {
      const response = await api.patch(`/mockups/${item.serverId}`, {
        status,
        title,
        metadata,
        html,
        json: payload,
      });
      return (response?.data ?? response) as ServerMockup;
    }

    const response = await api.post('/mockups', {
      briefing_id: briefingId || undefined,
      client_id: clientId || undefined,
      platform: item.platform,
      format: item.format,
      production_type: productionType || undefined,
      status,
      title,
      metadata,
      html,
      json: payload,
    });
    return (response?.data ?? response) as ServerMockup;
  };

  const persistSelected = async (ids: string[], statusOverride?: string) => {
    if (!ids.length) return;
    const updates = await Promise.allSettled(
      ids.map(async (id) => {
        const item = mockups.find((mockup) => mockup.id === id);
        if (!item) return null;
        const record = await persistMockup(item, statusOverride);
        return { id, record };
      })
    );

    const recordMap = new Map<string, ServerMockup>();
    updates.forEach((result) => {
      if (result.status === 'fulfilled' && result.value?.record) {
        recordMap.set(result.value.id, result.value.record);
      }
    });

    setMockups((prev) =>
      prev.map((item) => {
        if (!ids.includes(item.id)) return item;
        const record = recordMap.get(item.id);
        if (!record) return item;
        return {
          ...item,
          serverId: record.id,
          status: record.status ?? item.status,
          title: record.title ?? item.title,
          createdAt: record.created_at ? new Date(record.created_at).toISOString() : item.createdAt,
          generated: true,
        };
      })
    );
  };

  const handleGenerateAll = () => {
    if (!mockups.length) return;
    setMockups((prev) => prev.map((item) => ({ ...item, generated: true })));
  };

  const handleZoomIn = () => setZoomLevel((value) => Math.min(1, Number((value + 0.08).toFixed(2))));
  const handleZoomOut = () => setZoomLevel((value) => Math.max(0.4, Number((value - 0.08).toFixed(2))));
  const handleZoomReset = () => setZoomLevel(0.92);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSelectAll = () => setSelectedIds(mockups.map((item) => item.id));

  const handleClearSelection = () => setSelectedIds([]);

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    const ids = [...selectedIds];
    const targets = mockups.filter((item) => ids.includes(item.id) && item.serverId);
    if (targets.length) {
      await Promise.allSettled(
        targets.map((item) => api.delete(`/mockups/${item.serverId}`))
      );
    }
    setMockups((prev) => prev.filter((item) => !ids.includes(item.id)));
    setSelectedIds([]);
  };

  const handleSaveSelected = async () => {
    if (!selectedIds.length) return;
    await persistSelected(selectedIds, 'saved');
    setSelectedIds([]);
  };

  const handleSaveDraftAll = async () => {
    if (!mockups.length) return;
    const ids = mockups.map((item) => item.id);
    await persistSelected(ids, 'draft');
  };

  const handleExportSelected = async () => {
    if (!mockups.length) return;
    const ids = selectedIds.length ? selectedIds : mockups.map((item) => item.id);
    try {
      const [{ toPng }, jsZipModule] = await Promise.all([import('html-to-image'), import('jszip')]);
      const JSZip = jsZipModule.default;
      const zip = new JSZip();
      for (const id of ids) {
        const node = document.querySelector(`[data-mockup-id="${id}"] [data-export-root]`) as HTMLElement | null;
        if (!node) continue;
        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
        });
        const base64 = dataUrl.split(',')[1];
        const filename = `mockup-${id}.png`;
        zip.file(filename, base64, { base64: true });
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `mockups-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1500);
    } catch (error) {
      console.error('Erro ao exportar mockups', error);
      window.alert('Não foi possível exportar os mockups. Verifique as imagens e tente novamente.');
    }
  };

  const updateStageDone = () => {
    const briefingId = safeGet('edro_briefing_id');
    if (!briefingId) return;
    api.patch(`/edro/briefings/${briefingId}/stages/producao`, { status: 'done' }).catch(() => null);
  };

  const resolveLabel = (platform: string, format: string) => {
    const label = displayMap?.[platform] || platform;
    return `${label} • ${format}`;
  };

  const renderMockup = (item: MockupItem) => {
    const productionType =
      context?.productionType ||
      context?.production_type ||
      safeGet('edro_studio_production_type') ||
      '';
    const copy = getCopyFor(item.platform, item.format, context);
    const caption = copy || 'Digite ou gere o copy para visualizar o mockup.';
    const captionLines = caption.split('\n').filter(Boolean);
    const captionText = captionLines.join(' ').slice(0, 2200);
    const shortText = captionLines[0] || captionText;
    const profileImage = clientLogo || context?.logo_url || context?.logo || '/assets/logo-studio.png';
    const platformLabel = displayMap[item.platform] || item.platform;
    const likes = Math.max(120, Math.round((context?.score || 60) * 25));
    const comments = Math.max(12, Math.round(likes / 18));
    const shares = Math.max(5, Math.round(likes / 30));
    const wideImage = createSvgDataUri(shortText, 1280, 720);
    const squareImage = createSvgDataUri(shortText, 1080, 1080);
    const tallImage = createSvgDataUri(shortText, 1080, 1920);
    const baseProps: Record<string, any> = {
      username,
      profileImage,
      avatar: profileImage,
      logo: profileImage,
      channelImage: profileImage,
      channelName: displayName,
      postText: captionText,
      caption: captionText,
      description: captionText,
      title: shortText,
      subtitle: context?.event || '',
      timeAgo: '2h',
      likes,
      comments,
      shares,
      views: `${likes * 4} views`,
      postImage: squareImage,
      image: squareImage,
      thumbnail: wideImage,
      coverImage: wideImage,
      bannerImage: wideImage,
      storyImage: tallImage,
      videoThumbnail: wideImage,
    };
    const catalogKey = buildCatalogKey(productionType, item.platform, item.format);
    const componentName = mockupCatalogMap[catalogKey];
    const RegistryComponent = componentName ? mockupRegistry[normalizeMockupKey(componentName)] : null;

    if (componentName === 'InstagramStoryMockup') {
      return (
        <InstagramStoryMockup
          username={username}
          profileImage={profileImage}
          storyImage={createSvgDataUri(shortText, 1080, 1920)}
          timeAgo="2h"
        />
      );
    }
    if (componentName === 'InstagramProfileMockup') {
      return (
        <InstagramProfileMockup
          username={username}
          profileImage={profileImage}
          bio={captionText.slice(0, 120)}
          website="edro.studio"
          posts={12}
          followers={1520}
          following={320}
          stories={[
            { title: 'Campanha', image: createSvgDataUri(shortText, 400, 400) },
            { title: 'Bastidores', image: createSvgDataUri(shortText, 400, 400, '#2563eb') },
          ]}
          gridImages={Array.from({ length: 9 }).map((_, idx) =>
            createSvgDataUri(`${shortText} ${idx + 1}`, 400, 400, '#f97316')
          )}
        />
      );
    }
    if (componentName === 'InstagramGridMockup') {
      return (
        <InstagramGridMockup
          username={username}
          gridImages={Array.from({ length: 9 }).map((_, idx) =>
            createSvgDataUri(`${shortText} ${idx + 1}`, 400, 400, '#0ea5e9')
          )}
        />
      );
    }
    if (componentName === 'InstagramFeedMockup') {
      return (
        <InstagramFeedMockup
          username={username}
          profileImage={profileImage}
          postImage={squareImage}
          likes={Math.max(120, Math.round((context?.score || 60) * 25))}
          caption={captionText.slice(0, 180)}
          comments={[
            { username: 'cliente_real', text: 'Curti muito!' },
            { username: 'edro_team', text: 'Vamos nessa 🚀' },
          ]}
        />
      );
    }

    if (RegistryComponent) {
      return <RegistryComponent {...baseProps} />;
    }

    return (
      <div className="w-[375px] h-[667px] bg-white rounded-[32px] shadow-2xl border border-slate-200 flex flex-col p-6 gap-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{item.platform}</div>
        <div className="text-lg font-semibold text-slate-900">{item.format}</div>
        <div className="flex-1 rounded-2xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-center px-4 text-sm text-slate-500">
          {captionText || 'Copie o texto para visualizar o mockup.'}
        </div>
        <div className="text-xs text-slate-400">Mockup dinâmico gerado com base no briefing.</div>
      </div>
    );
  };

  const topbarLeft = (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl text-slate-900">Creative Studio</h1>
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-orange-50 px-2 py-1 rounded">
          Etapa 4 de 6
        </span>
      </div>
      <nav className="hidden md:flex items-center gap-4 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        {STUDIO_NAV.map((item) => (
          <Link key={item.href} href={item.href} className="hover:text-slate-700">
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );

  return (
    <AppShell title="Creative Studio Mockups" topbarLeft={topbarLeft}>
      <div className="flex-1 p-8 flex flex-col">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="font-serif text-4xl text-slate-900 leading-tight mb-2">Geração de Mockups</h2>
            <p className="text-slate-500 text-base">Visualize sua marca aplicada em cenários reais de alta fidelidade.</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden">
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full px-4 py-2 flex items-center gap-4 z-10">
              <div className="flex items-center gap-1 border-r border-white/10 pr-4">
                <button className="p-1.5 text-slate-600 hover:text-primary transition-colors" type="button" onClick={handleZoomIn}>
                  <span className="material-symbols-outlined">zoom_in</span>
                </button>
                <button className="p-1.5 text-slate-600 hover:text-primary transition-colors" type="button" onClick={handleZoomOut}>
                  <span className="material-symbols-outlined">zoom_out</span>
                </button>
                <button className="p-1.5 text-slate-600 hover:text-primary transition-colors" type="button" onClick={handleZoomReset}>
                  <span className="material-symbols-outlined">restart_alt</span>
                </button>
              </div>
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-primary transition-colors" type="button">
                  <span className="material-symbols-outlined">edit_note</span>
                  ANOTAÇÕES
                </button>
                <button className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-primary transition-colors" type="button">
                  <span className="material-symbols-outlined">grid_view</span>
                  GRADE
                </button>
              </div>
            </div>

            <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 gap-10 overflow-y-auto custom-scrollbar p-6">
              {orderedMockups.length ? (
                orderedMockups.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-mockup-id={item.id}
                      onClick={() => toggleSelect(item.id)}
                      className={`flex items-center justify-center min-h-[560px] text-left transition-all ${
                        isSelected ? 'ring-2 ring-primary/70 ring-offset-8 ring-offset-slate-200' : ''
                      }`}
                    >
                      <div data-export-root className="origin-center" style={{ transform: `scale(${zoomLevel})` }}>
                        {renderMockup(item)}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="col-span-3 text-sm text-slate-400">Nenhum formato selecionado ainda.</div>
              )}
            </div>
          </div>

          <div className="h-20 bg-white/70 border-t border-slate-100 px-6 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex -space-x-2">
                <div className="size-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                  <div className="w-full h-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                </div>
                <div className="size-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                  <div className="w-full h-full bg-slate-900/10 flex items-center justify-center text-[10px] font-bold text-slate-700">CP</div>
                </div>
                <div className="size-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                  <div className="w-full h-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-600">BR</div>
                </div>
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-900 uppercase tracking-wider">Ativos Aplicados</p>
                <p className="text-slate-500">{platformsCount} plataformas • {mockups.length} formatos selecionados</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-slate-500">{selectedCount ? `${selectedCount} selecionado(s)` : 'Nenhum selecionado'}</span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1.5 border border-slate-200 rounded-full text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all"
              >
                Selecionar todos
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-3 py-1.5 border border-slate-200 rounded-full text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={handleSaveSelected}
                disabled={!selectedCount || syncing}
                className="px-3 py-1.5 border border-slate-200 rounded-full text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={!selectedCount || syncing}
                className="px-3 py-1.5 border border-slate-200 rounded-full text-rose-500 hover:text-rose-600 hover:border-rose-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Excluir
              </button>
              <button
                type="button"
                onClick={handleExportSelected}
                disabled={!mockups.length || syncing}
                className="px-4 py-1.5 bg-primary text-white rounded-full hover:bg-orange-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Exportar ZIP
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-between items-center">
          <Link href="/studio/editor" className="flex items-center gap-2 px-5 py-2.5 text-slate-400 hover:text-slate-900 font-bold text-sm transition-all">
            <span className="material-symbols-outlined">arrow_back</span>
            Voltar ao Passo 3
          </Link>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleSaveDraftAll}
              disabled={syncing || !mockups.length}
              className="px-5 py-2.5 border border-slate-900 text-slate-900 text-sm font-bold rounded hover:bg-slate-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Salvar como Rascunho
            </button>
            <Link
              href="/studio/export"
              onClick={updateStageDone}
              className="px-8 py-2.5 bg-primary text-white text-sm font-bold rounded hover:bg-orange-600 transition-all flex items-center gap-2 shadow-md"
            >
              Continuar
              <span className="material-symbols-outlined !text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>
        <div className="mt-6 text-xs text-slate-500">
          {syncing ? 'Sincronizando mockups...' : `${generatedCount} de ${mockups.length} mockups gerados`}
        </div>
      </div>
    </AppShell>
  );
}
