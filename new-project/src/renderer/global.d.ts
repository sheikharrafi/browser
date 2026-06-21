// রেন্ডারার গ্লোবাল টাইপ — preload-এর contextBridge দ্বারা উন্মুক্ত `window.browser` API।
import type { BrowserApi } from '../shared/ipc';

declare global {
  interface Window {
    readonly browser: BrowserApi;
  }
}

export {};
