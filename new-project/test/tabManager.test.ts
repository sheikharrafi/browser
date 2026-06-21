import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { InMemoryTabManager } from '../src/services/browsing/TabManager';

// Task 2.2–2.5: Tab_Manager-এর জন্য প্রোপার্টি ও উদাহরণ টেস্ট।
// প্রতিটি প্রোপার্টি টেস্ট test/setup.ts-এর গ্লোবাল কনফিগ অনুযায়ী ন্যূনতম ১০০
// পুনরাবৃত্তি (numRuns >= 100) চালায়।

// বৈধ URL আর্বিট্রারি (ঐচ্ছিক — undefined মানে খালি ট্যাব)।
const optionalUrlArb = fc.option(fc.webUrl(), { nil: undefined });

// --------------------------------------------------------------------------
// একক (unit) টেস্ট — মৌলিক জীবনচক্র আচরণ
// --------------------------------------------------------------------------
describe('InMemoryTabManager — মৌলিক জীবনচক্র', () => {
  it('শুরুতে ঠিক একটি সক্রিয় খালি ট্যাব থাকে', () => {
    const tm = new InMemoryTabManager();
    const tabs = tm.listTabs();
    expect(tabs).toHaveLength(1);
    expect(tabs[0].isActive).toBe(true);
    expect(tabs[0].url).toBeUndefined();
    expect(tm.getActiveTab().id).toBe(tabs[0].id);
  });

  it('createTab নতুন ট্যাবকে সক্রিয় করে এবং পূর্বেরটি নিষ্ক্রিয় করে', () => {
    const tm = new InMemoryTabManager();
    const first = tm.getActiveTab();
    const second = tm.createTab('https://example.com');
    expect(tm.getActiveTab().id).toBe(second.id);
    expect(tm.listTabs().find((t) => t.id === first.id)?.isActive).toBe(false);
  });

  it('অস্তিত্বহীন ট্যাব বন্ধ/সক্রিয় করলে ত্রুটি ফেরত দেয়', () => {
    const tm = new InMemoryTabManager();
    const missing = 'tab-does-not-exist' as ReturnType<
      typeof tm.getActiveTab
    >['id'];
    expect(tm.closeTab(missing).ok).toBe(false);
    expect(tm.activateTab(missing).ok).toBe(false);
  });

  it('অ-সক্রিয় ট্যাব বন্ধ করলে সক্রিয় ট্যাব অপরিবর্তিত থাকে', () => {
    const tm = new InMemoryTabManager();
    const t1 = tm.getActiveTab();
    tm.createTab(); // t2 (সক্রিয়)
    const active = tm.getActiveTab();
    const res = tm.closeTab(t1.id);
    expect(res.ok).toBe(true);
    expect(tm.getActiveTab().id).toBe(active.id);
  });
});

// --------------------------------------------------------------------------
// Property 1 (Task 2.2) — Validates: Requirements 1.1
// ট্যাগ: Feature: feature-rich-browser, Property 1: নতুন ট্যাব তৈরি তালিকা
// বাড়ায় ও সক্রিয় করে
// --------------------------------------------------------------------------
describe('Feature: feature-rich-browser, Property 1: নতুন ট্যাব তৈরি তালিকা বাড়ায় ও সক্রিয় করে', () => {
  it('যেকোনো createTab ক্রমে তালিকা ১ বৃদ্ধি পায় ও নতুন ট্যাব সক্রিয় হয় (Validates: Requirements 1.1)', () => {
    fc.assert(
      fc.property(
        fc.array(optionalUrlArb, { maxLength: 25 }),
        (urls) => {
          const tm = new InMemoryTabManager();
          for (const url of urls) {
            const before = tm.listTabs().length;
            const created = tm.createTab(url);
            const after = tm.listTabs();

            // তালিকা ঠিক ১ বৃদ্ধি পায়।
            expect(after).toHaveLength(before + 1);
            // নতুন ট্যাবটি তালিকায় উপস্থিত ও সক্রিয়।
            const found = after.find((t) => t.id === created.id);
            expect(found).toBeDefined();
            expect(found?.isActive).toBe(true);
            // ঠিক একটি ট্যাব সক্রিয় থাকে।
            expect(after.filter((t) => t.isActive)).toHaveLength(1);
            // getActiveTab নতুন ট্যাবই ফেরত দেয়।
            expect(tm.getActiveTab().id).toBe(created.id);
          }
        },
      ),
    );
  });
});

// --------------------------------------------------------------------------
// Property 2 (Task 2.3) — Validates: Requirements 1.2
// ট্যাগ: Feature: feature-rich-browser, Property 2: ট্যাব বন্ধ করলে তা
// অপসারিত হয় ও সংলগ্ন ট্যাব সক্রিয় হয়
// --------------------------------------------------------------------------
describe('Feature: feature-rich-browser, Property 2: ট্যাব বন্ধ করলে তা অপসারিত হয় ও সংলগ্ন ট্যাব সক্রিয় হয়', () => {
  it('যেকোনো ট্যাব বন্ধ করলে তা অপসারিত হয় ও (সক্রিয় হলে) সংলগ্ন ট্যাব সক্রিয় হয় (Validates: Requirements 1.2)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        fc.nat(),
        (count, pick) => {
          const tm = new InMemoryTabManager();
          // count মোট ট্যাব (একটি কনস্ট্রাক্টরে তৈরি)।
          for (let i = 1; i < count; i++) {
            tm.createTab(`https://site-${i}.example`);
          }
          // একটি নির্দিষ্ট ট্যাব সক্রিয় করি যাতে বন্ধের আচরণ নিয়ন্ত্রিত হয়।
          const tabsBefore = tm.listTabs();
          const targetIndex = pick % tabsBefore.length;
          const target = tabsBefore[targetIndex];
          const wasActive = target.isActive;
          const before = tabsBefore.length;

          const res = tm.closeTab(target.id);
          expect(res.ok).toBe(true);
          const after = tm.listTabs();

          if (before === 1) {
            // সর্বশেষ ট্যাব বন্ধ → একটি নতুন খালি ট্যাব (ভিন্ন id), সক্রিয় (Req 1.4)।
            expect(after).toHaveLength(1);
            expect(after[0].id).not.toBe(target.id);
            expect(after[0].isActive).toBe(true);
          } else {
            // বন্ধ ট্যাবটি অপসারিত ও তালিকা ১ কমে।
            expect(after).toHaveLength(before - 1);
            expect(after.find((t) => t.id === target.id)).toBeUndefined();
            // ঠিক একটি ট্যাব সক্রিয় থাকে।
            expect(after.filter((t) => t.isActive)).toHaveLength(1);
            if (wasActive) {
              // সংলগ্ন (একই সূচক, নতুবা নতুন শেষ) ট্যাব সক্রিয় হয়।
              const expectedIdx = Math.min(targetIndex, after.length - 1);
              expect(after[expectedIdx].isActive).toBe(true);
            }
          }
        },
      ),
    );
  });
});

// --------------------------------------------------------------------------
// Property 3 (Task 2.4) — Validates: Requirements 1.3
// ট্যাগ: Feature: feature-rich-browser, Property 3: ট্যাব নির্বাচন সক্রিয়
// ট্যাব নির্ধারণ করে
// --------------------------------------------------------------------------
describe('Feature: feature-rich-browser, Property 3: ট্যাব নির্বাচন সক্রিয় ট্যাব নির্ধারণ করে', () => {
  it('যেকোনো বিদ্যমান ট্যাব সক্রিয় করলে getActiveTab সেটিই ফেরত দেয় (Validates: Requirements 1.3)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        fc.nat(),
        (count, pick) => {
          const tm = new InMemoryTabManager();
          for (let i = 1; i < count; i++) {
            tm.createTab(`https://site-${i}.example`);
          }
          const tabs = tm.listTabs();
          const idx = pick % tabs.length;
          const target = tabs[idx];

          const res = tm.activateTab(target.id);
          expect(res.ok).toBe(true);
          // নির্বাচিত ট্যাবই সক্রিয়।
          expect(tm.getActiveTab().id).toBe(target.id);
          // ঠিক একটি ট্যাব সক্রিয় থাকে।
          expect(tm.listTabs().filter((t) => t.isActive)).toHaveLength(1);
        },
      ),
    );
  });
});

// --------------------------------------------------------------------------
// Task 2.5 — উদাহরণ টেস্ট: সর্বশেষ ট্যাব বন্ধে খালি ট্যাব (1.4) ও
// শিরোনাম/আইকন প্রদর্শন (1.5)
// --------------------------------------------------------------------------
describe('Tab_Manager — উদাহরণ এজ-কেস (Requirements 1.4, 1.5)', () => {
  it('সর্বশেষ খোলা ট্যাব বন্ধ করলে একটি নতুন খালি ট্যাব প্রদর্শিত হয় (Req 1.4)', () => {
    const tm = new InMemoryTabManager();
    const only = tm.getActiveTab();
    expect(tm.listTabs()).toHaveLength(1);

    const res = tm.closeTab(only.id);
    expect(res.ok).toBe(true);

    const tabs = tm.listTabs();
    expect(tabs).toHaveLength(1);
    // এটি একটি নতুন ট্যাব (ভিন্ন id) এবং খালি (কোনো url নেই)।
    expect(tabs[0].id).not.toBe(only.id);
    expect(tabs[0].url).toBeUndefined();
    expect(tabs[0].title).toBe('নতুন ট্যাব');
    expect(tabs[0].isActive).toBe(true);
  });

  it('প্রতিটি ট্যাব শিরোনাম ও আইকন ধারণ করে (Req 1.5)', () => {
    const tm = new InMemoryTabManager();
    // খালি ট্যাবেও ডিফল্ট শিরোনাম ও আইকন থাকে।
    const empty = tm.getActiveTab();
    expect(typeof empty.title).toBe('string');
    expect(empty.title.length).toBeGreaterThan(0);
    expect(empty.icon).toBeDefined();

    // URL সহ তৈরি ট্যাবের শিরোনাম URL প্রতিফলিত করে এবং আইকন থাকে।
    const withUrl = tm.createTab('https://example.com/page');
    expect(withUrl.title).toBe('https://example.com/page');
    expect(withUrl.icon).toBeDefined();

    // তালিকার প্রতিটি ট্যাবে শিরোনাম ও আইকন উপস্থিত।
    for (const tab of tm.listTabs()) {
      expect(typeof tab.title).toBe('string');
      expect(tab.icon).toBeDefined();
    }
  });
});
