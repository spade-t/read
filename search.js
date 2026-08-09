// ===== 搜索功能 =====

let searchResults = [];
let searchDisplayCount = 50;
const SEARCH_BATCH_SIZE = 50;
let allMessagesForSearch = [];
let settingsForSearch = {};
let jumpToCallback = null;

function initSearch(messages, settingsObj, jumpFn) {
    allMessagesForSearch = messages;
    settingsForSearch = settingsObj;
    jumpToCallback = jumpFn;
}

function setSearchMessages(messages) {
    allMessagesForSearch = messages;
}

function performSearch(query, searchInputEl, searchDropdownEl, searchClearEl) {
    if (!query.trim()) {
        searchDropdownEl.classList.remove('show');
        searchResults = [];
        searchDisplayCount = SEARCH_BATCH_SIZE;
        return;
    }
    const q = query.trim().toLowerCase();
    searchResults = [];
    for (let i = 0; i < allMessagesForSearch.length; i++) {
        const msg = allMessagesForSearch[i];
        if ((msg._text || '').toLowerCase().includes(q)) {
            searchResults.push({ index: i, msg });
            if (searchResults.length > 2000) break;
        }
    }
    searchDisplayCount = SEARCH_BATCH_SIZE;
    renderSearchResults(searchInputEl, searchDropdownEl, searchClearEl);
}

function renderSearchResults(searchInputEl, searchDropdownEl, searchClearEl) {
    if (searchResults.length === 0) {
        searchDropdownEl.innerHTML = '<div class="sd-empty">没有找到匹配的消息</div>';
        searchDropdownEl.classList.add('show');
        return;
    }

    const total = searchResults.length;
    const displayTotal = Math.min(searchDisplayCount, total);
    const hasMore = displayTotal < total;

    let html = '<div class="sd-header">共 ' + total + ' 条结果</div>';

    for (let i = 0; i < displayTotal; i++) {
        const match = searchResults[i];
        const msg = match.msg;
        const isUser = msg._userType === 'user';
        let name = isUser ? settingsForSearch.userName : (settingsForSearch.botName && settingsForSearch.botName !== 'Bot' ?
            settingsForSearch.botName : (msg._botName || 'Bot'));
        const time = formatBeijingTime(msg.create_time);
        let preview = msg._text || '';
        const q = searchInputEl.value.trim().toLowerCase();
        const idx = preview.toLowerCase().indexOf(q);
        if (idx >= 0) {
            preview = preview.substring(0, idx) + '<em>' + preview.substring(idx, idx + q.length) +
                '</em>' + preview.substring(idx + q.length);
        }
        if (preview.length > 80) preview = preview.substring(0, 80) + '...';

        html += '<div class="sd-item" data-index="' + match.index + '">' +
            '<div class="sd-top"><span class="sd-name">' + escapeHtml(name) + '</span>' +
            '<span class="sd-time">' + escapeHtml(time) + '</span></div>' +
            '<div class="sd-preview">' + preview + '</div></div>';
    }

    if (hasMore) {
        const remaining = total - displayTotal;
        html += '<div class="sd-more-btn" id="sd-more-btn">▼ 显示更多 (' + remaining + '条)</div>';
    }

    searchDropdownEl.innerHTML = html;
    searchDropdownEl.classList.add('show');

    searchDropdownEl.querySelectorAll('.sd-item').forEach(el => {
        el.addEventListener('click', function() {
            const idx = parseInt(this.dataset.index);
            if (!isNaN(idx) && idx >= 0 && idx < allMessagesForSearch.length) {
                if (jumpToCallback) jumpToCallback(idx);
                searchDropdownEl.classList.remove('show');
                searchInputEl.value = '';
                searchClearEl.classList.remove('show');
                searchResults = [];
                searchDisplayCount = SEARCH_BATCH_SIZE;
            }
        });
    });

    const moreBtn = document.getElementById('sd-more-btn');
    if (moreBtn) {
        moreBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            searchDisplayCount += SEARCH_BATCH_SIZE;
            renderSearchResults(searchInputEl, searchDropdownEl, searchClearEl);
        });
    }
}

function clearSearch(searchInputEl, searchDropdownEl, searchClearEl) {
    searchInputEl.value = '';
    searchClearEl.classList.remove('show');
    searchDropdownEl.classList.remove('show');
    searchResults = [];
    searchDisplayCount = SEARCH_BATCH_SIZE;
}

function updateSearchSettings(settingsObj) {
    settingsForSearch = settingsObj;
}