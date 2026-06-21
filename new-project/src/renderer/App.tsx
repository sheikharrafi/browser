// Chrome-অভিন্ন (hubhu) UI শেল — বিশুদ্ধ উপস্থাপনা স্তর (Req 12.1)।
// সকল ক্রিয়া preload-উন্মুক্ত `window.browser` API-এর মাধ্যমে মূল প্রসেসের ডোমেইন
// পরিষেবায় (Tab_Manager, Address_Bar, Navigation_Controller, Bookmark_Manager,
// History_Manager, Download_Manager) প্রেরিত হয় — এই কম্পোনেন্ট কোনো ব্যবসায়িক
// যুক্তি ধারণ করে না।

import { useEffect, useState, useCallback } from 'react';
import type {
  AppSnapshot,
  BookmarkState,
  DownloadState,
  HistoryState,
  TabState,
} from '../shared/ipc';

type Panel = 'none' | 'bookmarks' | 'history' | 'downloads';

const EMPTY_SNAPSHOT: AppSnapshot = { tabs: [], downloads: [] };

export function App(): JSX.Element {
  const [snapshot, setSnapshot] = useState<AppSnapshot>(EMPTY_SNAPSHOT);
  const [omnibox, setOmnibox] = useState('');
  const [editing, setEditing] = useState(false);
  const [panel, setPanel] = useState<Panel>('none');
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<ReadonlyArray<BookmarkState>>([]);
  const [historyRows, setHistoryRows] = useState<ReadonlyArray<HistoryState>>(
    [],
  );
  const [historyQuery, setHistoryQuery] = useState('');

  const activeTab: TabState | undefined = snapshot.tabs.find(
    (t) => t.id === snapshot.activeTabId,
  );

  // প্রাথমিক অবস্থা + মূল প্রসেস থেকে লাইভ আপডেট সাবস্ক্রিপশন।
  useEffect(() => {
    void window.browser.getState().then(setSnapshot);
    const unsubscribe = window.browser.onUpdate(setSnapshot);
    return unsubscribe;
  }, []);

  // ব্যবহারকারী সম্পাদনা না করলে অমনিবক্স সক্রিয় ট্যাবের URL দেখায়।
  useEffect(() => {
    if (!editing) setOmnibox(activeTab?.url ?? '');
  }, [activeTab?.url, editing]);

  const refreshBookmarks = useCallback(() => {
    void window.browser.listBookmarks().then(setBookmarks);
  }, []);
  const refreshHistory = useCallback(() => {
    void window.browser.listHistory().then(setHistoryRows);
  }, []);

  // প্যানেল ডেটা প্যানেল খোলার সময় লোড করি এবং স্ন্যাপশট বদলালে রিফ্রেশ করি।
  useEffect(() => {
    if (panel === 'bookmarks') refreshBookmarks();
    if (panel === 'history') refreshHistory();
  }, [panel, snapshot, refreshBookmarks, refreshHistory]);

  const submitOmnibox = (e: React.FormEvent): void => {
    e.preventDefault();
    if (omnibox.trim().length === 0) return;
    void window.browser.navigate(omnibox);
    setEditing(false);
  };

  const openPanel = (p: Panel): void => {
    setMenuOpen(false);
    setPanel((cur) => (cur === p ? 'none' : p));
  };

  const onHistorySearch = (q: string): void => {
    setHistoryQuery(q);
    if (q.trim().length === 0) {
      void window.browser.listHistory().then(setHistoryRows);
    } else {
      void window.browser.searchHistory(q).then(setHistoryRows);
    }
  };

  return (
    <>
      <TabBar
        tabs={snapshot.tabs}
        onActivate={(id) => void window.browser.activateTab(id)}
        onClose={(id) => void window.browser.closeTab(id)}
        onNew={() => void window.browser.newTab()}
      />

      <div className="toolbar">
        <div
          className={`tbtn${activeTab?.canGoBack ? '' : ' disabled'}`}
          title="পিছনে"
          onClick={() => void window.browser.goBack()}
        >
          ←
        </div>
        <div
          className={`tbtn${activeTab?.canGoForward ? '' : ' disabled'}`}
          title="সামনে"
          onClick={() => void window.browser.goForward()}
        >
          →
        </div>
        <div
          className="tbtn"
          title="রিলোড"
          onClick={() => void window.browser.reload()}
        >
          {activeTab?.loading ? '✕' : '⟳'}
        </div>

        <form className="omnibox" onSubmit={submitOmnibox}>
          <span className="lock">{activeTab?.loading ? '…' : '🔒'}</span>
          <input
            value={omnibox}
            placeholder="অনুসন্ধান করুন বা একটি URL টাইপ করুন"
            onChange={(e) => setOmnibox(e.target.value)}
            onFocus={() => setEditing(true)}
            onBlur={() => setEditing(false)}
          />
          <span
            className="lock"
            title="এই পেজ বুকমার্ক করুন"
            onMouseDown={(e) => {
              e.preventDefault();
              void window.browser.addBookmark();
            }}
          >
            ☆
          </span>
        </form>

        <div
          className="tbtn"
          title="ডাউনলোড"
          onClick={() => openPanel('downloads')}
        >
          ⤓
        </div>
        <div
          className="tbtn"
          title="বুকমার্ক"
          onClick={() => openPanel('bookmarks')}
        >
          ★
        </div>
        <div className="tbtn" title="প্রোফাইল">
          ◓
        </div>
        <div
          className="tbtn"
          title="আরও"
          onClick={() => setMenuOpen((v) => !v)}
        >
          ⋮
        </div>
      </div>

      {menuOpen && (
        <div className="menu">
          <div className="item" onClick={() => void window.browser.newTab()}>
            নতুন ট্যাব
          </div>
          <div className="item" onClick={() => openPanel('history')}>
            ইতিহাস
          </div>
          <div className="item" onClick={() => openPanel('bookmarks')}>
            বুকমার্ক
          </div>
          <div className="item" onClick={() => openPanel('downloads')}>
            ডাউনলোড
          </div>
        </div>
      )}

      {panel === 'bookmarks' && (
        <BookmarksPanel
          bookmarks={bookmarks}
          onOpen={(id) => void window.browser.openBookmark(id)}
          onRemove={(id) => {
            void window.browser.removeBookmark(id);
            refreshBookmarks();
          }}
          onClose={() => setPanel('none')}
        />
      )}

      {panel === 'history' && (
        <HistoryPanel
          rows={historyRows}
          query={historyQuery}
          onSearch={onHistorySearch}
          onOpen={(url) => void window.browser.navigate(url)}
          onDelete={(id) => {
            void window.browser.deleteHistory([id]);
            setHistoryRows((rows) => rows.filter((r) => r.id !== id));
          }}
          onClose={() => setPanel('none')}
        />
      )}

      {panel === 'downloads' && (
        <DownloadsPanel
          downloads={snapshot.downloads}
          onClose={() => setPanel('none')}
        />
      )}
    </>
  );
}

function TabBar(props: {
  tabs: ReadonlyArray<TabState>;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}): JSX.Element {
  return (
    <div className="tabbar">
      {props.tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab${tab.isActive ? ' active' : ''}`}
          onClick={() => props.onActivate(tab.id)}
        >
          {tab.icon ? (
            <img className="favicon" src={tab.icon} alt="" />
          ) : (
            <span className="favicon" />
          )}
          <span className="title">
            {tab.loading ? 'লোড হচ্ছে…' : tab.title || 'নতুন ট্যাব'}
          </span>
          <span
            className="close"
            onClick={(e) => {
              e.stopPropagation();
              props.onClose(tab.id);
            }}
          >
            ×
          </span>
        </div>
      ))}
      <div className="newtab" title="নতুন ট্যাব" onClick={props.onNew}>
        +
      </div>
    </div>
  );
}

function BookmarksPanel(props: {
  bookmarks: ReadonlyArray<BookmarkState>;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}): JSX.Element {
  return (
    <div className="panel">
      <h3>বুকমার্ক</h3>
      <div className="list">
        {props.bookmarks.length === 0 && (
          <div className="empty">কোনো বুকমার্ক নেই</div>
        )}
        {props.bookmarks.map((b) => (
          <div className="row" key={b.id} onClick={() => props.onOpen(b.id)}>
            <span className="favicon" />
            <div className="meta">
              <div className="t">{b.title}</div>
              <div className="u">{b.url}</div>
            </div>
            <span
              className="act"
              onClick={(e) => {
                e.stopPropagation();
                props.onRemove(b.id);
              }}
            >
              ×
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryPanel(props: {
  rows: ReadonlyArray<HistoryState>;
  query: string;
  onSearch: (q: string) => void;
  onOpen: (url: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}): JSX.Element {
  return (
    <div className="panel">
      <h3>ইতিহাস</h3>
      <div className="searchbox">
        <input
          value={props.query}
          placeholder="ইতিহাস অনুসন্ধান করুন"
          onChange={(e) => props.onSearch(e.target.value)}
        />
      </div>
      <div className="list">
        {props.rows.length === 0 && (
          <div className="empty">কোনো ইতিহাস রেকর্ড নেই</div>
        )}
        {props.rows.map((r) => (
          <div className="row" key={r.id} onClick={() => props.onOpen(r.url)}>
            <span className="favicon" />
            <div className="meta">
              <div className="t">{r.title}</div>
              <div className="u">{r.url}</div>
            </div>
            <span
              className="act"
              onClick={(e) => {
                e.stopPropagation();
                props.onDelete(r.id);
              }}
            >
              ×
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DownloadsPanel(props: {
  downloads: ReadonlyArray<DownloadState>;
  onClose: () => void;
}): JSX.Element {
  return (
    <div className="panel">
      <h3>ডাউনলোড</h3>
      <div className="list">
        {props.downloads.length === 0 && (
          <div className="empty">কোনো ডাউনলোড নেই</div>
        )}
        {props.downloads.map((d) => (
          <div className="row" key={d.id}>
            <span className="favicon" />
            <div className="meta">
              <div className="t">{d.filename}</div>
              <div className="u">
                {d.status} · {formatBytes(d.receivedBytes)}
                {d.totalBytes > 0 ? ` / ${formatBytes(d.totalBytes)}` : ''}
                {d.speed > 0 ? ` · ${formatBytes(d.speed)}/s` : ''}
              </div>
              <div className="progress">
                <div style={{ width: `${Math.round(d.percent)}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
