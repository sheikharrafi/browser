// উপাদান ৫: History_Manager — পরিদর্শন রেকর্ড সংরক্ষণ, অনুসন্ধান, প্রদর্শন ও মুছে ফেলা পরিচালনা করে।
// ইনকগনিটো মোডে রেকর্ড সংরক্ষণ করে না।
// প্রয়োজনীয়তা: ৪.১–৪.৫। (ইন্টারফেস স্বাক্ষর; বাস্তবায়ন Task 6.1-এ।)

import type { HistoryRecord, RecordId, Result, Timestamp, Url } from '../../types';

export interface HistoryManager {
  /** পরিদর্শন রেকর্ড সংরক্ষণ করে; ইনকগনিটো হলে কিছু করে না (Req 4.1, 4.5)। */
  recordVisit(
    title: string,
    url: Url,
    visitedAt: Timestamp,
    incognito: boolean,
  ): Result;

  /** visited_at অনুসারে অবরোহী ক্রমে রেকর্ড ফেরত দেয় (Req 4.2)। */
  listHistory(): ReadonlyArray<HistoryRecord>;

  /** শিরোনাম/URL-এ মিলযুক্ত রেকর্ড ফেরত দেয় (Req 4.3)। */
  searchHistory(query: string): ReadonlyArray<HistoryRecord>;

  /** নির্বাচিত রেকর্ড স্থায়ীভাবে সরায় (Req 4.4)। */
  deleteRecords(ids: ReadonlyArray<RecordId>): Result;
}

// ----------------------------------------------------------------------------
// বাস্তবায়ন (Task 6.1): InMemoryHistoryManager
//
// একটি বিশুদ্ধ ইন-মেমরি ডোমেইন বাস্তবায়ন (স্থায়িত্ব/সিঙ্ক ওয়্যারিং নয় — সেটি
// Task 17/21-এ)। পরিদর্শন রেকর্ড সংরক্ষণ, অবরোহী সময়-ক্রমে প্রদর্শন, অনুসন্ধান
// ও স্থায়ী অপসারণ পরিচালনা করে এবং ইনকগনিটো মোডে কিছু সংরক্ষণ করে না।
// (Req 4.1–4.5)
// ----------------------------------------------------------------------------

export class InMemoryHistoryManager implements HistoryManager {
  private readonly records = new Map<RecordId, HistoryRecord>();
  // সন্নিবেশের ক্রম বজায় রাখতে একটি মনোটোনিক ক্রম-সংখ্যা — সমান visitedAt-এর
  // জন্য নির্ধারণমূলক (deterministic) টাই-ব্রেকিং নিশ্চিত করে।
  private readonly insertionSeq = new Map<RecordId, number>();
  private recSeq = 0;
  private seqCounter = 0;

  private nextRecordId(): RecordId {
    this.recSeq += 1;
    return `rec-${this.recSeq}` as RecordId;
  }

  /**
   * পরিদর্শন রেকর্ড সংরক্ষণ করে। ইনকগনিটো মোডে কোনো রেকর্ড সংরক্ষণ করে না
   * (Req 4.1, 4.5)। উভয় ক্ষেত্রেই সফলতা (ok) ফেরত দেয়।
   */
  recordVisit(
    title: string,
    url: Url,
    visitedAt: Timestamp,
    incognito: boolean,
  ): Result {
    if (incognito) {
      // ইনকগনিটো সেশনে পরিদর্শন রেকর্ড সংরক্ষণ থেকে বিরত থাকি (Req 4.5)।
      return { ok: true, value: undefined };
    }
    const record: HistoryRecord = {
      id: this.nextRecordId(),
      title,
      url,
      visitedAt,
    };
    this.records.set(record.id, record);
    this.seqCounter += 1;
    this.insertionSeq.set(record.id, this.seqCounter);
    return { ok: true, value: undefined };
  }

  /**
   * visited_at অনুসারে অবরোহী (descending) ক্রমে সকল রেকর্ড ফেরত দেয় (Req 4.2)।
   * সমান visited_at-এর ক্ষেত্রে সর্বশেষ সন্নিবেশিত রেকর্ড আগে আসে (নির্ধারণমূলক)।
   */
  listHistory(): ReadonlyArray<HistoryRecord> {
    return [...this.records.values()].sort((a, b) => {
      if (b.visitedAt !== a.visitedAt) {
        return b.visitedAt - a.visitedAt;
      }
      // সমান সময় → সন্নিবেশ-ক্রমে অবরোহী (সর্বশেষ আগে)।
      return (
        (this.insertionSeq.get(b.id) ?? 0) - (this.insertionSeq.get(a.id) ?? 0)
      );
    });
  }

  /**
   * শিরোনাম বা URL-এ অনুসন্ধান শব্দ (case-insensitive) ধারণকারী রেকর্ড ফেরত দেয়
   * (Req 4.3)। ফলাফল listHistory()-এর মতো অবরোহী সময়-ক্রমে থাকে।
   */
  searchHistory(query: string): ReadonlyArray<HistoryRecord> {
    const needle = query.toLowerCase();
    return this.listHistory().filter(
      (r) =>
        r.title.toLowerCase().includes(needle) ||
        r.url.toLowerCase().includes(needle),
    );
  }

  /**
   * প্রদত্ত শনাক্তকারীর রেকর্ডগুলো স্থায়ীভাবে সরায় (Req 4.4)। অজানা শনাক্তকারী
   * নীরবে উপেক্ষা করা হয়; অপারেশন সর্বদা সফলতা ফেরত দেয়।
   */
  deleteRecords(ids: ReadonlyArray<RecordId>): Result {
    for (const id of ids) {
      this.records.delete(id);
      this.insertionSeq.delete(id);
    }
    return { ok: true, value: undefined };
  }

  // --------------------------------------------------------------------------
  // অতিরিক্ত পরিদর্শন পদ্ধতি (ইন্টারফেসের বাইরে; ওয়্যারিং ও টেস্টে ব্যবহৃত)
  // --------------------------------------------------------------------------

  /** নির্দিষ্ট রেকর্ড ফেরত দেয় (পরিদর্শন/টেস্টের জন্য)। */
  getRecord(id: RecordId): HistoryRecord | undefined {
    return this.records.get(id);
  }

  /** সংরক্ষিত রেকর্ডের মোট সংখ্যা (পরিদর্শন/টেস্টের জন্য)। */
  count(): number {
    return this.records.size;
  }
}
