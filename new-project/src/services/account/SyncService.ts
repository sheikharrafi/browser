// উপাদান ১৪খ: Sync_Service — সাইন-ইন থাকাকালীন ব্রাউজার ডেটা সিঙ্ক, পুনরুদ্ধার ও দ্বন্দ্ব-মার্জ পরিচালনা করে।
// প্রয়োজনীয়তা: ১৪.৩, ১৪.৪, ১৪.৫, ১৪.৭। (ইন্টারফেস স্বাক্ষর; বাস্তবায়ন Task 17.1-এ।)

import type { Account, Result, SyncState } from '../../types';

export interface SyncService {
  /** সাইন-ইন থাকাকালীন স্থানীয় SyncItem অ্যাকাউন্টে আপলোড করে (Req 14.3, 14.7)। */
  syncUp(state: SyncState): Promise<Result>;

  /** নতুন ডিভাইস/ফ্রেশ ইনস্টলে অ্যাকাউন্টের সিঙ্ককৃত ডেটা পুনরুদ্ধার করে (Req 14.4)। */
  restore(account: Account): Promise<SyncState>;

  /** প্রতিটি SyncItem-এর সর্বশেষ updated_at অনুসারে মার্জ করে; অ-দ্বন্দ্বপূর্ণ পরিবর্তন ধরে রাখে (Req 14.5)। */
  merge(local: SyncState, remote: SyncState): SyncState;
}
