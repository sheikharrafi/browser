// কোর ডেটা মডেলের জন্য মৌলিক যাচাইকরণ (validation) ফাংশন।
//
// প্রতিটি মডেলের জন্য একটি `isValid<Model>` ভবিষ্যদ্বক্তা (predicate) প্রদান করা হয়
// যা প্রয়োজনীয় ফিল্ডের উপস্থিতি ও মৌলিক সীমাবদ্ধতা (যেমন percent 0..100, offset
// অ-ঋণাত্মক) পরীক্ষা করে। এগুলো TypeScript টাইপ-গার্ড হিসেবেও ব্যবহারযোগ্য।
// সংশ্লিষ্ট: Task 1.2; Requirements 1.5, 5.5, 6.1, 9.3, 11.1, 13.1, 14.1, 15.2।

import {
  DownloadStatus,
  MediaKind,
  SegmentStatus,
  SyncItemKind,
  VpnStatus,
} from './primitives';
import type {
  Account,
  Bookmark,
  Credential,
  DownloadTask,
  Extension,
  Folder,
  HistoryRecord,
  MediaItem,
  NavigationEntry,
  NavigationStack,
  Progress,
  Resolution,
  Schedule,
  Segment,
  Session,
  SyncItem,
  SyncState,
  Tab,
  VpnConnection,
  VpnLocation,
} from './models';

// ----------------------------------------------------------------------------
// সহায়ক ভবিষ্যদ্বক্তা (helpers)
// ----------------------------------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

// খালি string-ও বৈধ হতে পারে এমন টেক্সট ফিল্ডের জন্য (যেমন title)।
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isInteger(value) && value >= 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isBytes(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array;
}

function isEnumValue<T extends Record<string, string>>(
  enumObj: T,
  value: unknown,
): boolean {
  return typeof value === 'string' && Object.values(enumObj).includes(value);
}

// ----------------------------------------------------------------------------
// ব্রাউজিং কোর মডেল
// ----------------------------------------------------------------------------

export function isValidTab(value: unknown): value is Tab {
  if (!isObject(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isString(value.title) &&
    isBoolean(value.isActive) &&
    (value.icon === undefined || isString(value.icon)) &&
    (value.url === undefined || isString(value.url))
  );
}

export function isValidNavigationEntry(
  value: unknown,
): value is NavigationEntry {
  if (!isObject(value)) return false;
  return isNonEmptyString(value.url) && isString(value.title);
}

export function isValidNavigationStack(
  value: unknown,
): value is NavigationStack {
  if (!isObject(value)) return false;
  if (!Array.isArray(value.entries)) return false;
  if (!value.entries.every(isValidNavigationEntry)) return false;
  if (!isInteger(value.currentIndex)) return false;
  // খালি হলে -1; নতুবা একটি বৈধ সূচক হতে হবে।
  if (value.entries.length === 0) return value.currentIndex === -1;
  return value.currentIndex >= 0 && value.currentIndex < value.entries.length;
}

export function isValidBookmark(value: unknown): value is Bookmark {
  if (!isObject(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isString(value.title) &&
    isNonEmptyString(value.url) &&
    (value.folderId === undefined || isNonEmptyString(value.folderId))
  );
}

export function isValidFolder(value: unknown): value is Folder {
  if (!isObject(value)) return false;
  return isNonEmptyString(value.id) && isString(value.name);
}

export function isValidHistoryRecord(value: unknown): value is HistoryRecord {
  if (!isObject(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isString(value.title) &&
    isNonEmptyString(value.url) &&
    isNonNegativeNumber(value.visitedAt)
  );
}

// ----------------------------------------------------------------------------
// ডাউনলোড কোর মডেল
// ----------------------------------------------------------------------------

export function isValidSegment(value: unknown): value is Segment {
  if (!isObject(value)) return false;
  if (!isNonNegativeInteger(value.index)) return false;
  if (!isNonNegativeInteger(value.startOffset)) return false;
  if (!isNonNegativeInteger(value.endOffset)) return false;
  if (!isNonNegativeInteger(value.bytesDownloaded)) return false;
  if (!isEnumValue(SegmentStatus, value.status)) return false;
  // endOffset কখনো startOffset-এর চেয়ে ছোট নয়; ডাউনলোডকৃত বাইট পরিসর অতিক্রম করে না।
  if (value.endOffset < value.startOffset) return false;
  const rangeSize = value.endOffset - value.startOffset + 1;
  return value.bytesDownloaded <= rangeSize;
}

export function isValidDownloadTask(value: unknown): value is DownloadTask {
  if (!isObject(value)) return false;
  if (!isNonEmptyString(value.id)) return false;
  if (!isNonEmptyString(value.url)) return false;
  if (!isNonEmptyString(value.destination)) return false;
  if (value.totalSize !== undefined && !isNonNegativeInteger(value.totalSize)) {
    return false;
  }
  if (!isNonNegativeInteger(value.bytesDownloaded)) return false;
  if (!isEnumValue(DownloadStatus, value.status)) return false;
  if (!Array.isArray(value.segments) || !value.segments.every(isValidSegment)) {
    return false;
  }
  // অন্তত একটি সমান্তরাল সংযোগ থাকতে হবে।
  if (!isInteger(value.maxConnections) || value.maxConnections < 1) return false;
  if (!isBoolean(value.supportsResume)) return false;
  // জানা থাকলে ডাউনলোডকৃত বাইট মোট আকারের বেশি হতে পারে না।
  if (
    typeof value.totalSize === 'number' &&
    value.bytesDownloaded > value.totalSize
  ) {
    return false;
  }
  return true;
}

export function isValidProgress(value: unknown): value is Progress {
  if (!isObject(value)) return false;
  if (!isFiniteNumber(value.percent)) return false;
  if (value.percent < 0 || value.percent > 100) return false;
  if (!isNonNegativeNumber(value.speedBytesPerSec)) return false;
  if (value.etaSeconds !== undefined && !isNonNegativeNumber(value.etaSeconds)) {
    return false;
  }
  return true;
}

export function isValidResolution(value: unknown): value is Resolution {
  if (!isObject(value)) return false;
  return (
    isString(value.label) &&
    isNonNegativeInteger(value.width) &&
    isNonNegativeInteger(value.height)
  );
}

export function isValidMediaItem(value: unknown): value is MediaItem {
  if (!isObject(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.sourceUrl) &&
    isEnumValue(MediaKind, value.kind) &&
    Array.isArray(value.resolutions) &&
    value.resolutions.every(isValidResolution)
  );
}

export function isValidSchedule(value: unknown): value is Schedule {
  if (!isObject(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.taskId) &&
    isNonNegativeNumber(value.startTime) &&
    isInteger(value.order)
  );
}

// ----------------------------------------------------------------------------
// প্রাইভেসি / নেটওয়ার্ক মডেল
// ----------------------------------------------------------------------------

export function isValidVpnLocation(value: unknown): value is VpnLocation {
  if (!isObject(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.country) &&
    (value.city === undefined || isString(value.city)) &&
    (value.latencyMs === undefined || isNonNegativeNumber(value.latencyMs))
  );
}

export function isValidVpnConnection(value: unknown): value is VpnConnection {
  if (!isObject(value)) return false;
  if (!isEnumValue(VpnStatus, value.status)) return false;
  if (!isBoolean(value.killSwitchEnabled)) return false;
  if (
    value.activeLocation !== undefined &&
    !isValidVpnLocation(value.activeLocation)
  ) {
    return false;
  }
  return true;
}

// ----------------------------------------------------------------------------
// এক্সটেনশন মডেল
// ----------------------------------------------------------------------------

export function isValidExtension(value: unknown): value is Extension {
  if (!isObject(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.version) &&
    isBoolean(value.enabled) &&
    Array.isArray(value.permissions) &&
    value.permissions.every(isString)
  );
}

// ----------------------------------------------------------------------------
// অ্যাকাউন্ট ও সিঙ্ক মডেল
// ----------------------------------------------------------------------------

export function isValidAccount(value: unknown): value is Account {
  if (!isObject(value)) return false;
  return isNonEmptyString(value.id) && isNonEmptyString(value.email);
}

export function isValidSession(value: unknown): value is Session {
  if (!isObject(value)) return false;
  return (
    isValidAccount(value.account) &&
    isNonEmptyString(value.token) &&
    isNonNegativeNumber(value.establishedAt) &&
    isBoolean(value.isAuthenticated)
  );
}

export function isValidSyncItem(value: unknown): value is SyncItem {
  if (!isObject(value)) return false;
  return (
    isNonEmptyString(value.key) &&
    isEnumValue(SyncItemKind, value.kind) &&
    isBytes(value.payload) &&
    isNonNegativeNumber(value.updatedAt)
  );
}

export function isValidSyncState(value: unknown): value is SyncState {
  if (!isObject(value)) return false;
  if (!(value.items instanceof Map)) return false;
  for (const [key, item] of value.items as Map<unknown, unknown>) {
    if (!isString(key)) return false;
    if (!isValidSyncItem(item)) return false;
    // map কী অবশ্যই আইটেমের কী-এর সাথে সঙ্গতিপূর্ণ হবে।
    if ((item as SyncItem).key !== key) return false;
  }
  if (
    value.lastSyncedAt !== undefined &&
    !isNonNegativeNumber(value.lastSyncedAt)
  ) {
    return false;
  }
  return true;
}

// ----------------------------------------------------------------------------
// পাসওয়ার্ড মডেল
// ----------------------------------------------------------------------------

export function isValidCredential(value: unknown): value is Credential {
  if (!isObject(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.site) &&
    isString(value.username) &&
    isBytes(value.encryptedPassword) &&
    isNonNegativeNumber(value.updatedAt)
  );
}
