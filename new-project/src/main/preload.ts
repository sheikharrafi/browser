// Preload স্ক্রিপ্ট — contextIsolation সক্রিয় অবস্থায় রেন্ডারার ও মূল প্রসেসের
// মধ্যে নিরাপদ সেতু (bridge)। রেন্ডারারে কোনো Node/Electron API সরাসরি উন্মুক্ত হয় না;
// কেবল নিচের সুনির্দিষ্ট, টাইপ-নিরাপদ পদ্ধতিগুলো `window.browser`-এ পাওয়া যায়।

import { contextBridge, ipcRenderer } from 'electron';
import type { AppSnapshot, BrowserApi } from '../shared/ipc';
import { IpcChannels } from '../shared/ipc';

const api: BrowserApi = {
  getState: () => ipcRenderer.invoke(IpcChannels.getState),

  onUpdate: (callback: (snapshot: AppSnapshot) => void) => {
    const listener = (_event: unknown, snapshot: AppSnapshot): void =>
      callback(snapshot);
    ipcRenderer.on(IpcChannels.update, listener);
    // আনসাবস্ক্রাইব ফাংশন ফেরত দিই (রেন্ডারার আনমাউন্টে cleanup-এর জন্য)।
    return () => ipcRenderer.removeListener(IpcChannels.update, listener);
  },

  newTab: (url?: string) => ipcRenderer.invoke(IpcChannels.tabNew, url),
  closeTab: (tabId: string) => ipcRenderer.invoke(IpcChannels.tabClose, tabId),
  activateTab: (tabId: string) =>
    ipcRenderer.invoke(IpcChannels.tabActivate, tabId),

  navigate: (text: string) => ipcRenderer.invoke(IpcChannels.navNavigate, text),
  goBack: () => ipcRenderer.invoke(IpcChannels.navBack),
  goForward: () => ipcRenderer.invoke(IpcChannels.navForward),
  reload: () => ipcRenderer.invoke(IpcChannels.navReload),

  listBookmarks: () => ipcRenderer.invoke(IpcChannels.bookmarksList),
  addBookmark: () => ipcRenderer.invoke(IpcChannels.bookmarksAdd),
  removeBookmark: (bookmarkId: string) =>
    ipcRenderer.invoke(IpcChannels.bookmarksRemove, bookmarkId),
  openBookmark: (bookmarkId: string) =>
    ipcRenderer.invoke(IpcChannels.bookmarksOpen, bookmarkId),

  listHistory: () => ipcRenderer.invoke(IpcChannels.historyList),
  searchHistory: (query: string) =>
    ipcRenderer.invoke(IpcChannels.historySearch, query),
  deleteHistory: (ids: ReadonlyArray<string>) =>
    ipcRenderer.invoke(IpcChannels.historyDelete, ids),

  listDownloads: () => ipcRenderer.invoke(IpcChannels.downloadsList),
};

contextBridge.exposeInMainWorld('browser', api);
