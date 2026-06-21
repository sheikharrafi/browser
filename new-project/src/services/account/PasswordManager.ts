// উপাদান ১৫: Password_Manager — ক্রেডেনশিয়াল সংরক্ষণ (এনক্রিপ্টেড), অটোফিল, তালিকা ব্যবস্থাপনা ও সিঙ্ক পরিচালনা করে।
// প্রয়োজনীয়তা: ১৫.১–১৫.৭। (ইন্টারফেস স্বাক্ষর; বাস্তবায়ন Task 18.1-এ।)

import type {
  Credential,
  CredentialId,
  FilledCredential,
  Result,
  SaveOffer,
  Site,
} from '../../types';

export interface PasswordManager {
  /** সংরক্ষিত না থাকলে ক্রেডেনশিয়াল সংরক্ষণের প্রস্তাব ফেরত দেয় (Req 15.1)। */
  onLoginSubmit(site: Site, username: string, password: string): SaveOffer | undefined;

  /** ব্যবহারকারীর নিশ্চিতকরণে password এনক্রিপ্ট করে Credential সংরক্ষণ করে (Req 15.2)। */
  saveCredential(site: Site, username: string, password: string): Result<Credential>;

  /** মিলযুক্ত সাইটে decrypt করে অটোফিল করে; decrypt ব্যর্থ হলে এড়িয়ে যায় (Req 15.3, 15.7)। */
  autofill(site: Site): FilledCredential | undefined;

  /** সংরক্ষিত ক্রেডেনশিয়ালের তালিকা ফেরত দেয় (Req 15.4)। */
  listCredentials(): ReadonlyArray<Credential>;

  /** ক্রেডেনশিয়াল সম্পাদনা করে ও updated_at হালনাগাদ করে (Req 15.4)। */
  editCredential(id: CredentialId, username?: string, password?: string): Result;

  /** ক্রেডেনশিয়াল স্থায়ীভাবে সরায় (Req 15.5)। */
  removeCredential(id: CredentialId): Result;

  isStored(site: Site, username: string): boolean;
}
