import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  InMemoryDownloadManager,
} from '../src/services/download/DownloadManager';
import type { Downloader } from '../src/services/download/DownloadManager';
import { DownloadStatus } from '../src/types';
import type { Path, Url } from '../src/types';

// Task 8.2–8.6: Download_Manager-এর জন্য প্রোপার্টি ও উদাহরণ টেস্ট।
// প্রতিটি প্রোপার্টি টেস্ট test/setup.ts-এর গ্লোবাল কনফিগ অনুযায়ী ন্যূনতম ১০০
// পুনরাবৃত্তি (numRuns >= 100) চালায়।

const urlArb = fc.webUrl();
const destArb = fc.string({ minLength: 1 }).map((s) => `/downloads/${s}` as Path);

// একটি জানা মোট-আকারের Downloader তৈরি করে (নেটওয়ার্ক HEAD-এর বিমূর্তকরণ)।
function fixedSizeDownloader(totalSize: number, supportsResume = false): Downloader {
  return { probe: () => ({ totalSize, supportsResume }) };
}

// --------------------------------------------------------------------------
// একক (unit) টেস্ট — মৌলিক ডাউনলোড জীবনচক্র
// --------------------------------------------------------------------------
describe('InMemoryDownloadManager — মৌলিক জীবনচক্র', () => {
  it('শুরুতে কোনো ডাউনলোড থাকে না', () => {
    const dm = new InMemoryDownloadManager();
    expect(dm.listDownloads('All')).toHaveLength(0);
  });

  it('createDownload Queued অবস্থায় একটি কার্য তৈরি করে (Req 5.1)', () => {
    const dm = new InMemoryDownloadManager();
    const task = dm.createDownload('https://example.com/file.zip', '/dl/file.zip');
    expect(task.status).toBe(DownloadStatus.Queued);
    expect(task.url).toBe('https://example.com/file.zip');
    expect(task.destination).toBe('/dl/file.zip');
    expect(task.bytesDownloaded).toBe(0);
    expect(task.maxConnections).toBeGreaterThanOrEqual(1);
    expect(dm.listDownloads('All')).toHaveLength(1);
  });

  it('অবস্থা মেশিন Queued -> Active -> Completed অনুসরণ করে (Req 5.3)', () => {
    let notified = false;
    const dm = new InMemoryDownloadManager({
      downloader: fixedSizeDownloader(1000),
      notify: () => {
        notified = true;
      },
    });
    const task = dm.createDownload('https://example.com/f', '/dl/f');
    expect(dm.start(task.id).ok).toBe(true);
    expect(dm.getTask(task.id)?.status).toBe(DownloadStatus.Active);
    expect(dm.recordBytes(task.id, 1000).ok).toBe(true);
    expect(dm.getTask(task.id)?.status).toBe(DownloadStatus.Completed);
    expect(notified).toBe(true);
  });

  it('পজ ও রিজিউম অর্জিত অগ্রগতি সংরক্ষণ করে (মৌলিক MVP)', () => {
    const dm = new InMemoryDownloadManager({ downloader: fixedSizeDownloader(1000) });
    const task = dm.createDownload('https://example.com/f', '/dl/f');
    dm.start(task.id);
    dm.recordBytes(task.id, 400);
    expect(dm.pause(task.id).ok).toBe(true);
    expect(dm.getTask(task.id)?.status).toBe(DownloadStatus.Paused);
    expect(dm.getTask(task.id)?.bytesDownloaded).toBe(400);
    expect(dm.resume(task.id).ok).toBe(true);
    expect(dm.getTask(task.id)?.status).toBe(DownloadStatus.Active);
  });

  it('অজানা কার্যে অপারেশন ত্রুটি ফেরত দেয়', () => {
    const dm = new InMemoryDownloadManager();
    const missing = 'dl-missing' as ReturnType<typeof dm.createDownload>['id'];
    expect(dm.pause(missing).ok).toBe(false);
    expect(dm.resume(missing).ok).toBe(false);
    expect(dm.retry(missing).ok).toBe(false);
    expect(dm.start(missing).ok).toBe(false);
  });
});

// --------------------------------------------------------------------------
// Property 16 (Task 8.2) — Validates: Requirements 5.1
// ট্যাগ: Feature: feature-rich-browser, Property 16: ডাউনলোড কার্য তৈরি ও তালিকাভুক্তি
// --------------------------------------------------------------------------
describe('Feature: feature-rich-browser, Property 16: ডাউনলোড কার্য তৈরি ও তালিকাভুক্তি', () => {
  it('যেকোনো URL/গন্তব্য ক্রমে তৈরি প্রতিটি ডাউনলোড তালিকায় উপস্থিত ও পুনরুদ্ধারযোগ্য (Validates: Requirements 5.1)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(urlArb, destArb), { maxLength: 25 }),
        (entries) => {
          const dm = new InMemoryDownloadManager();
          const created: { id: string; url: Url; destination: Path }[] = [];
          for (const [url, destination] of entries) {
            const before = dm.listDownloads('All').length;
            const task = dm.createDownload(url, destination);
            const after = dm.listDownloads('All');
            // তালিকা ঠিক ১ বৃদ্ধি পায়।
            expect(after).toHaveLength(before + 1);
            // নতুন কার্য Queued অবস্থায় শুরু হয় ও সঠিক URL/গন্তব্য ধারণ করে।
            expect(task.status).toBe(DownloadStatus.Queued);
            expect(task.url).toBe(url);
            expect(task.destination).toBe(destination);
            created.push({ id: task.id, url, destination });
          }

          const all = dm.listDownloads('All');
          for (const c of created) {
            const found = all.find((t) => t.id === c.id);
            expect(found).toBeDefined();
            expect(found?.url).toBe(c.url);
            expect(found?.destination).toBe(c.destination);
          }
          // প্রতিটি id অনন্য।
          const ids = all.map((t) => t.id);
          expect(new Set(ids).size).toBe(ids.length);
          // Queued ফিল্টারে সব নতুন কার্য থাকে।
          expect(dm.listDownloads(DownloadStatus.Queued)).toHaveLength(
            created.length,
          );
        },
      ),
    );
  });
});

// --------------------------------------------------------------------------
// Property 17 (Task 8.3) — Validates: Requirements 5.2
// ট্যাগ: Feature: feature-rich-browser, Property 17: অগ্রগতি শতকরা হার সীমার মধ্যে থাকে
// --------------------------------------------------------------------------
describe('Feature: feature-rich-browser, Property 17: অগ্রগতি শতকরা হার সীমার মধ্যে থাকে', () => {
  it('অগ্রগতি শতকরা হার সর্বদা 0..100 পরিসরে থাকে এবং 100*bytes/total-এর সমান (Validates: Requirements 5.2)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000_000 }), // মোট আকার (bytes)
        fc.double({ min: 0, max: 1, noNaN: true }), // অগ্রগতির ভগ্নাংশ
        (totalSize, fraction) => {
          const bytes = Math.floor(totalSize * fraction);
          const dm = new InMemoryDownloadManager({
            downloader: fixedSizeDownloader(totalSize),
          });
          const task = dm.createDownload('https://example.com/f', '/dl/f');
          dm.start(task.id);
          const res = dm.recordBytes(task.id, bytes);
          expect(res.ok).toBe(true);

          const progress = dm.getProgress(task.id);
          // শতকরা হার সীমার মধ্যে থাকে।
          expect(progress.percent).toBeGreaterThanOrEqual(0);
          expect(progress.percent).toBeLessThanOrEqual(100);

          // clamp-পরবর্তী প্রকৃত বাইট থেকে প্রত্যাশিত শতকরা হার গণনা।
          const actualBytes = Math.min(bytes, totalSize);
          const expected = (100 * actualBytes) / totalSize;
          expect(progress.percent).toBeCloseTo(expected, 6);
        },
      ),
    );
  });
});

// --------------------------------------------------------------------------
// Property 18 (Task 8.4) — Validates: Requirements 5.3
// ট্যাগ: Feature: feature-rich-browser, Property 18: সম্পূর্ণ ডাউনলোড সঠিকভাবে চিহ্নিত হয়
// --------------------------------------------------------------------------
describe('Feature: feature-rich-browser, Property 18: সম্পূর্ণ ডাউনলোড সঠিকভাবে চিহ্নিত হয়', () => {
  it('bytesDownloaded মোট আকারে পৌঁছালেই (এবং কেবল তখনই) ডাউনলোড Completed হয় (Validates: Requirements 5.3)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000_000 }), // মোট আকার
        fc.double({ min: 0, max: 1, noNaN: true }), // আংশিক অগ্রগতির ভগ্নাংশ (< 1)
        (totalSize, fraction) => {
          // মোট আকারের চেয়ে কঠোরভাবে কম একটি আংশিক মান (< totalSize)।
          const partial = Math.min(totalSize - 1, Math.floor(totalSize * fraction));

          let completedNotifications = 0;
          const dm = new InMemoryDownloadManager({
            downloader: fixedSizeDownloader(totalSize),
            notify: () => {
              completedNotifications += 1;
            },
          });
          const task = dm.createDownload('https://example.com/f', '/dl/f');
          dm.start(task.id);

          // আংশিক অগ্রগতিতে Active থাকে — Completed নয়।
          dm.recordBytes(task.id, partial);
          expect(dm.getTask(task.id)?.status).toBe(DownloadStatus.Active);
          expect(completedNotifications).toBe(0);

          // মোট আকারে পৌঁছালে Completed হয় ও ঠিক একবার অবহিতকরণ ঘটে।
          dm.recordBytes(task.id, totalSize);
          const finalTask = dm.getTask(task.id);
          expect(finalTask?.status).toBe(DownloadStatus.Completed);
          expect(finalTask?.bytesDownloaded).toBe(totalSize);
          expect(completedNotifications).toBe(1);
          // সম্পূর্ণতায় শতকরা হার ঠিক 100।
          expect(dm.getProgress(task.id).percent).toBe(100);
        },
      ),
    );
  });
});

// --------------------------------------------------------------------------
// Property 19 (Task 8.5) — Validates: Requirements 5.5
// ট্যাগ: Feature: feature-rich-browser, Property 19: ডাউনলোড তালিকা ফিল্টার সঠিক
// --------------------------------------------------------------------------
describe('Feature: feature-rich-browser, Property 19: ডাউনলোড তালিকা ফিল্টার সঠিক', () => {
  // প্রতিটি ডাউনলোডকে একটি লক্ষ্য অবস্থায় চালিত করার নির্দেশনা।
  type Target = 'Active' | 'Completed' | 'Failed';
  const targetArb = fc.constantFrom<Target>('Active', 'Completed', 'Failed');

  it('listDownloads(filter) ঠিক সেই অবস্থার কার্যগুলো ফেরত দেয়; All সব ফেরত দেয় (Validates: Requirements 5.5)', () => {
    fc.assert(
      fc.property(
        fc.array(targetArb, { minLength: 1, maxLength: 20 }),
        (targets) => {
          const TOTAL = 1000;
          const dm = new InMemoryDownloadManager({
            downloader: fixedSizeDownloader(TOTAL),
          });

          const expected: Record<DownloadStatus, number> = {
            [DownloadStatus.Queued]: 0,
            [DownloadStatus.Active]: 0,
            [DownloadStatus.Paused]: 0,
            [DownloadStatus.Completed]: 0,
            [DownloadStatus.Failed]: 0,
          };

          for (const target of targets) {
            const task = dm.createDownload('https://example.com/f', '/dl/f');
            dm.start(task.id);
            if (target === 'Active') {
              dm.recordBytes(task.id, 500); // আংশিক — Active থাকে।
              expected[DownloadStatus.Active] += 1;
            } else if (target === 'Completed') {
              dm.recordBytes(task.id, TOTAL); // সম্পূর্ণ।
              expected[DownloadStatus.Completed] += 1;
            } else {
              dm.failWithNetworkError(task.id, 'নেটওয়ার্ক ত্রুটি');
              expected[DownloadStatus.Failed] += 1;
            }
          }

          // প্রতিটি অবস্থার ফিল্টার সঠিক সংখ্যা ও সঠিক অবস্থার কার্য ফেরত দেয়।
          for (const status of Object.values(DownloadStatus)) {
            const filtered = dm.listDownloads(status);
            expect(filtered).toHaveLength(expected[status]);
            for (const t of filtered) {
              expect(t.status).toBe(status);
            }
          }
          // All ফিল্টার সব কার্য ফেরত দেয়।
          expect(dm.listDownloads('All')).toHaveLength(targets.length);
        },
      ),
    );
  });
});

// --------------------------------------------------------------------------
// Task 8.6 — উদাহরণ টেস্ট: নেটওয়ার্ক ত্রুটিতে Failed চিহ্নিতকরণ ও retry বিকল্প
// Validates: Requirements 5.4
// --------------------------------------------------------------------------
describe('Download_Manager — নেটওয়ার্ক ত্রুটি ও retry (Requirements 5.4)', () => {
  it('নেটওয়ার্ক ত্রুটিতে ডাউনলোড Failed হয় এবং retry বিকল্প উপলব্ধ থাকে (Req 5.4)', () => {
    const dm = new InMemoryDownloadManager({
      downloader: fixedSizeDownloader(1000),
    });
    const task = dm.createDownload('https://example.com/f', '/dl/f');
    dm.start(task.id);
    dm.recordBytes(task.id, 250);

    // নেটওয়ার্ক ত্রুটি ঘটে।
    const failRes = dm.failWithNetworkError(task.id, 'নেটওয়ার্ক ত্রুটি: সংযোগ বিচ্ছিন্ন');
    expect(failRes.ok).toBe(true);
    expect(dm.getTask(task.id)?.status).toBe(DownloadStatus.Failed);
    // retry বিকল্প উপলব্ধ ও ত্রুটি বার্তা সংরক্ষিত।
    expect(dm.canRetry(task.id)).toBe(true);
    expect(dm.getLastError(task.id)).toContain('নেটওয়ার্ক ত্রুটি');
    // ব্যর্থ কার্য Failed ফিল্টারে দৃশ্যমান (Req 5.5)।
    expect(dm.listDownloads(DownloadStatus.Failed).map((t) => t.id)).toContain(
      task.id,
    );
  });

  it('retry ব্যর্থ ডাউনলোড পুনরায় Active করে; অ-ব্যর্থ কার্যে retry ত্রুটি দেয়', () => {
    const dm = new InMemoryDownloadManager({
      downloader: fixedSizeDownloader(1000),
    });
    const task = dm.createDownload('https://example.com/f', '/dl/f');
    dm.start(task.id);

    // Active অবস্থায় retry অনুমোদিত নয়।
    expect(dm.retry(task.id).ok).toBe(false);

    dm.failWithNetworkError(task.id);
    expect(dm.getTask(task.id)?.status).toBe(DownloadStatus.Failed);

    // retry সফল — কার্য পুনরায় Active হয় এবং retry পতাকা পরিষ্কার হয়।
    const retryRes = dm.retry(task.id);
    expect(retryRes.ok).toBe(true);
    expect(dm.getTask(task.id)?.status).toBe(DownloadStatus.Active);
    expect(dm.canRetry(task.id)).toBe(false);
  });
});
