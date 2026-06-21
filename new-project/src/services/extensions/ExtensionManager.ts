// উপাদান ১৩: Extension_Manager — Chrome-সামঞ্জস্যপূর্ণ এক্সটেনশন ইনস্টল, তালিকা, সক্রিয়/নিষ্ক্রিয়করণ ও অপসারণ।
// প্রয়োজনীয়তা: ১৩.১–১৩.৬। (ইন্টারফেস স্বাক্ষর; বাস্তবায়ন Task 16.1-এ।)

import type {
  Extension,
  ExtensionId,
  ExtensionSource,
  PageContext,
  Result,
} from '../../types';

export interface ExtensionManager {
  /** Chrome-সামঞ্জস্যপূর্ণ উৎস থেকে এক্সটেনশন ইনস্টল করে; ব্যর্থে তালিকা অপরিবর্তিত (Req 13.1, 13.6)। */
  install(source: ExtensionSource): Promise<Result<Extension>>;

  /** সকল ইনস্টলকৃত এক্সটেনশন ফেরত দেয় (ব্যবস্থাপক ভিউ ও টুলবার আইকনের জন্য) (Req 13.2)। */
  listExtensions(): ReadonlyArray<Extension>;

  /** নির্দিষ্ট এক্সটেনশনের সক্রিয়তা অবস্থা নির্ধারণ করে (Req 13.3)। */
  setEnabled(extensionId: ExtensionId, enabled: boolean): Result;

  /** এক্সটেনশনটি তালিকা ও টুলবার থেকে সরায় (Req 13.4)। */
  remove(extensionId: ExtensionId): Result;

  isInstalled(extensionId: ExtensionId): boolean;

  /** সক্রিয় হলে অনুমতির পরিসরে পেজ বিষয়বস্তু/আচরণে কাজ করে (Req 13.5)। */
  applyToPage(extension: Extension, page: PageContext): Result;
}
