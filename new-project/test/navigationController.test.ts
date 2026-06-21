import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { InMemoryNavigationController } from '../src/services/browsing/NavigationController';
import type { LoadOutcome, PageLoader } from '../src/services/browsing/NavigationController';
import { LoadState } from '../src/types';
import type { LoadResult, TabId, Url } from '../src/types';

// Task 4.3–4.5: Navigation_Controller-এর জন্য প্রোপার্টি ও উদাহরণ টেস্ট।
// প্রতিটি প্রোপার্টি টেস্ট test/setup.ts-এর গ্লোবাল কনফিগ অনুযায়ী ন্যূনতম ১০০
// পুনরাবৃত্তি (numRuns >= 100) চালায়।

const TAB = 'tab-1' as TabId;

// সর্বদা সফল লোডার (ডিফল্ট আচরণের সাথে সঙ্গতিপূর্ণ)।
const succeedingLoader: PageLoader = async () => ({ ok: true });

// --------------------------------------------------------------------------
// একক (unit) টেস্ট — মৌলিক নেভিগেশন আচরণ
// --------------------------------------------------------------------------
describe('InMemoryNavigationController — মৌলিক নেভিগেশন', () => {
  it('navigate নতুন এন্ট্রি push করে এবং Loaded ফেরত দেয়', async () => {
    const nav = new InMemoryNavigationController();
    const res = await nav.navigate(TAB, 'https://a.example');
    expect(res.state).toBe(LoadState.Loaded);
    expect(res.url).toBe('https://a.example');
    expect(nav.getCurrentUrl(TAB)).toBe('https://a.example');
    expect(nav.canGoBack(TAB)).toBe(false);
    expect(nav.canGoForward(TAB)).toBe(false);
  });

  it('navigate current_index-এর পরের forward এন্ট্রি ছেঁটে ফেলে', async () => {
    const nav = new InMemoryNavigationController();
    await nav.navigate(TAB, 'https://a.example');
    await nav.navigate(TAB, 'https://b.example');
    await nav.navigate(TAB, 'https://c.example');
    await nav.goBack(TAB); // b
    await nav.goBack(TAB); // a
    expect(nav.canGoForward(TAB)).toBe(true);
    // a থেকে নতুন নেভিগেশন → b, c forward এন্ট্রি বাতিল হয়।
    await nav.navigate(TAB, 'https://d.example');
    expect(nav.canGoForward(TAB)).toBe(false);
    expect(nav.getCurrentUrl(TAB)).toBe('https://d.example');
    const stack = nav.getNavigationStack(TAB);
    expect(stack.entries.map((e) => e.url)).toEqual([
      'https://a.example',
      'https://d.example',
    ]);
  });

  it('খালি স্ট্যাকে goBack/goForward undefined ফেরত দেয়', async () => {
    const nav = new InMemoryNavigationController();
    expect(await nav.goBack(TAB)).toBeUndefined();
    expect(await nav.goForward(TAB)).toBeUndefined();
  });
});

// --------------------------------------------------------------------------
// Property 5 (Task 4.4) — Validates: Requirements 2.3, 2.4
// ট্যাগ: Feature: feature-rich-browser, Property 5: পিছনে-সামনে নেভিগেশন
// রাউন্ড-ট্রিপ
// --------------------------------------------------------------------------
describe('Feature: feature-rich-browser, Property 5: পিছনে-সামনে নেভিগেশন রাউন্ড-ট্রিপ', () => {
  it('সম্পূর্ণ পিছনে তারপর সম্পূর্ণ সামনে গেলে একই বর্তমান পেজে ফেরে (Validates: Requirements 2.3, 2.4)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.webUrl(), { minLength: 1, maxLength: 15 }),
        async (urls) => {
          const nav = new InMemoryNavigationController({
            loader: succeedingLoader,
          });
          for (const url of urls) {
            await nav.navigate(TAB, url);
          }
          const lastUrl = urls[urls.length - 1];
          expect(nav.getCurrentUrl(TAB)).toBe(lastUrl);

          // সম্পূর্ণ পিছনে: প্রতিটি goBack প্রত্যাশিত পূর্ববর্তী এন্ট্রি ফেরত দেয় (Req 2.3)।
          let steps = 0;
          for (let i = urls.length - 2; i >= 0; i--) {
            expect(nav.canGoBack(TAB)).toBe(true);
            const back = await nav.goBack(TAB);
            expect(back).toBe(urls[i]);
            steps += 1;
          }
          expect(nav.canGoBack(TAB)).toBe(false);
          expect(nav.getCurrentUrl(TAB)).toBe(urls[0]);

          // সম্পূর্ণ সামনে: প্রতিটি goForward প্রত্যাশিত পরবর্তী এন্ট্রি ফেরত দেয় (Req 2.4)।
          for (let j = 0; j < steps; j++) {
            expect(nav.canGoForward(TAB)).toBe(true);
            const fwd = await nav.goForward(TAB);
            expect(fwd).toBe(urls[j + 1]);
          }
          expect(nav.canGoForward(TAB)).toBe(false);

          // রাউন্ড-ট্রিপ শেষে আবার সর্বশেষ পেজে ফিরে আসি।
          expect(nav.getCurrentUrl(TAB)).toBe(lastUrl);
        },
      ),
    );
  });
});

// --------------------------------------------------------------------------
// Task 4.5 — উদাহরণ টেস্ট: রিলোড (2.5), লোডিং অবস্থা সূচক (2.6),
// লোড ব্যর্থতায় ত্রুটি বার্তা + retry (2.7)
// --------------------------------------------------------------------------
describe('Navigation_Controller — উদাহরণ এজ-কেস (Requirements 2.5, 2.6, 2.7)', () => {
  it('reload বর্তমান পেজ পুনরায় লোড করে এবং স্ট্যাক অপরিবর্তিত রাখে (Req 2.5)', async () => {
    const nav = new InMemoryNavigationController();
    await nav.navigate(TAB, 'https://a.example');
    await nav.navigate(TAB, 'https://b.example');
    const before = nav.getNavigationStack(TAB);

    const res = await nav.reload(TAB);
    expect(res.state).toBe(LoadState.Loaded);
    expect(res.url).toBe('https://b.example');

    const after = nav.getNavigationStack(TAB);
    // স্ট্যাকের এন্ট্রি ও বর্তমান সূচক অপরিবর্তিত (নতুন এন্ট্রি যোগ হয় না)।
    expect(after.entries.map((e) => e.url)).toEqual(
      before.entries.map((e) => e.url),
    );
    expect(after.currentIndex).toBe(before.currentIndex);
  });

  it('পেজ লোডের সময় Loading → Loaded অবস্থা সূচক নির্গত হয় (Req 2.6)', async () => {
    const transitions: LoadState[] = [];
    const nav = new InMemoryNavigationController({
      loader: succeedingLoader,
      onLoadStateChange: (_tabId, state) => {
        transitions.push(state);
      },
    });

    await nav.navigate(TAB, 'https://a.example');

    // লোডিং চলাকালীন Loading এবং সম্পূর্ণে Loaded — এই ক্রম নির্গত হয়।
    expect(transitions).toEqual([LoadState.Loading, LoadState.Loaded]);
    expect(nav.getLoadState(TAB)).toBe(LoadState.Loaded);
  });

  it('লোড ব্যর্থ হলে ত্রুটি বার্তা দেয় এবং retry সফল হলে Loaded হয় (Req 2.7)', async () => {
    let shouldFail = true;
    const flakyLoader: PageLoader = async (): Promise<LoadOutcome> =>
      shouldFail
        ? { ok: false, error: 'নেটওয়ার্ক ত্রুটি: পেজ লোড ব্যর্থ' }
        : { ok: true };

    const nav = new InMemoryNavigationController({ loader: flakyLoader });

    const failed: LoadResult = await nav.navigate(TAB, 'https://a.example');
    expect(failed.state).toBe(LoadState.Failed);
    expect(failed.error).toBeDefined();
    expect(failed.error).toContain('নেটওয়ার্ক ত্রুটি');
    expect(nav.getLoadState(TAB)).toBe(LoadState.Failed);

    // পুনরায় চেষ্টা (retry) — এবার লোডার সফল হয়।
    shouldFail = false;
    const retried = await nav.retry(TAB);
    expect(retried.state).toBe(LoadState.Loaded);
    expect(retried.url).toBe('https://a.example');
    expect(nav.getLoadState(TAB)).toBe(LoadState.Loaded);

    // retry নতুন এন্ট্রি যোগ করে না (একই URL, একই স্ট্যাক দৈর্ঘ্য)।
    const stack = nav.getNavigationStack(TAB);
    expect(stack.entries).toHaveLength(1);
    expect(stack.currentIndex).toBe(0);
  });
});
