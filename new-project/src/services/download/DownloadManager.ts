// উপাদান ৬: Download_Manager — ডাউনলোড কার্য তৈরি, অবস্থা পরিবর্তন, অগ্রগতি ও পজ/রিজিউম পরিচালনা করে।
// প্রকৃত বাইট স্থানান্তরের জন্য Download_Engine-কে নিয়োজিত করে।
// প্রয়োজনীয়তা: ৫.১–৫.৫, ৭.১–৭.৪। (ইন্টারফেস স্বাক্ষর; MVP বাস্তবায়ন Task 8.1; সেগমেন্টেড/পজ/রিজিউম Task 9/10-এ।)

import { DownloadStatus } from '../../types';
import type {
  DownloadTask,
  Path,
  Progress,
  Result,
  StatusFilter,
  TaskId,
  Url,
} from '../../types';

export interface DownloadManager {
  /** নতুন ডাউনলোড কার্য তৈরি করে (Req 5.1)। */
  createDownload(url: Url, destination: Path): DownloadTask;

  /** চলমান ডাউনলোড স্থগিত করে এবং অর্জিত অগ্রগতি সংরক্ষণ করে (Req 7.1)। */
  pause(taskId: TaskId): Result;

  /** সংরক্ষিত অবস্থান থেকে ডাউনলোড পুনরায় শুরু করতে Engine-কে বলে (Req 7.2)। */
  resume(taskId: TaskId): Result;

  /** ব্যর্থ ডাউনলোড পুনরায় চেষ্টা করে (Req 5.4)। */
  retry(taskId: TaskId): Result;

  /** অবস্থা-ফিল্টার অনুযায়ী ডাউনলোড তালিকা ফেরত দেয় (Req 5.5)। */
  listDownloads(filter: StatusFilter): ReadonlyArray<DownloadTask>;

  /** শতকরা হার, গতি ও আনুমানিক অবশিষ্ট সময় ফেরত দেয় (Req 5.2)। */
  getProgress(taskId: TaskId): Progress;

  /** অ্যাপ পুনঃসূচনার পর সংরক্ষিত অবস্থা থেকে অগ্রগতি পুনরুদ্ধার করে (Req 7.3)। */
  restoreOnStartup(): Result;
}

// ----------------------------------------------------------------------------
// বাস্তবায়ন (Task 8.1): InMemoryDownloadManager
//
// একটি বিশুদ্ধ ইন-মেমরি ডোমেইন বাস্তবায়ন। প্রকৃত নেটওয়ার্ক/Electron `net` এখানে
// ওয়্যার করা হয়নি — পরিবর্তে বাইট স্থানান্তর বিমূর্তভাবে (abstractly) মডেল করা হয়
// একটি injectable `Downloader`-এর মাধ্যমে যা ফাইল মেটাডেটা (মোট আকার, রিজিউম
// সমর্থন) সরবরাহ করে এবং স্থানান্তরিত বাইট নিয়ন্ত্রণ পদ্ধতির (control methods)
// মাধ্যমে ফিড করা হয়। সেগমেন্টেড/ত্বরান্বিত ডাউনলোড ও সম্পূর্ণ পজ/রিজিউম ইঞ্জিন
// Task 9/10-এ যুক্ত হবে — এই MVP একক-সংযোগ আচরণ মডেল করে।
//
// অবস্থা মেশিন (Req 5.1–5.5):
//   Queued -> Active -> Completed | Failed   (Active <-> Paused — মৌলিক MVP সমর্থন)
//   - নেটওয়ার্ক ত্রুটিতে Failed চিহ্নিত হয় ও retry বিকল্প উপলব্ধ থাকে (Req 5.4)।
//   - bytesDownloaded == totalSize হলে স্বয়ংক্রিয়ভাবে Completed হয় ও অবহিতকরণ
//     কলব্যাক আহূত হয় (Req 5.3)।
// ----------------------------------------------------------------------------

// নেটওয়ার্ক HEAD-এর বিমূর্ত প্রতিরূপ: একটি ডাউনলোডযোগ্য সম্পদের মেটাডেটা ফেরত দেয়।
export interface FileMetadata {
  /** মোট আকার (bytes); অজানা হলে undefined। */
  readonly totalSize?: number;
  /** সার্ভার রিজিউম (byte-range) সমর্থন করে কিনা। */
  readonly supportsResume: boolean;
}

// বাইট স্থানান্তরের বিমূর্ত উৎস (injectable)। প্রকৃত নেটওয়ার্ক স্তর Task 9-এ ওয়্যার হবে।
export interface Downloader {
  /** প্রদত্ত URL-এর জন্য ফাইল মেটাডেটা ফেরত দেয় (HEAD অনুরোধের বিমূর্তকরণ)। */
  probe(url: Url): FileMetadata;
}

// ডাউনলোড সম্পূর্ণ হলে আহূত অবহিতকরণ কলব্যাক (Req 5.3)।
export type DownloadNotifier = (task: DownloadTask) => void;

// ডিফল্ট Downloader: আকার অজানা ও রিজিউম অসমর্থিত ধরে নেয় (নিরাপদ MVP ডিফল্ট)।
const DEFAULT_DOWNLOADER: Downloader = {
  probe: (): FileMetadata => ({ totalSize: undefined, supportsResume: false }),
};

interface InternalTask {
  task: DownloadTask;
  // ব্যর্থ অবস্থায় retry বিকল্প উপলব্ধ কিনা (Req 5.4)।
  canRetry: boolean;
  // গতি/ETA হিসাবের জন্য সর্বশেষ হালনাগাদ সময় ও বাইট।
  lastUpdateMs: number;
  lastSpeedBytesPerSec: number;
}

export interface DownloadManagerOptions {
  readonly downloader?: Downloader;
  /** সম্পূর্ণ হলে অবহিতকরণ (Req 5.3)। */
  readonly notify?: DownloadNotifier;
  /** ইনজেক্টযোগ্য ঘড়ি (গতি/ETA-এর নির্ধারণমূলক টেস্টের জন্য)। */
  readonly now?: () => number;
}

export class InMemoryDownloadManager implements DownloadManager {
  private readonly tasks = new Map<TaskId, InternalTask>();
  private taskOrder: TaskId[] = [];
  private seq = 0;
  private readonly downloader: Downloader;
  private readonly notify?: DownloadNotifier;
  private readonly now: () => number;

  constructor(options?: DownloadManagerOptions) {
    this.downloader = options?.downloader ?? DEFAULT_DOWNLOADER;
    this.notify = options?.notify;
    this.now = options?.now ?? (() => Date.now());
  }

  private nextTaskId(): TaskId {
    this.seq += 1;
    return `dl-${this.seq}` as TaskId;
  }

  // --------------------------------------------------------------------------
  // DownloadManager ইন্টারফেস
  // --------------------------------------------------------------------------

  createDownload(url: Url, destination: Path): DownloadTask {
    // নেটওয়ার্ক মেটাডেটা বিমূর্তভাবে probe করি (মোট আকার ও রিজিউম সমর্থন)।
    const meta = this.downloader.probe(url);
    const task: DownloadTask = {
      id: this.nextTaskId(),
      url,
      destination,
      totalSize: meta.totalSize,
      bytesDownloaded: 0,
      status: DownloadStatus.Queued, // নতুন কার্য Queued অবস্থায় শুরু হয় (Req 5.1)।
      segments: [], // MVP একক-সংযোগ — সেগমেন্ট Task 9-এ।
      maxConnections: 1,
      supportsResume: meta.supportsResume,
    };
    this.tasks.set(task.id, {
      task,
      canRetry: false,
      lastUpdateMs: this.now(),
      lastSpeedBytesPerSec: 0,
    });
    this.taskOrder.push(task.id);
    return task;
  }

  pause(taskId: TaskId): Result {
    const internal = this.tasks.get(taskId);
    if (internal === undefined) {
      return { ok: false, error: `Download not found: ${taskId}` };
    }
    const { status } = internal.task;
    // কেবল চলমান (Active) ডাউনলোড পজ করা যায়; অর্জিত অগ্রগতি সংরক্ষিত থাকে (Req 7.1)।
    if (status !== DownloadStatus.Active) {
      return { ok: false, error: `Cannot pause download in status: ${status}` };
    }
    internal.task = { ...internal.task, status: DownloadStatus.Paused };
    return { ok: true, value: undefined };
  }

  resume(taskId: TaskId): Result {
    const internal = this.tasks.get(taskId);
    if (internal === undefined) {
      return { ok: false, error: `Download not found: ${taskId}` };
    }
    const { status } = internal.task;
    // স্থগিত (Paused) ডাউনলোড সংরক্ষিত অবস্থান থেকে পুনরায় শুরু হয় (Req 7.2)।
    if (status !== DownloadStatus.Paused) {
      return { ok: false, error: `Cannot resume download in status: ${status}` };
    }
    internal.task = { ...internal.task, status: DownloadStatus.Active };
    internal.lastUpdateMs = this.now();
    return { ok: true, value: undefined };
  }

  retry(taskId: TaskId): Result {
    const internal = this.tasks.get(taskId);
    if (internal === undefined) {
      return { ok: false, error: `Download not found: ${taskId}` };
    }
    // কেবল ব্যর্থ ডাউনলোড পুনরায় চেষ্টা করা যায় (Req 5.4)।
    if (internal.task.status !== DownloadStatus.Failed) {
      return {
        ok: false,
        error: `Cannot retry download in status: ${internal.task.status}`,
      };
    }
    // একক-সংযোগ MVP: পুনরায় চেষ্টা শুরু থেকে আরম্ভ করে (রিজিউম Task 10-এ)।
    internal.task = {
      ...internal.task,
      status: DownloadStatus.Active,
      bytesDownloaded: 0,
    };
    internal.canRetry = false;
    internal.lastUpdateMs = this.now();
    internal.lastSpeedBytesPerSec = 0;
    return { ok: true, value: undefined };
  }

  listDownloads(filter: StatusFilter): ReadonlyArray<DownloadTask> {
    const all = this.taskOrder.map((id) => this.tasks.get(id)!.task);
    if (filter === 'All') {
      return all;
    }
    return all.filter((t) => t.status === filter);
  }

  getProgress(taskId: TaskId): Progress {
    const internal = this.tasks.get(taskId);
    if (internal === undefined) {
      // অজানা কার্যের জন্য একটি নিরপেক্ষ (শূন্য) অগ্রগতি ফেরত দিই।
      return { percent: 0, speedBytesPerSec: 0, etaSeconds: undefined };
    }
    const { task } = internal;
    const percent = this.computePercent(task);
    const speed = internal.lastSpeedBytesPerSec;
    let etaSeconds: number | undefined;
    if (
      task.totalSize !== undefined &&
      speed > 0 &&
      task.bytesDownloaded < task.totalSize
    ) {
      etaSeconds = (task.totalSize - task.bytesDownloaded) / speed;
    }
    return { percent, speedBytesPerSec: speed, etaSeconds };
  }

  restoreOnStartup(): Result {
    // ইন-মেমরি MVP: কোনো স্থায়িত্ব নেই — পূর্ণ startup-পুনরুদ্ধার Task 10-এ।
    // সংরক্ষিত (in-memory) অবস্থা ইতিমধ্যে উপলব্ধ, তাই সফলতা ফেরত দিই।
    return { ok: true, value: undefined };
  }

  // --------------------------------------------------------------------------
  // নিয়ন্ত্রণ/পরিদর্শন পদ্ধতি (ইন্টারফেসের বাইরে; বাইট স্থানান্তর সিমুলেশন ও ওয়্যারিং)
  // --------------------------------------------------------------------------

  /**
   * Queued ডাউনলোড শুরু করে (Queued -> Active)। প্রকৃত ওয়্যারিং-এ এটি
   * Download_Engine-কে আহ্বান করবে; MVP-তে এটি কেবল অবস্থা পরিবর্তন করে।
   */
  start(taskId: TaskId): Result {
    const internal = this.tasks.get(taskId);
    if (internal === undefined) {
      return { ok: false, error: `Download not found: ${taskId}` };
    }
    if (internal.task.status !== DownloadStatus.Queued) {
      return {
        ok: false,
        error: `Cannot start download in status: ${internal.task.status}`,
      };
    }
    internal.task = { ...internal.task, status: DownloadStatus.Active };
    internal.lastUpdateMs = this.now();
    return { ok: true, value: undefined };
  }

  /**
   * স্থানান্তরিত বাইটের নতুন (পরম/absolute) মোট মান রেকর্ড করে — বাইট স্থানান্তরের
   * বিমূর্ত মডেল। মান [0, totalSize] পরিসরে clamp হয়। গতি ও ETA হালনাগাদ হয়।
   * bytesDownloaded == totalSize হলে স্বয়ংক্রিয়ভাবে Completed হয় ও অবহিতকরণ
   * কলব্যাক আহূত হয় (Req 5.2, 5.3)।
   */
  recordBytes(taskId: TaskId, bytesDownloaded: number): Result {
    const internal = this.tasks.get(taskId);
    if (internal === undefined) {
      return { ok: false, error: `Download not found: ${taskId}` };
    }
    const { task } = internal;
    if (task.status !== DownloadStatus.Active) {
      return {
        ok: false,
        error: `Cannot record bytes in status: ${task.status}`,
      };
    }
    if (!Number.isFinite(bytesDownloaded) || bytesDownloaded < 0) {
      return { ok: false, error: 'bytesDownloaded must be a non-negative number' };
    }
    // জানা থাকলে মোট আকারের মধ্যে clamp করি।
    const clamped =
      task.totalSize !== undefined
        ? Math.min(bytesDownloaded, task.totalSize)
        : bytesDownloaded;

    // গতি (bytes/sec) হালনাগাদ করি ঘড়ির ব-দ্বীপ (delta) ব্যবহার করে।
    const nowMs = this.now();
    const deltaMs = nowMs - internal.lastUpdateMs;
    const deltaBytes = clamped - task.bytesDownloaded;
    if (deltaMs > 0 && deltaBytes > 0) {
      internal.lastSpeedBytesPerSec = (deltaBytes / deltaMs) * 1000;
    }
    internal.lastUpdateMs = nowMs;

    let updated: DownloadTask = { ...task, bytesDownloaded: clamped };

    // সম্পূর্ণতা সনাক্তকরণ (bytes == total) — Req 5.3।
    if (task.totalSize !== undefined && clamped >= task.totalSize) {
      updated = { ...updated, status: DownloadStatus.Completed };
      internal.task = updated;
      this.notify?.(updated); // ব্যবহারকারীকে অবহিত করি।
      return { ok: true, value: undefined };
    }

    internal.task = updated;
    return { ok: true, value: undefined };
  }

  /**
   * নেটওয়ার্ক ত্রুটির কারণে ডাউনলোড ব্যর্থ চিহ্নিত করে এবং retry বিকল্প উপলব্ধ
   * করে (Req 5.4)। কেবল Queued/Active/Paused ডাউনলোডে প্রযোজ্য।
   */
  failWithNetworkError(taskId: TaskId, message?: string): Result {
    const internal = this.tasks.get(taskId);
    if (internal === undefined) {
      return { ok: false, error: `Download not found: ${taskId}` };
    }
    const { status } = internal.task;
    if (
      status === DownloadStatus.Completed ||
      status === DownloadStatus.Failed
    ) {
      return {
        ok: false,
        error: `Cannot fail download in terminal status: ${status}`,
      };
    }
    internal.task = { ...internal.task, status: DownloadStatus.Failed };
    internal.canRetry = true; // retry বিকল্প উপলব্ধ (Req 5.4)।
    internal.lastSpeedBytesPerSec = 0;
    if (message !== undefined) {
      this.lastErrors.set(taskId, message);
    }
    return { ok: true, value: undefined };
  }

  /** নির্দিষ্ট ডাউনলোড কার্যের জন্য retry বিকল্প উপলব্ধ কিনা (Req 5.4)। */
  canRetry(taskId: TaskId): boolean {
    return this.tasks.get(taskId)?.canRetry ?? false;
  }

  /** সর্বশেষ ত্রুটি বার্তা ফেরত দেয় (থাকলে)। */
  getLastError(taskId: TaskId): string | undefined {
    return this.lastErrors.get(taskId);
  }

  /** নির্দিষ্ট ডাউনলোড কার্য ফেরত দেয় (পরিদর্শন/টেস্টের জন্য)। */
  getTask(taskId: TaskId): DownloadTask | undefined {
    return this.tasks.get(taskId)?.task;
  }

  private readonly lastErrors = new Map<TaskId, string>();

  private computePercent(task: DownloadTask): number {
    if (task.totalSize === undefined || task.totalSize <= 0) {
      // মোট আকার অজানা হলে শতকরা হার নির্ণয় করা যায় না — 0 ধরি।
      return 0;
    }
    const percent = (100 * task.bytesDownloaded) / task.totalSize;
    // সংখ্যাগত নিরাপত্তার জন্য [0, 100] পরিসরে clamp করি।
    return Math.min(100, Math.max(0, percent));
  }
}
