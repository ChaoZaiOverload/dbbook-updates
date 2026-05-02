(() => {
  'use strict';

  const CACHE_KEY = 'dbu_comment_cache';
  const FETCH_DELAY_MS = 1500;
  const COMMENT_CLASS = 'dbu-friend-comment';

  // ── URL helpers ───────────────────────────────────────────────────────────

  function subjectIdFromHref(href) {
    const m = href && href.match(/\/subject\/(\d+)/);
    return m ? m[1] : null;
  }

  function userIdFromHref(href) {
    const m = href && href.match(/\/people\/([^/?#]+)/);
    return m ? m[1].toLowerCase() : null;
  }

  // ── Cache ─────────────────────────────────────────────────────────────────

  function loadCache() {
    return new Promise(resolve =>
      chrome.storage.local.get(CACHE_KEY, d => resolve(d[CACHE_KEY] || {}))
    );
  }

  function saveCache(cache) {
    return new Promise(resolve =>
      chrome.storage.local.set({ [CACHE_KEY]: cache }, resolve)
    );
  }

  // ── Updates-page item discovery ───────────────────────────────────────────
  //
  // Structure (confirmed from DevTools):
  //   li.mbtr
  //     div.feed_title
  //       a[href*="/people/"]   ← friend's profile
  //       span.allstarN.star-img ← rating (absent for 想读/在读)
  //     div.feed_con
  //       ul.mod_book_list
  //         li > div.mod_book
  //           div.mod_book_pic  a[href*="/subject/"]
  //           div.mod_book_con  ← inject comment here
  //             div.mod_book_name  a[href*="/subject/"]
  //             div.mod_book_data
  //             div > span.allstarN.star-img

  function findUpdateItems() {
    const items = [];
    const seen = new Set();

    for (const mbtr of document.querySelectorAll('li.mbtr')) {
      // Only process entries that have a rating (skip 想读/在读 without stars)
      if (!mbtr.querySelector('.feed_title span[class*="allstar"]')) continue;

      const userLink = mbtr.querySelector('.feed_title a[href*="/people/"]');
      if (!userLink) continue;
      const userId = userIdFromHref(userLink.href);
      if (!userId) continue;

      for (const modBook of mbtr.querySelectorAll('div.mod_book')) {
        const bookLink = modBook.querySelector('a[href*="/subject/"]');
        if (!bookLink) continue;
        const subjectId = subjectIdFromHref(bookLink.href);
        if (!subjectId) continue;

        const key = `${subjectId}:${userId}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const injectTarget = modBook.querySelector('div.mod_book_con') || modBook;
        items.push({ injectTarget, subjectId, userId });
      }
    }

    return items;
  }

  // ── Book subject page fetching & comment parsing ──────────────────────────
  //
  // Fetches /subject/{id}/comments?sort=follows so that friend comments
  // appear first, then parses li.comment-item elements.
  // Returns a map: lowercased userId → comment text string.

  async function fetchCommentMap(subjectId) {
    const url = `https://book.douban.com/subject/${subjectId}/comments?sort=follows`;
    const resp = await fetch(url, { credentials: 'include' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
    const html = await resp.text();

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const map = {};

    for (const li of doc.querySelectorAll('li.comment-item')) {
      // User profile link is the first <a> inside .comment-info
      const userLink = li.querySelector('.comment-info a[href*="/people/"]');
      // Short comment text
      const textEl = li.querySelector('p.comment-content span.short');

      if (userLink && textEl) {
        const uid = userIdFromHref(userLink.href);
        const text = textEl.textContent.trim();
        if (uid && text) map[uid] = text;
      }
    }

    return map;
  }

  // ── DOM injection ─────────────────────────────────────────────────────────

  function injectComment(injectTarget, text) {
    if (injectTarget.querySelector('.' + COMMENT_CLASS)) return;
    const div = document.createElement('div');
    div.className = COMMENT_CLASS;
    div.textContent = text;
    injectTarget.appendChild(div);
  }

  // ── Delay helper ──────────────────────────────────────────────────────────

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // ── Main ──────────────────────────────────────────────────────────────────

  async function run() {
    const items = findUpdateItems();
    if (items.length === 0) {
      console.log('[DBU] No update items found — check selectors.');
      return;
    }
    console.log(`[DBU] Found ${items.length} update items.`);

    // Group items by subjectId so we fetch each book page only once
    const bySubject = new Map();
    for (const item of items) {
      if (!bySubject.has(item.subjectId)) bySubject.set(item.subjectId, []);
      bySubject.get(item.subjectId).push(item);
    }

    const cache = await loadCache();
    const newEntries = {};
    let first = true;

    for (const [subjectId, groupItems] of bySubject) {
      let commentMap;

      if (cache[subjectId]) {
        commentMap = cache[subjectId];
        console.log(`[DBU] Cache hit for subject ${subjectId}`);
      } else {
        if (!first) await delay(FETCH_DELAY_MS);
        first = false;

        try {
          console.log(`[DBU] Fetching comments for subject ${subjectId}…`);
          commentMap = await fetchCommentMap(subjectId);
          newEntries[subjectId] = commentMap;
        } catch (err) {
          console.warn(`[DBU] Failed to fetch subject ${subjectId}:`, err.message);
          continue;
        }
      }

      for (const item of groupItems) {
        const comment = commentMap[item.userId];
        if (comment) {
          injectComment(item.injectTarget, comment);
          console.log(`[DBU] Injected comment for ${item.userId} on ${subjectId}`);
        } else {
          console.log(`[DBU] No comment found for user ${item.userId} on subject ${subjectId}`);
        }
      }
    }

    // Persist new fetched entries
    if (Object.keys(newEntries).length > 0) {
      await saveCache({ ...cache, ...newEntries });
    }
  }

  run();
})();
