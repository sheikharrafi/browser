// উপাদান ১৪ক: Account_Manager — অ্যাকাউন্ট সাইন-ইন/সাইন-আউট ও সেশন জীবনচক্র পরিচালনা করে।
// প্রয়োজনীয়তা: ১৪.১, ১৪.২, ১৪.৬। (ইন্টারফেস স্বাক্ষর; বাস্তবায়ন Task 17.1-এ।)

import type { AuthCredentials, Result, Session } from '../../types';

export interface AccountManager {
  /** সফল হলে প্রমাণীকৃত সেশন প্রতিষ্ঠা করে, ব্যর্থ হলে Error (Req 14.1, 14.6)। */
  signIn(credentials: AuthCredentials): Promise<Result<Session>>;

  /** সক্রিয় সেশন শেষ করে ও স্থানীয় সেশন ডেটা পরিষ্কার করে (Req 14.2)। */
  signOut(): Promise<Result>;

  /** বর্তমান সেশন ফেরত দেয় (সাইন-ইন না থাকলে undefined)। */
  currentSession(): Session | undefined;

  isSignedIn(): boolean;
}
