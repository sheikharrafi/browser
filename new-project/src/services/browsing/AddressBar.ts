// উপাদান ২: Address_Bar — URL ইনপুট যাচাই ও নেভিগেশন/অনুসন্ধানে রাউটিং পরিচালনা করে।
// প্রয়োজনীয়তা: ২.১, ২.২। (ইন্টারফেস স্বাক্ষর; বাস্তবায়ন Task 4.1-এ।)

import type { NavigationTarget, Url } from '../../types';

export interface AddressBar {
  /** বৈধ URL হলে NavigateTo, অন্যথায় SearchQuery টার্গেট ফেরত দেয় (Req 2.1, 2.2)। */
  submitInput(text: string): NavigationTarget;

  /** ইনপুট টেক্সট একটি বৈধ URL কিনা যাচাই করে। */
  isValidUrl(text: string): boolean;

  /** সক্রিয় ট্যাবের বর্তমান URL প্রদর্শন করে। */
  displayUrl(url: Url): void;
}


// ----------------------------------------------------------------------------
// বাস্তবায়ন (Task 4.1): InMemoryAddressBar
//
// একটি বিশুদ্ধ ইন-মেমরি ডোমেইন বাস্তবায়ন (Electron webContents ওয়্যারিং নয় —
// সেটি Task 19/21-এ)। ইনপুট টেক্সট বৈধ URL হলে নেভিগেশন টার্গেট (NavigateTo),
// নতুবা নির্ধারিত অনুসন্ধান ইঞ্জিনে অনুসন্ধান প্রশ্ন (SearchQuery) হিসেবে রাউট করে।
// (Req 2.1, 2.2)
// ----------------------------------------------------------------------------

// ডিফল্ট অনুসন্ধান ইঞ্জিন প্রিফিক্স — অবৈধ ইনপুট এর সাথে যুক্ত করে অনুসন্ধান URL তৈরি হয়।
const DEFAULT_SEARCH_ENGINE = 'https://www.google.com/search?q=';

// স্কিমসহ URL সনাক্ত করার রেগেক্স (যেমন http://, https://, ftp://, file://)।
const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;

// localhost (ঐচ্ছিক পোর্ট/পাথসহ)।
const LOCALHOST_RE = /^localhost(:\d+)?(\/.*)?$/i;

// ডোমেইন-সদৃশ হোস্ট: এক বা একাধিক লেবেল, কমপক্ষে একটি ডট এবং ≥২ অক্ষরের TLD।
const DOMAIN_RE =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

export class InMemoryAddressBar implements AddressBar {
  private readonly searchEngine: string;
  // সক্রিয় ট্যাবে সর্বশেষ প্রদর্শিত URL (displayUrl দ্বারা সেট)।
  private displayedUrl?: Url;

  constructor(options?: { searchEngine?: string }) {
    this.searchEngine = options?.searchEngine ?? DEFAULT_SEARCH_ENGINE;
  }

  submitInput(text: string): NavigationTarget {
    // বৈধ URL → স্বাভাবিকীকৃত (normalized) ঠিকানায় নেভিগেট করি (Req 2.1)।
    if (this.isValidUrl(text)) {
      return { kind: 'NavigateTo', url: this.normalize(text) };
    }
    // অবৈধ → টেক্সটকে অনুসন্ধান প্রশ্ন হিসেবে অনুসন্ধান ইঞ্জিনে পাঠাই (Req 2.2)।
    return { kind: 'SearchQuery', url: this.buildSearchUrl(text) };
  }

  isValidUrl(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.length === 0) return false;
    // অভ্যন্তরীণ whitespace থাকলে এটি একটি অনুসন্ধান প্রশ্ন, URL নয়।
    if (/\s/.test(trimmed)) return false;

    // সুস্পষ্ট স্কিম থাকলে WHATWG URL পার্সার দিয়ে যাচাই করি।
    if (SCHEME_RE.test(trimmed)) {
      try {
        const u = new URL(trimmed);
        return u.protocol === 'file:' || u.hostname.length > 0;
      } catch {
        return false;
      }
    }

    // স্কিম ছাড়া: localhost বা ডোমেইন-সদৃশ হোস্ট গ্রহণযোগ্য।
    if (LOCALHOST_RE.test(trimmed)) return true;
    const host = trimmed.split('/')[0].split('?')[0].split(':')[0];
    return DOMAIN_RE.test(host);
  }

  displayUrl(url: Url): void {
    // সক্রিয় ট্যাবের বর্তমান URL সংরক্ষণ করি (UI ওয়্যারিং Task 19/21-এ)।
    this.displayedUrl = url;
  }

  /** displayUrl দ্বারা সর্বশেষ প্রদর্শিত URL ফেরত দেয় (টেস্ট/পরিদর্শনের জন্য)। */
  getDisplayedUrl(): Url | undefined {
    return this.displayedUrl;
  }

  // স্কিম থাকলে WHATWG-স্বাভাবিকীকৃত href; নতুবা https:// প্রিফিক্স যুক্ত করে।
  private normalize(text: string): Url {
    const trimmed = text.trim();
    if (SCHEME_RE.test(trimmed)) {
      try {
        return new URL(trimmed).href;
      } catch {
        return trimmed;
      }
    }
    return `https://${trimmed}`;
  }

  // অবৈধ ইনপুটকে নির্ধারিত অনুসন্ধান ইঞ্জিনের প্রশ্ন URL-এ রূপান্তর করে।
  private buildSearchUrl(text: string): Url {
    return `${this.searchEngine}${encodeURIComponent(text.trim())}`;
  }
}
