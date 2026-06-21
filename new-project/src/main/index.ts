// Electron মূল প্রসেস (main process) — কম্পোজিশন রুট ও বুটস্ট্র্যাপ।
//
// এই ফাইলটি প্রকৃত Electron অ্যাপ্লিকেশন চালু করে: একটি BrowserWindow তৈরি করে যা
// Chrome-অভিন্ন React UI শেল (renderer) লোড করে, এবং প্রতিটি ট্যাবের জন্য একটি
// BrowserView ব্যবহার করে প্রকৃত ওয়েব পেজ রেন্ডার করে। বিদ্যমান ইন-মেমরি ডোমেইন
// পরিষেবাগুলো (InMemoryTabManager, InMemoryAddressBar, InMemoryNavigationController,
// InMemoryBookmarkManager, InMemoryHistoryManager, InMemoryDownloadManager) IPC-এর
// মাধ্যমে UI-এর সাথে সংযুক্ত হয় — অর্থাৎ ডোমেইন স্তরই "মস্তিষ্ক", BrowserView কেবল
// উপস্থাপনা/রেন্ডার ইঞ্জিন। (Task 19.1 + 19.2; Req 2, 12)

import { join } from 'node:path';
import {
  app,
  BrowserView,
  BrowserWindow,
  ipcMain,
  session,
  shell,
  type DownloadItem,
} from 'electron';

import {
  InMemoryAddressBar,
  InMemoryBookmarkManager,
  InMemoryDownloadManager,
  InMemoryHistoryManager,
  InMemoryNavigationController,
  InMemoryTabManager,
} from '../services';
import { DownloadStatus } from '../types';
import type {
  BookmarkId,
  Path as DomainPath,
  RecordId,
  TabId,
  Url,
} from '../types';
import {
  IpcChannels,
  type AppSnapshot,
  type BookmarkState,
  type DownloadState,
  type HistoryState,
  type TabState,
} from '../shared/ipc';

// ----------------------------------------------------------------------------
// ধ্রুবক (constants)
// ----------------------------------------------------------------------------

// Chrome-অভিন্ন UI শেলের উচ্চতা (ট্যাব বার + টুলবার) — BrowserView এর নিচে বসে।
const CHROME_HEIGHT = 88;

// নতুন/খালি ট্যাবের ডিফল্ট হোম পেজ।
const HOME_URL = 'https://www.google.com';

// ----------------------------------------------------------------------------
// ডোমেইন পরিষেবা (composition root) — সকল ব্যবসায়িক যুক্তি এখানে কেন্দ্রীভূত।
// ----------------------------------------------------------------------------

const tabManager = new InMemoryTabManager();
const addressBar = new InMemoryAddressBar();
// নেভিগেশন কন্ট্রোলারের লোডার প্রকৃত BrowserView.webContents-এ পেজ লোড করে (Req 2.1)।
const navigation = new InMemoryNavigationController({
  loader: (url) => loadUrlIntoCurrentView(url),
});
const bookmarks = new InMemoryBookmarkManager();
const history = new InMemoryHistoryManager();

// ডাউনলোড ম্যানেজার: প্রকৃত Electron DownloadItem থেকে মেটাডেটা ফিড করা হয়
// (will-download হ্যান্ডলারে `nextDownloadMeta` সেট করে createDownload আহ্বান)।
let nextDownloadMeta: { totalSize?: number; supportsResume: boolean } = {
  totalSize: undefined,
  supportsResume: false,
};
const downloads = new InMemoryDownloadManager({
  downloader: { probe: () => nextDownloadMeta },
  notify: () => pushState(),
});

// ----------------------------------------------------------------------------
// রানটাইম অবস্থা (Electron-নির্দিষ্ট) — ডোমেইন ট্যাবের সাথে প্রকৃত BrowserView ম্যাপিং।
// ----------------------------------------------------------------------------

interface TabMeta {
  title: string;
  url: string;
  favicon?: string;
  loading: boolean;
}

let mainWindow: BrowserWindow | undefined;
const views = new Map<TabId, BrowserView>();
const tabMeta = new Map<TabId, TabMeta>();

// নেভিগেশন কন্ট্রোলারের লোডার কোন ট্যাবে লোড করবে — ক্রমিক (sequential) কলে নিরাপদ।
let currentNavTabId: TabId | undefined;
// লোডার (programmatic loadURL) চলাকালীন will-navigate ইন্টারসেপশন এড়াতে ফ্ল্যাগ।
let loadingViaController = false;

// প্রকৃত DownloadItem ট্র্যাকিং (id → item) — pause/resume/বাতিল ভবিষ্যতে।
const downloadItems = new Map<string, DownloadItem>();
// ডাউনলোডের প্রদর্শন-অবস্থা override (যেমন মোট আকার অজানা থাকলেও সম্পূর্ণতা)।
const downloadDisplay = new Map<
  string,
  { filename: string; status: string; received: number; total: number; speed: number; url: string }
>();

// ----------------------------------------------------------------------------
// BrowserView জীবনচক্র ও পেজ লোডিং
// ----------------------------------------------------------------------------

function activeTabId(): TabId {
  return tabManager.getActiveTab().id;
}

function activeView(): BrowserView | undefined {
  return views.get(activeTabId());
}

// সক্রিয় BrowserView-কে উইন্ডোর কন্টেন্ট এলাকায় (UI শেলের নিচে) স্থাপন করে।
function layoutActiveView(): void {
  const view = activeView();
  if (view === undefined || mainWindow === undefined) return;
  const [width, height] = mainWindow.getContentSize();
  view.setBounds({
    x: 0,
    y: CHROME_HEIGHT,
    width,
    height: Math.max(0, height - CHROME_HEIGHT),
  });
  view.setAutoResize({ width: true, height: true });
}

// একটি নির্দিষ্ট ট্যাবের জন্য BrowserView তৈরি ও তার webContents ইভেন্ট ওয়্যার করে।
function createViewForTab(tabId: TabId): BrowserView {
  const view = new BrowserView({
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  const wc = view.webContents;

  // ট্যাব মেটাডেটা — প্রকৃত পেজ থেকে শিরোনাম/আইকন/লোডিং অবস্থা (Req 1.5, 2.6, 12)।
  wc.on('page-title-updated', (_e, title) => {
    updateMeta(tabId, { title });
  });
  wc.on('page-favicon-updated', (_e, favicons) => {
    if (favicons.length > 0) updateMeta(tabId, { favicon: favicons[0] });
  });
  wc.on('did-start-loading', () => updateMeta(tabId, { loading: true }));
  wc.on('did-stop-loading', () => updateMeta(tabId, { loading: false }));
  wc.on('did-navigate', (_e, url) => updateMeta(tabId, { url }));
  wc.on('did-navigate-in-page', (_e, url, isMainFrame) => {
    if (isMainFrame) updateMeta(tabId, { url });
  });

  // পেজের ভেতরের লিংক-ক্লিক/নেভিগেশন ডোমেইন Navigation_Controller-এর মধ্য দিয়ে রাউট করি
  // যাতে নেভিগেশন স্ট্যাক (পিছনে/সামনে) ডোমেইন স্তরে কর্তৃত্বপূর্ণ থাকে (Req 2.3, 2.4)।
  wc.on('will-navigate', (event, url) => {
    if (loadingViaController) return; // আমাদের নিজস্ব loadURL — উপেক্ষা করি।
    event.preventDefault();
    void navigateInTab(tabId, url);
  });

  // নতুন উইন্ডো/পপআপ অনুরোধ — বর্তমান অ্যাপে নতুন ট্যাব হিসেবে খুলি।
  wc.setWindowOpenHandler(({ url }) => {
    void openInNewTab(url);
    return { action: 'deny' };
  });

  views.set(tabId, view);
  tabMeta.set(tabId, { title: 'নতুন ট্যাব', url: '', loading: false });
  return view;
}

// ডোমেইন ট্যাব তালিকার সাথে প্রকৃত BrowserView ম্যাপ মিলিয়ে নেয় (তৈরি/ধ্বংস + সক্রিয় দেখানো)।
function syncViews(): TabId[] {
  const tabs = tabManager.listTabs();
  const ids = new Set<TabId>(tabs.map((t) => t.id));

  // অপসারিত ট্যাবের view ধ্বংস করি।
  for (const [id, view] of [...views.entries()]) {
    if (!ids.has(id)) {
      try {
        // @ts-expect-error — webContents.destroy() রানটাইমে উপলব্ধ; টাইপে নেই।
        view.webContents.destroy?.();
      } catch {
        // উপেক্ষা — ইতিমধ্যে ধ্বংস হয়ে থাকতে পারে।
      }
      views.delete(id);
      tabMeta.delete(id);
    }
  }

  // নতুন ট্যাবের জন্য view তৈরি করি।
  const newlyCreated: TabId[] = [];
  for (const tab of tabs) {
    if (!views.has(tab.id)) {
      createViewForTab(tab.id);
      newlyCreated.push(tab.id);
    }
  }

  // সক্রিয় view দেখাই ও স্থাপন করি।
  const view = activeView();
  if (view !== undefined && mainWindow !== undefined) {
    mainWindow.setBrowserView(view);
    layoutActiveView();
  }
  return newlyCreated;
}

function updateMeta(tabId: TabId, patch: Partial<TabMeta>): void {
  const existing = tabMeta.get(tabId) ?? {
    title: 'নতুন ট্যাব',
    url: '',
    loading: false,
  };
  tabMeta.set(tabId, { ...existing, ...patch });
  pushState();
}

// Navigation_Controller-এর লোডার: currentNavTabId-এর view-তে প্রকৃত পেজ লোড করে।
function loadUrlIntoCurrentView(
  url: Url,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tabId = currentNavTabId;
  const view = tabId !== undefined ? views.get(tabId) : undefined;
  if (view === undefined) {
    return Promise.resolve({ ok: false, error: 'কোনো সক্রিয় ভিউ নেই।' });
  }
  const wc = view.webContents;
  return new Promise((resolve) => {
    const onFinish = (): void => {
      cleanup();
      resolve({ ok: true });
    };
    const onFail = (
      _e: unknown,
      _code: number,
      desc: string,
      _validatedUrl: string,
      isMainFrame: boolean,
    ): void => {
      if (!isMainFrame) return;
      cleanup();
      resolve({ ok: false, error: desc });
    };
    const cleanup = (): void => {
      wc.removeListener('did-finish-load', onFinish);
      wc.removeListener('did-fail-load', onFail);
    };
    wc.once('did-finish-load', onFinish);
    wc.once('did-fail-load', onFail);
    wc.loadURL(url).catch((err: unknown) => {
      cleanup();
      resolve({ ok: false, error: String(err) });
    });
  });
}

// একটি ট্যাবে একটি URL-এ নেভিগেট করি — ডোমেইন কন্ট্রোলারের মধ্য দিয়ে (স্ট্যাক + লোড),
// সফল হলে ইতিহাস রেকর্ড করি (Req 2.1, 4.1)।
async function navigateInTab(tabId: TabId, url: Url): Promise<void> {
  currentNavTabId = tabId;
  loadingViaController = true;
  try {
    const result = await navigation.navigate(tabId, url);
    if (result.state !== 'Failed') {
      const view = views.get(tabId);
      const title = view?.webContents.getTitle() ?? url;
      // ইনকগনিটো MVP-তে নেই — সাধারণ মোডে রেকর্ড করি (Req 4.1)।
      history.recordVisit(title, url, Date.now(), false);
    }
  } finally {
    loadingViaController = false;
    pushState();
  }
}

// নতুন ট্যাবে একটি URL খুলি (লিংক-পপআপ/নতুন-ট্যাব অনুরোধের জন্য)।
async function openInNewTab(url: string): Promise<void> {
  tabManager.createTab(url as Url);
  syncViews();
  await navigateInTab(activeTabId(), normalizeForOpen(url));
}

function normalizeForOpen(text: string): Url {
  const target = addressBar.submitInput(text);
  return target.url;
}

// ----------------------------------------------------------------------------
// স্ন্যাপশট নির্মাণ ও রেন্ডারারে push
// ----------------------------------------------------------------------------

function buildTabStates(): TabState[] {
  return tabManager.listTabs().map((t): TabState => {
    const meta = tabMeta.get(t.id);
    return {
      id: t.id,
      title: meta?.title ?? t.title,
      url: meta?.url ?? t.url ?? '',
      icon: meta?.favicon,
      isActive: t.isActive,
      loading: meta?.loading ?? false,
      canGoBack: navigation.canGoBack(t.id),
      canGoForward: navigation.canGoForward(t.id),
    };
  });
}

function buildDownloadStates(): DownloadState[] {
  // ডোমেইন DownloadManager-এর তালিকা ও প্রকৃত DownloadItem প্রদর্শন-অবস্থা সমন্বয় করি।
  return downloads.listDownloads('All').map((task): DownloadState => {
    const disp = downloadDisplay.get(task.id);
    const progress = downloads.getProgress(task.id);
    const total = task.totalSize ?? disp?.total ?? 0;
    const received = task.bytesDownloaded || disp?.received || 0;
    const percent =
      total > 0 ? Math.min(100, (100 * received) / total) : progress.percent;
    return {
      id: task.id,
      url: task.url,
      filename: disp?.filename ?? task.destination,
      status: disp?.status ?? task.status,
      percent,
      receivedBytes: received,
      totalBytes: total,
      speed: disp?.speed ?? progress.speedBytesPerSec,
    };
  });
}

function buildSnapshot(): AppSnapshot {
  const tabs = buildTabStates();
  const active = tabs.find((t) => t.isActive);
  return {
    tabs,
    activeTabId: active?.id,
    downloads: buildDownloadStates(),
  };
}

function pushState(): void {
  mainWindow?.webContents.send(IpcChannels.update, buildSnapshot());
}

// ----------------------------------------------------------------------------
// IPC হ্যান্ডলার — UI ক্রিয়া → ডোমেইন পরিষেবা (Task 19.2 ওয়্যারিং)
// ----------------------------------------------------------------------------

function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannels.getState, () => buildSnapshot());

  // ট্যাব → Tab_Manager (Req 1)
  ipcMain.handle(IpcChannels.tabNew, async (_e, url?: string) => {
    tabManager.createTab(url as Url | undefined);
    syncViews();
    await navigateInTab(activeTabId(), url ? normalizeForOpen(url) : HOME_URL);
  });

  ipcMain.handle(IpcChannels.tabClose, (_e, tabId: string) => {
    tabManager.closeTab(tabId as TabId);
    const created = syncViews();
    // closeTab সর্বশেষ ট্যাব বন্ধে নতুন খালি ট্যাব তৈরি করতে পারে — সেটিতে হোম লোড করি।
    for (const id of created) {
      currentNavTabId = id;
      void navigateInTab(id, HOME_URL);
    }
    pushState();
  });

  ipcMain.handle(IpcChannels.tabActivate, (_e, tabId: string) => {
    tabManager.activateTab(tabId as TabId);
    syncViews();
    pushState();
  });

  // নেভিগেশন → Address_Bar / Navigation_Controller (Req 2)
  ipcMain.handle(IpcChannels.navNavigate, async (_e, text: string) => {
    // অমনিবক্স রাউটিং: বৈধ URL → নেভিগেট; অন্যথায় অনুসন্ধান প্রশ্ন (Req 2.1, 2.2)।
    const target = addressBar.submitInput(text);
    await navigateInTab(activeTabId(), target.url);
  });

  ipcMain.handle(IpcChannels.navBack, async () => {
    const tabId = activeTabId();
    currentNavTabId = tabId;
    loadingViaController = true;
    try {
      await navigation.goBack(tabId);
    } finally {
      loadingViaController = false;
      pushState();
    }
  });

  ipcMain.handle(IpcChannels.navForward, async () => {
    const tabId = activeTabId();
    currentNavTabId = tabId;
    loadingViaController = true;
    try {
      await navigation.goForward(tabId);
    } finally {
      loadingViaController = false;
      pushState();
    }
  });

  ipcMain.handle(IpcChannels.navReload, async () => {
    const tabId = activeTabId();
    currentNavTabId = tabId;
    loadingViaController = true;
    try {
      await navigation.reload(tabId);
    } finally {
      loadingViaController = false;
      pushState();
    }
  });

  // বুকমার্ক → Bookmark_Manager (Req 3)
  ipcMain.handle(IpcChannels.bookmarksList, (): BookmarkState[] =>
    bookmarks.listBookmarks().map((b) => ({
      id: b.id,
      title: b.title,
      url: b.url,
    })),
  );

  ipcMain.handle(IpcChannels.bookmarksAdd, () => {
    const tabId = activeTabId();
    const meta = tabMeta.get(tabId);
    const url = (meta?.url ?? '') as Url;
    if (url.length === 0) return;
    bookmarks.addBookmark(meta?.title ?? url, url);
    pushState();
  });

  ipcMain.handle(IpcChannels.bookmarksRemove, (_e, bookmarkId: string) => {
    bookmarks.removeBookmark(bookmarkId as BookmarkId);
    pushState();
  });

  ipcMain.handle(IpcChannels.bookmarksOpen, async (_e, bookmarkId: string) => {
    const url = bookmarks.selectBookmark(bookmarkId as BookmarkId);
    if (url !== undefined) await navigateInTab(activeTabId(), url);
  });

  // ইতিহাস → History_Manager (Req 4)
  ipcMain.handle(IpcChannels.historyList, (): HistoryState[] =>
    history.listHistory().map(toHistoryState),
  );

  ipcMain.handle(IpcChannels.historySearch, (_e, query: string): HistoryState[] =>
    history.searchHistory(query).map(toHistoryState),
  );

  ipcMain.handle(IpcChannels.historyDelete, (_e, ids: string[]) => {
    history.deleteRecords(ids as RecordId[]);
    pushState();
  });

  // ডাউনলোড → Download_Manager (Req 5)
  ipcMain.handle(IpcChannels.downloadsList, () => buildDownloadStates());
}

function toHistoryState(r: {
  id: string;
  title: string;
  url: string;
  visitedAt: number;
}): HistoryState {
  return { id: r.id, title: r.title, url: r.url, visitedAt: r.visitedAt };
}

// ----------------------------------------------------------------------------
// প্রকৃত ডাউনলোড (Electron session 'will-download') → Download_Manager (Req 5)
// ----------------------------------------------------------------------------

function registerDownloadHandler(): void {
  session.defaultSession.on('will-download', (_event, item) => {
    const total = item.getTotalBytes();
    nextDownloadMeta = {
      totalSize: total > 0 ? total : undefined,
      supportsResume: false,
    };
    const savePath = item.getSavePath() || item.getFilename();
    const task = downloads.createDownload(
      item.getURL() as Url,
      savePath as DomainPath,
    );
    downloads.start(task.id); // Queued → Active।
    downloadItems.set(task.id, item);
    downloadDisplay.set(task.id, {
      filename: item.getFilename(),
      status: DownloadStatus.Active,
      received: 0,
      total: total > 0 ? total : 0,
      speed: 0,
      url: item.getURL(),
    });

    let lastBytes = 0;
    let lastTime = Date.now();

    item.on('updated', (_e, state) => {
      const received = item.getReceivedBytes();
      const now = Date.now();
      const dt = now - lastTime;
      const speed = dt > 0 ? ((received - lastBytes) / dt) * 1000 : 0;
      lastBytes = received;
      lastTime = now;
      // ডোমেইন ম্যানেজারে প্রকৃত বাইট রেকর্ড করি (Req 5.2)।
      downloads.recordBytes(task.id, received);
      const disp = downloadDisplay.get(task.id);
      if (disp !== undefined) {
        disp.received = received;
        disp.speed = Math.max(0, speed);
        disp.status =
          state === 'interrupted'
            ? DownloadStatus.Paused
            : DownloadStatus.Active;
      }
      pushState();
    });

    item.once('done', (_e, state) => {
      const disp = downloadDisplay.get(task.id);
      if (state === 'completed') {
        // মোট আকার জানা থাকলে recordBytes(total) ডোমেইন স্তরে Completed করে (Req 5.3)।
        if (nextDownloadMeta.totalSize !== undefined) {
          downloads.recordBytes(task.id, nextDownloadMeta.totalSize);
        }
        if (disp !== undefined) {
          disp.status = DownloadStatus.Completed;
          disp.received = item.getReceivedBytes();
        }
      } else {
        // বাতিল/বিঘ্নিত → ব্যর্থ চিহ্নিত করি ও retry বিকল্প রাখি (Req 5.4)।
        downloads.failWithNetworkError(task.id, state);
        if (disp !== undefined) disp.status = DownloadStatus.Failed;
      }
      downloadItems.delete(task.id);
      pushState();
    });

    pushState();
  });
}

// ----------------------------------------------------------------------------
// উইন্ডো তৈরি ও অ্যাপ জীবনচক্র
// ----------------------------------------------------------------------------

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'FeatureRichBrowser',
    backgroundColor: '#202124',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  // Chrome-অভিন্ন UI শেল (renderer) লোড করি।
  void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));

  mainWindow.on('resize', layoutActiveView);

  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });

  // বহিরাগত (target=_blank ইত্যাদি) UI-শেল লিংক ব্রাউজার-ট্যাবে নয়, ডিফল্ট ব্রাউজারে নয় —
  // UI শেল নিজে কোনো বহিরাগত নেভিগেশন করবে না; নিরাপত্তার জন্য আটকাই।
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  // প্রাথমিক ট্যাব (TabManager কনস্ট্রাক্টরে একটি ট্যাব ইতিমধ্যে আছে) — view তৈরি করে হোম লোড করি।
  syncViews();
  const initial = activeTabId();
  void navigateInTab(initial, HOME_URL);
}

app.whenReady().then(() => {
  registerIpcHandlers();
  registerDownloadHandler();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  // macOS-এ অ্যাপ সাধারণত খোলা থাকে; অন্য প্ল্যাটফর্মে বন্ধ করি।
  if (process.platform !== 'darwin') app.quit();
});
