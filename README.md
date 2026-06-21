# Feature Rich Browser

> Chrome + 1DM Plus হাইব্রিড MVP — Electron + TypeScript + React
> A hybrid MVP of a Chrome-like browser and a 1DM Plus-style download manager.

---

## বাংলা

### এটা কী? (What is this?)
এটি একটি **ফিচার-রিচ ব্রাউজার** — একটি Chrome-অনুরূপ ওয়েব ব্রাউজার এবং একটি
1DM Plus-অনুরূপ ডাউনলোড ম্যানেজার-এর সমন্বয়ে তৈরি একটি MVP (Minimum Viable Product)।
এটি **Electron + TypeScript + React** দিয়ে তৈরি। এর মধ্যে আছে ট্যাব ব্যবস্থাপনা,
নেভিগেশন, বুকমার্ক, হিস্ট্রি, ডাউনলোড ইঞ্জিন, মিডিয়া গ্র্যাবার, অ্যাকাউন্ট/পাসওয়ার্ড,
সিঙ্ক, এক্সটেনশন ও VPN সার্ভিস।

### কীভাবে চালাবেন (How to run)
```bash
cd new-project
npm install
npm start
```
`npm start` কমান্ডটি আগে প্রজেক্ট বিল্ড করে, তারপর Electron অ্যাপটি চালু করে।

### ইনস্টলার তৈরি করা (How to build installers)
```bash
cd new-project
npm run dist
```
এটি `release/` ফোল্ডারে ইনস্টলার তৈরি করবে (Windows: NSIS, macOS: dmg, Linux: AppImage)।

### GitHub Actions দিয়ে অটো-বিল্ড
এই রিপোতে GitHub Actions কনফিগার করা আছে (`.github/workflows/build.yml`)।
- প্রতিটি push-এ ইনস্টলার অটো-বিল্ড হয়।
- বিল্ড করা ইনস্টলার পাওয়া যাবে: **Actions ট্যাব → সংশ্লিষ্ট রান → Artifacts**।
- একটি `v*` ট্যাগ (যেমন `v0.1.0`) push করলে একটি **GitHub Release** তৈরি হবে।

---

## English

### What is this?
**Feature Rich Browser** is an MVP that combines a Chrome-like web browser with a
1DM Plus-style download manager. It is built with **Electron + TypeScript + React**
and includes tab management, navigation, bookmarks, history, a download engine,
a media grabber, account/password management, sync, extensions, and a VPN service.

### How to run
```bash
cd new-project
npm install
npm start
```
`npm start` builds the project and then launches the Electron app.

### How to build installers
```bash
cd new-project
npm run dist
```
This produces installers in the `release/` folder (Windows: NSIS, macOS: dmg, Linux: AppImage).

### Automated builds via GitHub Actions
This repository ships with a GitHub Actions workflow at `.github/workflows/build.yml`.
- Installers are built automatically on every push.
- Download the built installers from the **Actions tab → the workflow run → Artifacts**.
- Push a `v*` tag (e.g. `v0.1.0`) to cut a **GitHub Release**.

---

## Project structure
```
browser/
├── .github/workflows/build.yml   # CI: auto-builds installers
├── README.md                     # this file
└── new-project/                  # the Electron + TS + React app
    ├── src/                      # main / renderer / services / types
    ├── test/                     # vitest unit & property-based tests
    ├── build/build.mjs           # build script
    ├── package.json
    ├── tsconfig.json
    ├── vitest.config.ts
    └── .kiro/specs/              # spec docs (requirements, design, tasks)
```

## License
MIT
