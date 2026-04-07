export const ROOM_SCOPES = [
  'global',
  'team',
  'studio',
  'client',
  'job',
  'briefing',
  'meeting',
  'direct',
] as const;

export type RoomScope = (typeof ROOM_SCOPES)[number];

export const ROOM_CONTEXT_TYPES = [
  'global',
  'team',
  'studio',
  'client',
  'job',
  'briefing',
  'meeting',
] as const;

export type RoomContextType = (typeof ROOM_CONTEXT_TYPES)[number];

export const ROOM_MEMBER_ROLES = ['owner', 'member', 'viewer'] as const;
export type RoomMemberRole = (typeof ROOM_MEMBER_ROLES)[number];

export const ROOM_NOTIFICATION_LEVELS = ['all', 'mentions', 'mute'] as const;
export type RoomNotificationLevel = (typeof ROOM_NOTIFICATION_LEVELS)[number];

export const ROOM_AUTHOR_KINDS = ['user', 'jarvis', 'system'] as const;
export type RoomAuthorKind = (typeof ROOM_AUTHOR_KINDS)[number];

export const ROOM_MESSAGE_TYPES = ['message', 'system', 'artifact', 'summary', 'decision', 'task', 'alert'] as const;
export type RoomMessageType = (typeof ROOM_MESSAGE_TYPES)[number];

export const ROOM_BRIDGE_SOURCES = ['manual', 'meeting', 'whatsapp', 'jarvis', 'system'] as const;
export type RoomBridgeSource = (typeof ROOM_BRIDGE_SOURCES)[number];

export const ROOM_ARTIFACT_TYPES = ['summary', 'decision', 'task', 'briefing', 'risk', 'meeting_note', 'whatsapp_digest'] as const;
export type RoomArtifactType = (typeof ROOM_ARTIFACT_TYPES)[number];

export const ROOM_SYSTEM_EVENT_TYPES = [
  'member.joined',
  'member.left',
  'room.context_linked',
  'meeting.linked',
  'briefing.created',
  'job.status_changed',
  'jarvis.summary_posted',
] as const;
export type RoomSystemEventType = (typeof ROOM_SYSTEM_EVENT_TYPES)[number];

export type RoomMetadata = {
  autoCreated?: boolean;
  source?: 'manual' | 'system';
  defaultRoomKey?: string | null;
  contextLabel?: string | null;
  tags?: string[];
  linkedMeetingId?: string | null;
  linkedBriefingId?: string | null;
};

export type RoomContextRef = {
  type: RoomContextType;
  id: string;
  label?: string | null;
  clientId?: string | null;
  edroClientId?: string | null;
};

export type RoomMessageMetadata = {
  mentions?: string[];
  bridgeSource?: RoomBridgeSource | null;
  artifactType?: RoomArtifactType | null;
  artifactId?: string | null;
  jarvisAction?: 'summarize' | 'extract_actions' | 'create_briefing' | 'create_risk' | null;
  systemEvent?: RoomSystemEventType | null;
  context?: RoomContextRef | null;
  [key: string]: unknown;
};

export type RoomArtifactCandidate = {
  type: RoomArtifactType;
  title: string;
  summary: string;
  confidence?: number | null;
  sourceMessageIds?: string[];
};

export type RoomSummary = {
  id: string;
  name: string;
  description?: string | null;
  scope: RoomScope;
  contextType?: RoomContextType | null;
  contextId?: string | null;
  clientId?: string | null;
  edroClientId?: string | null;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  unreadCount: number;
  isArchived: boolean;
  memberCount?: number;
  metadata?: RoomMetadata | null;
};

export type RoomMember = {
  roomId: string;
  userId: string;
  name?: string | null;
  email?: string | null;
  role: RoomMemberRole;
  notificationLevel: RoomNotificationLevel;
  pinnedAt?: string | null;
  lastReadMessageId?: string | null;
  lastReadAt?: string | null;
  lastSeenAt?: string | null;
};

export type RoomPresence = {
  roomId: string;
  userId: string;
  name?: string | null;
  status: 'online' | 'idle' | 'away';
  pathname?: string | null;
  pageContext?: Record<string, unknown> | null;
  updatedAt: string;
};

export type RoomMessage = {
  id: string;
  roomId: string;
  parentMessageId?: string | null;
  authorUserId?: string | null;
  authorName?: string | null;
  authorEmail?: string | null;
  authorKind: RoomAuthorKind;
  messageType: RoomMessageType;
  body: string;
  bodyFormat: 'plain' | 'markdown';
  metadata?: RoomMessageMetadata | null;
  clientId?: string | null;
  edroClientId?: string | null;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
};

export type CreateRoomInput = {
  name: string;
  description?: string | null;
  scope: RoomScope;
  contextType?: RoomContextType | null;
  contextId?: string | null;
  clientId?: string | null;
  edroClientId?: string | null;
  memberUserIds?: string[];
};

export type EnsureContextRoomInput = {
  scope: Extract<RoomScope, 'client' | 'job' | 'briefing' | 'meeting' | 'team' | 'studio'>;
  contextType: RoomContextType;
  contextId: string;
  name?: string | null;
  description?: string | null;
  clientId?: string | null;
  edroClientId?: string | null;
};

export type PostRoomMessageInput = {
  body: string;
  parentMessageId?: string | null;
  metadata?: RoomMessageMetadata | null;
};

export type UpdateRoomReadInput = {
  lastReadMessageId?: string | null;
};

export type UpdateRoomPresenceInput = {
  status: 'online' | 'idle' | 'away';
  pathname?: string | null;
  pageContext?: Record<string, unknown> | null;
};

export type SummarizeRoomInput = {
  messageLimit?: number;
  style?: 'brief' | 'detailed';
};

export type SummarizeRoomResponse = {
  summaryMessage: RoomMessage;
};

export type ExtractRoomArtifactsInput = {
  messageLimit?: number;
  artifactTypes?: RoomArtifactType[];
};

export type ExtractRoomArtifactsResponse = {
  artifacts: RoomArtifactCandidate[];
};

export type ListRoomsResponse = {
  rooms: RoomSummary[];
};

export type GetRoomResponse = {
  room: RoomSummary;
  members: RoomMember[];
  presence: RoomPresence[];
};

export type ListRoomMessagesResponse = {
  messages: RoomMessage[];
  nextCursor?: string | null;
};

export type RoomStreamEvent =
  | { type: 'snapshot'; room: RoomSummary; members: RoomMember[]; presence: RoomPresence[]; messages: RoomMessage[] }
  | { type: 'message.created'; message: RoomMessage }
  | { type: 'message.updated'; message: RoomMessage }
  | { type: 'message.deleted'; messageId: string; roomId: string }
  | { type: 'presence.updated'; presence: RoomPresence }
  | { type: 'read.updated'; roomId: string; userId: string; lastReadMessageId?: string | null; lastReadAt?: string | null }
  | { type: 'room.updated'; room: RoomSummary }
  | { type: 'keepalive'; ts: string };
