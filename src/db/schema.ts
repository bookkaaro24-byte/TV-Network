// src/db/schema.ts
/**
 * Apex Digital TV Network & Playout Engine - Master Relational Schema
 * Powered by Drizzle ORM (PostgreSQL / Cloud SQL)
 * 
 * Supports:
 * 1. User Identity & RBAC (synced from Firebase Auth UID)
 * 2. 24/7 Digital TV Channels & Timeline Playout Anchors
 * 3. Media Asset Catalog (VOD & Universal Playout Ingest)
 * 4. Deep Media Metadata (Sports Stats, Match Events, Podcast Chapters)
 * 5. EPG 24-Hour Programme Schedules (UTC Wall-Clock Time Slots)
 * 6. Playout Audit Events & Hot-Switching History
 * 7. SCTE-35 DPI Cue Markers & Ad Inventory
 * 8. Broadcast Graphics, Breaking Alerts & News Ticker Feeds
 */

import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// 1. IDENTITY & ACCESS CONTROL
// ============================================================================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.uid, { onDelete: 'cascade' }).unique(),
  favoriteChannelIds: jsonb('favorite_channel_ids').$type<string[]>().default([]).notNull(),
  reminderProgramIds: jsonb('reminder_program_ids').$type<string[]>().default([]).notNull(),
  viewingPreferences: jsonb('viewing_preferences').$type<{
    defaultResolution?: string;
    autoPlay?: boolean;
    volume?: number;
    subtitles?: boolean;
  }>().default({}).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(), // 'viewer', 'subscriber', 'operator', 'engineer', 'admin'
  description: text('description'),
  permissions: jsonb('permissions').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userRoles = pgTable('user_roles', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// 2. CHANNELS & ON-AIR PLAYOUT CONFIGURATIONS
// ============================================================================

export const channels = pgTable('channels', {
  id: varchar('id', { length: 64 }).primaryKey(), // e.g. 'apex-101', 'apex-102', 'custom-ch-1'
  channelNumber: integer('channel_number').notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  callSign: varchar('call_sign', { length: 32 }).notNull(),
  groupTitle: varchar('group_title', { length: 64 }).default('Apex Digital TV').notNull(),
  logoUrl: text('logo_url'),
  resolution: varchar('resolution', { length: 32 }).default('1080p60 HDR').notNull(),
  defaultStreamUrl: text('default_stream_url').notNull(),
  isCustom: boolean('is_custom').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: text('created_by').references(() => users.uid, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const channelSettings = pgTable('channel_settings', {
  id: serial('id').primaryKey(),
  channelId: varchar('channel_id', { length: 64 }).notNull().references(() => channels.id, { onDelete: 'cascade' }).unique(),
  currentAssignedTitle: text('current_assigned_title'),
  currentStreamUrl: text('current_stream_url'),
  assignedProgramId: text('assigned_program_id'),
  epochStartTime: timestamp('epoch_start_time', { withTimezone: true }),
  durationSeconds: integer('duration_seconds').default(1800).notNull(),
  isLiveFeed: boolean('is_live_feed').default(false).notNull(),
  playoutRevision: integer('playout_revision').default(1).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// 3. MEDIA ASSETS & VOD INGEST CATALOG
// ============================================================================

export const mediaAssets = pgTable('media_assets', {
  id: text('id').primaryKey(), // UUID or string identifier e.g. 'prog-1704...'
  userId: text('user_id').references(() => users.uid, { onDelete: 'set null' }),
  title: text('title').notNull(),
  category: varchar('category', { length: 64 }).notNull(),
  contentType: varchar('content_type', { length: 32 }).notNull(), // 'podcast', 'sports', 'business', 'tech'
  storageProvider: varchar('storage_provider', { length: 32 }).default('local_disk').notNull(), // 'local_disk', 'gcs', 'drive', 'hls_remote'
  storagePath: text('storage_path'), // Server filesystem path or GCS object URI
  streamUrl: text('stream_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  durationMinutes: integer('duration_minutes').default(30).notNull(),
  durationSeconds: doublePrecision('duration_seconds').default(1800).notNull(),
  width: integer('width').default(1920),
  height: integer('height').default(1080),
  aspectRatio: varchar('aspect_ratio', { length: 16 }).default('16:9').notNull(),
  videoCodec: varchar('video_codec', { length: 32 }).default('h264'),
  audioCodec: varchar('audio_codec', { length: 32 }).default('aac'),
  fileSizeBytes: integer('file_size_bytes'),
  isVerified: boolean('is_verified').default(true).notNull(),
  driveFileId: text('drive_file_id'),
  driveMimeType: text('drive_mime_type'),
  source: varchar('source', { length: 32 }).default('upload'), // 'upload', 'drive', 'hls_url', 'youtube'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Backward-compatible alias for existing imports
export const mediaItems = mediaAssets;

export const mediaMetadata = pgTable('media_metadata', {
  id: serial('id').primaryKey(),
  mediaId: text('media_id').notNull().references(() => mediaAssets.id, { onDelete: 'cascade' }).unique(),
  description: text('description'),
  hostOrTeams: text('host_or_teams'),
  sportsData: jsonb('sports_data').$type<{
    teams?: { home: any; away: any };
    score?: { home: number; away: number };
    timeElapsed?: string;
    liveStatus?: string;
    league?: string;
    stats?: Record<string, any>;
  }>(),
  podcastNotes: jsonb('podcast_notes').$type<{
    executiveSummary?: string;
    keyTakeaways?: string[];
    timestamps?: Array<{ timestamp: string; topic: string; summary: string }>;
    downloadFileName?: string;
  }>(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// 4. EPG 24-HOUR PROGRAMME SCHEDULES
// ============================================================================

export const programmeSchedules = pgTable('programme_schedules', {
  id: text('id').primaryKey(),
  channelId: varchar('channel_id', { length: 64 }).notNull().references(() => channels.id, { onDelete: 'cascade' }),
  mediaId: text('media_id').references(() => mediaAssets.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  category: varchar('category', { length: 64 }).default('General').notNull(),
  contentType: varchar('content_type', { length: 32 }).default('podcast').notNull(),
  streamUrl: text('stream_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  description: text('description'),
  hostOrTeams: text('host_or_teams'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').default(30).notNull(),
  isLive: boolean('is_live').default(false).notNull(),
  overrideStreamUrl: text('override_stream_url'), // Used during live break-in
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// 5. PLAYOUT AUDIT EVENTS & OPERATIONAL LOGS
// ============================================================================

export const playoutEvents = pgTable('playout_events', {
  id: serial('id').primaryKey(),
  channelId: varchar('channel_id', { length: 64 }).references(() => channels.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 64 }).notNull(), // 'PROGRAM_STARTED', 'HOT_SWITCH_INITIATED', 'AD_BREAK_START'
  message: text('message').notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// 6. ADVERTISING & SCTE-35 DIGITAL PROGRAM INSERTION (DPI)
// ============================================================================

export const adInventory = pgTable('ad_inventory', {
  id: varchar('id', { length: 64 }).primaryKey(),
  title: varchar('title', { length: 140 }).notNull(),
  advertiser: varchar('advertiser', { length: 140 }).notNull(),
  videoUrl: text('video_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  durationSeconds: integer('duration_seconds').default(15).notNull(),
  callToActionUrl: text('call_to_action_url'),
  callToActionText: varchar('call_to_action_text', { length: 64 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const scte35AdBreaks = pgTable('scte35_ad_breaks', {
  id: text('id').primaryKey(),
  channelId: varchar('channel_id', { length: 64 }).references(() => channels.id, { onDelete: 'cascade' }),
  eventId: integer('event_id').notNull(),
  commandType: varchar('command_type', { length: 32 }).default('splice_insert').notNull(),
  ptsTime: doublePrecision('pts_time').notNull(),
  durationSeconds: integer('duration_seconds').default(15).notNull(),
  isOutNetwork: boolean('is_out_network').default(true).notNull(),
  segmentationType: varchar('segmentation_type', { length: 64 }).default('0x34_provider_ad_start').notNull(),
  upid: varchar('upid', { length: 64 }),
  hexPayload: text('hex_payload'),
  adInventoryId: varchar('ad_inventory_id', { length: 64 }).references(() => adInventory.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 32 }).default('completed').notNull(),
  triggeredAt: timestamp('triggered_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// 7. BROADCAST GRAPHICS & TICKER FEEDS
// ============================================================================

export const broadcastGraphics = pgTable('broadcast_graphics', {
  id: text('id').primaryKey(),
  category: varchar('category', { length: 32 }).default('BREAKING').notNull(),
  headline: text('headline').notNull(),
  source: varchar('source', { length: 64 }).default('Station Newsroom').notNull(),
  change: varchar('change', { length: 32 }),
  isBreaking: boolean('is_breaking').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: text('created_by').references(() => users.uid, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.uid],
    references: [userProfiles.userId],
  }),
  mediaAssets: many(mediaAssets),
  createdChannels: many(channels),
}));

export const channelsRelations = relations(channels, ({ one, many }) => ({
  settings: one(channelSettings, {
    fields: [channels.id],
    references: [channelSettings.channelId],
  }),
  schedules: many(programmeSchedules),
  playoutEvents: many(playoutEvents),
  adBreaks: many(scte35AdBreaks),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one, many }) => ({
  user: one(users, {
    fields: [mediaAssets.userId],
    references: [users.uid],
  }),
  metadata: one(mediaMetadata, {
    fields: [mediaAssets.id],
    references: [mediaMetadata.mediaId],
  }),
  schedules: many(programmeSchedules),
}));

export const programmeSchedulesRelations = relations(programmeSchedules, ({ one }) => ({
  channel: one(channels, {
    fields: [programmeSchedules.channelId],
    references: [channels.id],
  }),
  media: one(mediaAssets, {
    fields: [programmeSchedules.mediaId],
    references: [mediaAssets.id],
  }),
}));
