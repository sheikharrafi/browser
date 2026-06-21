// ডোমেইন ডেটা মডেল (STRUCT) ও সহায়ক (auxiliary) টাইপ।
//
// নোট: নিচের STRUCT মডেলগুলো (Tab, Bookmark, DownloadTask, ...) design.md-এর
// "ডেটা মডেল (Data Models)" বিভাগ অনুযায়ী সম্পূর্ণ ফিল্ড সংজ্ঞাসহ সংজ্ঞায়িত
// (**Task 1.2 — কোর ডেটা মডেল সংজ্ঞায়িত করা**)। সংশ্লিষ্ট মৌলিক যাচাইকরণ
// (validation) ফাংশন `./validation` মডিউলে রয়েছে।

import type {
  AccountId,
  BookmarkId,
  Bytes,
  CredentialId,
  DownloadStatus,
  ExtensionId,
  FolderId,
  IconRef,
  LoadState,
  LocationId,
  MediaId,
  MediaKind,
  Path,
  Permission,
  RecordId,
  ScheduleId,
  SegmentStatus,
  Site,
  SyncItemKind,
  TabId,
  TaskId,
  Timestamp,
  Url,
  VpnStatus,
} from './primitives';

// ----------------------------------------------------------------------------
// STRUCT মডেল (design.md "ডেটা মডেল" অনুযায়ী সম্পূর্ণ সংজ্ঞা)
// ----------------------------------------------------------------------------

// একটি ব্রাউজার ট্যাব।
export interface Tab {
  readonly id: TabId;
  readonly title: string;
  readonly icon?: IconRef;
  readonly url?: Url;
  readonly isActive: boolean;
}

// নেভিগেশন স্ট্যাকের একটি এন্ট্রি।
export interface NavigationEntry {
  readonly url: Url;
  readonly title: string;
}

// প্রতি-ট্যাব নেভিগেশন ইতিহাস স্ট্যাক।
export interface NavigationStack {
  readonly entries: ReadonlyArray<NavigationEntry>;
  readonly currentIndex: number; // -1 যখন খালি
}

// একটি সংরক্ষিত বুকমার্ক।
export interface Bookmark {
  readonly id: BookmarkId;
  readonly title: string;
  readonly url: Url;
  readonly folderId?: FolderId;
}

// বুকমার্ক সংগঠনের জন্য ফোল্ডার।
export interface Folder {
  readonly id: FolderId;
  readonly name: string;
}

// একটি পরিদর্শন ইতিহাস রেকর্ড।
export interface HistoryRecord {
  readonly id: RecordId;
  readonly title: string;
  readonly url: Url;
  readonly visitedAt: Timestamp;
}

// একটি ডাউনলোড কার্য।
export interface DownloadTask {
  readonly id: TaskId;
  readonly url: Url;
  readonly destination: Path;
  readonly totalSize?: number; // bytes; অজানা হলে undefined
  readonly bytesDownloaded: number;
  readonly status: DownloadStatus;
  readonly segments: ReadonlyArray<Segment>;
  readonly maxConnections: number;
  readonly supportsResume: boolean;
}

// একটি ডাউনলোড সেগমেন্ট (সমান্তরাল ডাউনলোডের অংশ)।
export interface Segment {
  readonly index: number;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly bytesDownloaded: number;
  readonly status: SegmentStatus;
}

// ডাউনলোড অগ্রগতির পরিমাপ।
export interface Progress {
  readonly percent: number; // 0.0 .. 100.0
  readonly speedBytesPerSec: number;
  readonly etaSeconds?: number;
}

// সনাক্তকৃত একটি মিডিয়া আইটেম।
export interface MediaItem {
  readonly id: MediaId;
  readonly sourceUrl: Url;
  readonly kind: MediaKind;
  readonly resolutions: ReadonlyArray<Resolution>;
}

// একটি নির্ধারিত (scheduled) ডাউনলোড।
export interface Schedule {
  readonly id: ScheduleId;
  readonly taskId: TaskId;
  readonly startTime: Timestamp;
  readonly order: number;
}

// একটি উপলব্ধ VPN সার্ভার অবস্থান।
export interface VpnLocation {
  readonly id: LocationId;
  readonly country: string;
  readonly city?: string;
  readonly latencyMs?: number; // পরিমাপকৃত লেটেন্সি; দ্রুততম নির্বাচনে ব্যবহৃত
}

// সক্রিয় VPN সংযোগের অবস্থা।
export interface VpnConnection {
  readonly status: VpnStatus;
  readonly activeLocation?: VpnLocation;
  readonly killSwitchEnabled: boolean;
}

// একটি ইনস্টলকৃত এক্সটেনশন।
export interface Extension {
  readonly id: ExtensionId;
  readonly name: string;
  readonly version: string;
  readonly enabled: boolean;
  readonly permissions: ReadonlyArray<Permission>;
}

// একটি ব্যবহারকারী অ্যাকাউন্ট।
export interface Account {
  readonly id: AccountId;
  readonly email: string;
}

// একটি প্রমাণীকৃত সেশন।
export interface Session {
  readonly account: Account;
  readonly token: string;
  readonly establishedAt: Timestamp;
  readonly isAuthenticated: boolean;
}

// সিঙ্ক করা একটি ডেটা আইটেম।
export interface SyncItem {
  readonly key: string; // যেমন: "bookmark:<id>", "setting:<name>"
  readonly kind: SyncItemKind;
  readonly payload: Bytes;
  readonly updatedAt: Timestamp; // দ্বন্দ্ব-মার্জে সর্বশেষ সংস্করণ নির্বাচনে ব্যবহৃত
}

// সম্পূর্ণ সিঙ্ক অবস্থা (key -> SyncItem)।
export interface SyncState {
  readonly items: ReadonlyMap<string, SyncItem>;
  readonly lastSyncedAt?: Timestamp;
}

// একটি সংরক্ষিত পরিচয়পত্র (credential)।
export interface Credential {
  readonly id: CredentialId;
  readonly site: Site; // মিলযুক্ত সাইট সনাক্তকরণ (origin/domain)
  readonly username: string;
  readonly encryptedPassword: Bytes; // সর্বদা এনক্রিপ্টেড আকারে সংরক্ষিত
  readonly updatedAt: Timestamp;
}

// ----------------------------------------------------------------------------
// সহায়ক (auxiliary) টাইপ — ইন্টারফেস স্বাক্ষরে ব্যবহৃত (STRUCT তালিকার বাইরে)
// ----------------------------------------------------------------------------

// Address_Bar রাউটিং ফলাফল: বৈধ URL → NavigateTo; অবৈধ → SearchQuery।
export type NavigationTarget =
  | { readonly kind: 'NavigateTo'; readonly url: Url }
  | { readonly kind: 'SearchQuery'; readonly url: Url };

// পেজ লোডের ফলাফল ও লোডিং অবস্থা সূচক।
export interface LoadResult {
  readonly state: LoadState;
  readonly url?: Url;
  readonly error?: string;
}

// Download_Manager.list_downloads ফিল্টার।
export type StatusFilter = DownloadStatus | 'All';

// Download_Engine সেগমেন্ট অগ্রগতি স্ট্রিম ইভেন্ট।
export interface SegmentProgress {
  readonly segmentIndex: number;
  readonly bytesDownloaded: number;
  readonly status: SegmentStatus;
}

// একত্রীকরণের পর সম্পন্ন ফাইলের প্রতিনিধিত্ব (DOM `File`-এর সাথে নাম-সংঘর্ষ এড়াতে)।
export interface DownloadedFile {
  readonly path: Path;
  readonly sizeBytes: number;
}

// Media_Grabber-এর জন্য পেজ প্রসঙ্গ ও রেজোলিউশন/খণ্ড।
export interface PageContext {
  readonly url: Url;
}
export interface Resolution {
  readonly label: string;
  readonly width: number;
  readonly height: number;
}
export interface Fragment {
  readonly index: number;
  readonly url: Url;
}

// VPN_Manager সংযোগ ফলাফল।
export interface ConnectionResult {
  readonly status: VpnStatus;
  readonly location?: VpnLocation;
  readonly error?: string;
}

// VPN রাউটিং-এর জন্য নেটওয়ার্ক অনুরোধের বিমূর্ত প্রতিনিধিত্ব।
export interface NetworkRequest {
  readonly url: Url;
}

// Scheduler সমাপ্তি-পরবর্তী কার্যক্রম।
export type PostAction =
  | { readonly kind: 'None' }
  | { readonly kind: 'QuitApp' }
  | { readonly kind: 'Custom'; readonly name: string };

// Extension_Manager ইনস্টল উৎস।
export interface ExtensionSource {
  readonly location: Url | Path;
}

// Account_Manager সাইন-ইন পরিচয়পত্র।
export interface AuthCredentials {
  readonly email: string;
  readonly password: string;
}

// Password_Manager সংরক্ষণ প্রস্তাব ও অটোফিল ফলাফল।
export interface SaveOffer {
  readonly site: Site;
  readonly username: string;
}
export interface FilledCredential {
  readonly site: Site;
  readonly username: string;
  readonly password: string;
}
