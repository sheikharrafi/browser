// উপাদান ৩: Navigation_Controller — পেজ লোডিং, পিছনে/সামনে নেভিগেশন ও রিলোড পরিচালনা করে।
// প্রতি ট্যাবে একটি নেভিগেশন স্ট্যাক বজায় রাখে।
// প্রয়োজনীয়তা: ২.৩–২.৭। (ইন্টারফেস স্বাক্ষর; বাস্তবায়ন Task 4.3-এ।)

import type { LoadResult, TabId, Url } from '../../types';

export interface NavigationController {
  /** প্রদত্ত URL লোড করে; নেভিগেশন স্ট্যাকে নতুন এন্ট্রি push করে। */
  navigate(tabId: TabId, url: Url): Promise<LoadResult>;

  /** ইতিহাস তালিকার পূর্ববর্তী পেজে যায় (Req 2.3)। */
  goBack(tabId: TabId): Promise<Url | undefined>;

  /** ইতিহাস তালিকার পরবর্তী পেজে যায় (Req 2.4)। */
  goForward(tabId: TabId): Promise<Url | undefined>;

  /** বর্তমান পেজ পুনরায় লোড করে (Req 2.5)। */
  reload(tabId: TabId): Promise<LoadResult>;

  canGoBack(tabId: TabId): boolean;
  canGoForward(tabId: TabId): boolean;
}


// অতিরিক্ত টাইপ ইম্পোর্ট (বাস্তবায়নের জন্য)।
import { LoadState } from '../../types';
import type { NavigationEntry, NavigationStack } from '../../types';

// ----------------------------------------------------------------------------
// বাস্তবায়ন (Task 4.3): InMemoryNavigationController
//
// একটি বিশুদ্ধ ইন-মেমরি ডোমেইন বাস্তবায়ন। প্রতি-ট্যাব নেভিগেশন স্ট্যাক বজায় রাখে
// এবং লোডিং অবস্থা সূচক (Idle → Loading → Loaded | Failed) নির্গত করে।
// প্রকৃত পেজ লোড (Electron webContents) এখানে ওয়্যার করা হয়নি — সেটি Task 19/21-এ;
// এখানে পেজ লোডের ফলাফল একটি injectable `PageLoader` দ্বারা মডেল করা হয়। (Req 2.3–2.7)
// ----------------------------------------------------------------------------

// একটি পেজ লোডের ফলাফল (সফল অথবা ত্রুটিসহ ব্যর্থ)।
export type LoadOutcome = { readonly ok: true } | { readonly ok: false; readonly error: string };

// একটি URL লোড করার বিমূর্ত (abstract) কৌশল; ডিফল্ট সর্বদা সফল হয়।
export type PageLoader = (url: Url) => Promise<LoadOutcome>;

// লোডিং অবস্থা পরিবর্তন পর্যবেক্ষক (UI লোডিং সূচকের জন্য — Req 2.6)।
export type LoadStateObserver = (
  tabId: TabId,
  state: LoadState,
  result?: LoadResult,
) => void;

interface MutableStack {
  entries: NavigationEntry[];
  currentIndex: number; // -1 যখন খালি
}

export class InMemoryNavigationController implements NavigationController {
  private readonly stacks = new Map<TabId, MutableStack>();
  private readonly states = new Map<TabId, LoadState>();
  private readonly lastResults = new Map<TabId, LoadResult>();
  private readonly loader: PageLoader;
  private readonly observer?: LoadStateObserver;

  constructor(options?: {
    loader?: PageLoader;
    onLoadStateChange?: LoadStateObserver;
  }) {
    this.loader = options?.loader ?? (async () => ({ ok: true }));
    this.observer = options?.onLoadStateChange;
  }

  async navigate(tabId: TabId, url: Url): Promise<LoadResult> {
    const stack = this.getOrCreateStack(tabId);
    // current_index-এর পরের সব এন্ট্রি ছেঁটে নতুন এন্ট্রি push করি।
    stack.entries = stack.entries.slice(0, stack.currentIndex + 1);
    stack.entries.push({ url, title: url });
    stack.currentIndex = stack.entries.length - 1;
    return this.load(tabId, url);
  }

  async goBack(tabId: TabId): Promise<Url | undefined> {
    if (!this.canGoBack(tabId)) return undefined;
    const stack = this.stacks.get(tabId)!;
    stack.currentIndex -= 1;
    const entry = stack.entries[stack.currentIndex];
    await this.load(tabId, entry.url);
    return entry.url;
  }

  async goForward(tabId: TabId): Promise<Url | undefined> {
    if (!this.canGoForward(tabId)) return undefined;
    const stack = this.stacks.get(tabId)!;
    stack.currentIndex += 1;
    const entry = stack.entries[stack.currentIndex];
    await this.load(tabId, entry.url);
    return entry.url;
  }

  async reload(tabId: TabId): Promise<LoadResult> {
    const stack = this.stacks.get(tabId);
    if (stack === undefined || stack.currentIndex < 0) {
      // কোনো বর্তমান পেজ নেই — নিষ্ক্রিয় অবস্থা।
      return { state: LoadState.Idle };
    }
    return this.load(tabId, stack.entries[stack.currentIndex].url);
  }

  canGoBack(tabId: TabId): boolean {
    const stack = this.stacks.get(tabId);
    return stack !== undefined && stack.currentIndex > 0;
  }

  canGoForward(tabId: TabId): boolean {
    const stack = this.stacks.get(tabId);
    return (
      stack !== undefined && stack.currentIndex < stack.entries.length - 1
    );
  }

  // --------------------------------------------------------------------------
  // অতিরিক্ত পরিদর্শন/নিয়ন্ত্রণ পদ্ধতি (ইন্টারফেসের বাইরে; ওয়্যারিং ও টেস্টে ব্যবহৃত)
  // --------------------------------------------------------------------------

  /** লোড ব্যর্থতায় বর্তমান পেজ পুনরায় লোড করার চেষ্টা করে (Req 2.7-এর retry বিকল্প)। */
  async retry(tabId: TabId): Promise<LoadResult> {
    return this.reload(tabId);
  }

  /** নির্দিষ্ট ট্যাবের বর্তমান লোডিং অবস্থা সূচক (Req 2.6)। */
  getLoadState(tabId: TabId): LoadState {
    return this.states.get(tabId) ?? LoadState.Idle;
  }

  /** সর্বশেষ লোড ফলাফল (ত্রুটি বার্তাসহ — Req 2.7)। */
  getLastResult(tabId: TabId): LoadResult | undefined {
    return this.lastResults.get(tabId);
  }

  /** বর্তমান এন্ট্রির URL (থাকলে)। */
  getCurrentUrl(tabId: TabId): Url | undefined {
    const stack = this.stacks.get(tabId);
    if (stack === undefined || stack.currentIndex < 0) return undefined;
    return stack.entries[stack.currentIndex].url;
  }

  /** নেভিগেশন স্ট্যাকের একটি অপরিবর্তনীয় (immutable) স্ন্যাপশট। */
  getNavigationStack(tabId: TabId): NavigationStack {
    const stack = this.stacks.get(tabId);
    if (stack === undefined) return { entries: [], currentIndex: -1 };
    return {
      entries: [...stack.entries],
      currentIndex: stack.currentIndex,
    };
  }

  // --------------------------------------------------------------------------
  // অভ্যন্তরীণ সহায়ক
  // --------------------------------------------------------------------------

  private getOrCreateStack(tabId: TabId): MutableStack {
    let stack = this.stacks.get(tabId);
    if (stack === undefined) {
      stack = { entries: [], currentIndex: -1 };
      this.stacks.set(tabId, stack);
    }
    return stack;
  }

  // একটি URL লোড করে: Loading → (Loaded | Failed) অবস্থা পরিবর্তন নির্গত করে।
  private async load(tabId: TabId, url: Url): Promise<LoadResult> {
    this.setState(tabId, LoadState.Loading);
    const outcome = await this.loader(url);
    const result: LoadResult = outcome.ok
      ? { state: LoadState.Loaded, url }
      : { state: LoadState.Failed, url, error: outcome.error };
    this.lastResults.set(tabId, result);
    this.setState(tabId, result.state, result);
    return result;
  }

  private setState(tabId: TabId, state: LoadState, result?: LoadResult): void {
    this.states.set(tabId, state);
    this.observer?.(tabId, state, result);
  }
}
