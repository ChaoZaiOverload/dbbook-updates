# Douban Book Updates Comments

A Chrome extension that shows your friends' short comments alongside their star ratings on the **我关注的阅读动态** (book reading updates) page.

## The problem

Douban's reading updates feed (`book.douban.com/updates`) shows when a friend finishes a book and their star rating, but not the short comment they wrote. You have to click into the book page to find it.

## What this extension does

For every rated entry on the updates page, the extension fetches the book's comment page sorted by friends and injects the matching friend's comment directly below the existing book info — no extra clicks required.

Before:

```
1077 Canton Rd  读过  ★★★★☆
A Cha Chaan Teng That Does Not Exist
Derek Chung / May Huang / Zephyr Press
```

After:

```
1077 Canton Rd  读过  ★★★★☆
A Cha Chaan Teng That Does Not Exist
Derek Chung / May Huang / Zephyr Press
这本书让我想起了旺角的某个早晨...
```

**Scope:** only rated entries (读过 with stars) are processed. 想读 and 在读 entries without a rating are skipped.

## How it works

1. Scans the page for `li.mbtr` entries that have a star rating in `div.feed_title`.
2. For each unique book, fetches `book.douban.com/subject/{id}/comments?sort=follows` — this sorts friend comments to the top.
3. Matches the comment to the friend shown in the update entry by their profile URL.
4. Injects the comment text into `div.mod_book_con`, after the title, author, and stars.
5. Caches comment maps by subject ID in `chrome.storage.local` so already-fetched books don't trigger a network request on subsequent visits.

Fetches are spaced 1.5 seconds apart to avoid rate-limiting. Each page load triggers at most one fetch per unique book on that page.

## Installation

This extension is not on the Chrome Web Store. Load it manually:

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the `extension/` folder inside this repo.
5. The extension icon will appear in your toolbar. No configuration needed.

## Usage

Navigate to `https://book.douban.com/updates` (or any paginated URL like `?start=20&uid=...`). The extension runs automatically on page load. Open DevTools → Console and filter for `[DBU]` to see per-book fetch and match status.

To clear the comment cache (e.g. if you want fresh comments after some time), go to `chrome://extensions` → find this extension → click **Details** → **Extension storage** → **Clear**, or use the Chrome DevTools Application panel.

## Files

```
extension/
  manifest.json   extension config and permissions
  content.js      page parsing, fetching, and comment injection
  style.css       styling for injected comments
```

## Permissions

| Permission | Why |
|---|---|
| `storage` | Cache comment maps so each book is fetched at most once |
| `host_permissions: book.douban.com/*` | Fetch book comment pages with your login session |
