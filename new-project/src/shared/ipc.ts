// শেয়ার্ড IPC চুক্তি (contract) — মূল প্রসেস (main), preload ও রেন্ডারার (renderer)
// একই ডেটা-ট্রান্সফার অবজেক্ট (DTO) ও চ্যানেল নাম ব্যবহার করে।
//
// নোট: এই টাইপগুলো ইচ্ছাকৃতভাবে সরল (plain, JSON-serializable) — কারণ Electron IPC
// সীমানা পেরিয়ে শুধুমাত্র structured-clone-যোগ্য মান পাঠানো যায় (ব্র্যান্ডেড ডোমেইন
// টাইপ বা ক্লাস ইনস্ট্যান্স নয়)।

// একটি ট্যাবের UI-দৃশ্যমান অবস্থা (TabManager + প্রকৃত webContents মেটাডেটার সমন্বয়)।
export interface TabState {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly icon?: string;
  readonly isActive: boolean;
  readonly loading: boolean;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
}

// একটি ডাউনলোডের UI-দৃশ্যমান অবস্থা (DownloadManager + Electron DownloadItem)।
export interface DownloadState {
  readonly id: string;
  readonly url: string;
  readonly filename: string;
  readonly status: string; // Queued | Active | Paused | Completed | Failed
  readonly percent: number; // 0..100
  readonly receivedBytes: number;
  readonly totalBytes: number;
  readonly speed: number; // bytes/sec
}

// একটি বুকমার্কের UI-দৃশ্যমান অবস্থা।
export interface BookmarkState {
  readonly id: string;
  readonly title: string;
  readonly url: string;
}

// একটি ইতিহাস রেকর্ডের UI-দৃশ্যমান অবস্থা।
export interface HistoryState {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly visitedAt: number;
}

// পুরো অ্যাপ্লিকেশন স্ন্যাপশট — মূল প্রসেস থেকে রেন্ডারারে push করা হয়।
export interface AppSnapshot {
  readonly tabs: ReadonlyArray<TabState>;
  readonly activeTabId?: string;
  readonly downloads: ReadonlyArray<DownloadState>;
}

// preload-এর মাধ্যমে রেন্ডারারে উন্মুক্ত নিরাপদ API (contextBridge)।
export interface BrowserApi {
  // অবস্থা (state)
  getState(): Promise<AppSnapshot>;
  onUpdate(callback: (snapshot: AppSnapshot) => void): () => void;

  // ট্যাব জীবনচক্র (→ Tab_Manager)
  newTab(url?: string): Promise<void>;
  closeTab(tabId: string): Promise<void>;
  activateTab(tabId: string): Promise<void>;

  // নেভিগেশন (→ Address_Bar / Navigation_Controller)
  navigate(text: string): Promise<void>;
  goBack(): Promise<void>;
  goForward(): Promise<void>;
  reload(): Promise<void>;

  // বুকমার্ক (→ Bookmark_Manager)
  listBookmarks(): Promise<ReadonlyArray<BookmarkState>>;
  addBookmark(): Promise<void>;
  removeBookmark(bookmarkId: string): Promise<void>;
  openBookmark(bookmarkId: string): Promise<void>;

  // ইতিহাস (→ History_Manager)
  listHistory(): Promise<ReadonlyArray<HistoryState>>;
  searchHistory(query: string): Promise<ReadonlyArray<HistoryState>>;
  deleteHistory(ids: ReadonlyArray<string>): Promise<void>;

  // ডাউনলোড (→ Download_Manager)
  listDownloads(): Promise<ReadonlyArray<DownloadState>>;
}

// IPC চ্যানেল নামসমূহ (একক উৎস — main ও preload উভয়ে ব্যবহৃত)।
export const IpcChannels = {
  getState: 'app:get-state',
  update: 'app:update',
  tabNew: 'tabs:create',
  tabClose: 'tabs:close',
  tabActivate: 'tabs:activate',
  navNavigate: 'nav:navigate',
  navBack: 'nav:back',
  navForward: 'nav:forward',
  navReload: 'nav:reload',
  bookmarksList: 'bookmarks:list',
  bookmarksAdd: 'bookmarks:add',
  bookmarksRemove: 'bookmarks:remove',
  bookmarksOpen: 'bookmarks:open',
  historyList: 'history:list',
  historySearch: 'history:search',
  historyDelete: 'history:delete',
  downloadsList: 'downloads:list',
} as const;
