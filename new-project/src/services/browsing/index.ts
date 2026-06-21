// ব্রাউজিং কোর (Browsing Core) — উপাদান ১–৫ এর ইন্টারফেস ব্যারেল।
export type { TabManager } from './TabManager';
export { InMemoryTabManager } from './TabManager';
export type { AddressBar } from './AddressBar';
export { InMemoryAddressBar } from './AddressBar';
export type { NavigationController } from './NavigationController';
export {
  InMemoryNavigationController,
} from './NavigationController';
export type {
  LoadOutcome,
  PageLoader,
  LoadStateObserver,
} from './NavigationController';
export type { BookmarkManager } from './BookmarkManager';
export { InMemoryBookmarkManager } from './BookmarkManager';
export type { BookmarkNavigator } from './BookmarkManager';
export type { HistoryManager } from './HistoryManager';
export { InMemoryHistoryManager } from './HistoryManager';
