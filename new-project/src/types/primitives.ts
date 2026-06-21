// আদিম (primitive) ও শনাক্তকারী (ID) টাইপ এবং সাধারণ ফলাফল/গণনা (enum) টাইপ।
// এই টাইপগুলো ১৬টি কোর উপাদানের ইন্টারফেস স্বাক্ষরে ব্যবহৃত হয়।
// সম্পূর্ণ ডেটা মডেল (STRUCT) সংজ্ঞা Task 1.2-তে যুক্ত হবে।

export type Url = string;
export type Path = string;
export type Timestamp = number; // epoch milliseconds
export type Bytes = Uint8Array;

// টাইপ-নিরাপত্তার জন্য ব্র্যান্ডেড শনাক্তকারী টাইপ।
export type TabId = string & { readonly __brand: 'TabId' };
export type BookmarkId = string & { readonly __brand: 'BookmarkId' };
export type FolderId = string & { readonly __brand: 'FolderId' };
export type RecordId = string & { readonly __brand: 'RecordId' };
export type TaskId = string & { readonly __brand: 'TaskId' };
export type ScheduleId = string & { readonly __brand: 'ScheduleId' };
export type MediaId = string & { readonly __brand: 'MediaId' };
export type LocationId = string & { readonly __brand: 'LocationId' };
export type ExtensionId = string & { readonly __brand: 'ExtensionId' };
export type AccountId = string & { readonly __brand: 'AccountId' };
export type CredentialId = string & { readonly __brand: 'CredentialId' };

export type IconRef = string;
export type Site = string; // origin/domain
export type Permission = string; // এক্সটেনশন অনুমতির শনাক্তকারী (যেমন: "tabs", "storage")

// সাধারণ ফলাফল টাইপ — সফলতা বা ত্রুটি।
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}
export interface Err {
  readonly ok: false;
  readonly error: string;
}
export type Result<T = void> = Ok<T> | Err;

// গণনা (enum) টাইপ — ডিজাইন নথির অবস্থা মেশিন অনুযায়ী।
export enum OsName {
  Windows = 'Windows',
  macOS = 'macOS',
  Linux = 'Linux',
}

export enum LoadState {
  Idle = 'Idle',
  Loading = 'Loading',
  Loaded = 'Loaded',
  Failed = 'Failed',
}

export enum DownloadStatus {
  Queued = 'Queued',
  Active = 'Active',
  Paused = 'Paused',
  Completed = 'Completed',
  Failed = 'Failed',
}

export enum SegmentStatus {
  Pending = 'Pending',
  Active = 'Active',
  Done = 'Done',
  Failed = 'Failed',
}

export enum MediaKind {
  DirectFile = 'DirectFile',
  HLS = 'HLS',
  DASH = 'DASH',
}

export enum VpnStatus {
  Disconnected = 'Disconnected',
  Connecting = 'Connecting',
  Connected = 'Connected',
  Error = 'Error',
}

export enum SyncItemKind {
  Bookmark = 'Bookmark',
  History = 'History',
  OpenTab = 'OpenTab',
  Password = 'Password',
  Setting = 'Setting',
}
