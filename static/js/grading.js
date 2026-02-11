// grading.js — Shared grading logic for single-run and compare views

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function inlineFormat(str) {
    // Inline code: `code`
    str = str.replace(/`([^`]+)`/g, '<code style="background:#e9ecef;padding:0.1rem 0.35rem;border-radius:3px;font-size:0.88em">$1</code>');
    // Bold: **text** or __text__
    str = str.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    str = str.replace(/__(.+?)__/g, '<strong>$1</strong>');
    // Italic: *text* or _text_ (but not inside words for _)
    str = str.replace(/(?<!\w)\*([^*]+?)\*(?!\w)/g, '<em>$1</em>');
    str = str.replace(/(?<!\w)_([^_]+?)_(?!\w)/g, '<em>$1</em>');
    return str;
}

function renderMarkdown(text) {
    if (!text) return '';
    let escaped = escapeHtml(text);
    let lines = escaped.split('\n');
    let html = '', i = 0;
    while (i < lines.length) {
        let line = lines[i];
        if (line.trim().startsWith('```')) {
            let code = []; i++;
            while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i++; }
            if (i < lines.length) i++;
            html += '<pre style="background:#f1f3f5;padding:0.75rem;border-radius:6px;overflow-x:auto;margin:0.5rem 0;white-space:pre-wrap"><code>' + code.join('\n') + '</code></pre>';
            continue;
        }
        if (/^(\s*[-*]\s*){3,}$/.test(line) && !/^\s*[-*]\s+\S/.test(line)) { html += '<hr>'; i++; continue; }
        if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s\-:|]+\|[\s\-:|]*$/.test(lines[i + 1])) {
            let th = '<table style="border-collapse:collapse;margin:0.5rem 0;font-size:0.9rem"><thead><tr>';
            let hd = line.split('|').map(c => c.trim()).filter(c => c !== '');
            hd.forEach(h => { th += '<th style="border:1px solid #dee2e6;padding:0.4rem 0.75rem;background:#f1f3f5">' + inlineFormat(h) + '</th>'; });
            th += '</tr></thead><tbody>'; i += 2;
            while (i < lines.length && lines[i].includes('|')) {
                let cells = lines[i].split('|').map(c => c.trim()).filter(c => c !== '');
                if (!cells.length) break;
                th += '<tr>'; cells.forEach(c => { th += '<td style="border:1px solid #dee2e6;padding:0.4rem 0.75rem">' + inlineFormat(c) + '</td>'; }); th += '</tr>'; i++;
            }
            th += '</tbody></table>'; html += th; continue;
        }
        if (/^#{1,4}\s/.test(line)) {
            const level = line.match(/^#+/)[0].length;
            html += `<h${level+1}>` + inlineFormat(line.replace(/^#+\s+/, '')) + `</h${level+1}>`;
            i++; continue;
        }
        if (/^\s*[-*]\s+/.test(line)) {
            html += '<ul>';
            while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { html += '<li>' + inlineFormat(lines[i].replace(/^\s*[-*]\s+/, '')) + '</li>'; i++; }
            html += '</ul>'; continue;
        }
        if (/^\s*\d+[.)]\s+/.test(line)) {
            html += '<ol>';
            while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { html += '<li>' + inlineFormat(lines[i].replace(/^\s*\d+[.)]\s+/, '')) + '</li>'; i++; }
            html += '</ol>'; continue;
        }
        if (line.trim() === '') { i++; continue; }
        html += '<p>' + inlineFormat(line) + '</p>'; i++;
    }
    return html;
}

// --- Tool call modal ---
let _toolModalOverlay = null;
let _toolModalState = { resultId: null, idx: 0 };
let _toolCallsCache = {}; // resultId -> { toolCalls, queryLabel, runLabel }

function parseJson(raw) {
    if (!raw) return null;
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch(e) { return typeof raw === 'string' ? raw : null; }
}

// Render a JSON value as a collapsible tree
function renderJsonTree(val, key, depth, startOpen) {
    if (depth === undefined) depth = 0;
    if (startOpen === undefined) startOpen = depth < 2;
    const indent = depth * 0.75;
    const keyHtml = key !== null ? '<span class="jt-key">' + escapeHtml(String(key)) + '</span>: ' : '';

    if (val === null) return '<div class="jt-line" style="padding-left:' + indent + 'rem">' + keyHtml + '<span class="jt-null">null</span></div>';
    if (typeof val === 'boolean') return '<div class="jt-line" style="padding-left:' + indent + 'rem">' + keyHtml + '<span class="jt-bool">' + val + '</span></div>';
    if (typeof val === 'number') return '<div class="jt-line" style="padding-left:' + indent + 'rem">' + keyHtml + '<span class="jt-number">' + val + '</span></div>';
    if (typeof val === 'string') {
        const escaped = escapeHtml(val);
        if (val.length > 200) {
            const id = 'jts-' + Math.random().toString(36).slice(2, 8);
            return '<div class="jt-line" style="padding-left:' + indent + 'rem">' + keyHtml +
                '<span class="jt-string">"<span id="' + id + '">' + escapeHtml(val.slice(0, 120)) + '</span>"</span> ' +
                '<button class="jt-expand-str" onclick="this.previousElementSibling.querySelector(\'span\').textContent=' +
                "'" + escaped.replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'" +
                ';this.textContent=\'\'">&hellip;' + val.length + ' chars</button></div>';
        }
        return '<div class="jt-line" style="padding-left:' + indent + 'rem">' + keyHtml + '<span class="jt-string">"' + escaped + '"</span></div>';
    }
    if (Array.isArray(val)) {
        if (val.length === 0) return '<div class="jt-line" style="padding-left:' + indent + 'rem">' + keyHtml + '<span class="jt-bracket">[]</span></div>';
        const openClass = startOpen ? ' open' : '';
        let h = '<div class="jt-node' + openClass + '" style="padding-left:' + indent + 'rem">';
        h += '<span class="jt-toggle" onclick="jtToggle(this.parentElement)">';
        h += keyHtml + '<span class="jt-bracket">[</span> <span class="jt-count">' + val.length + ' items</span></span>';
        h += '<div class="jt-children">';
        val.forEach((item, i) => { h += renderJsonTree(item, i, depth + 1, depth + 1 < 1); });
        h += '</div>';
        h += '<div class="jt-close" style="padding-left:' + indent + 'rem"><span class="jt-bracket">]</span></div>';
        h += '</div>';
        return h;
    }
    if (typeof val === 'object') {
        const keys = Object.keys(val);
        if (keys.length === 0) return '<div class="jt-line" style="padding-left:' + indent + 'rem">' + keyHtml + '<span class="jt-bracket">{}</span></div>';
        const openClass = startOpen ? ' open' : '';
        let h = '<div class="jt-node' + openClass + '" style="padding-left:' + indent + 'rem">';
        h += '<span class="jt-toggle" onclick="jtToggle(this.parentElement)">';
        h += keyHtml + '<span class="jt-bracket">{</span> <span class="jt-count">' + keys.length + ' keys</span></span>';
        h += '<div class="jt-children">';
        keys.forEach(k => { h += renderJsonTree(val[k], k, depth + 1, depth + 1 < 1); });
        h += '</div>';
        h += '<div class="jt-close" style="padding-left:' + indent + 'rem"><span class="jt-bracket">}</span></div>';
        h += '</div>';
        return h;
    }
    return '<div class="jt-line" style="padding-left:' + indent + 'rem">' + keyHtml + escapeHtml(String(val)) + '</div>';
}

function renderJsonSection(raw) {
    const parsed = parseJson(raw);
    if (parsed === null && !raw) return '<div class="tc-modal-json jt-root"><span class="jt-null">empty</span></div>';
    if (typeof parsed === 'string') return '<div class="tc-modal-json jt-root"><span class="jt-string">' + escapeHtml(parsed) + '</span></div>';
    if (typeof parsed === 'object') return '<div class="tc-modal-json jt-root">' + renderJsonTree(parsed, null, 0, true) + '</div>';
    return '<div class="tc-modal-json jt-root">' + escapeHtml(String(raw)) + '</div>';
}

function buildToolModalHtml(resultId, idx) {
    const cache = _toolCallsCache[resultId];
    if (!cache || !cache.toolCalls) return '';
    const tc = cache.toolCalls;
    if (idx < 0 || idx >= tc.length) return '';
    const t = tc[idx];
    const total = tc.length;

    // Build modal
    let h = '<div class="tc-modal">';

    // Header
    h += '<div class="tc-modal-header">';
    h += '<h3><span class="tool-pill" style="font-size:0.95rem;padding:0.2rem 0.6rem">' + escapeHtml(t.name || 'unknown') + '</span>';
    h += ' <span class="tc-modal-idx">Step ' + (idx + 1) + ' of ' + total;
    if (cache.queryLabel) h += ' &middot; ' + escapeHtml(cache.queryLabel);
    if (cache.runLabel) h += ' &middot; ' + escapeHtml(cache.runLabel);
    h += '</span></h3>';
    h += '<button class="tc-modal-close" onclick="closeToolModal()">&times;</button>';
    h += '</div>';

    // Split body: left sidebar + right content
    h += '<div class="tc-modal-split">';

    // Left: search + tool call list
    h += '<div class="tc-modal-sidebar">';
    h += '<div class="tc-search-box"><input type="text" class="tc-search-input" placeholder="Search output..." oninput="tcSearch(this.value)" onkeydown="if(event.key===\'Escape\'){this.value=\'\';tcSearch(\'\');}"></div>';
    h += '<div class="tc-sidebar-list" id="tcSidebarList">';
    tc.forEach((call, i) => {
        const active = i === idx ? ' active' : '';
        h += '<div class="tc-sidebar-item' + active + '" data-idx="' + i + '" onclick="selectToolInModal(' + i + ')">';
        h += '<span class="tc-sidebar-num">' + (i + 1) + '</span>';
        h += '<span class="tc-sidebar-name">' + escapeHtml(call.name || 'unknown') + '</span>';
        h += '</div>';
    });
    h += '</div></div>';

    // Store raw data for fullscreen viewer
    _toolModalState._argsRaw = t.arguments || '{}';
    _toolModalState._respRaw = t.response || '';

    // Right: input/output
    h += '<div class="tc-modal-content">';
    h += '<div class="tc-modal-section"><h4>Input (Arguments) <span class="jt-fold-btns"><button onclick="tcFoldSection(this,false)" title="Expand all">&#x229E;</button><button onclick="tcFoldSection(this,true)" title="Collapse all">&#x229F;</button><button onclick="tcOpenFullscreen(\'args\')" title="View fullscreen">&#x26F6;</button></span></h4>';
    h += renderJsonSection(t.arguments || '{}');
    h += '</div>';
    h += '<div class="tc-modal-section"><h4>Output (Response) <span class="jt-fold-btns"><button onclick="tcFoldSection(this,false)" title="Expand all">&#x229E;</button><button onclick="tcFoldSection(this,true)" title="Collapse all">&#x229F;</button><button onclick="tcOpenFullscreen(\'resp\')" title="View fullscreen">&#x26F6;</button></span></h4>';
    h += renderJsonSection(t.response || '');
    h += '</div>';
    h += '</div>';

    h += '</div></div>';
    return h;
}

function showToolModal(resultId, idx) {
    _toolModalState = { resultId, idx, _searchQuery: '' };
    if (!_toolModalOverlay) {
        _toolModalOverlay = document.getElementById('toolModalOverlay');
    }
    _toolModalOverlay.innerHTML = buildToolModalHtml(resultId, idx);
    _toolModalOverlay.style.display = 'flex';
    requestAnimationFrame(() => _toolModalOverlay.classList.add('visible'));
    document.addEventListener('keydown', _toolModalKeyHandler);
}

function closeToolModal() {
    if (_toolModalOverlay) {
        _toolModalOverlay.classList.remove('visible');
        setTimeout(() => { _toolModalOverlay.style.display = 'none'; }, 150);
    }
    document.removeEventListener('keydown', _toolModalKeyHandler);
}

function _restoreSearch() {
    const q = _toolModalState._searchQuery || '';
    if (q) {
        const input = _toolModalOverlay.querySelector('.tc-search-input');
        if (input) { input.value = q; tcSearch(q); }
        // Highlight matches in the right panel and expand to them
        _highlightInContent(q);
    }
}

function _highlightInContent(query) {
    if (!query) return;
    const content = _toolModalOverlay.querySelector('.tc-modal-content');
    if (!content) return;

    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null, false);
    const matches = [];
    const ql = query.toLowerCase();

    // Find all text nodes containing the query
    while (walker.nextNode()) {
        const node = walker.currentNode;
        const idx = node.textContent.toLowerCase().indexOf(ql);
        if (idx >= 0) matches.push({ node, idx });
    }

    if (!matches.length) return;

    // Expand all ancestor jt-nodes for each match
    matches.forEach(m => {
        let el = m.node.parentElement;
        while (el && !el.classList.contains('tc-modal-content')) {
            if (el.classList.contains('jt-node')) el.classList.add('open');
            el = el.parentElement;
        }
    });

    // Wrap matching text with <mark> highlights
    matches.forEach(m => {
        const node = m.node;
        const text = node.textContent;
        const idx = text.toLowerCase().indexOf(ql);
        if (idx < 0) return;

        const before = text.slice(0, idx);
        const match = text.slice(idx, idx + query.length);
        const after = text.slice(idx + query.length);

        const frag = document.createDocumentFragment();
        if (before) frag.appendChild(document.createTextNode(before));
        const mark = document.createElement('mark');
        mark.className = 'jt-highlight';
        mark.textContent = match;
        frag.appendChild(mark);
        if (after) frag.appendChild(document.createTextNode(after));
        node.parentNode.replaceChild(frag, node);
    });

    // Scroll to first highlight
    const first = content.querySelector('.jt-highlight');
    if (first) {
        setTimeout(() => first.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    }
}

function selectToolInModal(idx) {
    // Save search state
    const input = _toolModalOverlay.querySelector('.tc-search-input');
    if (input) _toolModalState._searchQuery = input.value;
    _toolModalState.idx = idx;
    _toolModalOverlay.innerHTML = buildToolModalHtml(_toolModalState.resultId, idx);
    _restoreSearch();
}

function navToolModal(dir) {
    const newIdx = _toolModalState.idx + dir;
    const cache = _toolCallsCache[_toolModalState.resultId];
    if (!cache || !cache.toolCalls) return;
    if (newIdx < 0 || newIdx >= cache.toolCalls.length) return;
    // Save search state
    const input = _toolModalOverlay.querySelector('.tc-search-input');
    if (input) _toolModalState._searchQuery = input.value;
    _toolModalState.idx = newIdx;
    _toolModalOverlay.innerHTML = buildToolModalHtml(_toolModalState.resultId, newIdx);
    _restoreSearch();
}

function _toolModalKeyHandler(e) {
    // Don't intercept keys when typing in search
    if (e.target.classList.contains('tc-search-input')) return;
    if (e.key === 'Escape') closeToolModal();
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); navToolModal(-1); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); navToolModal(1); }
}

function jtToggle(node) {
    const wasOpen = node.classList.contains('open');
    if (wasOpen) {
        // Collapsing: also collapse all children
        node.querySelectorAll('.jt-node').forEach(n => n.classList.remove('open'));
    }
    node.classList.toggle('open');
}

function tcFoldSection(btn, collapse) {
    const section = btn.closest('.tc-modal-section');
    if (!section) return;
    section.querySelectorAll('.jt-node').forEach(n => {
        if (collapse && n.parentElement.classList.contains('jt-root')) {
            n.classList.add('open');
        } else if (collapse) {
            n.classList.remove('open');
        } else {
            n.classList.add('open');
        }
    });
}

let _fullscreenPrev = null;
function tcOpenFullscreen(which) {
    const raw = which === 'args' ? _toolModalState._argsRaw : _toolModalState._respRaw;
    const label = which === 'args' ? 'Input (Arguments)' : 'Output (Response)';
    const cache = _toolCallsCache[_toolModalState.resultId];
    const tc = cache ? cache.toolCalls[_toolModalState.idx] : null;
    const toolName = tc ? escapeHtml(tc.name || 'unknown') : '';

    // Save current modal HTML so we can restore on back
    _fullscreenPrev = _toolModalOverlay.innerHTML;

    let parsed = parseJson(raw);

    let treeHtml;
    if (parsed !== null && typeof parsed === 'object') {
        treeHtml = renderJsonTree(parsed, null, 0, true);
    } else {
        treeHtml = '<span class="jt-string">' + escapeHtml(String(parsed || raw || '')) + '</span>';
    }

    let h = '<div class="tc-fullscreen">';
    h += '<div class="tc-fs-header">';
    h += '<button class="tc-fs-back" onclick="tcCloseFullscreen()" title="Back (Esc)">&larr; Back</button>';
    h += '<span class="tc-fs-title">' + toolName + ' &mdash; ' + label + '</span>';
    h += '<div class="tc-fs-tools">';
    h += '<input type="text" class="tc-fs-search" placeholder="Search..." oninput="tcFsSearch(this.value)">';
    h += '<span class="tc-fs-match-count" id="fsMatchCount"></span>';
    h += '<button class="jt-fold-btns-btn" onclick="tcFsSearchNav(-1)" title="Previous match">&#x25B2;</button>';
    h += '<button class="jt-fold-btns-btn" onclick="tcFsSearchNav(1)" title="Next match">&#x25BC;</button>';
    h += '<span class="jt-fold-btns"><button onclick="tcFoldFs(false)" title="Expand all">&#x229E;</button><button onclick="tcFoldFs(true)" title="Collapse all">&#x229F;</button></span>';
    h += '</div>';
    h += '</div>';
    h += '<div class="tc-fs-body"><div class="tc-modal-json jt-root">' + treeHtml + '</div></div>';
    h += '</div>';

    _toolModalOverlay.innerHTML = h;
    // Restore search from main modal if present
    const q = _toolModalState._searchQuery || '';
    if (q) {
        const input = _toolModalOverlay.querySelector('.tc-fs-search');
        if (input) { input.value = q; tcFsSearch(q); }
    }
    document.removeEventListener('keydown', _toolModalKeyHandler);
    document.addEventListener('keydown', _fullscreenKeyHandler);
}

function tcCloseFullscreen() {
    if (_fullscreenPrev) {
        _toolModalOverlay.innerHTML = _fullscreenPrev;
        _fullscreenPrev = null;
    }
    document.removeEventListener('keydown', _fullscreenKeyHandler);
    document.addEventListener('keydown', _toolModalKeyHandler);
}

function _fullscreenKeyHandler(e) {
    if (e.target.classList.contains('tc-fs-search')) {
        if (e.key === 'Enter') { e.preventDefault(); tcFsSearchNav(e.shiftKey ? -1 : 1); }
        if (e.key === 'Escape') { e.target.blur(); }
        return;
    }
    if (e.key === 'Escape') { e.preventDefault(); tcCloseFullscreen(); }
}

function tcFoldFs(collapse) {
    const body = document.querySelector('.tc-fs-body');
    if (!body) return;
    body.querySelectorAll('.jt-node').forEach(n => {
        if (collapse && n.parentElement.classList.contains('jt-root')) {
            n.classList.add('open');
        } else if (collapse) {
            n.classList.remove('open');
        } else {
            n.classList.add('open');
        }
    });
}

let _fsMatchIdx = -1;
function tcFsSearch(query) {
    const body = document.querySelector('.tc-fs-body');
    if (!body) return;

    // Clear previous highlights
    body.querySelectorAll('.jt-highlight').forEach(m => {
        const parent = m.parentNode;
        parent.replaceChild(document.createTextNode(m.textContent), m);
        parent.normalize();
    });

    const countEl = document.getElementById('fsMatchCount');
    if (!query.trim()) {
        _fsMatchIdx = -1;
        if (countEl) countEl.textContent = '';
        return;
    }

    // Find and highlight all substring matches in text nodes
    const ql = query.toLowerCase();
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null, false);
    const matches = [];
    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.textContent.toLowerCase().indexOf(ql) >= 0) matches.push(node);
    }

    // Process matches (expand ancestors + wrap with <mark>)
    matches.forEach(node => {
        // Expand ancestor jt-nodes
        let el = node.parentElement;
        while (el && !el.classList.contains('tc-fs-body')) {
            if (el.classList.contains('jt-node')) el.classList.add('open');
            el = el.parentElement;
        }
        // Wrap all occurrences in this text node
        const text = node.textContent;
        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        let lowerText = text.toLowerCase();
        let pos = lowerText.indexOf(ql);
        while (pos >= 0) {
            if (pos > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, pos)));
            const mark = document.createElement('mark');
            mark.className = 'jt-highlight';
            mark.textContent = text.slice(pos, pos + query.length);
            frag.appendChild(mark);
            lastIdx = pos + query.length;
            pos = lowerText.indexOf(ql, lastIdx);
        }
        if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        node.parentNode.replaceChild(frag, node);
    });

    const allMarks = body.querySelectorAll('.jt-highlight');
    if (countEl) countEl.textContent = allMarks.length ? allMarks.length + ' found' : 'No matches';
    // Jump to first match
    _fsMatchIdx = allMarks.length ? 0 : -1;
    if (allMarks.length) {
        allMarks[0].classList.add('jt-highlight-active');
        allMarks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function tcFsSearchNav(dir) {
    const body = document.querySelector('.tc-fs-body');
    if (!body) return;
    const allMarks = body.querySelectorAll('.jt-highlight');
    if (!allMarks.length) return;

    // Remove active from current
    if (_fsMatchIdx >= 0 && _fsMatchIdx < allMarks.length) {
        allMarks[_fsMatchIdx].classList.remove('jt-highlight-active');
    }

    _fsMatchIdx += dir;
    if (_fsMatchIdx >= allMarks.length) _fsMatchIdx = 0;
    if (_fsMatchIdx < 0) _fsMatchIdx = allMarks.length - 1;

    allMarks[_fsMatchIdx].classList.add('jt-highlight-active');
    allMarks[_fsMatchIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });

    const countEl = document.getElementById('fsMatchCount');
    if (countEl) countEl.textContent = (_fsMatchIdx + 1) + '/' + allMarks.length;
}

// --- Search across tool call input/output ---
function tcGetSearchText(tc) {
    let text = '';
    if (tc.arguments) {
        try {
            const parsed = typeof tc.arguments === 'string' ? JSON.parse(tc.arguments) : tc.arguments;
            text += JSON.stringify(parsed);
        } catch(e) { text += String(tc.arguments); }
    }
    if (tc.response) {
        try {
            const parsed = typeof tc.response === 'string' ? JSON.parse(tc.response) : tc.response;
            text += ' ' + JSON.stringify(parsed);
        } catch(e) { text += ' ' + String(tc.response); }
    }
    return text;
}

function tcSearch(query) {
    const cache = _toolCallsCache[_toolModalState.resultId];
    if (!cache || !cache.toolCalls) return;
    const list = document.getElementById('tcSidebarList');
    if (!list) return;
    const items = list.querySelectorAll('.tc-sidebar-item');

    if (!query.trim()) {
        // Show all, restore order
        items.forEach(item => {
            item.style.display = '';
            item.style.order = '';
            const nameEl = item.querySelector('.tc-sidebar-name');
            const snippet = item.querySelector('.tc-search-snippet');
            if (snippet) snippet.remove();
        });
        return;
    }

    const results = [];
    const ql = query.toLowerCase();
    cache.toolCalls.forEach((tc, i) => {
        const text = tcGetSearchText(tc);
        const pos = text.toLowerCase().indexOf(ql);
        results.push({ idx: i, match: pos >= 0, start: pos, text });
    });

    results.forEach(r => {
        const item = list.querySelector(`.tc-sidebar-item[data-idx="${r.idx}"]`);
        if (!item) return;
        // Remove old snippet
        const old = item.querySelector('.tc-search-snippet');
        if (old) old.remove();

        if (r.match) {
            item.style.display = '';
            item.style.order = '';
            // Show a snippet of the match context
            if (r.start !== undefined && r.start >= 0) {
                const snippetStart = Math.max(0, r.start - 20);
                const snippetEnd = Math.min(r.text.length, r.start + query.length + 40);
                let snippet = (snippetStart > 0 ? '...' : '') + r.text.slice(snippetStart, snippetEnd) + (snippetEnd < r.text.length ? '...' : '');
                // Highlight the match
                const ql = query.toLowerCase();
                const si = snippet.toLowerCase().indexOf(ql);
                if (si >= 0) {
                    snippet = escapeHtml(snippet.slice(0, si)) + '<mark>' + escapeHtml(snippet.slice(si, si + query.length)) + '</mark>' + escapeHtml(snippet.slice(si + query.length));
                } else {
                    snippet = escapeHtml(snippet);
                }
                const el = document.createElement('div');
                el.className = 'tc-search-snippet';
                el.innerHTML = snippet;
                item.appendChild(el);
            }
        } else {
            item.style.display = 'none';
        }
    });
}

function syntaxHighlightJson(json) {
    return json.replace(/("(?:\\.|[^"\\])*")\s*:/g, '<span class="json-key">$1</span>:')
               .replace(/:\s*("(?:\\.|[^"\\])*")/g, ': <span class="json-string">$1</span>')
               .replace(/:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, ': <span class="json-number">$1</span>')
               .replace(/:\s*(true|false)/g, ': <span class="json-bool">$1</span>')
               .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>')
               .replace(/\[\s*("(?:\\.|[^"\\])*")/g, '[<span class="json-string">$1</span>')
               .replace(/,\s*("(?:\\.|[^"\\])*")/g, ', <span class="json-string">$1</span>');
}

function renderToolCallPills(toolCalls, resultId) {
    if (!toolCalls || !toolCalls.length) return '';
    return '<div class="dc-tools">' + toolCalls.map((tc, i) =>
        '<span class="tool-pill-click" onclick="event.stopPropagation();showToolModal(' + resultId + ',' + i + ')" title="Click to view input/output">' + escapeHtml(tc.name || 'unknown') + '</span>'
    ).join(' ') + '</div>';
}

// --- Render reasoning steps ---
function renderReasoning(reasoning) {
    if (!reasoning || !reasoning.length) return '';
    let html = `<details class="detail-section">`;
    html += `<summary class="detail-summary">Reasoning (${reasoning.length} step${reasoning.length > 1 ? 's' : ''})</summary>`;
    html += `<div class="detail-body">`;
    reasoning.forEach((step, i) => {
        html += `<div class="reasoning-step">`;
        if (step.summary && Array.isArray(step.summary)) {
            step.summary.forEach(s => {
                html += `<div class="reasoning-text">${renderMarkdown(s)}</div>`;
            });
        } else if (step.summary && typeof step.summary === 'string') {
            html += `<div class="reasoning-text">${renderMarkdown(step.summary)}</div>`;
        }
        if (step.content && Array.isArray(step.content)) {
            step.content.forEach(c => {
                if (typeof c === 'string') {
                    html += `<div class="reasoning-text">${renderMarkdown(c)}</div>`;
                }
            });
        }
        html += `</div>`;
    });
    html += `</div></details>`;
    return html;
}

// --- Render result metadata (time, tokens, tools) + tool call pills + reasoning ---
function renderResultDetails(r, queryLabel, runLabel) {
    const tokens = r.usage && r.usage.total_tokens ? r.usage.total_tokens.toLocaleString() : 'N/A';
    const time = r.execution_time_seconds ? r.execution_time_seconds.toFixed(1) + 's' : 'N/A';

    // Cache tool calls for modal
    if (r.tool_calls && r.tool_calls.length) {
        _toolCallsCache[r.id] = { toolCalls: r.tool_calls, queryLabel: queryLabel || '', runLabel: runLabel || '' };
    }

    let html = `<div class="result-meta">
        <span><strong>Time:</strong> ${time}</span>
        <span><strong>Tokens:</strong> ${tokens}</span>
        <span><strong>Tool Calls:</strong> ${(r.tool_calls || []).length}</span>
    </div>`;
    html += renderToolCallPills(r.tool_calls, r.id);
    html += renderReasoning(r.reasoning);
    return html;
}

// === Single-run grading ===
let _singleRunLabel = '';
async function loadGrading(runId) {
    const [results, run] = await Promise.all([
        fetch(`/api/results?run_id=${runId}`).then(r => r.json()),
        fetch(`/api/runs/${runId}`).then(r => r.json()),
    ]);
    _singleRunLabel = run.label || '';
    renderGradingCards(results, runId);
}

function renderGradingCards(results, runId) {
    const container = document.getElementById('queryCards');
    if (!container) return;
    container.innerHTML = '';

    results.sort((a, b) => a.query_id - b.query_id);

    results.forEach(r => {
        const q = r.query || {};
        const grade = r.grade ? r.grade.grade : '';
        const card = document.createElement('div');
        card.className = 'query-card';
        card.id = `result-${r.id}`;

        card.innerHTML = `
            <div class="query-card-header">
                <span class="query-title">Query #${q.ordinal || r.query_id}
                    ${q.tag ? `<span class="type-badge">${escapeHtml(q.tag)}</span>` : ''}
                </span>
            </div>
            <div class="query-text">${renderMarkdown(q.query_text || '')}</div>
            <div class="expected-answer">
                <h4>Expected Answer</h4>
                <div>${renderMarkdown(q.expected_answer || '')}</div>
                ${q.comments ? `<div class="answer-comment"><strong>Note:</strong> ${escapeHtml(q.comments)}</div>` : ''}
            </div>
            <div>
                <h4 style="margin-bottom:0.5rem">Agent Response</h4>
                <div class="response-box ${grade}" id="response-${r.id}">
                    ${r.error ? `<div style="color:#dc3545;font-weight:600">ERROR: ${escapeHtml(r.error)}</div>` : renderMarkdown(r.agent_response || 'N/A')}
                </div>
                <div class="grade-buttons">
                    <button class="grade-btn grade-btn-correct ${grade === 'correct' ? 'active' : ''}" onclick="setGrade(${r.id}, 'correct')">✓ Correct</button>
                    <button class="grade-btn grade-btn-partial ${grade === 'partial' ? 'active' : ''}" onclick="setGrade(${r.id}, 'partial')">~ Partial</button>
                    <button class="grade-btn grade-btn-wrong ${grade === 'wrong' ? 'active' : ''}" onclick="setGrade(${r.id}, 'wrong')">✗ Wrong</button>
                </div>
                ${renderResultDetails(r, 'Q' + (q.ordinal || r.query_id))}
            </div>
        `;
        container.appendChild(card);
    });

    updateGradingSummary(results, _singleRunLabel);
}

async function setGrade(resultId, grade) {
    await fetch(`/api/grades/results/${resultId}/grade`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade }),
    });

    // Update UI
    const box = document.getElementById(`response-${resultId}`);
    if (box) {
        box.className = `response-box ${grade}`;
    }
    const card = document.getElementById(`result-${resultId}`);
    if (card) {
        card.querySelectorAll('.grade-btn').forEach(btn => btn.classList.remove('active'));
        card.querySelector(`.grade-btn-${grade}`).classList.add('active');
    }

    // Refresh summary
    const runId = typeof runIds !== 'undefined' ? runIds[0] : window.runId;
    const results = await fetch(`/api/results?run_id=${runId}`).then(r => r.json());
    updateGradingSummary(results, _singleRunLabel);

    // Auto-advance to next query card
    if (card) {
        const allCards = [...document.querySelectorAll('#queryCards .query-card')];
        const idx = allCards.indexOf(card);
        if (idx >= 0 && idx + 1 < allCards.length) {
            allCards[idx + 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

function updateGradingSummary(results, label) {
    let c = 0, p = 0, w = 0;
    results.forEach(r => {
        if (r.grade) {
            if (r.grade.grade === 'correct') c++;
            else if (r.grade.grade === 'partial') p++;
            else if (r.grade.grade === 'wrong') w++;
        }
    });
    const pending = results.length - (c + p + w);
    const graded = c + p + w;

    const summary = document.getElementById('gradeSummary');
    if (summary) {
        const runLabel = label || 'Results';
        summary.innerHTML = `<div class="summary-row">
            <div class="summary-group" style="background:#e7f1ff">
                <span class="summary-group-label" style="color:#004085">${escapeHtml(runLabel)}</span>
                <span class="summary-chip chip-correct">${c}</span>
                <span class="summary-chip chip-partial">${p}</span>
                <span class="summary-chip chip-wrong">${w}</span>
                <span class="summary-chip chip-pending">${pending}</span>
            </div>
        </div>`;
    }

    const progress = document.getElementById('gradingProgress');
    if (progress) {
        const pct = results.length ? Math.round(graded / results.length * 100) : 0;
        progress.innerHTML = `${graded}/${results.length} graded <div class="progress-bar" style="width:200px;display:inline-block;vertical-align:middle;margin:0 0.5rem"><div class="progress-fill" style="width:${pct}%"></div></div> ${pct}%`;
    }
}

// === Compare grading ===
let _compareAllResults = {};
let _compareRuns = [];

async function loadCompareGrading(runIds) {
    _compareAllResults = {};
    _compareRuns = [];

    for (const id of runIds) {
        const [run, results] = await Promise.all([
            fetch(`/api/runs/${id}`).then(r => r.json()),
            fetch(`/api/results?run_id=${id}`).then(r => r.json()),
        ]);
        _compareRuns.push(run);
        results.forEach(r => {
            if (!_compareAllResults[r.query_id]) _compareAllResults[r.query_id] = { query: r.query, runs: {} };
            _compareAllResults[r.query_id].runs[id] = r;
        });
    }

    renderCompareCards(_compareAllResults, _compareRuns);
}

// Color palette for summary groups
const _summaryGroupColors = [
    { bg: '#e7f1ff', label: '#004085' },
    { bg: '#fff3e0', label: '#7a4100' },
    { bg: '#e8f5e9', label: '#1b5e20' },
    { bg: '#f3e5f5', label: '#4a148c' },
    { bg: '#fff8e1', label: '#f57f17' },
    { bg: '#e0f7fa', label: '#006064' },
];

function renderCompareCards(allResults, runs) {
    const container = document.getElementById('queryCards');
    if (!container) return;
    container.innerHTML = '';

    const queryIds = Object.keys(allResults).sort((a, b) => parseInt(a) - parseInt(b));

    // Summary per run — colored chip style
    const summaryContainer = document.getElementById('gradeSummary');
    if (summaryContainer) {
        let html = '<div class="summary-row">';
        runs.forEach((run, ri) => {
            const colors = _summaryGroupColors[ri % _summaryGroupColors.length];
            let c = 0, p = 0, w = 0;
            queryIds.forEach(qid => {
                const r = allResults[qid].runs[run.id];
                if (r && r.grade) {
                    if (r.grade.grade === 'correct') c++;
                    else if (r.grade.grade === 'partial') p++;
                    else if (r.grade.grade === 'wrong') w++;
                }
            });
            const pending = queryIds.length - (c + p + w);
            if (ri > 0) html += '<div class="summary-divider"></div>';
            html += `<div class="summary-group" style="background:${colors.bg}">
                <span class="summary-group-label" style="color:${colors.label}">${escapeHtml(run.label)}</span>
                <span class="summary-chip chip-correct">${c}</span>
                <span class="summary-chip chip-partial">${p}</span>
                <span class="summary-chip chip-wrong">${w}</span>
                <span class="summary-chip chip-pending">${pending}</span>
            </div>`;
        });
        html += '</div>';
        summaryContainer.innerHTML = html;
    }

    queryIds.forEach(qid => {
        const entry = allResults[qid];
        const q = entry.query || {};
        const card = document.createElement('div');
        card.className = 'query-card';

        let tabBar = '<div class="tab-bar">';
        runs.forEach((run, idx) => {
            const r = entry.runs[run.id];
            const grade = r && r.grade ? r.grade.grade : 'not_graded';
            tabBar += `<button class="tab-btn ${idx === 0 ? 'active' : ''}" onclick="switchCompareTab(this, '${qid}', ${idx})">${escapeHtml(run.label)} <span class="grade-dot ${grade}"></span></button>`;
        });
        tabBar += '</div>';

        let panels = '';
        runs.forEach((run, idx) => {
            const r = entry.runs[run.id];
            const grade = r && r.grade ? r.grade.grade : '';
            const resultId = r ? r.id : null;
            panels += `<div class="tab-panel ${idx === 0 ? 'active' : ''}" id="compare-tab-${qid}-${idx}">`;
            if (r) {
                panels += `<div class="response-box ${grade}" id="response-${resultId}">${r.error ? `<div style="color:#dc3545">ERROR: ${escapeHtml(r.error)}</div>` : renderMarkdown(r.agent_response || 'N/A')}</div>`;
                panels += `<div class="grade-buttons">
                    <button class="grade-btn grade-btn-correct ${grade === 'correct' ? 'active' : ''}" onclick="setCompareGrade(${resultId}, 'correct', '${qid}', ${idx})">✓ Correct</button>
                    <button class="grade-btn grade-btn-partial ${grade === 'partial' ? 'active' : ''}" onclick="setCompareGrade(${resultId}, 'partial', '${qid}', ${idx})">~ Partial</button>
                    <button class="grade-btn grade-btn-wrong ${grade === 'wrong' ? 'active' : ''}" onclick="setCompareGrade(${resultId}, 'wrong', '${qid}', ${idx})">✗ Wrong</button>
                </div>`;
                panels += renderResultDetails(r, 'Q' + (q.ordinal || qid), run.label);
            } else {
                panels += '<div style="color:#adb5bd;font-style:italic;padding:1rem">No data for this query</div>';
            }
            panels += '</div>';
        });

        card.innerHTML = `
            <div class="query-card-header">
                <span class="query-title">Query #${q.ordinal || qid} ${q.tag ? `<span class="type-badge">${escapeHtml(q.tag)}</span>` : ''}</span>
            </div>
            <div class="query-text">${renderMarkdown(q.query_text || '')}</div>
            <div class="expected-answer">
                <h4>Expected Answer</h4>
                <div>${renderMarkdown(q.expected_answer || '')}</div>
                ${q.comments ? `<div class="answer-comment"><strong>Note:</strong> ${escapeHtml(q.comments)}</div>` : ''}
            </div>
            ${tabBar}
            ${panels}
        `;
        container.appendChild(card);
    });
}

function switchCompareTab(btn, qid, idx) {
    const bar = btn.parentElement;
    bar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const card = bar.parentElement;
    card.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`compare-tab-${qid}-${idx}`);
    if (target) target.classList.add('active');
}

async function setCompareGrade(resultId, grade, qid, tabIdx) {
    if (!resultId) return;
    await fetch(`/api/grades/results/${resultId}/grade`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade }),
    });

    // Update cached grade data
    if (_compareAllResults[qid] && _compareRuns[tabIdx]) {
        const r = _compareAllResults[qid].runs[_compareRuns[tabIdx].id];
        if (r) { r.grade = { grade }; }
    }

    const box = document.getElementById(`response-${resultId}`);
    if (box) box.className = `response-box ${grade}`;

    const panel = document.getElementById(`compare-tab-${qid}-${tabIdx}`);
    if (panel) {
        panel.querySelectorAll('.grade-btn').forEach(btn => btn.classList.remove('active'));
        panel.querySelector(`.grade-btn-${grade}`).classList.add('active');
    }

    // Update grade dot in tab
    const card = panel.closest('.query-card');
    const tabs = card.querySelectorAll('.tab-btn');
    const dot = tabs[tabIdx].querySelector('.grade-dot');
    if (dot) { dot.className = `grade-dot ${grade}`; }

    // Refresh colored summary chips
    _refreshCompareSummary();

    // Auto-advance: next tab or next query card
    const nextTabIdx = tabIdx + 1;
    if (nextTabIdx < tabs.length) {
        // Move to next run tab within same query
        tabs[nextTabIdx].click();
    } else {
        // All tabs graded for this query — move to next query card
        const allCards = [...document.querySelectorAll('#queryCards .query-card')];
        const cardIdx = allCards.indexOf(card);
        if (cardIdx >= 0 && cardIdx + 1 < allCards.length) {
            const nextCard = allCards[cardIdx + 1];
            nextCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Activate first tab of next card
            const firstTab = nextCard.querySelector('.tab-btn');
            if (firstTab) setTimeout(() => firstTab.click(), 300);
        }
    }
}

function _refreshCompareSummary() {
    const queryIds = Object.keys(_compareAllResults).sort((a, b) => parseInt(a) - parseInt(b));
    const summaryContainer = document.getElementById('gradeSummary');
    if (summaryContainer && _compareRuns.length) {
        let html = '<div class="summary-row">';
        let totalGraded = 0, totalAll = 0;
        _compareRuns.forEach((run, ri) => {
            const colors = _summaryGroupColors[ri % _summaryGroupColors.length];
            let c = 0, p = 0, w = 0;
            queryIds.forEach(qid => {
                const r = _compareAllResults[qid].runs[run.id];
                if (r && r.grade) {
                    if (r.grade.grade === 'correct') c++;
                    else if (r.grade.grade === 'partial') p++;
                    else if (r.grade.grade === 'wrong') w++;
                }
            });
            const pending = queryIds.length - (c + p + w);
            totalGraded += (c + p + w);
            totalAll += queryIds.length;
            if (ri > 0) html += '<div class="summary-divider"></div>';
            html += `<div class="summary-group" style="background:${colors.bg}">
                <span class="summary-group-label" style="color:${colors.label}">${escapeHtml(run.label)}</span>
                <span class="summary-chip chip-correct">${c}</span>
                <span class="summary-chip chip-partial">${p}</span>
                <span class="summary-chip chip-wrong">${w}</span>
                <span class="summary-chip chip-pending">${pending}</span>
            </div>`;
        });
        html += '</div>';
        summaryContainer.innerHTML = html;

        const progress = document.getElementById('gradingProgress');
        if (progress) {
            const pct = totalAll ? Math.round(totalGraded / totalAll * 100) : 0;
            progress.innerHTML = `${totalGraded}/${totalAll} graded <div class="progress-bar" style="width:200px;display:inline-block;vertical-align:middle;margin:0 0.5rem"><div class="progress-fill" style="width:${pct}%"></div></div> ${pct}%`;
        }
    }
}


// ── Config tab ──────────────────────────────────────────────────────
async function loadCompareConfigs(runIds) {
    const container = document.getElementById('configContent');
    if (!container) return;
    const configs = await Promise.all(runIds.map(id => fetch(`/api/runs/${id}/config`).then(r => r.json())));
    container.innerHTML = '';
    configs.forEach(cfg => {
        const div = document.createElement('div');
        container.appendChild(div);
        renderRunConfig(cfg, div);
    });
}

function renderRunConfig(cfg, targetEl) {
    const el = targetEl || document.getElementById('configContent');
    if (!el) return;
    const run = cfg.run || {};
    const agent = cfg.agent || {};
    const suite = cfg.suite || {};
    const groupSize = cfg.groupSize || 1;

    const toolsConfig = agent.tools_config;
    let toolsList = [];
    if (toolsConfig) {
        if (Array.isArray(toolsConfig)) {
            toolsConfig.forEach(tc => {
                if (tc.allowed_tools) toolsList.push(...tc.allowed_tools);
                else if (tc.name) toolsList.push(tc.name);
            });
        } else if (toolsConfig.allowed_tools) {
            toolsList = toolsConfig.allowed_tools;
        }
    }

    const fmtDate = (iso) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleString();
    };

    let duration = '—';
    if (run.started_at && run.completed_at) {
        const sec = Math.round((new Date(run.completed_at) - new Date(run.started_at)) / 1000);
        duration = sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`;
    }

    let html = '<div class="config-section">';
    html += '<h3 class="config-heading">Run</h3>';
    html += '<div class="config-grid">';
    html += `<div class="config-item"><span class="config-label">Label</span><span class="config-value">${escapeHtml(run.label)}</span></div>`;
    html += `<div class="config-item"><span class="config-label">Status</span><span class="config-value"><span class="status-${run.status}">${run.status}</span></span></div>`;
    html += `<div class="config-item"><span class="config-label">Queries</span><span class="config-value">${run.progress_total} (dataset has ${suite.query_count || '?'})</span></div>`;
    if (groupSize > 1) {
        html += `<div class="config-item"><span class="config-label">Runs in group</span><span class="config-value">${groupSize} (run #${run.run_number || 1})</span></div>`;
    }
    html += `<div class="config-item"><span class="config-label">Batch size</span><span class="config-value">${run.batch_size}</span></div>`;
    html += `<div class="config-item"><span class="config-label">Duration</span><span class="config-value">${duration}</span></div>`;
    html += `<div class="config-item"><span class="config-label">Started</span><span class="config-value">${fmtDate(run.started_at)}</span></div>`;
    html += `<div class="config-item"><span class="config-label">Completed</span><span class="config-value">${fmtDate(run.completed_at)}</span></div>`;
    if (run.output_dir) {
        html += `<div class="config-item config-item-wide"><span class="config-label">Output dir</span><span class="config-value config-mono">${escapeHtml(run.output_dir)}</span></div>`;
    }
    html += '</div></div>';

    // Dataset
    html += '<div class="config-section">';
    html += '<h3 class="config-heading">Dataset</h3>';
    html += '<div class="config-grid">';
    html += `<div class="config-item"><span class="config-label">Name</span><span class="config-value">${escapeHtml(suite.name || '—')}</span></div>`;
    html += `<div class="config-item"><span class="config-label">Total queries</span><span class="config-value">${suite.query_count || '—'}</span></div>`;
    if (suite.description) {
        html += `<div class="config-item config-item-wide"><span class="config-label">Description</span><span class="config-value">${escapeHtml(suite.description)}</span></div>`;
    }
    html += '</div></div>';

    // Agent
    html += '<div class="config-section">';
    html += '<h3 class="config-heading">Agent</h3>';
    html += '<div class="config-grid">';
    html += `<div class="config-item"><span class="config-label">Name</span><span class="config-value">${escapeHtml(agent.name || '—')}</span></div>`;
    html += `<div class="config-item"><span class="config-label">Model</span><span class="config-value config-mono">${escapeHtml(agent.model || '—')}</span></div>`;
    html += `<div class="config-item"><span class="config-label">Executor</span><span class="config-value">${escapeHtml(agent.executor_type || '—')}</span></div>`;
    if (toolsList.length) {
        html += `<div class="config-item config-item-wide"><span class="config-label">Tools (${toolsList.length})</span><span class="config-value">${toolsList.map(t => `<span class="config-tool-chip">${escapeHtml(t)}</span>`).join(' ')}</span></div>`;
    }
    html += '</div>';

    // System prompt
    if (agent.system_prompt) {
        html += '<div class="config-sub">';
        html += '<h4 class="config-subheading">System Prompt</h4>';
        html += `<pre class="config-pre">${escapeHtml(agent.system_prompt)}</pre>`;
        html += '</div>';
    }

    // Model settings
    if (agent.model_settings && Object.keys(agent.model_settings).length) {
        html += '<div class="config-sub">';
        html += '<h4 class="config-subheading">Model Settings</h4>';
        html += `<pre class="config-pre">${escapeHtml(JSON.stringify(agent.model_settings, null, 2))}</pre>`;
        html += '</div>';
    }

    // Tools config (raw JSON)
    if (toolsConfig) {
        html += '<div class="config-sub">';
        html += '<h4 class="config-subheading">Tools Config</h4>';
        html += `<pre class="config-pre">${escapeHtml(JSON.stringify(toolsConfig, null, 2))}</pre>`;
        html += '</div>';
    }

    html += '</div>';
    el.innerHTML = html;
}
