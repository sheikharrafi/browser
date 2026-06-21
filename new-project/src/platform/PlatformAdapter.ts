// উপাদান ১০: Platform_Adapter — প্ল্যাটফর্ম-নির্দিষ্ট আচরণ আবৃত করে (ক্রস-প্ল্যাটফর্ম)।
// প্রয়োজনীয়তা: ১০.৩। (ইন্টারফেস স্বাক্ষর; বাস্তবায়ন Task 14.1-এ।)

import type { OsName, Path } from '../types';

export interface PlatformAdapter {
  /**
   * প্ল্যাটফর্মের মানসম্মত ডিফল্ট ডাউনলোড ডিরেক্টরি ফেরত দেয় (Req 10.3)।
   * Windows: %USERPROFILE%\Downloads | macOS: ~/Downloads
   * Linux: $XDG_DOWNLOAD_DIR অথবা ~/Downloads
   */
  defaultDownloadDir(): Path;

  /** প্ল্যাটফর্ম-উপযোগী ফাইল পাথ নর্মালাইজ করে। */
  normalizePath(path: Path): Path;

  /** বর্তমান অপারেটিং সিস্টেম ফেরত দেয়। */
  osName(): OsName;
}
