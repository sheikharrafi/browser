// উপাদান ১: Tab_Manager — ব্রাউজার ট্যাবের জীবনচক্র (তৈরি, বন্ধ, সক্রিয়করণ) পরিচালনা করে।
// প্রয়োজনীয়তা: ১.১–১.৫। (এই ধাপে কেবল ইন্টারফেস স্বাক্ষর — বাস্তবায়ন Task 2.1-এ।)

import type { Result, TabId, Url } from '../../types';
import type { Tab } from '../../types';

export interface TabManager {
  /** নতুন ট্যাব তৈরি করে এবং সক্রিয় ট্যাব হিসেবে নির্ধারণ করে (Req 1.1)। */
  createTab(url?: Url): Tab;

  /** ট্যাব বন্ধ করে; সংলগ্ন ট্যাব সক্রিয় করে; সর্বশেষ বন্ধে খালি ট্যাব নিশ্চিত করে (Req 1.2, 1.4)। */
  closeTab(tabId: TabId): Result;

  /** নির্বাচিত ট্যাবকে সক্রিয় হিসেবে নির্ধারণ করে (Req 1.3)। */
  activateTab(tabId: TabId): Result;

  /** বর্তমান সক্রিয় ট্যাব ফেরত দেয়। */
  getActiveTab(): Tab;

  /** সকল ট্যাবের তালিকা (শিরোনাম ও আইকনসহ) ফেরত দেয় (Req 1.5)। */
  listTabs(): ReadonlyArray<Tab>;
}

// ----------------------------------------------------------------------------
// বাস্তবায়ন (Task 2.1): InMemoryTabManager
//
// একটি বিশুদ্ধ ইন-মেমরি ডোমেইন বাস্তবায়ন (Electron BrowserView ওয়্যারিং নয় —
// সেটি Task 19/21-এ)। ইনভেরিয়েন্ট: সর্বদা অন্তত একটি ট্যাব থাকে এবং ঠিক একটি
// ট্যাব সক্রিয় থাকে। ফলে getActiveTab() সর্বদা একটি বৈধ Tab ফেরত দেয়।
// ----------------------------------------------------------------------------

// খালি/নতুন ট্যাবের ডিফল্ট শিরোনাম (Req 1.4, 1.5)।
const DEFAULT_TAB_TITLE = 'নতুন ট্যাব';

// প্রতিটি ট্যাবের জন্য ডিফল্ট আইকন রেফারেন্স (Req 1.5) — প্রকৃত favicon লোডিং
// পরবর্তী UI/নেভিগেশন ওয়্যারিং ধাপে যুক্ত হবে।
const DEFAULT_TAB_ICON = 'default-favicon';

export class InMemoryTabManager implements TabManager {
  private tabs: Tab[] = [];
  private seq = 0;

  constructor() {
    // ইনভেরিয়েন্ট নিশ্চিত করতে শুরুতেই একটি খালি ট্যাব তৈরি করি।
    this.createTab();
  }

  private nextId(): TabId {
    this.seq += 1;
    return `tab-${this.seq}` as TabId;
  }

  createTab(url?: Url): Tab {
    const tab: Tab = {
      id: this.nextId(),
      title: url ?? DEFAULT_TAB_TITLE,
      icon: DEFAULT_TAB_ICON,
      url,
      isActive: true,
    };
    // আগের সক্রিয় ট্যাব(সমূহ) নিষ্ক্রিয় করি, তারপর নতুনটিকে যুক্ত ও সক্রিয় করি (Req 1.1)।
    this.tabs = this.tabs.map((t) =>
      t.isActive ? { ...t, isActive: false } : t,
    );
    this.tabs.push(tab);
    return tab;
  }

  closeTab(tabId: TabId): Result {
    const index = this.tabs.findIndex((t) => t.id === tabId);
    if (index === -1) {
      return { ok: false, error: `Tab not found: ${tabId}` };
    }

    const wasActive = this.tabs[index].isActive;
    this.tabs.splice(index, 1);

    if (this.tabs.length === 0) {
      // সর্বশেষ ট্যাব বন্ধ — একটি খালি নতুন ট্যাব নিশ্চিত করি (Req 1.4)।
      this.createTab();
      return { ok: true, value: undefined };
    }

    if (wasActive) {
      // সংলগ্ন ট্যাব সক্রিয় করি: একই সূচক (ডানদিকের ট্যাব), নতুবা শেষ ট্যাব (Req 1.2)।
      const adjacentIndex = Math.min(index, this.tabs.length - 1);
      this.setActiveByIndex(adjacentIndex);
    }
    return { ok: true, value: undefined };
  }

  activateTab(tabId: TabId): Result {
    const index = this.tabs.findIndex((t) => t.id === tabId);
    if (index === -1) {
      return { ok: false, error: `Tab not found: ${tabId}` };
    }
    this.setActiveByIndex(index);
    return { ok: true, value: undefined };
  }

  getActiveTab(): Tab {
    const active = this.tabs.find((t) => t.isActive);
    if (active === undefined) {
      // ইনভেরিয়েন্ট লঙ্ঘন — কখনো ঘটার কথা নয়।
      throw new Error('Invariant violated: কোনো সক্রিয় ট্যাব নেই।');
    }
    return active;
  }

  listTabs(): ReadonlyArray<Tab> {
    return [...this.tabs];
  }

  // নির্দিষ্ট সূচকের ট্যাবকে সক্রিয় করে এবং বাকি সব নিষ্ক্রিয় করে (ঠিক একটি সক্রিয়)।
  private setActiveByIndex(idx: number): void {
    const targetId = this.tabs[idx].id;
    this.tabs = this.tabs.map((t) => ({
      ...t,
      isActive: t.id === targetId,
    }));
  }
}
