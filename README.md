# Douban Book Updates Comments

A Chrome extension that shows your friends' short comments alongside their star ratings on the **我关注的阅读动态** (book reading updates) page.

## The problem

Douban's reading updates feed (`book.douban.com/updates`) shows when a friend finishes a book and their star rating, but not the short comment they wrote. You have to click into the book page to find it.

## What this extension does

For every rated entry on the updates page, the extension fetches the book's comment page sorted by friends and injects the matching friend's comment directly below the existing book info — no extra clicks required.

![Screenshot](docs/screenshot.png)

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

---

# 豆瓣阅读动态短评扩展

一个 Chrome 扩展，在**我关注的阅读动态**页面的星级评分旁显示好友的短评。

## 问题背景

豆瓣的阅读动态页面（`book.douban.com/updates`）只显示好友读完某本书后给出的星级评分，不显示他们写的短评。想看短评，必须点进书籍页面才能找到。

## 功能介绍

对于动态页面上每一条有评分的记录，扩展会自动获取该书按好友排序的短评页，并将对应好友的短评直接注入到书目信息下方，无需额外点击。

![截图](docs/screenshot.png)

**范围说明：** 只处理有星级评分的"读过"记录，没有评分的"想读"和"在读"记录会被跳过。

## 工作原理

1. 扫描页面中 `div.feed_title` 包含星级评分的 `li.mbtr` 条目。
2. 对每本不重复的书，请求 `book.douban.com/subject/{id}/comments?sort=follows`，该排序将好友短评置顶。
3. 通过个人主页 URL 匹配动态条目中对应的好友短评。
4. 将短评文本注入每本书的 `div.mod_book_con`，显示在书名、作者和星级之后。
5. 将短评数据按书籍 ID 缓存到 `chrome.storage.local`，已获取过的书籍在后续访问时不会重复请求。

相邻请求间隔 1.5 秒，避免触发限流。每次页面加载，每本书最多发起一次网络请求。

## 安装方法

本扩展未上架 Chrome 应用商店，需手动加载：

1. 克隆或下载本仓库。
2. 打开 Chrome，访问 `chrome://extensions`。
3. 开启右上角的**开发者模式**。
4. 点击**加载已解压的扩展程序**，选择本仓库中的 `extension/` 文件夹。
5. 扩展图标将出现在工具栏中，无需任何配置。

## 使用方法

访问 `https://book.douban.com/updates`（或带分页参数的链接，如 `?start=20&uid=...`），扩展会在页面加载完成后自动运行。打开开发者工具 → Console，筛选 `[DBU]` 可查看每本书的请求和匹配状态。

如需清除短评缓存（例如希望获取最新短评），可前往 `chrome://extensions` → 找到本扩展 → 点击**详情** → **扩展程序存储空间** → **清除**，或通过 Chrome 开发者工具的 Application 面板操作。

## 文件结构

```
extension/
  manifest.json   扩展配置与权限声明
  content.js      页面解析、数据请求与短评注入
  style.css       注入短评的样式
```

## 权限说明

| 权限 | 用途 |
|---|---|
| `storage` | 缓存短评数据，每本书只请求一次 |
| `host_permissions: book.douban.com/*` | 以登录状态请求书籍短评页面 |
