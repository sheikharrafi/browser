// উপাদান ১২: UI_Shell — Chrome-অভিন্ন (hubhu) উপস্থাপনা স্তর।
// বিশুদ্ধ উপস্থাপনা: কোনো ব্যবসায়িক যুক্তি ধারণ করে না, বরং পরিষেবা উপাদানে কল করে।
// প্রয়োজনীয়তা: ১২.১–১২.৫। (ইন্টারফেস স্বাক্ষর; বাস্তবায়ন Task 19.1/19.2-এ।)

import type { Result } from '../types';

// Chrome-অভিন্ন UI অঞ্চল (region) — ট্যাব বার, অমনিবক্স, টুলবার, মেনু ও কন্টেন্ট ভিউ।
export type UiRegion =
  | 'TabBar'
  | 'Omnibox'
  | 'Toolbar'
  | 'OverflowMenu'
  | 'ContentView';

export interface UiShell {
  /** Chrome-অভিন্ন UI শেল রুট DOM নোডে মাউন্ট করে (Req 12.1)। */
  mount(root: unknown): Result;

  /** শেল ও তার সকল অঞ্চল আনমাউন্ট করে। */
  unmount(): Result;

  /** একটি নির্দিষ্ট UI অঞ্চল পুনরায় রেন্ডার করে (অ-অবরোধী; Req 12.2, 12.3)। */
  render(region: UiRegion): void;
}
