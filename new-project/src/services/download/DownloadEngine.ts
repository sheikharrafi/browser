// উপাদান ৭: Download_Engine — সেগমেন্টেড ও ত্বরান্বিত ডাউনলোড সম্পাদন করে।
// byte-range সমর্থন পরীক্ষা, সমান্তরাল সেগমেন্ট, ব্যর্থ সেগমেন্ট পুনঃচেষ্টা ও একত্রীকরণ।
// প্রয়োজনীয়তা: ৬.১–৬.৫, ৭.২। (ইন্টারফেস স্বাক্ষর; বাস্তবায়ন Task 9.1-এ।)

import type {
  DownloadTask,
  DownloadedFile,
  Result,
  Segment,
  SegmentProgress,
  Url,
} from '../../types';

export interface DownloadEngine {
  /** HEAD অনুরোধে Accept-Ranges পরীক্ষা করে byte-range সমর্থন যাচাই করে (Req 6.1, 6.2)। */
  supportsByteRange(url: Url): Promise<boolean>;

  /**
   * ডাউনলোড শুরু করে; byte-range সমর্থিত ও আকার জ্ঞাত হলে সমান্তরাল সেগমেন্টে বিভক্ত করে
   * (max_connections সীমা সম্মান করে), অন্যথায় একক সংযোগে (Req 6.1, 6.2, 6.4)।
   */
  start(task: DownloadTask, maxConnections: number): AsyncIterable<SegmentProgress>;

  /** সংরক্ষিত offset থেকে সেগমেন্ট পুনরায় শুরু করে (Req 7.2)। */
  resumeSegment(segment: Segment): Result;

  /** সম্পন্ন সেগমেন্টগুলো ক্রমানুসারে একক ফাইলে একত্রিত করে (Req 6.3)। */
  mergeSegments(segments: ReadonlyArray<Segment>): DownloadedFile;

  /** ব্যর্থ সেগমেন্ট পুনরায় ডাউনলোডের চেষ্টা করে (Req 6.5)। */
  retrySegment(segment: Segment): Result;
}
