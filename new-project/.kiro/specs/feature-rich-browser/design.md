# নকশা নথি (Design Document)

## ওভারভিউ (Overview)

এই নথিতে `feature-rich-browser` অ্যাপ্লিকেশনের প্রযুক্তিগত নকশা বর্ণনা করা হয়েছে। অ্যাপ্লিকেশনটি একটি পূর্ণ-বৈশিষ্ট্যসম্পন্ন ওয়েব ব্রাউজার (Chrome-এর অনুরূপ) এবং একটি উন্নত ডাউনলোড ম্যানেজার (1DM Plus / IDM-এর অনুরূপ) — এই দুটির একটি হাইব্রিড ডেস্কটপ অ্যাপ্লিকেশন। নকশাটি দুটি প্রধান কার্যকরী ডোমেইনে বিভক্ত:

- **ব্রাউজিং কোর (Browsing Core)**: ট্যাব ব্যবস্থাপনা, অ্যাড্রেস বার, নেভিগেশন, বুকমার্ক এবং ইতিহাস।
- **ডাউনলোড কোর (Download Core)**: ডাউনলোড সূচনা ও ব্যবস্থাপনা, সেগমেন্টেড/ত্বরান্বিত ডাউনলোড, পজ/রিজিউম, শিডিউলিং এবং মিডিয়া ক্যাপচার।
- **প্রাইভেসি/নেটওয়ার্ক কোর (Privacy / Network Core)**: একটি শক্তিশালী, দ্রুতগতির অন্তর্নির্মিত VPN সিস্টেম যা ব্যবহারকারীকে যেকোনো উপলব্ধ ভৌগোলিক অবস্থান (location) নির্বাচন করে সেই অবস্থানের মাধ্যমে সমস্ত ব্রাউজিং ও ডাউনলোড ট্রাফিক রাউট করতে দেয়।

অ্যাপ্লিকেশনটি Windows, macOS এবং Linux-এ চলবে এবং একটি প্ল্যাটফর্ম-নিরপেক্ষ বিমূর্তকরণ স্তর (abstraction layer) ব্যবহার করে অভিন্ন কার্যকারিতা নিশ্চিত করবে।

> **নোট (VPN সিস্টেম — আনুষ্ঠানিক):** ব্যবহারকারীর অনুরোধ অনুযায়ী একটি শক্তিশালী ও অতি-দ্রুত **VPN সিস্টেম** (অবস্থান-নির্বাচনযোগ্য, দ্রুত ও মসৃণ) এই নকশায় `VPN_Manager` উপাদান হিসেবে যুক্ত করা হয়েছে। এই বৈশিষ্ট্যটি এখন `requirements.md`-তে **প্রয়োজনীয়তা ১১ (অন্তর্নির্মিত VPN ব্যবস্থা)** হিসেবে আনুষ্ঠানিকভাবে অন্তর্ভুক্ত।

> **নোট (কর্মক্ষমতা ও UI — আনুষ্ঠানিক):** ব্যবহারকারীর অনুরোধ অনুযায়ী অ্যাপ্লিকেশনটির ব্যবহারকারী ইন্টারফেস **Google Chrome-এর সাথে দৃশ্যত অভিন্ন (hubhu/identical)** হবে এবং এটি অতি-দ্রুত ও মসৃণভাবে চলবে। এই দাবিগুলো এখন `requirements.md`-তে **প্রয়োজনীয়তা ১২ (কর্মক্ষমতা ও ব্যবহারকারী অভিজ্ঞতা)** হিসেবে আনুষ্ঠানিকভাবে অন্তর্ভুক্ত এবং নিচে "Chrome-অভিন্ন UI ও কর্মক্ষমতা" বিভাগে নকশা করা হয়েছে।

> **নোট (বাস্তবায়ন প্রযুক্তি — নির্বাচিত):** বাস্তবায়নের প্রযুক্তি এখন নির্বাচিত হয়েছে — **Electron + TypeScript (UI-এর জন্য React সহ)**। অ্যাপ্লিকেশনটি `electron-builder` ব্যবহার করে Windows (`.exe`/NSIS ইনস্টলার), macOS (`.dmg`) এবং Linux (`.AppImage`) — এই তিন প্ল্যাটফর্মের জন্য ইনস্টলারে প্যাকেজ করা হবে। এই নথিতে উপস্থাপিত সিউডোকোড ইন্টারফেসগুলো সরাসরি TypeScript মডিউল/ক্লাসে ম্যাপ করা হবে (যেমন প্রতিটি `INTERFACE` একটি TypeScript ইন্টারফেস/ক্লাস হিসেবে বাস্তবায়িত হবে)।

## MVP পরিসর ও পর্যায়ক্রম (MVP Scope & Phasing)

ব্যবহারকারীর সিদ্ধান্ত অনুযায়ী একটি **MVP-প্রথম (MVP-first)** পদ্ধতি অনুসরণ করা হবে, যেখানে লক্ষ্য একটি প্রকৃত **ইনস্টলযোগ্য ডেস্কটপ অ্যাপ্লিকেশন**। বৈশিষ্ট্যগুলো তিনটি পর্যায়ে (phase) ক্রমান্বয়ে যুক্ত হবে।

### পর্যায় ১ — MVP (Phase 1: Minimum Viable Product)

পর্যায় ১ হলো একটি **প্রকৃত চালনাযোগ্য ও ইনস্টলযোগ্য Electron অ্যাপ্লিকেশন** — অর্থাৎ `electron-builder` দিয়ে তৈরি ইনস্টলার (Windows `.exe`/NSIS, macOS `.dmg`, Linux `.AppImage`) ইনস্টল করে ব্যবহারকারী সরাসরি চালাতে পারবেন। এই পর্যায়ে নিম্নলিখিত মূল ব্রাউজিং বৈশিষ্ট্যগুলো অন্তর্ভুক্ত:

- **ট্যাব ব্যবস্থাপনা** — `Tab_Manager` (প্রয়োজনীয়তা ১)।
- **অ্যাড্রেস বার ও নেভিগেশন** — `Address_Bar` ও `Navigation_Controller`, Electron-এর `BrowserView`/`webContents` ব্যবহার করে প্রকৃত পেজ লোডিং (প্রয়োজনীয়তা ২)।
- **বুকমার্ক** — `Bookmark_Manager` (প্রয়োজনীয়তা ৩)।
- **ইতিহাস** — `History_Manager` (প্রয়োজনীয়তা ৪)।
- **বেসিক ডাউনলোড ম্যানেজার** — `Download_Manager` দিয়ে মৌলিক (একক-সংযোগ) ডাউনলোড সূচনা, অগ্রগতি ও তালিকা (প্রয়োজনীয়তা ৫)।

> **MVP চালনাযোগ্যতা নিশ্চিতকরণ:** পর্যায় ১-এর সমাপ্তিতে অ্যাপটি একটি সত্যিকারের ইনস্টলযোগ্য ও চালনাযোগ্য ব্রাউজার হবে — ব্যবহারকারী এটি ইনস্টল করে ট্যাব খুলতে, ওয়েবসাইট ব্রাউজ করতে, বুকমার্ক ও ইতিহাস ব্যবহার করতে এবং ফাইল ডাউনলোড করতে পারবেন।

### পর্যায় ২ — উন্নত ডাউনলোড (Phase 2: Advanced Downloads)

- ত্বরান্বিত/সেগমেন্টেড ডাউনলোড — `Download_Engine` (প্রয়োজনীয়তা ৬)।
- পজ/রিজিউম ও startup-এ অগ্রগতি পুনরুদ্ধার (প্রয়োজনীয়তা ৭)।
- ডাউনলোড শিডিউলিং — `Scheduler` (প্রয়োজনীয়তা ৮)।
- মিডিয়া ক্যাপচার — `Media_Grabber` (প্রয়োজনীয়তা ৯)।

### পর্যায় ৩ — প্রাইভেসি, এক্সটেনশন ও অ্যাকাউন্ট (Phase 3: Privacy, Extensions & Account)

- অন্তর্নির্মিত VPN — `VPN_Manager` (প্রয়োজনীয়তা ১১)।
- Chrome এক্সটেনশন সমর্থন — `Extension_Manager` (প্রয়োজনীয়তা ১৩)।
- অ্যাকাউন্ট ও সিঙ্ক — `Account_Manager` ও `Sync_Service` (প্রয়োজনীয়তা ১৪)।
- পাসওয়ার্ড ব্যবস্থাপক — `Password_Manager` (প্রয়োজনীয়তা ১৫)।

### পর্যায়-ব্যাপী (ক্রমবর্ধমানভাবে আবৃত) বৈশিষ্ট্য

- **Chrome-অভিন্ন UI ও কর্মক্ষমতা (প্রয়োজনীয়তা ১২):** প্রতিটি পর্যায়ে UI পরিমার্জিত হয়ে Chrome-এর সাথে দৃশ্যত অভিন্নতার দিকে এগোবে; পর্যায় ১ থেকেই React-ভিত্তিক UI_Shell মৌলিক Chrome-অনুরূপ বিন্যাস প্রদান করবে।
- **ক্রস-প্ল্যাটফর্ম প্যাকেজিং (প্রয়োজনীয়তা ১০):** `electron-builder` ও `Platform_Adapter` ব্যবহার করে প্রতিটি পর্যায়ের আউটপুট তিনটি প্ল্যাটফর্মের (Windows/macOS/Linux) জন্য ইনস্টলার আকারে প্যাকেজ করা হবে, ফলে প্রতিটি পর্যায় শেষেই অ্যাপটি ইনস্টলযোগ্য থাকে।

## প্রযুক্তি স্ট্যাক (Tech Stack)

- **Electron** — ক্রস-প্ল্যাটফর্ম ডেস্কটপ অ্যাপ্লিকেশন রানটাইম (Chromium + Node.js); ব্রাউজিং কোরের জন্য `BrowserView`/`webContents`।
- **TypeScript** — টাইপ-নিরাপদ অ্যাপ্লিকেশন যুক্তি; নথির সিউডোকোড ইন্টারফেসগুলো TypeScript মডিউল/ক্লাসে বাস্তবায়িত হবে।
- **React** — UI স্তরের (UI_Shell) জন্য কম্পোনেন্ট-ভিত্তিক রেন্ডারিং।
- **electron-builder** — Windows (`.exe`/NSIS), macOS (`.dmg`) ও Linux (`.AppImage`) ইনস্টলার প্যাকেজিং।
- **প্রোপার্টি-ভিত্তিক টেস্টিং লাইব্রেরি (যেমন `fast-check`)** — উপরের শুদ্ধতা বৈশিষ্ট্যসমূহ (Correctness Properties) প্রোপার্টি টেস্ট হিসেবে যাচাই করতে।

## স্থাপত্য (Architecture)

অ্যাপ্লিকেশনটি একটি স্তরীয় (layered) স্থাপত্য অনুসরণ করে যেখানে UI স্তর, পরিষেবা স্তর (service layer / domain components) এবং স্থায়িত্ব ও প্ল্যাটফর্ম স্তর পরস্পর থেকে পৃথক।

### উচ্চ-স্তরীয় স্থাপত্য চিত্র (High-Level Architecture Diagram)

```
+-----------------------------------------------------------------------+
|                          UI স্তর (UI Layer)                            |
|   Tab UI | Address Bar UI | Bookmark UI | History UI | Download UI     |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
|                  পরিষেবা স্তর (Service / Domain Layer)                  |
|                                                                       |
|  +------------------ ব্রাউজিং কোর -------------------+                  |
|  | Tab_Manager | Address_Bar | Navigation_Controller |                 |
|  | Bookmark_Manager | History_Manager                |                 |
|  +---------------------------------------------------+                 |
|                                                                       |
|  +------------------ ডাউনলোড কোর --------------------+                  |
|  | Download_Manager | Download_Engine                |                 |
|  | Media_Grabber | Scheduler                         |                 |
|  +---------------------------------------------------+                 |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
|                  প্রাইভেসি/নেটওয়ার্ক স্তর (Privacy / Network)            |
|     VPN_Manager  (অবস্থান নির্বাচন | টানেল | সব ট্রাফিক রাউটিং)           |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
|                অ্যাকাউন্ট ও সিঙ্ক স্তর (Account & Sync Layer)             |
|  Account_Manager (সাইন-ইন/আউট | সেশন) | Sync_Service (বুকমার্ক/ইতিহাস/    |
|  ট্যাব/পাসওয়ার্ড/সেটিংস সিঙ্ক ও দ্বন্দ্ব-মার্জ) | Password_Manager         |
|  (ক্রেডেনশিয়াল এনক্রিপ্ট/সংরক্ষণ/অটোফিল)                                  |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
|              স্থায়িত্ব ও প্ল্যাটফর্ম স্তর (Persistence & Platform)        |
|   Storage (DB/File) | Network Client | Platform_Adapter (Win/Mac/Linux)|
+-----------------------------------------------------------------------+
```

> **অ্যাকাউন্ট ও সিঙ্ক নীতি:** ব্যবহারকারী সাইন-ইন থাকাকালীন `Sync_Service` বুকমার্ক, ইতিহাস, খোলা ট্যাব, সংরক্ষিত পাসওয়ার্ড ও সেটিংস অ্যাকাউন্টে সিঙ্ক করে এবং নতুন ডিভাইসে সাইন-ইনে সেগুলো পুনরুদ্ধার করে। `Password_Manager` ক্রেডেনশিয়াল এনক্রিপ্টেড আকারে সংরক্ষণ করে এবং সাইন-ইন থাকাকালীন `Sync_Service`-এর মাধ্যমে সিঙ্ক হয়। এই স্তর `requirements.md`-তে **প্রয়োজনীয়তা ১৪ (অ্যাকাউন্ট ও সিঙ্ক ব্যবস্থা)** ও **প্রয়োজনীয়তা ১৫ (পাসওয়ার্ড ব্যবস্থাপক)** আনুষ্ঠানিকভাবে বাস্তবায়ন করে।

> **ট্রাফিক রাউটিং নীতি:** VPN সক্রিয় থাকলে ব্রাউজিং কোর ও ডাউনলোড কোর উভয়ের সমস্ত নেটওয়ার্ক ট্রাফিক (পেজ লোড, সেগমেন্টেড ডাউনলোড, মিডিয়া খণ্ড) `VPN_Manager`-এর সক্রিয় টানেলের মধ্য দিয়ে নির্বাচিত অবস্থান থেকে প্রবাহিত হবে।

### স্থাপত্যগত নীতিমালা (Architectural Principles)

1. **দায়িত্ব পৃথকীকরণ (Separation of Concerns):** প্রতিটি উপাদানের একটি একক, সুস্পষ্ট দায়িত্ব রয়েছে।
2. **প্ল্যাটফর্ম বিমূর্তকরণ (Platform Abstraction):** `Platform_Adapter` প্ল্যাটফর্ম-নির্দিষ্ট আচরণ (যেমন ডিফল্ট ডাউনলোড ডিরেক্টরি, ফাইল পাথ) আবৃত করে।
3. **ইভেন্ট-চালিত যোগাযোগ (Event-Driven Communication):** দীর্ঘমেয়াদী কার্যক্রম (ডাউনলোড অগ্রগতি, পেজ লোডিং) ইভেন্ট/কলব্যাকের মাধ্যমে UI-কে অবহিত করে।
4. **অবস্থা স্থায়িত্ব (State Persistence):** বুকমার্ক, ইতিহাস এবং ডাউনলোড অবস্থা অ্যাপ্লিকেশন পুনঃসূচনার মধ্যেও টিকে থাকে।

## উপাদানসমূহ ও ইন্টারফেস (Components and Interfaces)

### ১. Tab_Manager

ব্রাউজার ট্যাবের জীবনচক্র (তৈরি, বন্ধ, সক্রিয়করণ) পরিচালনা করে এবং সক্রিয় ট্যাবের অবস্থা বজায় রাখে।

**দায়িত্ব:**
- নতুন ট্যাব তৈরি ও সক্রিয় হিসেবে নির্ধারণ।
- ট্যাব বন্ধ করা এবং সংলগ্ন ট্যাব সক্রিয়করণ।
- সর্বশেষ ট্যাব বন্ধ হলে একটি খালি ট্যাব নিশ্চিত করা।

**ইন্টারফেস (সিউডোকোড):**

```
INTERFACE Tab_Manager:
    FUNCTION create_tab(url: Optional<URL>) -> Tab
        # নতুন ট্যাব তৈরি করে এবং active_tab_id হালনাগাদ করে

    FUNCTION close_tab(tab_id: TabId) -> Result
        # ট্যাব সরায়; খালি হয়ে গেলে নতুন খালি ট্যাব তৈরি করে;
        # বন্ধ হওয়া ট্যাব সক্রিয় হলে সংলগ্ন ট্যাব সক্রিয় করে

    FUNCTION activate_tab(tab_id: TabId) -> Result
        # নির্বাচিত ট্যাবকে সক্রিয় হিসেবে নির্ধারণ করে

    FUNCTION get_active_tab() -> Tab

    FUNCTION list_tabs() -> List<Tab>
```

### ২. Address_Bar

URL ইনপুট গ্রহণ, যাচাই এবং নেভিগেশন বা অনুসন্ধানের মধ্যে রাউটিং পরিচালনা করে।

**দায়িত্ব:**
- ইনপুট টেক্সট বৈধ URL কিনা যাচাই করা।
- বৈধ হলে `Navigation_Controller`-কে নেভিগেট করতে বলা; অবৈধ হলে অনুসন্ধান প্রশ্ন হিসেবে অনুসন্ধান ইঞ্জিনে পাঠানো।

**ইন্টারফেস (সিউডোকোড):**

```
INTERFACE Address_Bar:
    FUNCTION submit_input(text: String) -> NavigationTarget
        # IF is_valid_url(text) THEN RETURN NavigateTo(normalize(text))
        # ELSE RETURN SearchQuery(build_search_url(text))

    FUNCTION is_valid_url(text: String) -> Boolean

    FUNCTION display_url(url: URL)
        # সক্রিয় ট্যাবের বর্তমান URL প্রদর্শন করে
```

### ৩. Navigation_Controller

পেজ লোডিং, ইতিহাস-ভিত্তিক পিছনে/সামনে নেভিগেশন এবং রিলোড পরিচালনা করে। প্রতি ট্যাবে একটি নেভিগেশন স্ট্যাক বজায় রাখে।

**দায়িত্ব:**
- প্রদত্ত URL লোড করা ও লোডিং অবস্থা সূচক নির্গত করা।
- নেভিগেশন স্ট্যাকের মাধ্যমে পিছনে/সামনে যাওয়া।
- লোড ব্যর্থতায় ত্রুটি অবস্থা ও পুনরায় চেষ্টার বিকল্প প্রদান।

**ইন্টারফেস (সিউডোকোড):**

```
INTERFACE Navigation_Controller:
    FUNCTION navigate(tab_id: TabId, url: URL) -> LoadResult
        # current_index-এর পরের সব এন্ট্রি ছেঁটে নতুন এন্ট্রি push করে

    FUNCTION go_back(tab_id: TabId) -> Optional<URL>
        # IF can_go_back THEN current_index -= 1; load entry

    FUNCTION go_forward(tab_id: TabId) -> Optional<URL>
        # IF can_go_forward THEN current_index += 1; load entry

    FUNCTION reload(tab_id: TabId) -> LoadResult

    FUNCTION can_go_back(tab_id: TabId) -> Boolean
    FUNCTION can_go_forward(tab_id: TabId) -> Boolean
```

লোড অবস্থা: `Idle -> Loading -> Loaded | Failed`। `Failed` অবস্থায় একটি retry অ্যাকশন উপলব্ধ থাকে।

### ৪. Bookmark_Manager

বুকমার্ক সংরক্ষণ, মুছে ফেলা, সম্পাদনা এবং ফোল্ডারভিত্তিক সংগঠন পরিচালনা করে।

**ইন্টারফেস (সিউডোকোড):**

```
INTERFACE Bookmark_Manager:
    FUNCTION add_bookmark(title: String, url: URL, folder_id: Optional<FolderId>) -> Bookmark
    FUNCTION remove_bookmark(bookmark_id: BookmarkId) -> Result
    FUNCTION rename_bookmark(bookmark_id: BookmarkId, new_name: String) -> Result
    FUNCTION move_to_folder(bookmark_id: BookmarkId, folder_id: FolderId) -> Result
    FUNCTION create_folder(name: String) -> Folder
    FUNCTION list_bookmarks(folder_id: Optional<FolderId>) -> List<Bookmark>
```

### ৫. History_Manager

পরিদর্শিত পেজের রেকর্ড সংরক্ষণ, অনুসন্ধান, প্রদর্শন (সময় অনুসারে অবরোহী ক্রমে) এবং মুছে ফেলা পরিচালনা করে। ইনকগনিটো মোডে রেকর্ড সংরক্ষণ করে না।

**ইন্টারফেস (সিউডোকোড):**

```
INTERFACE History_Manager:
    FUNCTION record_visit(title: String, url: URL, visited_at: Timestamp, incognito: Boolean) -> Result
        # IF incognito THEN DO NOTHING (রেকর্ড সংরক্ষণ করবে না)
        # ELSE store record

    FUNCTION list_history() -> List<HistoryRecord>   # visited_at অনুসারে অবরোহী ক্রমে

    FUNCTION search_history(query: String) -> List<HistoryRecord>

    FUNCTION delete_records(ids: List<RecordId>) -> Result   # স্থায়ীভাবে সরায়
```

### ৬. Download_Manager

ডাউনলোড কার্য তৈরি, অবস্থা পরিবর্তন (active/completed/failed/paused), অগ্রগতি প্রদর্শন এবং পজ/রিজিউম পরিচালনা করে। প্রকৃত বাইট স্থানান্তরের জন্য `Download_Engine`-কে নিয়োজিত করে।

**ইন্টারফেস (সিউডোকোড):**

```
INTERFACE Download_Manager:
    FUNCTION create_download(url: URL, destination: Path) -> DownloadTask
    FUNCTION pause(task_id: TaskId) -> Result        # অবস্থা সংরক্ষণ করে স্থগিত করে
    FUNCTION resume(task_id: TaskId) -> Result        # Engine-কে সংরক্ষিত অবস্থান থেকে শুরু করতে বলে
    FUNCTION retry(task_id: TaskId) -> Result
    FUNCTION list_downloads(filter: StatusFilter) -> List<DownloadTask>
    FUNCTION get_progress(task_id: TaskId) -> Progress   # percent, speed, eta
    FUNCTION restore_on_startup() -> Result            # বন্ধ হওয়ার পর অগ্রগতি পুনরুদ্ধার
```

ডাউনলোড অবস্থা মেশিন: `Queued -> Active -> (Paused <-> Active) -> Completed | Failed`।

### ৭. Download_Engine

সেগমেন্টেড ও ত্বরান্বিত ডাউনলোড সম্পাদন করে। সার্ভারের byte-range সমর্থন পরীক্ষা করে, সমান্তরাল সেগমেন্ট ডাউনলোড পরিচালনা করে, ব্যর্থ সেগমেন্ট পুনরায় চেষ্টা করে এবং সম্পন্ন সেগমেন্টগুলো একত্রিত করে।

**ইন্টারফেস (সিউডোকোড):**

```
INTERFACE Download_Engine:
    FUNCTION supports_byte_range(url: URL) -> Boolean   # HEAD অনুরোধ; Accept-Ranges পরীক্ষা

    FUNCTION start(task: DownloadTask, max_connections: Integer) -> Stream<SegmentProgress>
        # IF supports_byte_range AND size_known:
        #     segments = split(total_size, segment_count <= max_connections)
        #     parallel download প্রতিটি segment
        # ELSE:
        #     single connection download

    FUNCTION resume_segment(segment: Segment) -> Result   # offset = bytes_downloaded থেকে

    FUNCTION merge_segments(segments: List<Segment>) -> File   # ক্রম অনুসারে একত্রিত

    FUNCTION retry_segment(segment: Segment) -> Result
```

### ৮. Media_Grabber

ওয়েব পেজে চলমান মিডিয়া স্ট্রিম (সরাসরি ফাইল ও HLS/DASH খণ্ডিত স্ট্রিম) সনাক্ত করে, রেজোলিউশন নির্বাচন প্রদান করে এবং নির্বাচিত মিডিয়া `Download_Manager`-এ পাঠায়।

**ইন্টারফেস (সিউডোকোড):**

```
INTERFACE Media_Grabber:
    FUNCTION detect_media(page: PageContext) -> List<MediaItem>
    FUNCTION list_resolutions(media: MediaItem) -> List<Resolution>
    FUNCTION request_download(media: MediaItem, resolution: Resolution) -> DownloadTask
        # খণ্ডিত (HLS/DASH) হলে playlist parse করে সব খণ্ড একটি কার্যে যুক্ত করে
    FUNCTION merge_fragments(fragments: List<Fragment>) -> File
```

### ৯. Scheduler

ভবিষ্যৎ সময়ে ডাউনলোড স্বয়ংক্রিয়ভাবে শুরু করা, একাধিক ডাউনলোড নির্ধারিত ক্রমে শুরু করা, সমাপ্তি-পরবর্তী কার্যক্রম সম্পাদন এবং সময়সূচি বাতিল পরিচালনা করে।

**ইন্টারফেস (সিউডোকোড):**

```
INTERFACE Scheduler:
    FUNCTION schedule(task_id: TaskId, start_time: Timestamp, order: Integer) -> ScheduleId
    FUNCTION cancel_schedule(schedule_id: ScheduleId) -> Result   # সময়সূচি সরায়
    FUNCTION on_tick(now: Timestamp)
        # due schedules-গুলো order অনুসারে আরোহী ক্রমে Download_Manager-এ শুরু করে
    FUNCTION set_post_completion_action(action: PostAction)   # যেমন: অ্যাপ বন্ধ
```

### ১০. Platform_Adapter (ক্রস-প্ল্যাটফর্ম)

প্ল্যাটফর্ম-নির্দিষ্ট আচরণ আবৃত করে যাতে মূল উপাদানগুলো প্ল্যাটফর্ম-নিরপেক্ষ থাকে।

```
INTERFACE Platform_Adapter:
    FUNCTION default_download_dir() -> Path
        # Windows: %USERPROFILE%\Downloads
        # macOS:   ~/Downloads
        # Linux:   $XDG_DOWNLOAD_DIR অথবা ~/Downloads
    FUNCTION normalize_path(path: Path) -> Path
    FUNCTION os_name() -> Enum{Windows, macOS, Linux}
```

### ১১. VPN_Manager (প্রাইভেসি / নেটওয়ার্ক)

একটি শক্তিশালী, দ্রুতগতির VPN সিস্টেম যা ব্যবহারকারীকে যেকোনো উপলব্ধ অবস্থান নির্বাচন করে সেই অবস্থানের সার্ভারের মাধ্যমে সমস্ত ব্রাউজিং ও ডাউনলোড ট্রাফিক রাউট করতে দেয়।

**দায়িত্ব:**
- উপলব্ধ VPN অবস্থানের (server location) তালিকা প্রদান।
- নির্বাচিত অবস্থানে একটি এনক্রিপ্টেড টানেল সংযোগ স্থাপন (connect) ও বিচ্ছিন্ন (disconnect)।
- সক্রিয় থাকাকালীন অ্যাপ্লিকেশনের সমস্ত নেটওয়ার্ক ট্রাফিক টানেলের মধ্য দিয়ে রাউট করা।
- দ্রুততম সংযোগের জন্য কম-লেটেন্সি সার্ভার নির্বাচনের সুযোগ এবং সংযোগ বিচ্ছিন্ন হলে ট্রাফিক ফাঁস রোধ (kill-switch)।

**ইন্টারফেস (সিউডোকোড):**

```
INTERFACE VPN_Manager:
    FUNCTION list_locations() -> List<VpnLocation>
        # সব উপলব্ধ অবস্থান (দেশ/শহর) ফেরত দেয়

    FUNCTION connect(location: VpnLocation) -> ConnectionResult
        # নির্বাচিত অবস্থানে টানেল স্থাপন করে; status -> Connected
        # সফল হলে active_location = location

    FUNCTION disconnect() -> Result
        # টানেল বন্ধ করে; status -> Disconnected

    FUNCTION current_status() -> Enum{Disconnected, Connecting, Connected, Error}

    FUNCTION active_location() -> Optional<VpnLocation>

    FUNCTION route(request: NetworkRequest) -> NetworkRequest
        # IF status == Connected THEN টানেলের মধ্য দিয়ে রাউট করে (egress = active_location)
        # ELSE সরাসরি (direct) পাঠায়

    FUNCTION fastest_location() -> VpnLocation
        # সর্বনিম্ন পরিমাপকৃত লেটেন্সির অবস্থান নির্বাচন করে
```

VPN অবস্থা মেশিন: `Disconnected -> Connecting -> Connected -> Disconnected | Error`। `Connected` অবস্থায় kill-switch সক্রিয় থাকে যাতে টানেল হঠাৎ বিচ্ছিন্ন হলে কোনো ট্রাফিক টানেলের বাইরে না যায়।

### ১২. UI_Shell — Chrome-অভিন্ন UI ও কর্মক্ষমতা (Chrome-Identical UI & Performance)

UI স্তরটি **Google Chrome-এর সাথে দৃশ্যত অভিন্ন (hubhu/identical)** একটি ব্যবহারকারী ইন্টারফেস উপস্থাপন করে এবং অতি-দ্রুত ও মসৃণ প্রতিক্রিয়া নিশ্চিত করে। এই উপাদানটি প্রয়োজনীয়তা ১২-কে সরাসরি বাস্তবায়ন করে।

**Chrome-অভিন্ন UI বিন্যাস (Req 12.1):**
- **ট্যাব বার (Tab Bar):** উপরের প্রান্তে Chrome-এর অনুরূপ আকৃতির ট্যাব, "+" নতুন-ট্যাব বোতাম এবং একই ট্যাব-শিরোনাম/আইকন বিন্যাস।
- **অমনিবক্স (Omnibox) অ্যাড্রেস বার:** Chrome-এর মতো সম্মিলিত অ্যাড্রেস + অনুসন্ধান বার, একই অবস্থান, আকৃতি ও সাজেশন আচরণ।
- **টুলবার বোতাম (Toolbar):** পিছনে/সামনে/রিলোড, প্রোফাইল, এক্সটেনশন ও ওভারফ্লো (⋮) মেনু বোতাম — Chrome-এর অভিন্ন অবস্থান ও চেহারায়।
- **মেনু (Menu):** ⋮ ওভারফ্লো মেনুর বিন্যাস, আকৃতি ও আইটেম-চেহারা Chrome-এর সাথে সামঞ্জস্যপূর্ণ।

**Chrome-অভিন্নতা নীতি:** UI_Shell বিশুদ্ধভাবে উপস্থাপনা স্তর; এটি সরাসরি কোনো ব্যবসায়িক যুক্তি ধারণ করে না বরং `Tab_Manager`, `Address_Bar`, `Navigation_Controller` প্রভৃতি পরিষেবা উপাদানে কল করে। ফলে UI-কে Chrome-এর সাথে দৃশ্যত মেলানো যায় অন্তর্নিহিত যুক্তি অপরিবর্তিত রেখে।

**সম্পূর্ণ বৈশিষ্ট্য সেট (Req 12.4, 12.5):** UI_Shell এমনভাবে নকশাকৃত যাতে Chrome-সমতুল্য ব্রাউজিং বৈশিষ্ট্য (ট্যাব, বুকমার্ক, ইতিহাস, নেভিগেশন, ব্যক্তিগত মোড — উপাদান ১–৫) এবং 1DM Plus-সমতুল্য ডাউনলোড বৈশিষ্ট্য (সেগমেন্টেড ডাউনলোড, পজ/রিজিউম, শিডিউলিং, মিডিয়া ক্যাপচার — উপাদান ৬–৯) উভয়ই সম্পূর্ণভাবে UI থেকে অ্যাক্সেসযোগ্য হয়।

> **নোট (এক্সটেনশন সমর্থন — আনুষ্ঠানিক):** ব্যবহারকারীর অনুরোধ অনুযায়ী Chrome-এর সম্পূর্ণ বৈশিষ্ট্য সেটের অংশ হিসেবে **Chrome এক্সটেনশন যুক্ত করার ব্যবস্থা** (একটি এক্সটেনশন/অ্যাড-অন ব্যবস্থাপক ও টুলবার এক্সটেনশন আইকন) এখন `requirements.md`-তে **প্রয়োজনীয়তা ১৩ (Chrome এক্সটেনশন সমর্থন)** হিসেবে আনুষ্ঠানিকভাবে অন্তর্ভুক্ত এবং নিচে `Extension_Manager` (উপাদান ১৩) হিসেবে নকশা করা হয়েছে। UI_Shell-এর টুলবার এক্সটেনশন আইকন ও এক্সটেনশন ব্যবস্থাপক ভিউ এই উপাদানের সাথে সংযুক্ত থাকবে।

**কর্মক্ষমতা পদ্ধতি (Req 12.2, 12.3):**
- **সাব-১০০ মিলিসেকেন্ড প্রতিক্রিয়া (Req 12.2):** সকল ইন্টারফেস ক্রিয়া (ট্যাব পরিবর্তন, মেনু খোলা, স্ক্রোল) UI থ্রেডে অ-অবরোধী (non-blocking) থাকবে; ভারী কাজ (পেজ রেন্ডার, ডাউনলোড I/O, VPN টানেল) পৃথক থ্রেড/প্রসেসে স্থানান্তরিত হবে যাতে ইনপুট-থেকে-দৃশ্যমান-প্রতিক্রিয়া বিলম্ব ১০০ ms-এর নিচে থাকে।
- **৬০ FPS রেন্ডারিং (Req 12.3):** অ্যানিমেশন ও স্ক্রোলিং GPU-ত্বরান্বিত কম্পোজিটিং ব্যবহার করবে এবং প্রতি ফ্রেমের বাজেট ~১৬.৬ ms-এর মধ্যে রাখবে; UI থ্রেডে দীর্ঘ সিঙ্ক্রোনাস কাজ এড়ানো হবে।
- এই কর্মক্ষমতা লক্ষ্যমাত্রাগুলো পরিমাপযোগ্য থ্রেশহোল্ড হিসেবে কর্মক্ষমতা/বেঞ্চমার্ক টেস্টে যাচাই করা হবে (নিচের টেস্টিং কৌশল দ্রষ্টব্য), প্রোপার্টি-ভিত্তিক টেস্টের পরিবর্তে।

### ১৩. Extension_Manager (Chrome এক্সটেনশন সমর্থন)

Chrome-সামঞ্জস্যপূর্ণ উৎস থেকে এক্সটেনশন ইনস্টল, ইনস্টলকৃত এক্সটেনশনের তালিকা ব্যবস্থাপনা, সক্রিয়/নিষ্ক্রিয়করণ এবং অপসারণ পরিচালনা করে। সক্রিয় এক্সটেনশনগুলো তাদের অনুমতির পরিসরের মধ্যে পেজের বিষয়বস্তু বা ব্রাউজারের আচরণে কাজ করে। এই উপাদানটি প্রয়োজনীয়তা ১৩-কে সরাসরি বাস্তবায়ন করে এবং UI_Shell-এর এক্সটেনশন ব্যবস্থাপক ভিউ ও টুলবার এক্সটেনশন আইকনের সাথে সংযুক্ত।

**দায়িত্ব:**
- Chrome-সামঞ্জস্যপূর্ণ উৎস থেকে এক্সটেনশন ইনস্টল এবং ইনস্টলকৃত তালিকায় যোগ করা (Req 13.1)।
- ইনস্টলকৃত এক্সটেনশনের তালিকা প্রদান যাতে ব্যবস্থাপক ভিউ ও টুলবার আইকন প্রদর্শন করা যায় (Req 13.2)।
- একটি এক্সটেনশন সক্রিয় (enable) বা নিষ্ক্রিয় (disable) করা (Req 13.3)।
- একটি এক্সটেনশন অপসারণ করা যাতে তা তালিকা ও টুলবার উভয় থেকে সরে যায় (Req 13.4)।
- সক্রিয় এক্সটেনশনকে তার অনুমতির (permissions) পরিসরের মধ্যে পেজ বিষয়বস্তু/ব্রাউজার আচরণে কাজ করতে দেওয়া (Req 13.5)।
- ইনস্টল ব্যর্থতায় ত্রুটি বার্তা প্রদর্শন এবং ইনস্টলকৃত তালিকা অপরিবর্তিত রাখা (Req 13.6)।

**ইন্টারফেস (সিউডোকোড):**

```
INTERFACE Extension_Manager:
    FUNCTION install(source: ExtensionSource) -> Result<Extension>
        # Chrome-সামঞ্জস্যপূর্ণ উৎস যাচাই ও লোড করে
        # সফল হলে নতুন Extension তৈরি (enabled = true) করে তালিকায় যোগ করে
        # ব্যর্থ হলে Error ফেরত দেয় এবং তালিকা অপরিবর্তিত রাখে (Req 13.6)

    FUNCTION list_extensions() -> List<Extension>
        # সকল ইনস্টলকৃত এক্সটেনশন ফেরত দেয় (ব্যবস্থাপক ভিউ ও টুলবার আইকনের জন্য)

    FUNCTION set_enabled(extension_id: ExtensionId, enabled: Boolean) -> Result
        # নির্দিষ্ট এক্সটেনশনের enabled অবস্থা নির্ধারণ করে

    FUNCTION remove(extension_id: ExtensionId) -> Result
        # এক্সটেনশনটি ইনস্টলকৃত তালিকা ও টুলবার থেকে সরায়

    FUNCTION is_installed(extension_id: ExtensionId) -> Boolean

    FUNCTION apply_to_page(extension: Extension, page: PageContext) -> Result
        # IF extension.enabled THEN অনুমতির পরিসরের মধ্যে পেজ বিষয়বস্তু/আচরণে কাজ করে (Req 13.5)
        # অনুমতির বাইরে কোনো ক্রিয়া অনুমোদিত নয়
```

এক্সটেনশন অবস্থা মেশিন: `(Installed, enabled=true) <-> (Installed, enabled=false) -> Removed`। ইনস্টল ব্যর্থ হলে কোনো অবস্থা পরিবর্তন ঘটে না (তালিকা অপরিবর্তিত)।

### ১৪. Account_Manager ও Sync_Service (অ্যাকাউন্ট ও সিঙ্ক ব্যবস্থা)

`Account_Manager` ব্যবহারকারীর অ্যাকাউন্ট সাইন-ইন/সাইন-আউট ও সেশন জীবনচক্র পরিচালনা করে, এবং `Sync_Service` সাইন-ইন থাকাকালীন ব্রাউজার ডেটা (বুকমার্ক, ইতিহাস, খোলা ট্যাব, সংরক্ষিত পাসওয়ার্ড, সেটিংস) অ্যাকাউন্টে সিঙ্ক করে এবং নতুন ডিভাইস/ফ্রেশ ইনস্টলে পুনরুদ্ধার করে। এই দুটি উপাদান প্রয়োজনীয়তা ১৪-কে সরাসরি বাস্তবায়ন করে।

**দায়িত্ব (Account_Manager):**
- সাইন-ইন সম্পন্ন করে একটি প্রমাণীকৃত (authenticated) সেশন প্রতিষ্ঠা করা (Req 14.1)।
- সাইন-আউট করে সেশন শেষ করা এবং স্থানীয় সেশন ডেটা পরিষ্কার করা (Req 14.2)।
- সাইন-ইন প্রমাণীকরণ ব্যর্থতায় ত্রুটি বার্তা প্রদর্শন এবং সেশন প্রতিষ্ঠা না করা (Req 14.6)।

**দায়িত্ব (Sync_Service):**
- সাইন-ইন থাকাকালীন বুকমার্ক, ইতিহাস, খোলা ট্যাব, সংরক্ষিত পাসওয়ার্ড ও সেটিংস অ্যাকাউন্টে সিঙ্ক করা (Req 14.3)।
- নতুন ডিভাইস/ফ্রেশ ইনস্টলে সাইন-ইনের পর সিঙ্ককৃত ডেটা পুনরুদ্ধার করা (Req 14.4)।
- সিঙ্ক দ্বন্দ্ব (conflict) ঘটলে সর্বশেষ টাইমস্ট্যাম্প (latest timestamp) অনুসারে মার্জ করা এবং অ-দ্বন্দ্বপূর্ণ পরিবর্তনগুলো ধরে রাখা (Req 14.5)।
- নেটওয়ার্ক/সার্ভার ব্যর্থতায় ত্রুটি বার্তা প্রদর্শন এবং সংযোগ পুনরুদ্ধারে স্বয়ংক্রিয় পুনঃচেষ্টা (retry) (Req 14.7)।

**ইন্টারফেস (সিউডোকোড):**

```
INTERFACE Account_Manager:
    FUNCTION sign_in(credentials: AuthCredentials) -> Result<Session>
        # IF auth সফল THEN একটি প্রমাণীকৃত Session প্রতিষ্ঠা করে (Req 14.1)
        # ELSE Error ফেরত দেয়; সেশন প্রতিষ্ঠা করে না (Req 14.6)

    FUNCTION sign_out() -> Result
        # সক্রিয় সেশন শেষ করে এবং স্থানীয় সেশন ডেটা পরিষ্কার করে (Req 14.2)

    FUNCTION current_session() -> Optional<Session>

    FUNCTION is_signed_in() -> Boolean

INTERFACE Sync_Service:
    FUNCTION sync_up(state: SyncState) -> Result
        # IF is_signed_in THEN স্থানীয় SyncItem-গুলো অ্যাকাউন্টে আপলোড করে (Req 14.3)
        # নেটওয়ার্ক/সার্ভার ব্যর্থতায় Error; পুনরুদ্ধারে retry (Req 14.7)

    FUNCTION restore(account: Account) -> SyncState
        # নতুন ডিভাইস/ফ্রেশ ইনস্টলে অ্যাকাউন্টের সিঙ্ককৃত ডেটা পুনরুদ্ধার করে (Req 14.4)

    FUNCTION merge(local: SyncState, remote: SyncState) -> SyncState
        # প্রতিটি SyncItem-এর জন্য সর্বশেষ updated_at টাইমস্ট্যাম্প বিশিষ্ট সংস্করণ নির্বাচন করে;
        # অ-দ্বন্দ্বপূর্ণ (ভিন্ন কী) পরিবর্তন উভয় পক্ষ থেকে ধরে রাখে (Req 14.5)
```

সেশন অবস্থা মেশিন: `SignedOut -> (sign_in সফল) -> SignedIn -> (sign_out) -> SignedOut`। সাইন-ইন ব্যর্থ হলে কোনো অবস্থা পরিবর্তন ঘটে না (SignedOut অপরিবর্তিত)।

### ১৫. Password_Manager (পাসওয়ার্ড ব্যবস্থাপক)

লগইন ফর্ম জমা দেওয়ার সময় পাসওয়ার্ড সংরক্ষণের প্রস্তাব দেওয়া, ক্রেডেনশিয়াল এনক্রিপ্ট করে সংরক্ষণ, মিলযুক্ত সাইটে অটোফিল, সংরক্ষিত ক্রেডেনশিয়াল দেখা/সম্পাদনা/মুছে ফেলা এবং সাইন-ইন থাকাকালীন `Sync_Service`-এর মাধ্যমে সিঙ্ক করা পরিচালনা করে। এই উপাদানটি প্রয়োজনীয়তা ১৫-কে সরাসরি বাস্তবায়ন করে।

**দায়িত্ব:**
- লগইন ফর্ম জমা দেওয়ার সময় ক্রেডেনশিয়াল সংরক্ষিত না থাকলে সংরক্ষণের প্রস্তাব দেওয়া (Req 15.1)।
- ব্যবহারকারীর নিশ্চিতকরণে পাসওয়ার্ড এনক্রিপ্টেড আকারে সংরক্ষণ করা (Req 15.2)।
- মিলযুক্ত সাইটে সংরক্ষিত ক্রেডেনশিয়াল অটোফিল করা (Req 15.3)।
- সংরক্ষিত ক্রেডেনশিয়ালের তালিকা প্রদর্শন এবং প্রতিটি সম্পাদনা/মুছে ফেলার সুযোগ (Req 15.4)।
- একটি ক্রেডেনশিয়াল স্থায়ীভাবে অপসারণ করা (Req 15.5)।
- সাইন-ইন থাকাকালীন `Sync_Service`-এর মাধ্যমে ক্রেডেনশিয়াল সিঙ্ক করা (Req 15.6, প্রয়োজনীয়তা ১৪ অনুসারে)।
- ডিক্রিপশন ব্যর্থতায় ত্রুটি বার্তা প্রদর্শন এবং অটোফিল এড়িয়ে যাওয়া (Req 15.7)।

**ইন্টারফেস (সিউডোকোড):**

```
INTERFACE Password_Manager:
    FUNCTION on_login_submit(site: Site, username: String, password: String) -> Optional<SaveOffer>
        # IF NOT is_stored(site, username) THEN সংরক্ষণের প্রস্তাব ফেরত দেয় (Req 15.1)

    FUNCTION save_credential(site: Site, username: String, password: String) -> Result<Credential>
        # ব্যবহারকারীর নিশ্চিতকরণে password এনক্রিপ্ট করে Credential সংরক্ষণ করে (Req 15.2)
        # encrypted_password = encrypt(password); updated_at = now

    FUNCTION autofill(site: Site) -> Optional<FilledCredential>
        # IF মিলযুক্ত সংরক্ষিত Credential থাকে THEN decrypt করে অটোফিল করে (Req 15.3)
        # IF decrypt ব্যর্থ THEN Error প্রদর্শন; অটোফিল এড়িয়ে যায় (Req 15.7)

    FUNCTION list_credentials() -> List<Credential>      # দেখা/সম্পাদনার জন্য (Req 15.4)

    FUNCTION edit_credential(id: CredentialId, username: Optional<String>, password: Optional<String>) -> Result
        # updated_at হালনাগাদ করে (Req 15.4)

    FUNCTION remove_credential(id: CredentialId) -> Result   # স্থায়ীভাবে সরায় (Req 15.5)

    FUNCTION is_stored(site: Site, username: String) -> Boolean
```

ক্রেডেনশিয়াল অবস্থা: `(সংরক্ষিত, encrypted) <-> (সম্পাদিত) -> Removed`। ডিক্রিপশন ব্যর্থ হলে অটোফিল ঘটে না এবং একটি ত্রুটি বার্তা প্রদর্শিত হয়।

## ডেটা মডেল (Data Models)

```
STRUCT Tab:
    id: TabId
    title: String
    icon: Optional<IconRef>
    url: Optional<URL>
    is_active: Boolean

STRUCT NavigationEntry:
    url: URL
    title: String

STRUCT NavigationStack:
    entries: List<NavigationEntry>
    current_index: Integer            # -1 যখন খালি

STRUCT Bookmark:
    id: BookmarkId
    title: String
    url: URL
    folder_id: Optional<FolderId>

STRUCT Folder:
    id: FolderId
    name: String

STRUCT HistoryRecord:
    id: RecordId
    title: String
    url: URL
    visited_at: Timestamp

STRUCT DownloadTask:
    id: TaskId
    url: URL
    destination: Path
    total_size: Optional<Integer>     # bytes; অজানা হলে None
    bytes_downloaded: Integer
    status: Enum{Queued, Active, Paused, Completed, Failed}
    segments: List<Segment>
    max_connections: Integer
    supports_resume: Boolean

STRUCT Segment:
    index: Integer
    start_offset: Integer
    end_offset: Integer
    bytes_downloaded: Integer
    status: Enum{Pending, Active, Done, Failed}

STRUCT Progress:
    percent: Float                    # 0.0 .. 100.0
    speed_bytes_per_sec: Float
    eta_seconds: Optional<Float>

STRUCT MediaItem:
    id: MediaId
    source_url: URL
    kind: Enum{DirectFile, HLS, DASH}
    resolutions: List<Resolution>

STRUCT Schedule:
    id: ScheduleId
    task_id: TaskId
    start_time: Timestamp
    order: Integer

STRUCT VpnLocation:
    id: LocationId
    country: String
    city: Optional<String>
    latency_ms: Optional<Float>      # পরিমাপকৃত লেটেন্সি; দ্রুততম নির্বাচনে ব্যবহৃত

STRUCT VpnConnection:
    status: Enum{Disconnected, Connecting, Connected, Error}
    active_location: Optional<VpnLocation>
    kill_switch_enabled: Boolean

STRUCT Extension:
    id: ExtensionId
    name: String
    version: String
    enabled: Boolean
    permissions: List<Permission>

STRUCT Account:
    id: AccountId
    email: String

STRUCT Session:
    account: Account
    token: String
    established_at: Timestamp
    is_authenticated: Boolean

STRUCT SyncItem:
    key: String                       # যেমন: "bookmark:<id>", "setting:<name>"
    kind: Enum{Bookmark, History, OpenTab, Password, Setting}
    payload: Bytes
    updated_at: Timestamp             # দ্বন্দ্ব-মার্জে সর্বশেষ সংস্করণ নির্বাচনে ব্যবহৃত

STRUCT SyncState:
    items: Map<String, SyncItem>      # key -> SyncItem
    last_synced_at: Optional<Timestamp>

STRUCT Credential:
    id: CredentialId
    site: Site                        # মিলযুক্ত সাইট সনাক্তকরণ (origin/domain)
    username: String
    encrypted_password: Bytes         # সর্বদা এনক্রিপ্টেড আকারে সংরক্ষিত
    updated_at: Timestamp
```

## ত্রুটি পরিচালনা (Error Handling)

| পরিস্থিতি | উপাদান | পরিচালনা কৌশল |
|---|---|---|
| পেজ লোড ব্যর্থ | Navigation_Controller | `Failed` অবস্থায় যাওয়া; ত্রুটি বার্তা + retry অ্যাকশন প্রদর্শন (Req 2.7) |
| অবৈধ URL ইনপুট | Address_Bar | অনুসন্ধান প্রশ্ন হিসেবে রাউট করা (Req 2.2) |
| ডাউনলোড নেটওয়ার্ক ত্রুটি | Download_Manager | `Failed` চিহ্নিত করা; retry বিকল্প (Req 5.4) |
| সেগমেন্ট ডাউনলোড ব্যর্থ | Download_Engine | সীমিত সংখ্যক পুনঃচেষ্টা; সব ব্যর্থ হলে task `Failed` (Req 6.5) |
| সার্ভার byte-range অসমর্থিত | Download_Engine | একক সংযোগে fallback (Req 6.2) |
| সার্ভার রিজিউম অসমর্থিত | Download_Manager | ব্যবহারকারীকে অবহিত; শুরু থেকে পুনঃচালুর বিকল্প (Req 7.4) |
| ডাউনলোড চলাকালীন অ্যাপ ক্র্যাশ/বন্ধ | Download_Manager | startup-এ সংরক্ষিত অবস্থা থেকে পুনরুদ্ধার (Req 7.3) |
| মিডিয়া খণ্ড ডাউনলোড ব্যর্থ | Media_Grabber | খণ্ড পুনঃচেষ্টা; একত্রীকরণ ব্যর্থ হলে ত্রুটি প্রতিবেদন |
| VPN টানেল সংযোগ ব্যর্থ | VPN_Manager | status -> Error; ব্যবহারকারীকে ত্রুটি বার্তা প্রদর্শন ও পুনরায় সংযোগ/ভিন্ন অবস্থান নির্বাচনের বিকল্প (Req 11.8) |
| VPN টানেল হঠাৎ বিচ্ছিন্ন | VPN_Manager / Kill_Switch | kill-switch সক্রিয় করে সমস্ত নেটওয়ার্ক ট্রাফিক অবরুদ্ধ রাখা যতক্ষণ না সংযোগ পুনঃস্থাপিত হয় বা ব্যবহারকারী VPN নিষ্ক্রিয় করে, যাতে কোনো ট্রাফিক টানেলের বাইরে না যায় (Req 11.6) |
| VPN সংযোগ বিচ্ছিন্নকরণ অনুরোধ | VPN_Manager | সক্রিয় টানেল বন্ধ; status -> Disconnected; পরবর্তী ট্রাফিক সরাসরি (direct) রাউট (Req 11.4) |
| এক্সটেনশন ইনস্টল ব্যর্থ | Extension_Manager | install Error ফেরত দেয়; ব্যবহারকারীকে ত্রুটি বার্তা প্রদর্শন; ইনস্টলকৃত এক্সটেনশন তালিকা অপরিবর্তিত রাখা (Req 13.6) |
| সাইন-ইন প্রমাণীকরণ ব্যর্থ | Account_Manager | sign_in Error ফেরত দেয়; ব্যবহারকারীকে ত্রুটি বার্তা প্রদর্শন; সেশন প্রতিষ্ঠা না করা (SignedOut অপরিবর্তিত) (Req 14.6) |
| সিঙ্ক নেটওয়ার্ক/সার্ভার ব্যর্থ | Sync_Service | ব্যবহারকারীকে ত্রুটি বার্তা প্রদর্শন; সংযোগ পুনরুদ্ধার হলে স্বয়ংক্রিয়ভাবে সিঙ্ক পুনঃচেষ্টা (retry) (Req 14.7) |
| ক্রেডেনশিয়াল ডিক্রিপশন ব্যর্থ | Password_Manager | ত্রুটি বার্তা প্রদর্শন; সেই সাইটে অটোফিল এড়িয়ে যাওয়া (Req 15.7) |

ত্রুটি পরিচালনার সাধারণ নীতি: প্রতিটি ব্যর্থতা একটি সুস্পষ্ট অবস্থায় রূপান্তরিত হবে এবং যেখানে প্রযোজ্য সেখানে একটি পুনরুদ্ধার-পথ (retry/restart) ব্যবহারকারীকে প্রদান করা হবে।


## শুদ্ধতা বৈশিষ্ট্যসমূহ (Correctness Properties)

*একটি প্রোপার্টি হলো এমন একটি বৈশিষ্ট্য বা আচরণ যা সিস্টেমের সকল বৈধ সম্পাদনে সত্য থাকা উচিত — মূলত সিস্টেমের কী করা উচিত সে সম্পর্কে একটি আনুষ্ঠানিক বিবৃতি। প্রোপার্টিগুলো মানব-পঠনযোগ্য স্পেসিফিকেশন এবং যন্ত্র-যাচাইযোগ্য শুদ্ধতা নিশ্চয়তার মধ্যে সেতুবন্ধন হিসেবে কাজ করে।*

> **প্রোপার্টি রিফ্লেকশন নোট:** নেভিগেশন পিছনে (২.৩) ও সামনে (২.৪) মানদণ্ড দুটি একটি একক রাউন্ড-ট্রিপ প্রোপার্টিতে (Property 5) একত্রিত করা হয়েছে কারণ go_forward হলো go_back-এর বিপরীত। VPN প্রোপার্টিগুলো (35–38) ১১.১ (অবস্থান তালিকা), ১১.২ (সংযোগ), ১১.৩ (ট্রাফিক রাউটিং) ও ১১.৫ (দ্রুততম অবস্থান) আবৃত করে — এগুলো পরস্পর অ-অপ্রয়োজনীয় (তালিকা বনাম সংযোগ বনাম রাউটিং বনাম নির্বাচন)। VPN বিচ্ছিন্নকরণ (১১.৪) হলো সংযোগের বিপরীত এবং এটি প্রোপার্টির পরিবর্তে একটি উদাহরণ/কভারেজ টেস্ট হিসেবে যাচাই করা হয়। এক্সটেনশন প্রোপার্টিগুলো (39–41) ১৩.১ (ইনস্টল তালিকায় যোগ), ১৩.৩ (সক্রিয়/নিষ্ক্রিয় টগল) ও ১৩.৪ (অপসারণ ইনভেরিয়েন্ট) আবৃত করে — এগুলো পরস্পর অ-অপ্রয়োজনীয় (যোগ বনাম অবস্থা-টগল বনাম অপসারণ)। এক্সটেনশন প্রদর্শন (১৩.২), রানটাইম আচরণ (১৩.৫) ও ইনস্টল ব্যর্থতা (১৩.৬) প্রোপার্টির পরিবর্তে উদাহরণ/ইন্টিগ্রেশন টেস্টে আবৃত হয়। অ্যাকাউন্ট ও সিঙ্ক প্রোপার্টিগুলো (42–44) ১৪.১/১৪.২ (সাইন-ইন/আউট সেশন রাউন্ড-ট্রিপ — পরস্পর বিপরীত বলে একত্রিত), ১৪.৪ (সিঙ্ক-তারপর-পুনরুদ্ধার রাউন্ড-ট্রিপ) ও ১৪.৫ (দ্বন্দ্ব-মার্জ সর্বশেষ টাইমস্ট্যাম্প) আবৃত করে — এগুলো পরস্পর অ-অপ্রয়োজনীয় (সেশন বনাম পুনরুদ্ধার বনাম মার্জ-যুক্তি)। পাসওয়ার্ড ব্যবস্থাপক প্রোপার্টিগুলো (45–47) ১৫.২ (এনক্রিপ্ট/ডিক্রিপ্ট রাউন্ড-ট্রিপ), ১৫.৩ (সংরক্ষণ-তারপর-অটোফিল) ও ১৫.৫ (যোগ-অপসারণ ইনভেরিয়েন্ট) আবৃত করে — P45 এনক্রিপশন বিশ্বস্ততা যাচাই করে আর P46 সাইট-মিল ভিত্তিক পুনরুদ্ধার যাচাই করে (ভিন্ন উদ্বেগ, তাই উভয়ই ধরে রাখা হয়েছে)। অ্যাকাউন্ট/সিঙ্ক/পাসওয়ার্ডের অ-প্রোপার্টি মানদণ্ড — ১৪.৩ (চলমান সিঙ্ক), ১৪.৬ (সাইন-ইন ব্যর্থতা), ১৪.৭ (সিঙ্ক নেটওয়ার্ক/সার্ভার ব্যর্থতা), ১৫.১ (সংরক্ষণ প্রস্তাব), ১৫.৪ (তালিকা দেখা/সম্পাদনা/মুছে ফেলা), ১৫.৬ (সাইন-ইন থাকাকালীন ক্রেডেনশিয়াল সিঙ্ক) ও ১৫.৭ (ডিক্রিপশন ব্যর্থতা) — প্রোপার্টির পরিবর্তে উপযুক্ত উদাহরণ/ইন্টিগ্রেশন/ত্রুটি-কেস টেস্টে আবৃত হয়। অ-যাচাইযোগ্য, এজ-কেস, উদাহরণ-ভিত্তিক, স্মোক, ইন্টিগ্রেশন ও কর্মক্ষমতা মানদণ্ডগুলো (১.৪, ১.৫, ২.৫, ২.৬, ২.৭, ৫.৪, ৬.৫, ৭.৪, ৮.৩, ১০.১, ১০.২, ১১.৪, ১১.৬, ১১.৭, ১১.৮, ১২.১, ১২.২, ১২.৩, ১২.৪, ১২.৫, ১৩.২, ১৩.৫, ১৩.৬, ১৪.৩, ১৪.৬, ১৪.৭, ১৫.১, ১৫.৪, ১৫.৬, ১৫.৭) প্রোপার্টি-ভিত্তিক টেস্টের পরিবর্তে উপযুক্ত উদাহরণ/এজ-কেস/স্মোক/ইন্টিগ্রেশন/ভিজুয়াল/কর্মক্ষমতা টেস্টের মাধ্যমে আবৃত হবে।

### Property 1: নতুন ট্যাব তৈরি তালিকা বাড়ায় ও সক্রিয় করে

*যেকোনো* বিদ্যমান ট্যাব তালিকার জন্য, একটি নতুন ট্যাব তৈরি করলে ট্যাব তালিকার দৈর্ঘ্য ঠিক এক বাড়বে এবং নবসৃষ্ট ট্যাবটি সক্রিয় ট্যাব হবে।

**Validates: Requirements 1.1**

### Property 2: ট্যাব বন্ধ করলে তা অপসারিত হয় ও সংলগ্ন ট্যাব সক্রিয় হয়

*যেকোনো* দুই বা ততোধিক ট্যাবযুক্ত ট্যাব তালিকা থেকে একটি ট্যাব বন্ধ করলে সেই ট্যাবটি আর তালিকায় থাকবে না এবং সক্রিয় ট্যাবটি একটি বিদ্যমান (সংলগ্ন) ট্যাব হবে।

**Validates: Requirements 1.2**

### Property 3: ট্যাব নির্বাচন সক্রিয় ট্যাব নির্ধারণ করে

*যেকোনো* ট্যাব তালিকা ও তার মধ্যে যেকোনো বৈধ ট্যাব শনাক্তকারীর জন্য, সেই ট্যাবটি সক্রিয় করলে get_active_tab অবিকল সেই নির্বাচিত ট্যাবটিই ফেরত দেবে।

**Validates: Requirements 1.3**

### Property 4: বৈধ URL নেভিগেশনে রাউট হয়, অবৈধ ইনপুট অনুসন্ধানে রাউট হয়

*যেকোনো* ইনপুট টেক্সটের জন্য, টেক্সটটি বৈধ URL হলে submit_input একটি NavigateTo (নর্মালাইজড URL সহ) টার্গেট ফেরত দেবে, অন্যথায় এটি একটি SearchQuery টার্গেট ফেরত দেবে।

**Validates: Requirements 2.1, 2.2**

### Property 5: পিছনে-সামনে নেভিগেশন রাউন্ড-ট্রিপ

*যেকোনো* নেভিগেশন স্ট্যাকের জন্য, একটি নতুন পেজে নেভিগেট করার পর go_back তারপর go_forward সম্পাদন করলে নেভিগেশন অবস্থান (current_index ও বর্তমান URL) যথাযথভাবে পূর্ববর্তী পেজে গিয়ে আবার মূল পেজে ফিরে আসবে।

**Validates: Requirements 2.3, 2.4**

### Property 6: বুকমার্ক সংরক্ষণ ও পুনরুদ্ধার

*যেকোনো* শিরোনাম ও URL-এর জন্য, একটি বুকমার্ক যোগ করলে list_bookmarks-এ সেই অবিকল শিরোনাম ও URL সহ একটি এন্ট্রি পাওয়া যাবে।

**Validates: Requirements 3.1**

### Property 7: বুকমার্ক যোগ-অপসারণ ইনভেরিয়েন্ট

*যেকোনো* বুকমার্কের জন্য, সেটি যোগ করে পরে অপসারণ করলে অপসারণের পর সেই বুকমার্ক শনাক্তকারীটি আর তালিকায় উপস্থিত থাকবে না।

**Validates: Requirements 3.2**

### Property 8: বুকমার্ক নির্বাচনে সঠিক URL লোড হয়

*যেকোনো* সংরক্ষিত বুকমার্কের জন্য, সেটি নির্বাচন করলে Navigation_Controller অবিকল সেই বুকমার্কের সাথে সম্পর্কিত URL-টিই লোড করবে।

**Validates: Requirements 3.3**

### Property 9: ফোল্ডারে স্থানান্তর সংগঠন সংরক্ষণ করে

*যেকোনো* বুকমার্ক ও যেকোনো ফোল্ডারের জন্য, বুকমার্কটিকে সেই ফোল্ডারে স্থানান্তর করলে বুকমার্কটির folder_id সেই ফোল্ডার হবে এবং তা list_bookmarks(folder) ফলাফলে উপস্থিত থাকবে।

**Validates: Requirements 3.4**

### Property 10: বুকমার্ক নাম সম্পাদনা স্থায়ী হয়

*যেকোনো* বুকমার্ক ও যেকোনো নতুন নামের জন্য, নাম সম্পাদনা করার পর বুকমার্কটি পুনরায় পড়লে সংরক্ষিত নামটি অবিকল নতুন নামের সমান হবে।

**Validates: Requirements 3.5**

### Property 11: পরিদর্শন রেকর্ড সংরক্ষণ (অ-ইনকগনিটো)

*যেকোনো* অ-ইনকগনিটো পেজ পরিদর্শনের জন্য, পরিদর্শনটি রেকর্ড করার পর list_history-তে সেই শিরোনাম, URL ও পরিদর্শন-সময় সহ একটি রেকর্ড উপস্থিত থাকবে।

**Validates: Requirements 4.1**

### Property 12: ইতিহাস অবরোহী সময়-ক্রমে সাজানো থাকে

*যেকোনো* পরিদর্শন রেকর্ডের সেটের জন্য, list_history-এর আউটপুট সর্বদা পরিদর্শন-সময় (visited_at) অনুসারে অবরোহী ক্রমে সাজানো থাকবে।

**Validates: Requirements 4.2**

### Property 13: ইতিহাস অনুসন্ধান কেবল মিলযুক্ত রেকর্ড ফেরত দেয়

*যেকোনো* রেকর্ড সেট ও যেকোনো অনুসন্ধান শব্দের জন্য, search_history-এর প্রতিটি ফলাফল রেকর্ডের শিরোনাম বা URL-এ সেই অনুসন্ধান শব্দটি ধারণ করবে।

**Validates: Requirements 4.3**

### Property 14: ইতিহাস মুছে ফেলা স্থায়ী

*যেকোনো* রেকর্ড সেটের জন্য, নির্বাচিত রেকর্ডগুলো মুছে ফেলার পর সেই শনাক্তকারীগুলোর কোনোটিই আর list_history-তে উপস্থিত থাকবে না।

**Validates: Requirements 4.4**

### Property 15: ইনকগনিটো মোড ইতিহাস সংরক্ষণ করে না

*যেকোনো* ইনকগনিটো পেজ পরিদর্শনের জন্য, পরিদর্শনটি রেকর্ড করার চেষ্টা করলেও ইতিহাস তালিকার আকার ও বিষয়বস্তু অপরিবর্তিত থাকবে।

**Validates: Requirements 4.5**

### Property 16: ডাউনলোড কার্য তৈরি ও তালিকাভুক্তি

*যেকোনো* বৈধ ডাউনলোড URL ও গন্তব্যের জন্য, create_download একটি নতুন ডাউনলোড কার্য তৈরি করবে যা পরবর্তীতে ডাউনলোড তালিকায় উপস্থিত থাকবে।

**Validates: Requirements 5.1**

### Property 17: অগ্রগতি শতকরা হার সীমার মধ্যে থাকে

*যেকোনো* ডাউনলোড কার্যের জন্য যেখানে bytes_downloaded total_size-এর চেয়ে বড় নয়, সম্পূর্ণতার শতকরা হার সর্বদা ০ থেকে ১০০-এর অন্তর্ভুক্ত সীমার মধ্যে থাকবে এবং তা 100 × bytes_downloaded / total_size-এর সমান হবে।

**Validates: Requirements 5.2**

### Property 18: সম্পূর্ণ ডাউনলোড সঠিকভাবে চিহ্নিত হয়

*যেকোনো* ডাউনলোড কার্যের জন্য, যখন bytes_downloaded total_size-এর সমান হয় তখন কার্যটির অবস্থা Completed হবে।

**Validates: Requirements 5.3**

### Property 19: ডাউনলোড তালিকা ফিল্টার সঠিক

*যেকোনো* মিশ্র-অবস্থার ডাউনলোড কার্যের সেট ও যেকোনো অবস্থা-ফিল্টারের জন্য, list_downloads(filter) কেবল সেইসব কার্যই ফেরত দেবে যাদের অবস্থা ফিল্টারের সমান।

**Validates: Requirements 5.5**

### Property 20: সেগমেন্টসমূহ সম্পূর্ণ বাইট-পরিসর আবৃত করে

*যেকোনো* জ্ঞাত আকারের ফাইলের জন্য যেখানে সার্ভার byte-range সমর্থন করে, উৎপন্ন সেগমেন্টগুলো পরস্পর অ-ওভারল্যাপিং হবে এবং একত্রে [0, total_size) সম্পূর্ণ পরিসরটি নির্ভুলভাবে আবৃত করবে।

**Validates: Requirements 6.1**

### Property 21: byte-range অসমর্থনে একক সেগমেন্ট

*যেকোনো* ডাউনলোডের জন্য যেখানে সার্ভার byte-range অনুরোধ সমর্থন করে না, Download_Engine ঠিক একটি সেগমেন্ট (একক সংযোগ) ব্যবহার করবে।

**Validates: Requirements 6.2**

### Property 22: সেগমেন্ট বিভাজন-একত্রীকরণ রাউন্ড-ট্রিপ

*যেকোনো* ফাইলের জন্য, সেটিকে সেগমেন্টে বিভক্ত করে পরে ক্রমানুসারে একত্রিত করলে ফলাফল ফাইলটি মূল ফাইলের বাইট-অনুক্রম ও আকারের সাথে অবিকল সমান হবে।

**Validates: Requirements 6.3**

### Property 23: সমান্তরাল সংযোগ সীমা সম্মানিত হয়

*যেকোনো* ডাউনলোড ও ব্যবহারকারী-কনফিগারকৃত max_connections মানের জন্য, একযোগে সক্রিয় সেগমেন্ট/সংযোগের সংখ্যা কখনোই max_connections অতিক্রম করবে না।

**Validates: Requirements 6.4**

### Property 24: পজ অর্জিত অগ্রগতি সংরক্ষণ করে

*যেকোনো* আংশিকভাবে সম্পন্ন চলমান ডাউনলোডের জন্য, সেটি পজ করলে কার্যটির অবস্থা Paused হবে এবং ইতিমধ্যে ডাউনলোড করা bytes_downloaded মান অপরিবর্তিত থাকবে।

**Validates: Requirements 7.1**

### Property 25: পজ-রিজিউম চূড়ান্ত ফলাফল সংরক্ষণ করে

*যেকোনো* ডাউনলোডের জন্য, এক বা একাধিক পজ/রিজিউম চক্রের মধ্য দিয়ে সম্পন্ন করলে চূড়ান্ত ফাইলটি কোনো বিঘ্ন ছাড়া সরাসরি ডাউনলোডের ফলাফলের সাথে বাইট-অনুক্রমে অবিকল সমান হবে।

**Validates: Requirements 7.2**

### Property 26: অগ্রগতি স্থায়িত্ব-পুনরুদ্ধার রাউন্ড-ট্রিপ

*যেকোনো* চলমান ডাউনলোড অবস্থার জন্য, অবস্থাটি স্থায়ীভাবে সংরক্ষণ করে অ্যাপ পুনঃসূচনার পর পুনরুদ্ধার করলে পুনরুদ্ধৃত অগ্রগতি (bytes_downloaded ও সেগমেন্ট অবস্থা) সংরক্ষিত মানের সমান হবে।

**Validates: Requirements 7.3**

### Property 27: নির্ধারিত ডাউনলোড সঠিক সময়ে শুরু হয়

*যেকোনো* নির্ধারিত শুরুর সময় ও বর্তমান সময়ের জন্য, on_tick(now) কেবল তখনই নির্ধারিত ডাউনলোড শুরু করবে যখন now নির্ধারিত শুরুর সময়ের সমান বা পরবর্তী হবে, অন্যথায় শুরু করবে না।

**Validates: Requirements 8.1**

### Property 28: একাধিক নির্ধারিত ডাউনলোড নির্ধারিত ক্রমে শুরু হয়

*যেকোনো* একাধিক due নির্ধারিত ডাউনলোডের সেটের জন্য, Scheduler সেগুলো তাদের নির্ধারিত ক্রম (order) অনুসারে আরোহী ক্রমে শুরু করবে।

**Validates: Requirements 8.2**

### Property 29: নির্ধারিত ডাউনলোড বাতিল সময়সূচি সরায়

*যেকোনো* নির্ধারিত ডাউনলোডের জন্য, সেটি বাতিল করলে সংশ্লিষ্ট সময়সূচিটি সরে যাবে এবং পরবর্তী কোনো on_tick সেই ডাউনলোডটি শুরু করবে না।

**Validates: Requirements 8.4**

### Property 30: সনাক্তকৃত মিডিয়া তালিকা সম্পূর্ণ

*যেকোনো* ডাউনলোডযোগ্য মিডিয়া স্ট্রিমযুক্ত পেজের জন্য, detect_media সেই পেজে উপস্থিত সকল ডাউনলোডযোগ্য মিডিয়া আইটেম ফেরত দেবে।

**Validates: Requirements 9.1**

### Property 31: নির্বাচিত মিডিয়া ডাউনলোড কার্যে রূপান্তরিত হয়

*যেকোনো* সনাক্তকৃত মিডিয়া আইটেমের জন্য, ডাউনলোড অনুরোধ করলে একটি সংশ্লিষ্ট ডাউনলোড কার্য তৈরি হবে এবং তা Download_Manager-এর ডাউনলোড তালিকায় যুক্ত হবে।

**Validates: Requirements 9.2**

### Property 32: নির্বাচিত রেজোলিউশন ডাউনলোড কার্যে প্রতিফলিত হয়

*যেকোনো* একাধিক রেজোলিউশনে উপলব্ধ মিডিয়া আইটেম ও যেকোনো নির্বাচিত উপলব্ধ রেজোলিউশনের জন্য, উৎপন্ন ডাউনলোড কার্যটি অবিকল সেই নির্বাচিত রেজোলিউশনের স্ট্রিমটিই ব্যবহার করবে।

**Validates: Requirements 9.3**

### Property 33: খণ্ডিত মিডিয়া একত্রীকরণ রাউন্ড-ট্রিপ

*যেকোনো* খণ্ডিত মিডিয়া স্ট্রিমের (HLS/DASH) খণ্ড-অনুক্রমের জন্য, খণ্ডগুলো ডাউনলোড করে একত্রিত করলে ফলাফল ফাইলটি খণ্ডগুলোর ক্রমিক সংযোজনের সাথে অবিকল সমান হবে।

**Validates: Requirements 9.4**

### Property 34: প্ল্যাটফর্ম-নির্দিষ্ট ডিফল্ট ডাউনলোড ডিরেক্টরি

*যেকোনো* সমর্থিত অপারেটিং সিস্টেমের (Windows/macOS/Linux) জন্য, default_download_dir সেই প্ল্যাটফর্মের মানসম্মত ডিফল্ট ডাউনলোড ডিরেক্টরিটিই ফেরত দেবে।

**Validates: Requirements 10.3**

### Property 35: উপলব্ধ VPN অবস্থানের তালিকা সম্পূর্ণ

*যেকোনো* কনফিগারকৃত উপলব্ধ VPN অবস্থানের সেটের জন্য, list_locations সেই সেটের সকল উপলব্ধ অবস্থান ফেরত দেবে এবং কোনো উপলব্ধ অবস্থান বাদ পড়বে না।

**Validates: Requirements 11.1**

### Property 36: VPN সংযোগ নির্বাচিত অবস্থান সক্রিয় করে

*যেকোনো* উপলব্ধ VPN অবস্থানের জন্য, সেই অবস্থানে সফলভাবে connect করার পর VPN অবস্থা Connected হবে এবং active_location অবিকল সেই নির্বাচিত অবস্থানের সমান হবে।

**Validates: Requirements 11.2**

### Property 37: সক্রিয় VPN-এ সমস্ত ট্রাফিক টানেলের মধ্য দিয়ে রাউট হয়

*যেকোনো* নেটওয়ার্ক অনুরোধের জন্য, VPN অবস্থা Connected থাকলে route(request)-এর egress অবিকল active_location-এর সাথে সঙ্গতিপূর্ণ হবে; অর্থাৎ কোনো ব্রাউজিং বা ডাউনলোড অনুরোধ সরাসরি (টানেলের বাইরে) যাবে না।

**Validates: Requirements 11.3**

### Property 38: দ্রুততম অবস্থান সর্বনিম্ন লেটেন্সি নির্বাচন করে

*যেকোনো* অ-খালি উপলব্ধ VPN অবস্থানের সেটের জন্য, fastest_location সর্বদা এমন একটি অবস্থান ফেরত দেবে যার পরিমাপকৃত লেটেন্সি অন্য কোনো উপলব্ধ অবস্থানের চেয়ে বেশি নয়।

**Validates: Requirements 11.5**

### Property 39: এক্সটেনশন ইনস্টল তালিকায় যোগ করে

*যেকোনো* ইনস্টলকৃত এক্সটেনশন তালিকা ও যেকোনো বৈধ Chrome-সামঞ্জস্যপূর্ণ এক্সটেনশন উৎসের জন্য, সফলভাবে install করার পর ইনস্টলকৃত তালিকার দৈর্ঘ্য ঠিক এক বাড়বে এবং নবইনস্টলকৃত এক্সটেনশনটি list_extensions-এ উপস্থিত থাকবে।

**Validates: Requirements 13.1**

### Property 40: এক্সটেনশন সক্রিয়/নিষ্ক্রিয়করণ অবস্থা টগল করে

*যেকোনো* ইনস্টলকৃত এক্সটেনশন ও যেকোনো লক্ষ্য বুলিয়ান মানের জন্য, set_enabled সম্পাদনের পর সেই এক্সটেনশনের enabled অবস্থা অবিকল সেই লক্ষ্য মানের সমান হবে; বিশেষত সক্রিয় করে পরে নিষ্ক্রিয় করলে (বা বিপরীত) অবস্থাটি যথাযথভাবে ফিরে আসবে।

**Validates: Requirements 13.3**

### Property 41: এক্সটেনশন অপসারণ ইনভেরিয়েন্ট

*যেকোনো* ইনস্টলকৃত এক্সটেনশনের জন্য, সেটি অপসারণ করার পর সেই এক্সটেনশন শনাক্তকারীটি আর list_extensions-এ (এবং টুলবারে) উপস্থিত থাকবে না।

**Validates: Requirements 13.4**

### Property 42: সাইন-ইন/সাইন-আউট সেশন রাউন্ড-ট্রিপ

*যেকোনো* অ্যাকাউন্ট ও বৈধ প্রমাণপত্রের জন্য, সফলভাবে sign_in করার পর একটি প্রমাণীকৃত সেশন বিদ্যমান থাকবে (is_signed_in সত্য); এরপর sign_out করলে সেশন শেষ হবে এবং স্থানীয় সেশন ডেটা পরিষ্কার হয়ে SignedOut অবস্থায় ফিরে আসবে (current_session খালি)।

**Validates: Requirements 14.1, 14.2**

### Property 43: সিঙ্ক-তারপর-পুনরুদ্ধার রাউন্ড-ট্রিপ

*যেকোনো* সিঙ্ক অবস্থার (বুকমার্ক, ইতিহাস, খোলা ট্যাব, পাসওয়ার্ড, সেটিংস) জন্য, সাইন-ইন থাকাকালীন সেটি sync_up করার পর একটি নতুন ডিভাইস/ফ্রেশ ইনস্টলে একই অ্যাকাউন্টে restore করলে পুনরুদ্ধৃত সিঙ্ক অবস্থাটি মূল সিঙ্ককৃত অবস্থার সাথে অবিকল সমান হবে।

**Validates: Requirements 14.4**

### Property 44: দ্বন্দ্ব-মার্জ সর্বশেষ টাইমস্ট্যাম্প নির্ধারণমূলকভাবে নির্বাচন করে

*যেকোনো* স্থানীয় ও দূরবর্তী সিঙ্ক অবস্থার জোড়ার জন্য, merge-এর ফলাফলে প্রতিটি দ্বন্দ্বপূর্ণ কী (উভয় পক্ষে উপস্থিত) এর জন্য সর্বোচ্চ updated_at টাইমস্ট্যাম্প বিশিষ্ট সংস্করণটিই থাকবে, এবং কেবল একটি পক্ষে উপস্থিত সকল অ-দ্বন্দ্বপূর্ণ কী অপরিবর্তিতভাবে ফলাফলে ধরে রাখা হবে; একই ইনপুটে ফলাফল সর্বদা অভিন্ন (নির্ধারণমূলক)।

**Validates: Requirements 14.5**

### Property 45: ক্রেডেনশিয়াল এনক্রিপ্ট/ডিক্রিপ্ট রাউন্ড-ট্রিপ

*যেকোনো* পাসওয়ার্ডের জন্য, সেটি এনক্রিপ্ট করে সংরক্ষণ করার পর ডিক্রিপ্ট করলে অবিকল মূল পাসওয়ার্ডটিই ফিরে পাওয়া যাবে, এবং সংরক্ষিত encrypted_password মানটি কখনোই প্লেইনটেক্সট পাসওয়ার্ডের সমান হবে না।

**Validates: Requirements 15.2**

### Property 46: সংরক্ষণ-তারপর-অটোফিল মিলযুক্ত সাইটে সংরক্ষিত ক্রেডেনশিয়াল ফেরত দেয়

*যেকোনো* সাইট ও ক্রেডেনশিয়ালের জন্য, সেটি সংরক্ষণ করার পর সেই মিলযুক্ত সাইটে autofill করলে অবিকল সেই সংরক্ষিত ব্যবহারকারীনাম ও (ডিক্রিপ্টকৃত) পাসওয়ার্ডটিই ফেরত পাওয়া যাবে।

**Validates: Requirements 15.3**

### Property 47: ক্রেডেনশিয়াল যোগ-অপসারণ ইনভেরিয়েন্ট

*যেকোনো* ক্রেডেনশিয়ালের জন্য, সেটি যোগ করে পরে অপসারণ করলে অপসারণের পর সেই ক্রেডেনশিয়াল শনাক্তকারীটি আর list_credentials-এ উপস্থিত থাকবে না।

**Validates: Requirements 15.5**

## টেস্টিং কৌশল (Testing Strategy)

**দ্বৈত টেস্টিং পদ্ধতি (Dual Testing Approach):**
- **প্রোপার্টি টেস্ট:** উপরের শুদ্ধতা বৈশিষ্ট্যসমূহ সকল ইনপুটে যাচাই করার জন্য (ন্যূনতম ১০০ পুনরাবৃত্তি প্রতি প্রোপার্টি)।
- **ইউনিট/উদাহরণ টেস্ট:** নির্দিষ্ট উদাহরণ, এজ কেস ও ত্রুটি অবস্থার জন্য (১.৪, ১.৫, ২.৫, ২.৬, ২.৭, ৫.৪, ৬.৫, ৭.৪, ৮.৩)।
- **স্মোক/ইন্টিগ্রেশন টেস্ট:** ক্রস-প্ল্যাটফর্ম চালনা ও অভিন্ন কার্যকারিতার জন্য (১০.১, ১০.২) এবং সম্পূর্ণ Chrome/1DM Plus বৈশিষ্ট্য-কভারেজ চেকলিস্টের জন্য (১২.৪, ১২.৫)।

**VPN-নির্দিষ্ট কভারেজ নোট (প্রয়োজনীয়তা ১১):**
- **১১.৪ (বিচ্ছিন্নকরণ):** উদাহরণ টেস্ট — connect তারপর disconnect সম্পাদন করলে অবস্থা Disconnected হবে এবং পরবর্তী অনুরোধ সরাসরি (direct) রাউট হবে।
- **১১.৬ (kill-switch):** এজ-কেস টেস্ট — সক্রিয় টানেল হঠাৎ বিচ্ছিন্ন হওয়ার ঘটনা সিমুলেট করে নিশ্চিত করা যে সংযোগ পুনঃস্থাপিত বা VPN নিষ্ক্রিয় না হওয়া পর্যন্ত সমস্ত নেটওয়ার্ক ট্রাফিক অবরুদ্ধ থাকে।
- **১১.৭ (অবস্থা প্রদর্শন):** উদাহরণ/UI টেস্ট — সক্রিয় সংযোগে স্ট্যাটাস ভিউ সংযুক্ত VpnLocation ও সংযোগ অবস্থা সঠিকভাবে প্রদর্শন করে কিনা যাচাই।
- **১১.৮ (সংযোগ ব্যর্থতা):** উদাহরণ টেস্ট — সংযোগ ব্যর্থতা সিমুলেট করে নিশ্চিত করা যে status -> Error হয় এবং একটি ভিন্ন VpnLocation নির্বাচনের সুযোগ থাকে।

**কর্মক্ষমতা ও UI কভারেজ নোট (প্রয়োজনীয়তা ১২):**
- **১২.১ (Chrome-অভিন্ন UI):** স্ন্যাপশট/ভিজুয়াল-রিগ্রেশন টেস্ট — ট্যাব বার, অমনিবক্স, টুলবার ও মেনু Chrome-রেফারেন্স বিন্যাসের সাথে দৃশ্যত অভিন্ন কিনা যাচাই।
- **১২.২ (সাব-১০০ ms প্রতিক্রিয়া):** কর্মক্ষমতা/বেঞ্চমার্ক টেস্ট — ইন্টারঅ্যাকশন-থেকে-পেইন্ট বিলম্ব ১০০ ms-এর নিচে পরিমাপ।
- **১২.৩ (৬০ FPS):** কর্মক্ষমতা/বেঞ্চমার্ক টেস্ট — টেকসই ফ্রেম রেট ≥ ৬০ FPS পরিমাপ।

**এক্সটেনশন কভারেজ নোট (প্রয়োজনীয়তা ১৩):**
- **১৩.২ (প্রদর্শন):** উদাহরণ/স্ন্যাপশট টেস্ট — ইনস্টলকৃত এক্সটেনশনগুলো ব্যবস্থাপক ভিউতে তালিকাভুক্ত হয় এবং প্রতিটির জন্য একটি টুলবার আইকন রেন্ডার হয় কিনা যাচাই।
- **১৩.৫ (রানটাইম আচরণ):** ইন্টিগ্রেশন/উদাহরণ টেস্ট — প্রতিনিধিত্বমূলক এক্সটেনশন দিয়ে নিশ্চিত করা যে সক্রিয় এক্সটেনশন কেবল তার মঞ্জুরকৃত অনুমতির পরিসরের মধ্যেই পেজ বিষয়বস্তু/ব্রাউজার আচরণে কাজ করে এবং পরিসরের বাইরের ক্রিয়া অবরুদ্ধ থাকে।
- **১৩.৬ (ইনস্টল ব্যর্থতা):** উদাহরণ/ত্রুটি-কেস টেস্ট — ইনস্টল ব্যর্থতা সিমুলেট করে নিশ্চিত করা যে একটি ত্রুটি বার্তা প্রদর্শিত হয় এবং list_extensions ইনস্টল-পূর্ব অবস্থার সাথে অভিন্ন থাকে।

**অ্যাকাউন্ট ও সিঙ্ক কভারেজ নোট (প্রয়োজনীয়তা ১৪):**
- **১৪.৩ (চলমান সিঙ্ক):** ইন্টিগ্রেশন টেস্ট (মক অ্যাকাউন্ট স্টোর) — সাইন-ইন থাকাকালীন বুকমার্ক/ইতিহাস/খোলা ট্যাব/পাসওয়ার্ড/সেটিংস পরিবর্তন হলে প্রতিটি ডেটা প্রকারের জন্য sync_up চালিত হয় কিনা যাচাই।
- **১৪.৬ (সাইন-ইন ব্যর্থতা):** উদাহরণ/ত্রুটি-কেস টেস্ট — প্রমাণীকরণ ব্যর্থতা সিমুলেট করে নিশ্চিত করা যে Error ফেরত আসে, ত্রুটি বার্তা প্রদর্শিত হয় এবং অবস্থা SignedOut অপরিবর্তিত থাকে।
- **১৪.৭ (সিঙ্ক নেটওয়ার্ক/সার্ভার ব্যর্থতা):** ইন্টিগ্রেশন টেস্ট — নেটওয়ার্ক/সার্ভার ব্যর্থতা সিমুলেট করে ত্রুটি বার্তা নিশ্চিত করা, এরপর সংযোগ পুনরুদ্ধারে স্বয়ংক্রিয় পুনঃচেষ্টা (retry) সফল হয় কিনা যাচাই।

**পাসওয়ার্ড ব্যবস্থাপক কভারেজ নোট (প্রয়োজনীয়তা ১৫):**
- **১৫.১ (সংরক্ষণ প্রস্তাব):** উদাহরণ/এজ-কেস টেস্ট — অসংরক্ষিত সাইটে লগইন ফর্ম জমায় সংরক্ষণ প্রস্তাব আসে এবং ইতিমধ্যে সংরক্ষিত সাইটে আসে না কিনা যাচাই।
- **১৫.৪ (তালিকা দেখা/সম্পাদনা/মুছে ফেলা):** উদাহরণ/UI টেস্ট — list_credentials সংরক্ষিত ক্রেডেনশিয়াল তালিকাভুক্ত করে এবং প্রতিটির জন্য সম্পাদনা/মুছে ফেলা ক্রিয়া উপলব্ধ কিনা যাচাই।
- **১৫.৬ (ক্রেডেনশিয়াল সিঙ্ক):** ইন্টিগ্রেশন টেস্ট — সাইন-ইন থাকাকালীন সংরক্ষিত ক্রেডেনশিয়াল একটি Password-প্রকার SyncItem তৈরি করে এবং Sync_Service-এর মাধ্যমে সিঙ্ক হয় কিনা (প্রয়োজনীয়তা ১৪ অনুসারে) যাচাই।
- **১৫.৭ (ডিক্রিপশন ব্যর্থতা):** উদাহরণ/ত্রুটি-কেস টেস্ট — দূষিত encrypted_password সিমুলেট করে নিশ্চিত করা যে অটোফিল ঘটে না এবং একটি ত্রুটি বার্তা প্রদর্শিত হয়।

**প্রোপার্টি টেস্ট কনফিগারেশন:**
- প্রতিটি প্রোপার্টি টেস্ট ন্যূনতম ১০০ পুনরাবৃত্তি চালাবে।
- প্রতিটি প্রোপার্টি টেস্ট নকশা নথির সংশ্লিষ্ট প্রোপার্টিকে রেফারেন্স করবে।
- ট্যাগ ফরম্যাট: **Feature: feature-rich-browser, Property {number}: {property_text}**
