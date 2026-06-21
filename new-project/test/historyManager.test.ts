import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { InMemoryHistoryManager } from '../src/services/browsing/HistoryManager';
import type { RecordId, Timestamp, Url } from '../src/types';

// Task 6.2–6.6: History_Manager-এর জন্য প্রোপার্টি ও উদাহরণ টেস্ট।
// প্রতিটি প্রোপার্টি টেস্ট test/setup.ts-এর গ্লোবাল কনফিগ অনুযায়ী ন্যূনতম ১০০
// পুনরাবৃত্তি (numRuns >= 100) চালায়।

// শিরোনাম (খালি হতে পারে), বৈধ URL ও অ-ঋণাত্মক টাইমস্ট্যাম্প আর্বিট্রারি।
const titleArb = fc.string();
const urlArb = fc.webUrl();
const tsArb = fc.nat(); // epoch ms (অ-ঋণাত্মক)

// একটি পরিদর্শন (visit) আর্বিট্রারি: [title, url, visitedAt]।
const visitArb = fc.tuple(titleArb, urlArb, tsArb);

// --------------------------------------------------------------------------
// একক (unit) টেস্ট — মৌলিক ইতিহাস জীবনচক্র
// --------------------------------------------------------------------------
describe('InMemoryHistoryManager — মৌলিক জীবনচক্র', () => {
  it('শুরুতে কোনো রেকর্ড থাকে না', () => {
    const hm = new InMemoryHistoryManager();
    expect(hm.listHistory()).toHaveLength(0);
    expect(hm.count()).toBe(0);
  });

  it('recordVisit একটি অ-ইনকগনিটো পরিদর্শন সংরক্ষণ করে (Req 4.1)', () => {
    const hm = new InMemoryHistoryManager();
    const res = hm.recordVisit('Example', 'https://example.com', 1000, false);
    expect(res.ok).toBe(true);
    const list = hm.listHistory();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('Example');
    expect(list[0].url).toBe('https://example.com');
    expect(list[0].visitedAt).toBe(1000);
  });

  it('ইনকগনিটো পরিদর্শন সংরক্ষণ করে না কিন্তু সফলতা ফেরত দেয় (Req 4.5)', () => {
    const hm = new InMemoryHistoryManager();
    const res = hm.recordVisit('Secret', 'https://secret.example', 1000, true);
    expect(res.ok).toBe(true);
    expect(hm.listHistory()).toHaveLength(0);
  });

  it('deleteRecords অজানা শনাক্তকারী নীরবে উপেক্ষা করে', () => {
    const hm = new InMemoryHistoryManager();
    hm.recordVisit('Example', 'https://example.com', 1000, false);
    const res = hm.deleteRecords(['rec-unknown' as RecordId]);
    expect(res.ok).toBe(true);
    expect(hm.listHistory()).toHaveLength(1);
  });

  it('searchHistory শিরোনাম ও URL উভয়েই case-insensitive মিল খোঁজে (Req 4.3)', () => {
    const hm = new InMemoryHistoryManager();
    hm.recordVisit('Kiro Docs', 'https://example.com/kiro', 1, false);
    hm.recordVisit('Other', 'https://other.example', 2, false);
    expect(hm.searchHistory('kiro')).toHaveLength(1);
    expect(hm.searchHistory('KIRO')).toHaveLength(1);
    expect(hm.searchHistory('example')).toHaveLength(2);
  });
});

// --------------------------------------------------------------------------
// Property 11 (Task 6.2) — Validates: Requirements 4.1
// ট্যাগ: Feature: feature-rich-browser, Property 11: পরিদর্শন রেকর্ড সংরক্ষণ (অ-ইনকগনিটো)
// --------------------------------------------------------------------------
describe('Feature: feature-rich-browser, Property 11: পরিদর্শন রেকর্ড সংরক্ষণ (অ-ইনকগনিটো)', () => {
  it('যেকোনো অ-ইনকগনিটো পরিদর্শন ক্রম রেকর্ড করলে প্রতিটি রেকর্ড একই শিরোনাম/URL/সময় সহ সংরক্ষিত হয় (Validates: Requirements 4.1)', () => {
    fc.assert(
      fc.property(fc.array(visitArb, { maxLength: 30 }), (visits) => {
        const hm = new InMemoryHistoryManager();
        for (const [title, url, ts] of visits) {
          const before = hm.count();
          const res = hm.recordVisit(title, url, ts as Timestamp, false);
          expect(res.ok).toBe(true);
          // অ-ইনকগনিটো প্রতিটি পরিদর্শন ঠিক ১টি রেকর্ড যোগ করে।
          expect(hm.count()).toBe(before + 1);
        }
        // মোট রেকর্ড সংখ্যা পরিদর্শন সংখ্যার সমান।
        expect(hm.count()).toBe(visits.length);

        // প্রতিটি পরিদর্শনের (title, url, visitedAt) সংরক্ষিত রেকর্ডে উপস্থিত থাকে।
        const list = hm.listHistory();
        for (const [title, url, ts] of visits) {
          const match = list.find(
            (r) => r.title === title && r.url === url && r.visitedAt === ts,
          );
          expect(match).toBeDefined();
        }
        // প্রতিটি id অনন্য (unique)।
        const ids = list.map((r) => r.id);
        expect(new Set(ids).size).toBe(ids.length);
      }),
    );
  });
});

// --------------------------------------------------------------------------
// Property 12 (Task 6.3) — Validates: Requirements 4.2
// ট্যাগ: Feature: feature-rich-browser, Property 12: ইতিহাস অবরোহী সময়-ক্রমে সাজানো থাকে
// --------------------------------------------------------------------------
describe('Feature: feature-rich-browser, Property 12: ইতিহাস অবরোহী সময়-ক্রমে সাজানো থাকে', () => {
  it('list_history সর্বদা visited_at অনুসারে অবরোহী ক্রমে রেকর্ড ফেরত দেয় (Validates: Requirements 4.2)', () => {
    fc.assert(
      fc.property(fc.array(visitArb, { maxLength: 30 }), (visits) => {
        const hm = new InMemoryHistoryManager();
        for (const [title, url, ts] of visits) {
          hm.recordVisit(title, url, ts as Timestamp, false);
        }
        const list = hm.listHistory();
        // প্রতিটি সংলগ্ন জোড়ার জন্য পূর্ববর্তী visited_at >= পরবর্তী (অবরোহী)।
        for (let i = 1; i < list.length; i += 1) {
          expect(list[i - 1].visitedAt).toBeGreaterThanOrEqual(
            list[i].visitedAt,
          );
        }
        // তালিকায় কোনো রেকর্ড হারায় না।
        expect(list).toHaveLength(visits.length);
      }),
    );
  });
});

// --------------------------------------------------------------------------
// Property 13 (Task 6.4) — Validates: Requirements 4.3
// ট্যাগ: Feature: feature-rich-browser, Property 13: ইতিহাস অনুসন্ধান কেবল মিলযুক্ত রেকর্ড ফেরত দেয়
// --------------------------------------------------------------------------
describe('Feature: feature-rich-browser, Property 13: ইতিহাস অনুসন্ধান কেবল মিলযুক্ত রেকর্ড ফেরত দেয়', () => {
  it('search_history-এর ফলাফলের প্রতিটি রেকর্ড অনুসন্ধান শব্দ ধারণ করে এবং সকল মিলযুক্ত রেকর্ড অন্তর্ভুক্ত (Validates: Requirements 4.3)', () => {
    fc.assert(
      fc.property(
        fc.array(visitArb, { maxLength: 30 }),
        fc.string(),
        (visits, query) => {
          const hm = new InMemoryHistoryManager();
          for (const [title, url, ts] of visits) {
            hm.recordVisit(title, url, ts as Timestamp, false);
          }
          const needle = query.toLowerCase();
          const results = hm.searchHistory(query);

          // (১) প্রতিটি ফলাফল প্রকৃতপক্ষে শিরোনাম বা URL-এ শব্দটি ধারণ করে।
          for (const r of results) {
            const matches =
              r.title.toLowerCase().includes(needle) ||
              r.url.toLowerCase().includes(needle);
            expect(matches).toBe(true);
          }

          // (২) সম্পূর্ণ ইতিহাসের সকল মিলযুক্ত রেকর্ড ফলাফলে উপস্থিত (সম্পূর্ণতা)।
          const all = hm.listHistory();
          const expectedMatchIds = all
            .filter(
              (r) =>
                r.title.toLowerCase().includes(needle) ||
                r.url.toLowerCase().includes(needle),
            )
            .map((r) => r.id)
            .sort();
          const actualIds = results.map((r) => r.id).sort();
          expect(actualIds).toEqual(expectedMatchIds);

          // (৩) ফলাফলও অবরোহী সময়-ক্রমে থাকে।
          for (let i = 1; i < results.length; i += 1) {
            expect(results[i - 1].visitedAt).toBeGreaterThanOrEqual(
              results[i].visitedAt,
            );
          }
        },
      ),
    );
  });
});

// --------------------------------------------------------------------------
// Property 14 (Task 6.5) — Validates: Requirements 4.4
// ট্যাগ: Feature: feature-rich-browser, Property 14: ইতিহাস মুছে ফেলা স্থায়ী
// --------------------------------------------------------------------------
describe('Feature: feature-rich-browser, Property 14: ইতিহাস মুছে ফেলা স্থায়ী', () => {
  it('নির্বাচিত রেকর্ড মুছে ফেললে তা স্থায়ীভাবে সরে যায় ও বাকিগুলো অপরিবর্তিত থাকে (Validates: Requirements 4.4)', () => {
    fc.assert(
      fc.property(
        fc.array(visitArb, { minLength: 1, maxLength: 30 }),
        fc.array(fc.nat(), { maxLength: 30 }),
        (visits, picks) => {
          const hm = new InMemoryHistoryManager();
          for (const [title, url, ts] of visits) {
            hm.recordVisit(title, url, ts as Timestamp, false);
          }
          const before = hm.listHistory();
          // picks থেকে মুছে ফেলার জন্য অনন্য রেকর্ড নির্বাচন করি।
          const toDeleteIds = [
            ...new Set(picks.map((p) => before[p % before.length].id)),
          ];

          const res = hm.deleteRecords(toDeleteIds);
          expect(res.ok).toBe(true);

          const after = hm.listHistory();
          // মুছে ফেলা প্রতিটি রেকর্ড অনুপস্থিত (স্থায়ী)।
          for (const id of toDeleteIds) {
            expect(after.find((r) => r.id === id)).toBeUndefined();
            expect(hm.getRecord(id)).toBeUndefined();
          }
          // আকার ঠিক মুছে ফেলা অনন্য রেকর্ড সংখ্যা কমে।
          expect(after).toHaveLength(before.length - toDeleteIds.length);
          // অ-মুছে-ফেলা রেকর্ডগুলো অপরিবর্তিত থাকে।
          const deletedSet = new Set(toDeleteIds);
          for (const r of before) {
            if (deletedSet.has(r.id)) continue;
            expect(after.find((x) => x.id === r.id)).toEqual(r);
          }

          // পুনরায় একই id মুছে ফেলা নিরাপদ (idempotent) ও কিছু পরিবর্তন করে না।
          const res2 = hm.deleteRecords(toDeleteIds);
          expect(res2.ok).toBe(true);
          expect(hm.listHistory()).toHaveLength(after.length);
        },
      ),
    );
  });
});

// --------------------------------------------------------------------------
// Property 15 (Task 6.6) — Validates: Requirements 4.5
// ট্যাগ: Feature: feature-rich-browser, Property 15: ইনকগনিটো মোড ইতিহাস সংরক্ষণ করে না
// --------------------------------------------------------------------------
describe('Feature: feature-rich-browser, Property 15: ইনকগনিটো মোড ইতিহাস সংরক্ষণ করে না', () => {
  it('যেকোনো ইনকগনিটো ও অ-ইনকগনিটো পরিদর্শন মিশ্রণে কেবল অ-ইনকগনিটোগুলো সংরক্ষিত হয় (Validates: Requirements 4.5)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(titleArb, urlArb, tsArb, fc.boolean()), {
          maxLength: 40,
        }),
        (visits) => {
          const hm = new InMemoryHistoryManager();
          let expectedStored = 0;
          for (const [title, url, ts, incognito] of visits) {
            hm.recordVisit(title, url, ts as Timestamp, incognito);
            if (!incognito) expectedStored += 1;
          }
          // কেবল অ-ইনকগনিটো পরিদর্শনগুলো সংরক্ষিত।
          expect(hm.count()).toBe(expectedStored);
          expect(hm.listHistory()).toHaveLength(expectedStored);
        },
      ),
    );
  });

  it('শুধুমাত্র ইনকগনিটো পরিদর্শন ক্রমে ইতিহাস সর্বদা খালি থাকে (Validates: Requirements 4.5)', () => {
    fc.assert(
      fc.property(fc.array(visitArb, { maxLength: 30 }), (visits) => {
        const hm = new InMemoryHistoryManager();
        for (const [title, url, ts] of visits) {
          hm.recordVisit(title, url, ts as Timestamp, true);
        }
        expect(hm.count()).toBe(0);
        expect(hm.listHistory()).toHaveLength(0);
      }),
    );
  });
});
