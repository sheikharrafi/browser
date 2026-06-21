import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { InMemoryBookmarkManager } from '../src/services/browsing/BookmarkManager';
import type { Url } from '../src/types';

// Task 5.2–5.6: Bookmark_Manager-এর জন্য প্রোপার্টি ও উদাহরণ টেস্ট।
// প্রতিটি প্রোপার্টি টেস্ট test/setup.ts-এর গ্লোবাল কনফিগ অনুযায়ী ন্যূনতম ১০০
// পুনরাবৃত্তি (numRuns >= 100) চালায়।

// বুকমার্ক শিরোনাম (খালি হতে পারে) ও বৈধ URL আর্বিট্রারি।
const titleArb = fc.string();
const urlArb = fc.webUrl();

// --------------------------------------------------------------------------
// একক (unit) টেস্ট — মৌলিক বুকমার্ক জীবনচক্র
// --------------------------------------------------------------------------
describe('InMemoryBookmarkManager — মৌলিক জীবনচক্র', () => {
  it('শুরুতে কোনো বুকমার্ক বা ফোল্ডার থাকে না', () => {
    const bm = new InMemoryBookmarkManager();
    expect(bm.listBookmarks()).toHaveLength(0);
    expect(bm.listFolders()).toHaveLength(0);
  });

  it('addBookmark শিরোনাম ও URL সহ একটি বুকমার্ক সংরক্ষণ করে (Req 3.1)', () => {
    const bm = new InMemoryBookmarkManager();
    const b = bm.addBookmark('Example', 'https://example.com');
    expect(b.title).toBe('Example');
    expect(b.url).toBe('https://example.com');
    expect(bm.listBookmarks()).toHaveLength(1);
    expect(bm.getBookmark(b.id)).toEqual(b);
  });

  it('অস্তিত্বহীন বুকমার্ক অপসারণ/নাম-সম্পাদনা/স্থানান্তরে ত্রুটি ফেরত দেয়', () => {
    const bm = new InMemoryBookmarkManager();
    const missing = 'bm-does-not-exist' as ReturnType<
      typeof bm.addBookmark
    >['id'];
    const folder = bm.createFolder('F');
    expect(bm.removeBookmark(missing).ok).toBe(false);
    expect(bm.renameBookmark(missing, 'x').ok).toBe(false);
    expect(bm.moveToFolder(missing, folder.id).ok).toBe(false);
  });

  it('অস্তিত্বহীন ফোল্ডারে স্থানান্তরে ত্রুটি ফেরত দেয়', () => {
    const bm = new InMemoryBookmarkManager();
    const b = bm.addBookmark('Example', 'https://example.com');
    const missingFolder = 'folder-missing' as ReturnType<
      typeof bm.createFolder
    >['id'];
    expect(bm.moveToFolder(b.id, missingFolder).ok).toBe(false);
  });

  it('createFolder একটি ফোল্ডার তৈরি করে যাতে বুকমার্ক সংগঠিত করা যায় (Req 3.4)', () => {
    const bm = new InMemoryBookmarkManager();
    const folder = bm.createFolder('কাজ');
    expect(folder.name).toBe('কাজ');
    expect(bm.listFolders().map((f) => f.id)).toContain(folder.id);
  });
});

// --------------------------------------------------------------------------
// Property 6 (Task 5.2) — Validates: Requirements 3.1
// ট্যাগ: Feature: feature-rich-browser, Property 6: বুকমার্ক সংরক্ষণ ও পুনরুদ্ধার
// --------------------------------------------------------------------------
describe('Feature: feature-rich-browser, Property 6: বুকমার্ক সংরক্ষণ ও পুনরুদ্ধার', () => {
  it('যেকোনো শিরোনাম/URL ক্রমে সংরক্ষিত বুকমার্ক একই শিরোনাম ও URL সহ পুনরুদ্ধারযোগ্য (Validates: Requirements 3.1)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(titleArb, urlArb), { maxLength: 25 }),
        (entries) => {
          const bm = new InMemoryBookmarkManager();
          const created: { id: string; title: string; url: Url }[] = [];
          for (const [title, url] of entries) {
            const before = bm.listBookmarks().length;
            const b = bm.addBookmark(title, url);
            const after = bm.listBookmarks();
            // তালিকা ঠিক ১ বৃদ্ধি পায়।
            expect(after).toHaveLength(before + 1);
            // সংরক্ষিত বুকমার্ক একই শিরোনাম ও URL ধারণ করে।
            expect(b.title).toBe(title);
            expect(b.url).toBe(url);
            created.push({ id: b.id, title, url });
          }

          // প্রতিটি সংরক্ষিত বুকমার্ক তালিকা থেকে অপরিবর্তিতভাবে পুনরুদ্ধারযোগ্য।
          const list = bm.listBookmarks();
          for (const c of created) {
            const found = list.find((x) => x.id === c.id);
            expect(found).toBeDefined();
            expect(found?.title).toBe(c.title);
            expect(found?.url).toBe(c.url);
          }
          // প্রতিটি id অনন্য (unique)।
          const ids = list.map((x) => x.id);
          expect(new Set(ids).size).toBe(ids.length);
        },
      ),
    );
  });
});

// --------------------------------------------------------------------------
// Property 7 (Task 5.3) — Validates: Requirements 3.2
// ট্যাগ: Feature: feature-rich-browser, Property 7: বুকমার্ক যোগ-অপসারণ ইনভেরিয়েন্ট
// --------------------------------------------------------------------------
describe('Feature: feature-rich-browser, Property 7: বুকমার্ক যোগ-অপসারণ ইনভেরিয়েন্ট', () => {
  it('একটি বুকমার্ক যোগ করে অপসারণ করলে তালিকা পূর্বাবস্থায় ফেরে ও বুকমার্কটি অনুপস্থিত থাকে (Validates: Requirements 3.2)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(titleArb, urlArb), { minLength: 1, maxLength: 20 }),
        fc.nat(),
        (entries, pick) => {
          const bm = new InMemoryBookmarkManager();
          for (const [title, url] of entries) {
            bm.addBookmark(title, url);
          }
          const before = bm.listBookmarks();
          const target = before[pick % before.length];

          const res = bm.removeBookmark(target.id);
          expect(res.ok).toBe(true);

          const after = bm.listBookmarks();
          // তালিকা ঠিক ১ কমে এবং অপসারিত বুকমার্ক অনুপস্থিত।
          expect(after).toHaveLength(before.length - 1);
          expect(after.find((b) => b.id === target.id)).toBeUndefined();
          // বাকি সব বুকমার্ক অপরিবর্তিত থাকে।
          for (const b of before) {
            if (b.id === target.id) continue;
            expect(after.find((x) => x.id === b.id)).toEqual(b);
          }

          // অপসারণ idempotent নয় — দ্বিতীয়বার অপসারণ ত্রুটি দেয়।
          expect(bm.removeBookmark(target.id).ok).toBe(false);
        },
      ),
    );
  });
});

// --------------------------------------------------------------------------
// Property 8 (Task 5.4) — Validates: Requirements 3.3
// ট্যাগ: Feature: feature-rich-browser, Property 8: বুকমার্ক নির্বাচনে সঠিক URL লোড হয়
// --------------------------------------------------------------------------
describe('Feature: feature-rich-browser, Property 8: বুকমার্ক নির্বাচনে সঠিক URL লোড হয়', () => {
  it('যেকোনো সংরক্ষিত বুকমার্ক নির্বাচন করলে সঠিক URL Navigation_Controller-এ পাঠানো হয় (Validates: Requirements 3.3)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(titleArb, urlArb), { minLength: 1, maxLength: 20 }),
        fc.nat(),
        (entries, pick) => {
          // নির্বাচিত URL ধারণ করার জন্য কলব্যাক (Navigation_Controller-এ ওয়্যারিং বিমূর্তকরণ)।
          const navigated: Url[] = [];
          const bm = new InMemoryBookmarkManager({
            onNavigate: (url) => navigated.push(url),
          });
          const created = entries.map(([title, url]) =>
            bm.addBookmark(title, url),
          );
          const target = created[pick % created.length];

          const loadedUrl = bm.selectBookmark(target.id);
          // নির্বাচন সংশ্লিষ্ট বুকমার্কের সঠিক URL ফেরত দেয়।
          expect(loadedUrl).toBe(target.url);
          // কলব্যাকে ঠিক একবার একই URL পাঠানো হয়।
          expect(navigated).toEqual([target.url]);
        },
      ),
    );
  });
});

// --------------------------------------------------------------------------
// Property 9 (Task 5.5) — Validates: Requirements 3.4
// ট্যাগ: Feature: feature-rich-browser, Property 9: ফোল্ডারে স্থানান্তর সংগঠন সংরক্ষণ করে
// --------------------------------------------------------------------------
describe('Feature: feature-rich-browser, Property 9: ফোল্ডারে স্থানান্তর সংগঠন সংরক্ষণ করে', () => {
  it('বুকমার্ক একটি ফোল্ডারে স্থানান্তর করলে তা সেই ফোল্ডারে তালিকাভুক্ত হয় ও অন্য বৈশিষ্ট্য অপরিবর্তিত থাকে (Validates: Requirements 3.4)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(titleArb, urlArb), { minLength: 1, maxLength: 15 }),
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
        fc.nat(),
        fc.nat(),
        (entries, folderNames, bmPick, folderPick) => {
          const bm = new InMemoryBookmarkManager();
          const created = entries.map(([title, url]) =>
            bm.addBookmark(title, url),
          );
          const folders = folderNames.map((name) => bm.createFolder(name));

          const target = created[bmPick % created.length];
          const folder = folders[folderPick % folders.length];

          const res = bm.moveToFolder(target.id, folder.id);
          expect(res.ok).toBe(true);

          const moved = bm.getBookmark(target.id);
          // ফোল্ডার নির্ধারিত হয়; id/title/url অপরিবর্তিত থাকে।
          expect(moved?.folderId).toBe(folder.id);
          expect(moved?.id).toBe(target.id);
          expect(moved?.title).toBe(target.title);
          expect(moved?.url).toBe(target.url);

          // ফোল্ডার-নির্দিষ্ট তালিকায় বুকমার্কটি উপস্থিত থাকে।
          const inFolder = bm.listBookmarks(folder.id);
          expect(inFolder.find((b) => b.id === target.id)).toBeDefined();
          // প্রতিটি ফোল্ডার-তালিকার আইটেম প্রকৃতপক্ষে সেই ফোল্ডারের।
          for (const b of inFolder) {
            expect(b.folderId).toBe(folder.id);
          }

          // সম্পূর্ণ তালিকার আকার অপরিবর্তিত (স্থানান্তর বুকমার্ক যোগ/বিয়োগ করে না)।
          expect(bm.listBookmarks()).toHaveLength(created.length);
        },
      ),
    );
  });
});

// --------------------------------------------------------------------------
// Property 10 (Task 5.6) — Validates: Requirements 3.5
// ট্যাগ: Feature: feature-rich-browser, Property 10: বুকমার্ক নাম সম্পাদনা স্থায়ী হয়
// --------------------------------------------------------------------------
describe('Feature: feature-rich-browser, Property 10: বুকমার্ক নাম সম্পাদনা স্থায়ী হয়', () => {
  it('বুকমার্কের নাম সম্পাদনা করলে হালনাগাদকৃত নাম স্থায়ীভাবে সংরক্ষিত হয় ও অন্য বৈশিষ্ট্য অপরিবর্তিত থাকে (Validates: Requirements 3.5)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(titleArb, urlArb), { minLength: 1, maxLength: 20 }),
        fc.nat(),
        titleArb,
        (entries, pick, newName) => {
          const bm = new InMemoryBookmarkManager();
          const created = entries.map(([title, url]) =>
            bm.addBookmark(title, url),
          );
          const target = created[pick % created.length];

          const res = bm.renameBookmark(target.id, newName);
          expect(res.ok).toBe(true);

          const renamed = bm.getBookmark(target.id);
          // হালনাগাদকৃত নাম সংরক্ষিত; url/id/folder অপরিবর্তিত।
          expect(renamed?.title).toBe(newName);
          expect(renamed?.url).toBe(target.url);
          expect(renamed?.id).toBe(target.id);
          expect(renamed?.folderId).toBe(target.folderId);

          // তালিকা থেকেও হালনাগাদকৃত নাম দৃশ্যমান (স্থায়ী)।
          const listed = bm
            .listBookmarks()
            .find((b) => b.id === target.id);
          expect(listed?.title).toBe(newName);
          // তালিকার আকার অপরিবর্তিত।
          expect(bm.listBookmarks()).toHaveLength(created.length);
        },
      ),
    );
  });
});
