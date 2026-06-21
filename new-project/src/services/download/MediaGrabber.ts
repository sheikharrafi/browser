// উপাদান ৮: Media_Grabber — ওয়েব পেজে মিডিয়া স্ট্রিম সনাক্ত করে, রেজোলিউশন নির্বাচন দেয়
// এবং নির্বাচিত মিডিয়া Download_Manager-এ পাঠায়।
// প্রয়োজনীয়তা: ৯.১–৯.৪। (ইন্টারফেস স্বাক্ষর; বাস্তবায়ন Task 12.1-এ।)

import type {
  DownloadTask,
  DownloadedFile,
  Fragment,
  MediaItem,
  PageContext,
  Resolution,
} from '../../types';

export interface MediaGrabber {
  /** পেজে উপস্থিত সকল ডাউনলোডযোগ্য মিডিয়া আইটেম সনাক্ত করে (Req 9.1)। */
  detectMedia(page: PageContext): ReadonlyArray<MediaItem>;

  /** একটি মিডিয়া আইটেমের উপলব্ধ রেজোলিউশন তালিকা ফেরত দেয় (Req 9.3)। */
  listResolutions(media: MediaItem): ReadonlyArray<Resolution>;

  /** নির্বাচিত মিডিয়া/রেজোলিউশন একটি ডাউনলোড কার্যে রূপান্তর করে (Req 9.2, 9.3)। */
  requestDownload(media: MediaItem, resolution: Resolution): DownloadTask;

  /** খণ্ডিত (HLS/DASH) মিডিয়া খণ্ডগুলো একটি একক ফাইলে একত্রিত করে (Req 9.4)। */
  mergeFragments(fragments: ReadonlyArray<Fragment>): DownloadedFile;
}
