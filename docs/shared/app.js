/* ============================================
   NORTHTRACKS — SHARED APP SCRIPT
   - persistent 7-day countdown (no refresh resets)
   - github api integration (releases, repo info)
   - changelog rendering, reveal-on-scroll, nav
   ============================================ */

(function () {
    'use strict';

    var REPO = 'mnishantlabs/NorthTracks';
    var WEEK = 7 * 24 * 60 * 60 * 1000;

    /* last-known repo push fallback (kept stable if the API is unreachable) */
    var FALLBACK_ANCHOR = Date.parse('2026-09-05T18:08:26Z');

    /* fallback latest-release data when the API is unreachable */
    var FALLBACK_LATEST = {
        tag_name: 'v1.1.0',
        name: 'NorthTracks v1.1.0',
        published_at: '2026-06-10T23:47:31Z',
        asset: 'https://github.com/mnishantlabs/NorthTracks/releases/download/v1.1.0/NorthTracks.Setup.1.1.0.exe',
        size: 84983858
    };

    /* ---------- storage helpers (safe on file://) ---------- */

    function storeGet(key) {
        try { return window.localStorage.getItem(key); } catch (e) { return null; }
    }
    function storeSet(key, val) {
        try { window.localStorage.setItem(key, val); } catch (e) {}
    }
    function sGet(key) {
        try { return window.sessionStorage.getItem(key); } catch (e) { return null; }
    }
    function sSet(key, val) {
        try { window.sessionStorage.setItem(key, val); } catch (e) {}
    }

    /* ---------- cached fetch ---------- */

    function fetchJSON(url, ttl) {
        ttl = ttl || 5 * 60 * 1000;
        var key = 'nt:' + url;
        var hit = sGet(key);
        if (hit) {
            try {
                var c = JSON.parse(hit);
                if (c.t > Date.now()) return Promise.resolve(c.d);
            } catch (e) {}
        }
        return fetch(url).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        }).then(function (data) {
            try { sSet(key, JSON.stringify({ t: Date.now() + ttl, d: data })); } catch (e) {}
            return data;
        });
    }

    /* ---------- countdown ---------- */

    function rollForward(anchor) {
        var now = Date.now();
        var t = anchor + WEEK;
        while (t - now < 6 * 60 * 60 * 1000) t += WEEK;
        return t;
    }

    function resolveTarget() {
        var cached = storeGet('nt:next-target');
        if (cached) {
            var t = Number(cached);
            if (t > Date.now() + 60 * 1000) return Promise.resolve(t);
        }
        var anchor = FALLBACK_ANCHOR;
        return fetchJSON('https://api.github.com/repos/' + REPO)
            .then(function (repo) {
                if (repo && repo.pushed_at) anchor = Date.parse(repo.pushed_at);
                if (!isFinite(anchor)) anchor = FALLBACK_ANCHOR;
                var target = rollForward(anchor);
                storeSet('nt:next-target', String(target));
                return target;
            })
            .catch(function () {
                var target = rollForward(anchor);
                storeSet('nt:next-target', String(target));
                return target;
            });
    }

    function pad(n) { return String(n).padStart(2, '0'); }

    function formatDate(ts) {
        return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }

    function initCountdown() {
        var holders = document.querySelectorAll('[data-countdown]');
        if (!holders.length) return;

        resolveTarget().then(function (target) {
            holders.forEach(function (holder) {
                holder.setAttribute('data-target', String(target));
            });
            var scheduled = document.getElementById('countdown-schedule');
            if (scheduled) scheduled.textContent = formatDate(target);
            tickCountdowns();
            setInterval(tickCountdowns, 1000);
        });
    }

    function tickCountdowns() {
        document.querySelectorAll('[data-countdown][data-target]').forEach(function (holder) {
            var target = Number(holder.getAttribute('data-target'));
            var DAY = 24 * 60 * 60 * 1000;
            var diff = target - Date.now();

            var days = Math.max(0, Math.floor(diff / DAY));
            var hours = Math.max(0, Math.floor((diff % DAY) / (60 * 60 * 1000)));
            var mins = Math.max(0, Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000)));
            var secs = Math.max(0, Math.floor((diff % (60 * 1000)) / 1000));

            var d = holder.querySelector('.num[data-unit="days"]');
            var h = holder.querySelector('.num[data-unit="hours"]');
            var m = holder.querySelector('.num[data-unit="mins"]');
            var s = holder.querySelector('.num[data-unit="secs"]');

            var done = diff <= 0;
            if (d) d.textContent = done ? '00' : String(days);
            if (h) h.textContent = pad(hours);
            if (m) m.textContent = pad(mins);
            if (s) s.textContent = pad(secs);

            var fill = holder.querySelector('.progress-fill');
            if (fill) {
                var weekStart = target - WEEK;
                var remain = Math.min(1, Math.max(0, diff / WEEK));
                fill.style.width = Math.round((1 - remain) * 100) + '%';
            }

            var note = holder.querySelector('.countdown-note');
            if (note && done) note.textContent = 'dropping now — check the catalog';

            var title = holder.querySelector('.countdown-title span');
            if (title && done) title.textContent = 'a new version is dropping';
        });
    }

    /* ---------- releases ---------- */

    function getReleases() {
        return fetchJSON('https://api.github.com/repos/' + REPO + '/releases?per_page=10').then(function (list) {
            if (!Array.isArray(list)) throw new Error('bad response');
            return list;
        });
    }

    function exeAsset(release) {
        if (!release || !release.assets) return null;
        return release.assets.filter(function (a) { return /\.exe$/i.test(a.name); })[0] || release.assets[0] || null;
    }

    function formatSize(bytes) {
        if (!bytes) return '';
        var mb = bytes / (1024 * 1024);
        return (mb >= 100 ? mb.toFixed(0) : mb.toFixed(1)) + ' mb';
    }

    function formatDateIso(iso) {
        var d = new Date(iso);
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function initHome() {
        var badge = document.getElementById('version-badge');
        var dlBtn = document.getElementById('dl-btn');
        var statReleases = document.getElementById('stat-releases');

        getReleases().then(function (list) {
            var latest = list[0];
            if (!latest) return;
            var tag = latest.tag_name || 'v?.?.?';
            if (badge) badge.textContent = tag + ' — now available';

            var asset = exeAsset(latest);
            if (dlBtn) {
                if (asset) {
                    dlBtn.href = asset.browser_download_url;
                    var label = dlBtn.querySelector('.dl-label');
                    if (label) {
                        label.textContent = 'download ' + tag + ' · ' + formatSize(asset.size);
                    }
                }
                dlBtn.classList.remove('disabled');
            }
            if (statReleases) statReleases.textContent = String(list.length);
        }).catch(function () {
            var tag = FALLBACK_LATEST.tag_name;
            if (badge) badge.textContent = tag + ' — now available';
            if (statReleases) statReleases.textContent = '2';
            if (dlBtn) {
                dlBtn.href = FALLBACK_LATEST.asset;
                var label = dlBtn.querySelector('.dl-label');
                if (label) label.textContent = 'download ' + tag + ' · ' + formatSize(FALLBACK_LATEST.size);
                dlBtn.classList.remove('disabled');
            }
        });
    }

    function markdownify(md) {
        var el = document.createElement('div');
        if (window.marked) {
            el.className = 'changelog';
            el.innerHTML = window.marked.parse(md || '');
        } else {
            el.className = 'changelog';
            el.textContent = (md || '').replace(/^#+\s*/gm, '').replace(/[*_`-]/g, '');
        }
        return el;
    }

    function ensureMarked() {
        return new Promise(function (resolve, reject) {
            if (window.marked) return resolve(window.marked);
            var s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/marked@12/lib/marked.umd.min.js';
            s.onload = function () { resolve(window.marked || null); };
            s.onerror = function () { reject(new Error('marked failed')); };
            document.head.appendChild(s);
        });
    }

    function initReleases() {
        var listEl = document.getElementById('release-list');
        if (!listEl) return;

        listEl.innerHTML =
            '<div class="state"><div class="spinner"></div>fetching the catalog…</div>';

        var latestHero = document.getElementById('release-hero');

        ensureMarked().catch(function () {}).then(function () {
            return getReleases();
        }).then(function (list) {
            if (!list.length) throw new Error('no releases');
            renderLatest(list[0]);
            renderList(list.slice(1));
        }).catch(function (err) {
            renderFallback();
        });
    }

    function renderLatest(release) {
        var el = document.getElementById('release-hero');
        if (!el) return;
        var tag = release.tag_name || 'latest';
        var asset = exeAsset(release);
        var sizeHtml = asset ? '<span class="rh-meta"><strong>' + formatSize(asset.size) + '</strong> installer</span>' : '';
        el.innerHTML =
            '<div>' +
            '  <span class="rh-tag chip">■ latest release</span>' +
            '  <h2>' + escapeHtml(release.name || 'NorthTracks') + '</h2>' +
            '  <div class="rh-version">' + escapeHtml(tag) + ' · released ' + escapeHtml(formatDateIso(release.published_at)) + '</div>' +
            '  <div class="rh-info">' + sizeHtml +
            '    <span class="rh-meta"><strong>windows 10 / 11</strong> · 64-bit</span>' +
            '  </div>' +
            '</div>' +
            '<div class="rh-actions">' +
            (asset
                ? '<a class="btn btn-primary btn-lg" href="' + escapeHtml(asset.browser_download_url) + '">download exe <span class="btn-arrow">&darr;</span></a>'
                : '') +
            '  <a class="btn btn-ghost btn-lg" href="https://github.com/' + REPO + '/releases/tag/' + escapeHtml(tag) + '" target="_blank" rel="noopener">release notes ↗</a>' +
            '</div>';
        el.classList.add('reveal', 'in');
    }

    function renderList(rest) {
        var listEl = document.getElementById('release-list');
        var heroTag = null;
        var hero = document.getElementById('release-hero');
        if (hero) {
            var h = hero.querySelector('h2');
            if (h) heroTag = h.textContent;
        }

        if (!rest.length) {
            listEl.innerHTML = '<div class="state">this is the only release so far — more shipping soon.</div>';
            return;
        }

        var html = rest.map(function (release) {
            var tag = release.tag_name || 'release';
            var asset = exeAsset(release);
            var size = asset ? formatSize(asset.size) : '';
            return (
                '<div class="release-card">' +
                '  <div class="release-head">' +
                '    <span class="tag release-tag">' + escapeHtml(tag) + '</span>' +
                '    <span class="release-name">' + escapeHtml(release.name || tag) + '</span>' +
                '    <div class="release-meta">' +
                '      <span class="meta-item">' + escapeHtml(formatDateIso(release.published_at)) + '</span>' +
                '      <span class="meta-item">' + escapeHtml(size) + '</span>' +
                (asset
                    ? '<a class="dl-btn" href="' + escapeHtml(asset.browser_download_url) + '">↓ download exe</a>'
                    : '') +
                '      <a class="meta-item" style="color:var(--accent-2)" href="https://github.com/' + REPO + '/releases/tag/' + escapeHtml(tag) + '" target="_blank" rel="noopener">tag ↗</a>' +
                '    </div>' +
                '  </div>' +
                '  <button class="release-toggle" type="button" aria-expanded="false">changelog <span class="chevron">▼</span></button>' +
                '  <div class="release-body"><div class="release-inner"></div></div>' +
                '</div>'
            );
        }).join('');

        listEl.innerHTML = html;

        listEl.querySelectorAll('.release-card').forEach(function (card, i) {
            var toggle = card.querySelector('.release-toggle');
            var body = card.querySelector('.release-body');
            var inner = card.querySelector('.release-inner');
            var release = rest[i];
            try { inner.appendChild(markdownify(release.body || 'No changelog notes published.')); }
            catch (e) { inner.textContent = 'No changelog notes published.'; }

            toggle.addEventListener('click', function () {
                var open = card.classList.toggle('open');
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        });
    }

    function renderFallback() {
        var heroEl = document.getElementById('release-hero');
        if (heroEl) {
            renderLatest({
                tag_name: FALLBACK_LATEST.tag_name,
                name: FALLBACK_LATEST.name,
                published_at: FALLBACK_LATEST.published_at,
                assets: [{ name: 'NorthTracks.Setup.' + FALLBACK_LATEST.tag_name.replace('v', '') + '.exe', size: FALLBACK_LATEST.size, browser_download_url: FALLBACK_LATEST.asset }]
            });
        }
        var listEl = document.getElementById('release-list');
        listEl.innerHTML =
            '<div class="state error">could not reach the catalog.<br>' +
            '<button class="retry" type="button" onclick="location.reload()">try again</button></div>';
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
        });
    }

    /* ---------- nav (scroll state) ---------- */

    function initNav() {
        var nav = document.querySelector('.nav');
        if (!nav) return;
        var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 10); };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* ---------- reveal on scroll ---------- */

    function initReveal() {
        var items = document.querySelectorAll('.reveal');
        if (!items.length) return;
        if (!('IntersectionObserver' in window)) {
            items.forEach(function (el) { el.classList.add('in'); });
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        items.forEach(function (el) { io.observe(el); });
    }

    /* ---------- boot ---------- */

    document.addEventListener('DOMContentLoaded', function () {
        initCountdown();
        initHome();
        initReleases();
        initNav();
        initReveal();
    });
})();