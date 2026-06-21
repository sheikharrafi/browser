// উপাদান ১১: VPN_Manager — অবস্থান-নির্বাচনযোগ্য, দ্রুতগতির অন্তর্নির্মিত VPN।
// অবস্থান তালিকা, সংযোগ/বিচ্ছিন্নকরণ, ট্রাফিক রাউটিং, দ্রুততম অবস্থান ও kill-switch পরিচালনা করে।
// প্রয়োজনীয়তা: ১১.১–১১.৮। (ইন্টারফেস স্বাক্ষর; বাস্তবায়ন Task 15.1-এ।)

import type {
  ConnectionResult,
  NetworkRequest,
  Result,
  VpnLocation,
  VpnStatus,
} from '../../types';

export interface VpnManager {
  /** সকল উপলব্ধ VPN অবস্থানের তালিকা ফেরত দেয় (Req 11.1)। */
  listLocations(): ReadonlyArray<VpnLocation>;

  /** নির্বাচিত অবস্থানে এনক্রিপ্টেড টানেল স্থাপন করে (Req 11.2)। */
  connect(location: VpnLocation): Promise<ConnectionResult>;

  /** সক্রিয় টানেল বন্ধ করে; ট্রাফিক সরাসরি নেটওয়ার্কে ফেরে (Req 11.4)। */
  disconnect(): Promise<Result>;

  /** বর্তমান সংযোগ অবস্থা ফেরত দেয় (Req 11.7)। */
  currentStatus(): VpnStatus;

  /** সক্রিয় অবস্থান ফেরত দেয় (Req 11.7)। */
  activeLocation(): VpnLocation | undefined;

  /** সক্রিয় থাকলে টানেলের মধ্য দিয়ে, অন্যথায় সরাসরি অনুরোধ রাউট করে (Req 11.3)। */
  route(request: NetworkRequest): NetworkRequest;

  /** সর্বনিম্ন পরিমাপকৃত লেটেন্সির অবস্থান নির্বাচন করে (Req 11.5)। */
  fastestLocation(): VpnLocation;
}
