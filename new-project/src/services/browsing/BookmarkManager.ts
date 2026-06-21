// উপাদান ৪: Bookmark_Manager — বুকমার্ক সংরক্ষণ, অপসারণ, সম্পাদনা ও ফোল্ডার সংগঠন পরিচালনা করে।
// প্রয়োজনীয়তা: ৩.১–৩.৫। (ইন্টারফেস স্বাক্ষর; বাস্তবায়ন Task 5.1-এ।)

import type {
  Bookmark,
  BookmarkId,
  Folder,
  FolderId,
  Result,
  Url,
} from '../../types';

export interface BookmarkManager {
  /** পেজের শিরোনাম ও URL সহ বুকমার্ক সংরক্ষণ করে (Req 3.1)। */
  addBookmark(title: string, url: Url, folderId?: FolderId): Bookmark;

  /** বুকমার্ক তালিকা থেকে সরায় (Req 3.2)। */
  removeBookmark(bookmarkId: BookmarkId): Result;

  /** বুকমার্কের নাম হালনাগাদ করে (Req 3.5)। */
  renameBookmark(bookmarkId: BookmarkId, newName: string): Result;

  /** বুকমার্ককে একটি ফোল্ডারে স্থানান্তর করে (Req 3.4)। */
  moveToFolder(bookmarkId: BookmarkId, folderId: FolderId): Result;

  /** নতুন বুকমার্ক ফোল্ডার তৈরি করে (Req 3.4)। */
  createFolder(name: string): Folder;

  /** বুকমার্ক তালিকা ফেরত দেয় (ঐচ্ছিকভাবে ফোল্ডার অনুসারে)। */
  listBookmarks(folderId?: FolderId): ReadonlyArray<Bookmark>;
}

// ----------------------------------------------------------------------------
// বাস্তবায়ন (Task 5.1): InMemoryBookmarkManager
//
// একটি বিশুদ্ধ ইন-মেমরি ডোমেইন বাস্তবায়ন (স্থায়িত্ব/সিঙ্ক ওয়্যারিং নয় — সেটি
// Task 17/21-এ)। বুকমার্ক সংরক্ষণ, অপসারণ, নাম সম্পাদনা, ফোল্ডারে স্থানান্তর ও
// ফোল্ডার সংগঠন পরিচালনা করে। (Req 3.1–3.5)
//
// বুকমার্ক নির্বাচনে সংশ্লিষ্ট URL Navigation_Controller-এর মাধ্যমে লোড হওয়ার
// কথা (Req 3.3); এখানে প্রকৃত নেভিগেশন ওয়্যার করা হয়নি — পরিবর্তে নির্বাচন
// নির্বাচিত বুকমার্কের URL ফেরত দেয় এবং একটি ঐচ্ছিক injectable কলব্যাক
// (`BookmarkNavigator`) আহ্বান করে। প্রকৃত সংযোগ Task 19/21-এ হবে।
// ----------------------------------------------------------------------------

// বুকমার্ক নির্বাচনে আহূত নেভিগেশন কলব্যাক (Navigation_Controller-এ ওয়্যারিং বিমূর্তকরণ)।
export type BookmarkNavigator = (url: Url) => void;

export class InMemoryBookmarkManager implements BookmarkManager {
  private readonly bookmarks = new Map<BookmarkId, Bookmark>();
  private readonly folders = new Map<FolderId, Folder>();
  // সন্নিবেশের ক্রম বজায় রাখতে আলাদা তালিকা (Map সন্নিবেশ-ক্রম রক্ষা করে, তবু স্পষ্টতার জন্য)।
  private bookmarkOrder: BookmarkId[] = [];
  private bmSeq = 0;
  private folderSeq = 0;
  private readonly navigator?: BookmarkNavigator;

  constructor(options?: { onNavigate?: BookmarkNavigator }) {
    this.navigator = options?.onNavigate;
  }

  private nextBookmarkId(): BookmarkId {
    this.bmSeq += 1;
    return `bm-${this.bmSeq}` as BookmarkId;
  }

  private nextFolderId(): FolderId {
    this.folderSeq += 1;
    return `folder-${this.folderSeq}` as FolderId;
  }

  addBookmark(title: string, url: Url, folderId?: FolderId): Bookmark {
    const bookmark: Bookmark = {
      id: this.nextBookmarkId(),
      title,
      url,
      // অজানা ফোল্ডার উপেক্ষা করি — শীর্ষ-স্তরে (undefined) রাখি।
      folderId:
        folderId !== undefined && this.folders.has(folderId)
          ? folderId
          : undefined,
    };
    this.bookmarks.set(bookmark.id, bookmark);
    this.bookmarkOrder.push(bookmark.id);
    return bookmark;
  }

  removeBookmark(bookmarkId: BookmarkId): Result {
    if (!this.bookmarks.has(bookmarkId)) {
      return { ok: false, error: `Bookmark not found: ${bookmarkId}` };
    }
    this.bookmarks.delete(bookmarkId);
    this.bookmarkOrder = this.bookmarkOrder.filter((id) => id !== bookmarkId);
    return { ok: true, value: undefined };
  }

  renameBookmark(bookmarkId: BookmarkId, newName: string): Result {
    const existing = this.bookmarks.get(bookmarkId);
    if (existing === undefined) {
      return { ok: false, error: `Bookmark not found: ${bookmarkId}` };
    }
    // হালনাগাদকৃত নাম সংরক্ষণ করি (Req 3.5)।
    this.bookmarks.set(bookmarkId, { ...existing, title: newName });
    return { ok: true, value: undefined };
  }

  moveToFolder(bookmarkId: BookmarkId, folderId: FolderId): Result {
    const existing = this.bookmarks.get(bookmarkId);
    if (existing === undefined) {
      return { ok: false, error: `Bookmark not found: ${bookmarkId}` };
    }
    if (!this.folders.has(folderId)) {
      return { ok: false, error: `Folder not found: ${folderId}` };
    }
    // বুকমার্কের অন্যান্য বৈশিষ্ট্য (id, title, url) অপরিবর্তিত রেখে ফোল্ডার নির্ধারণ (Req 3.4)।
    this.bookmarks.set(bookmarkId, { ...existing, folderId });
    return { ok: true, value: undefined };
  }

  createFolder(name: string): Folder {
    const folder: Folder = { id: this.nextFolderId(), name };
    this.folders.set(folder.id, folder);
    return folder;
  }

  listBookmarks(folderId?: FolderId): ReadonlyArray<Bookmark> {
    const all = this.bookmarkOrder.map((id) => this.bookmarks.get(id)!);
    if (folderId === undefined) {
      return all;
    }
    return all.filter((b) => b.folderId === folderId);
  }

  // --------------------------------------------------------------------------
  // অতিরিক্ত পরিদর্শন/নিয়ন্ত্রণ পদ্ধতি (ইন্টারফেসের বাইরে; ওয়্যারিং ও টেস্টে ব্যবহৃত)
  // --------------------------------------------------------------------------

  /**
   * একটি সংরক্ষিত বুকমার্ক নির্বাচন করে সংশ্লিষ্ট URL ফেরত দেয় এবং (থাকলে)
   * নেভিগেশন কলব্যাক আহ্বান করে — Navigation_Controller সেই URL লোড করবে (Req 3.3)।
   * বুকমার্ক না পাওয়া গেলে undefined ফেরত দেয় (কোনো নেভিগেশন ঘটে না)।
   */
  selectBookmark(bookmarkId: BookmarkId): Url | undefined {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (bookmark === undefined) return undefined;
    this.navigator?.(bookmark.url);
    return bookmark.url;
  }

  /** নির্দিষ্ট বুকমার্ক ফেরত দেয় (পরিদর্শন/টেস্টের জন্য)। */
  getBookmark(bookmarkId: BookmarkId): Bookmark | undefined {
    return this.bookmarks.get(bookmarkId);
  }

  /** সকল ফোল্ডারের তালিকা ফেরত দেয়। */
  listFolders(): ReadonlyArray<Folder> {
    return [...this.folders.values()];
  }
}
