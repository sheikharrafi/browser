// উপাদান ৯: Scheduler — নির্ধারিত সময়ে ডাউনলোড শুরু, নির্ধারিত ক্রম, সমাপ্তি-পরবর্তী কার্যক্রম
// ও সময়সূচি বাতিল পরিচালনা করে।
// প্রয়োজনীয়তা: ৮.১–৮.৪। (ইন্টারফেস স্বাক্ষর; বাস্তবায়ন Task 11.1-এ।)

import type { PostAction, Result, ScheduleId, TaskId, Timestamp } from '../../types';

export interface Scheduler {
  /** একটি ডাউনলোডের জন্য ভবিষ্যৎ শুরুর সময় ও ক্রম নির্ধারণ করে (Req 8.1, 8.2)। */
  schedule(taskId: TaskId, startTime: Timestamp, order: number): ScheduleId;

  /** নির্ধারিত সময়সূচি সরায় (Req 8.4)। */
  cancelSchedule(scheduleId: ScheduleId): Result;

  /** due সময়সূচিগুলো order অনুসারে আরোহী ক্রমে শুরু করে (Req 8.1, 8.2)। */
  onTick(now: Timestamp): void;

  /** সমাপ্তি-পরবর্তী কার্যক্রম নির্ধারণ করে, যেমন অ্যাপ বন্ধ (Req 8.3)। */
  setPostCompletionAction(action: PostAction): void;
}
