import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  DownloadStatus,
  SegmentStatus,
  isValidCredential,
  isValidDownloadTask,
  isValidProgress,
  isValidSegment,
  isValidTab,
} from '../src/types';
import type { DownloadTask, Progress, Segment, Tab } from '../src/types';

// Task 1.2 মডেল যাচাইকরণ ফাংশনের জন্য মৌলিক একক ও প্রোপার্টি টেস্ট।
// নোট: এগুলো ঐচ্ছিক যাচাইকরণ টেস্ট (design.md-এর নামকৃত Properties 1–47-এর অংশ নয়)।

describe('মডেল যাচাইকরণ — একক উদাহরণ', () => {
  it('একটি সঠিক Tab গ্রহণ করে এবং প্রয়োজনীয় ফিল্ড অনুপস্থিত হলে প্রত্যাখ্যান করে', () => {
    const tab: Tab = {
      id: 'tab-1' as Tab['id'],
      title: 'উদাহরণ',
      isActive: true,
    };
    expect(isValidTab(tab)).toBe(true);
    expect(isValidTab({ title: 'x', isActive: true })).toBe(false);
    expect(isValidTab({ id: '', title: 'x', isActive: true })).toBe(false);
    expect(isValidTab(null)).toBe(false);
  });

  it('percent 0..100-এর বাইরে হলে Progress প্রত্যাখ্যান করে', () => {
    const ok: Progress = { percent: 50, speedBytesPerSec: 100 };
    expect(isValidProgress(ok)).toBe(true);
    expect(isValidProgress({ percent: -1, speedBytesPerSec: 0 })).toBe(false);
    expect(isValidProgress({ percent: 101, speedBytesPerSec: 0 })).toBe(false);
  });

  it('endOffset < startOffset হলে Segment প্রত্যাখ্যান করে', () => {
    const seg: Segment = {
      index: 0,
      startOffset: 0,
      endOffset: 99,
      bytesDownloaded: 10,
      status: SegmentStatus.Active,
    };
    expect(isValidSegment(seg)).toBe(true);
    expect(isValidSegment({ ...seg, endOffset: -1 })).toBe(false);
    expect(isValidSegment({ ...seg, startOffset: 50, endOffset: 10 })).toBe(
      false,
    );
  });

  it('এনক্রিপ্টেড পাসওয়ার্ড Uint8Array না হলে Credential প্রত্যাখ্যান করে', () => {
    const cred = {
      id: 'c1',
      site: 'example.com',
      username: 'user',
      encryptedPassword: new Uint8Array([1, 2, 3]),
      updatedAt: 1000,
    };
    expect(isValidCredential(cred)).toBe(true);
    expect(isValidCredential({ ...cred, encryptedPassword: 'plain' })).toBe(
      false,
    );
  });
});

describe('মডেল যাচাইকরণ — প্রোপার্টি', () => {
  it('যেকোনো অ-ঋণাত্মক সীমার মধ্যে গঠিত DownloadTask বৈধ হয়', () => {
    fc.assert(
      fc.property(
        fc.record({
          totalSize: fc.integer({ min: 0, max: 1_000_000 }),
          maxConnections: fc.integer({ min: 1, max: 16 }),
          supportsResume: fc.boolean(),
        }),
        ({ totalSize, maxConnections, supportsResume }) => {
          const task: DownloadTask = {
            id: 'task-1' as DownloadTask['id'],
            url: 'https://example.com/file.bin',
            destination: '/downloads/file.bin',
            totalSize,
            bytesDownloaded: 0,
            status: DownloadStatus.Queued,
            segments: [],
            maxConnections,
            supportsResume,
          };
          return isValidDownloadTask(task) === true;
        },
      ),
    );
  });

  it('percent 0..100 সীমার মধ্যে থাকলে এবং কেবল তখনই Progress বৈধ', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -1000, max: 1000, noNaN: true }),
        fc.float({ min: 0, max: 1_000_000, noNaN: true }),
        (percent, speed) => {
          const expected = percent >= 0 && percent <= 100;
          return (
            isValidProgress({ percent, speedBytesPerSec: speed }) === expected
          );
        },
      ),
    );
  });
});
