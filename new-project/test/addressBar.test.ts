import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { InMemoryAddressBar } from '../src/services/browsing/AddressBar';

// Task 4.1–4.2: Address_Bar-এর জন্য একক ও প্রোপার্টি টেস্ট।
// প্রতিটি প্রোপার্টি টেস্ট test/setup.ts-এর গ্লোবাল কনফিগ অনুযায়ী ন্যূনতম ১০০
// পুনরাবৃত্তি (numRuns >= 100) চালায়।

const SEARCH_PREFIX = 'https://www.google.com/search?q=';

// --------------------------------------------------------------------------
// একক (unit) টেস্ট — মৌলিক ইনপুট রাউটিং আচরণ (Req 2.1, 2.2)
// --------------------------------------------------------------------------
describe('InMemoryAddressBar — ইনপুট রাউটিং', () => {
  it('সুস্পষ্ট স্কিমযুক্ত বৈধ URL নেভিগেশনে রাউট হয় (Req 2.1)', () => {
    const bar = new InMemoryAddressBar();
    const target = bar.submitInput('https://example.com/page');
    expect(target.kind).toBe('NavigateTo');
    expect(target.url).toBe('https://example.com/page');
  });

  it('স্কিম-ছাড়া ডোমেইন https:// প্রিফিক্সসহ স্বাভাবিকীকৃত হয় (Req 2.1)', () => {
    const bar = new InMemoryAddressBar();
    const target = bar.submitInput('example.com');
    expect(target.kind).toBe('NavigateTo');
    expect(target.url).toBe('https://example.com');
  });

  it('localhost (ঐচ্ছিক পোর্টসহ) বৈধ URL হিসেবে গণ্য হয়', () => {
    const bar = new InMemoryAddressBar();
    expect(bar.isValidUrl('localhost')).toBe(true);
    expect(bar.isValidUrl('localhost:3000/path')).toBe(true);
  });

  it('একাধিক শব্দ/whitespace যুক্ত ইনপুট অনুসন্ধানে রাউট হয় (Req 2.2)', () => {
    const bar = new InMemoryAddressBar();
    const target = bar.submitInput('how to write tests');
    expect(target.kind).toBe('SearchQuery');
    expect(target.url).toBe(`${SEARCH_PREFIX}${encodeURIComponent('how to write tests')}`);
  });

  it('ডট-ছাড়া একক শব্দ অনুসন্ধান প্রশ্ন হিসেবে গণ্য হয় (Req 2.2)', () => {
    const bar = new InMemoryAddressBar();
    const target = bar.submitInput('weather');
    expect(target.kind).toBe('SearchQuery');
    expect(bar.isValidUrl('weather')).toBe(false);
  });

  it('খালি/whitespace-মাত্র ইনপুট বৈধ URL নয়', () => {
    const bar = new InMemoryAddressBar();
    expect(bar.isValidUrl('')).toBe(false);
    expect(bar.isValidUrl('   ')).toBe(false);
  });

  it('কাস্টম অনুসন্ধান ইঞ্জিন প্রিফিক্স সম্মান করে', () => {
    const bar = new InMemoryAddressBar({
      searchEngine: 'https://duckduckgo.com/?q=',
    });
    const target = bar.submitInput('hello world');
    expect(target.kind).toBe('SearchQuery');
    expect(target.url).toBe(`https://duckduckgo.com/?q=${encodeURIComponent('hello world')}`);
  });

  it('displayUrl সর্বশেষ প্রদর্শিত URL সংরক্ষণ করে', () => {
    const bar = new InMemoryAddressBar();
    expect(bar.getDisplayedUrl()).toBeUndefined();
    bar.displayUrl('https://example.com');
    expect(bar.getDisplayedUrl()).toBe('https://example.com');
  });
});

// --------------------------------------------------------------------------
// Property 4 (Task 4.2) — Validates: Requirements 2.1, 2.2
// ট্যাগ: Feature: feature-rich-browser, Property 4: বৈধ URL নেভিগেশনে রাউট
// হয়, অবৈধ ইনপুট অনুসন্ধানে রাউট হয়
// --------------------------------------------------------------------------
describe('Feature: feature-rich-browser, Property 4: বৈধ URL নেভিগেশনে রাউট হয়, অবৈধ ইনপুট অনুসন্ধানে রাউট হয়', () => {
  it('যেকোনো বৈধ URL সর্বদা NavigateTo টার্গেট দেয় (Validates: Requirements 2.1)', () => {
    const bar = new InMemoryAddressBar();
    fc.assert(
      fc.property(fc.webUrl(), (url) => {
        const target = bar.submitInput(url);
        expect(target.kind).toBe('NavigateTo');
        // ফলাফল URL একটি পার্সযোগ্য বৈধ URL।
        expect(() => new URL(target.url)).not.toThrow();
      }),
    );
  });

  it('যেকোনো whitespace-যুক্ত (অ-URL) ইনপুট সর্বদা SearchQuery টার্গেট দেয় (Validates: Requirements 2.2)', () => {
    const bar = new InMemoryAddressBar();
    // একাধিক শব্দ স্পেস দিয়ে যুক্ত — whitespace নিয়ম অনুযায়ী এগুলো নিশ্চিতভাবে অবৈধ URL।
    const wordArb = fc.constantFrom(
      'how', 'to', 'write', 'tests', 'weather', 'cat', 'dog', 'foo', 'bar', 'browser',
    );
    const searchPhraseArb = fc
      .array(wordArb, { minLength: 2, maxLength: 6 })
      .map((words) => words.join(' '));

    fc.assert(
      fc.property(searchPhraseArb, (phrase) => {
        expect(bar.isValidUrl(phrase)).toBe(false);
        const target = bar.submitInput(phrase);
        expect(target.kind).toBe('SearchQuery');
        expect(target.url.startsWith(SEARCH_PREFIX)).toBe(true);
        expect(target.url).toContain(encodeURIComponent(phrase));
      }),
    );
  });
});
