(function() {
    'use strict';

    // ===== DOM 引用 =====
    const $ = id => document.getElementById(id);
    const uploadZone = $('upload-zone');
    const messagesContainer = $('messages-container');
    const footer = $('footer');
    const msgCount = $('msg-count');
    const title = $('title');
    const searchInput = $('search-input');
    const searchClear = $('search-clear');
    const searchDropdown = $('search-dropdown');
    const settingsBtn = $('settings-btn');
    const settingsOverlay = $('settings-overlay');
    const settingsClose = $('settings-close');
    const fileInput = $('file-input');
    const uploadBtn = $('upload-btn');
    const progressWrap = $('progress-wrap');
    const progressBar = $('progress-bar');
    const pstatus = $('pstatus');
    const pname = $('pname');
    const pdetail = $('pdetail');

    const sUserName = $('s-user-name');
    const sBotName = $('s-bot-name');
    const sUserAvatarInput = $('s-user-avatar-input');
    const sBotAvatarInput = $('s-bot-avatar-input');
    const sBgInput = $('s-bg-input');
    const sUserAvatarPreview = $('s-user-avatar-preview');
    const sBotAvatarPreview = $('s-bot-avatar-preview');
    const sBgPreview = $('s-bg-preview');
    const sSave = $('s-save');
    const sUploadJson = $('s-upload-json');
    const sExportMd = $('s-export-md');
    const sClearData = $('s-clear-data');
    const sDataSize = $('s-data-size');

    const confirmOverlay = $('confirm-overlay');
    const confirmTitle = $('confirm-title');
    const confirmDesc = $('confirm-desc');
    const confirmOk = $('confirm-ok');
    const confirmCancel = $('confirm-cancel');

    // ===== 全局状态 =====
    const DB_NAME = 'ChatViewerDB';
    const STORE_NAME = 'messages';
    const SETTINGS_STORE = 'settings';
    const DB_VERSION = 2;

    let allMessages = [];
    let isDataLoaded = false;
    let isParsing = false;
    let db = null;
    let settings = {
        userName: '我',
        botName: 'Bot',
        userAvatar: '',
        botAvatar: '',
        bgImage: ''
    };
    let pendingConfirm = null;
    let renderStart = 0;
    let renderEnd = 0;
    let isScrolling = false;
    let scrollRAF = null;

    // 搜索状态
    let searchResults = [];
    let searchDisplayCount = 50;
    const SEARCH_BATCH_SIZE = 50;

    // 保存滚动位置
    let savedScrollTop = 0;

    // ===== 消息文本提取 =====
    function extractRealText(showContent) {
        if (!showContent) return '';
        if (typeof showContent === 'string') {
            try {
                const parsed = JSON.parse(showContent);
                return extractTextFromBlocks(parsed);
            } catch (e) {
                return showContent.trim();
            }
        }
        if (Array.isArray(showContent)) {
            return extractTextFromBlocks(showContent);
        }
        return String(showContent).trim();
    }

    function extractTextFromBlocks(blocks) {
        if (!Array.isArray(blocks)) return '';
        let textOut = '';
        for (const block of blocks) {
            if (block?.content_v2?.text_block?.text) {
                textOut += block.content_v2.text_block.text;
            } else if (block?.content) {
                try {
                    const cObj = JSON.parse(block.content);
                    if (cObj.text) textOut += cObj.text;
                    else if (cObj.content) textOut += cObj.content;
                } catch (e) {
                    if (typeof block.content === 'string') textOut += block.content;
                }
            } else if (block?.text) {
                textOut += block.text;
            }
        }
        return textOut.trim();
    }

    function extractFromAppendFields(msg) {
        if (!msg.append_fields || !Array.isArray(msg.append_fields)) return '';
        for (const field of msg.append_fields) {
            if (field.content && typeof field.content === 'string') {
                try {
                    const parsed = JSON.parse(field.content);
                    if (parsed.text && typeof parsed.text === 'string') return parsed.text.trim();
                    if (parsed.content && typeof parsed.content === 'string') return parsed.content.trim();
                } catch (e) {
                    if (field.content.trim()) return field.content.trim();
                }
            }
            if (field.content_v2 && typeof field.content_v2 === 'string') {
                try {
                    const parsed = JSON.parse(field.content_v2);
                    if (parsed.text_block && parsed.text_block.text) {
                        return parsed.text_block.text.trim();
                    }
                    if (parsed.text && typeof parsed.text === 'string') return parsed.text.trim();
                } catch (e) {
                    if (field.content_v2.trim()) return field.content_v2.trim();
                }
            }
            if (field.text && typeof field.text === 'string' && field.text.trim()) {
                return field.text.trim();
            }
        }
        return '';
    }

    function extractMessageText(msg) {
        let text = extractRealText(msg.show_content);
        if (text) return text;
        text = extractFromAppendFields(msg);
        if (text) return text;
        if (msg.content && typeof msg.content === 'string' && msg.content.trim()) {
            try {
                const parsed = JSON.parse(msg.content);
                if (parsed.text) return parsed.text.trim();
                if (parsed.content) return parsed.content.trim();
            } catch (e) {
                return msg.content.trim();
            }
        }
        if (msg.text && typeof msg.text === 'string' && msg.text.trim()) {
            return msg.text.trim();
        }
        return '[空消息]';
    }

    function parseMessagesFromJSON(jsonData) {
        let conversations = [];
        if (Array.isArray(jsonData)) {
            conversations = jsonData;
        } else if (jsonData.conversations && Array.isArray(jsonData.conversations)) {
            conversations = jsonData.conversations;
        } else if (jsonData.messages && Array.isArray(jsonData.messages)) {
            return jsonData.messages.map(m => ({
                ...m,
                _text: extractMessageText(m),
                _userType: m.user_type || 'bot'
            }));
        } else {
            for (const key of Object.keys(jsonData)) {
                if (Array.isArray(jsonData[key]) && jsonData[key].length > 0) {
                    conversations = jsonData[key];
                    break;
                }
            }
        }
        const result = [];
        let botName = 'Bot';
        for (const conv of conversations) {
            if (conv.bot_name) botName = conv.bot_name;
            if (conv.messages && Array.isArray(conv.messages)) {
                for (const msg of conv.messages) {
                    result.push({
                        ...msg,
                        _text: extractMessageText(msg),
                        _userType: msg.user_type || 'bot',
                        _botName: conv.bot_name || botName
                    });
                }
            }
        }
        return { messages: result, botName };
    }

    // ===== IndexedDB =====
    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (e) => {
                const d = e.target.result;
                if (!d.objectStoreNames.contains(STORE_NAME)) {
                    d.createObjectStore(STORE_NAME, { keyPath: 'message_id' });
                }
                if (!d.objectStoreNames.contains(SETTINGS_STORE)) {
                    d.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
                }
            };
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    async function getDB() {
        if (!db) db = await openDB();
        return db;
    }

    async function saveMessagesToDB(messages) {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const msg of messages) store.put(msg);
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    }

    async function loadAllMessagesFromDB() {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        return new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function deleteMessageFromDB(messageId) {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(messageId);
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    }

    async function clearAllMessagesDB() {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    }

    async function saveSettingsToDB(settings) {
        const db = await getDB();
        const tx = db.transaction(SETTINGS_STORE, 'readwrite');
        const store = tx.objectStore(SETTINGS_STORE);
        for (const [key, value] of Object.entries(settings)) {
            store.put({ key, value });
        }
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    }

    async function loadSettingsFromDB() {
        const db = await getDB();
        const tx = db.transaction(SETTINGS_STORE, 'readonly');
        const store = tx.objectStore(SETTINGS_STORE);
        const all = await new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        const result = {};
        for (const item of all) result[item.key] = item.value;
        return result;
    }

    // 保存滚动位置
    function saveScrollPosition() {
        if (messagesContainer && isDataLoaded) {
            try {
                localStorage.setItem('chat_scroll_top', String(messagesContainer.scrollTop));
            } catch (e) {}
        }
    }

    function loadScrollPosition() {
        try {
            const pos = localStorage.getItem('chat_scroll_top');
            if (pos !== null) {
                savedScrollTop = parseInt(pos, 10) || 0;
            }
        } catch (e) {}
    }

    // ===== JSON 解析 =====
    function parseJSONFileComplete(file, onProgress, onComplete, onError) {
        const reader = new FileReader();
        reader.onprogress = function(e) {
            if (e.total > 0) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        };
        reader.onload = function(e) {
            try {
                const jsonData = JSON.parse(e.target.result);
                const result = parseMessagesFromJSON(jsonData);
                onComplete(result.messages, result.botName);
            } catch (err) {
                onError('JSON解析失败: ' + err.message);
            }
        };
        reader.onerror = function(e) {
            onError('读取文件失败: ' + e.target.error);
        };
        reader.readAsText(file);
    }

    // ===== 渲染 =====
    function getItemHeight() {
        if (window.innerWidth <= 400) return 90;
        if (window.innerWidth <= 600) return 100;
        return 110;
    }

    function renderMessages(container, start, end) {
        const total = allMessages.length;
        if (total === 0) {
            container.innerHTML =
                '<div style="text-align:center;padding:60px 20px;color:#999;font-size:16px;">暂无消息</div>';
            return;
        }
        const itemH = getItemHeight();

        // 使用 DocumentFragment 批量构建
        const fragment = document.createDocumentFragment();
        const wrapper = document.createElement('div');
        wrapper.style.paddingTop = Math.max(0, start * itemH) + 'px';
        wrapper.style.paddingBottom = Math.max(0, (total - end) * itemH) + 'px';

        const actualEnd = Math.min(end, total);
        for (let i = start; i < actualEnd; i++) {
            wrapper.appendChild(createMessageElement(allMessages[i], i));
        }

        fragment.appendChild(wrapper);
        container.innerHTML = '';
        container.appendChild(fragment);
    }

    function createMessageElement(msg, index) {
        const isUser = msg._userType === 'user';
        let displayName;
        if (isUser) {
            displayName = settings.userName || '我';
        } else {
            displayName = settings.botName && settings.botName !== 'Bot' ? settings.botName : (msg._botName || 'Bot');
        }
        const avatar = isUser ? settings.userAvatar : settings.botAvatar;
        const time = formatBeijingTime(msg.create_time);

        const item = document.createElement('div');
        item.className = 'msg-item';
        item.dataset.index = index;

        const row = document.createElement('div');
        row.className = 'msg-row ' + (isUser ? 'user' : 'bot');

        const avatarImg = document.createElement('img');
        avatarImg.className = 'msg-avatar';
        avatarImg.src = avatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Ccircle cx="20" cy="20" r="20" fill="%23ccc"/%3E%3Ctext x="20" y="26" font-size="18" text-anchor="middle" fill="%23999"%3E' +
            (isUser ? '我' : 'B') + '%3C/text%3E%3C/svg%3E';
        avatarImg.alt = displayName;
        avatarImg.loading = 'lazy';

        const body = document.createElement('div');
        body.className = 'msg-body';

        const header = document.createElement('div');
        header.className = 'msg-header';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'mname';
        nameSpan.textContent = displayName;
        const timeSpan = document.createElement('span');
        timeSpan.className = 'mtime';
        timeSpan.textContent = '(' + time + ')';
        header.appendChild(nameSpan);
        header.appendChild(timeSpan);

        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        const content = document.createElement('div');
        content.className = 'text-content';
        content.textContent = msg._text || '[空消息]';
        bubble.appendChild(content);

        const actions = document.createElement('div');
        actions.className = 'msg-actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'msg-action-btn copy-btn';
        copyBtn.textContent = '复制';
        copyBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const text = msg._text || '';
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => showToast('✅ 已复制'));
            } else {
                fallbackCopy(text);
            }
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'msg-action-btn delete-btn';
        deleteBtn.textContent = '删除';
        const idx = index;
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            confirmAction().then((ok) => {
                if (ok) deleteMessage(idx);
            }).catch(() => {});
        });

        actions.appendChild(copyBtn);
        actions.appendChild(deleteBtn);

        body.appendChild(header);
        body.appendChild(bubble);
        body.appendChild(actions);

        row.appendChild(avatarImg);
        row.appendChild(body);
        item.appendChild(row);
        return item;
    }

    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showToast('✅ 已复制');
        } catch (e) {
            showToast('❌ 复制失败');
        }
        document.body.removeChild(ta);
    }

    let toastTimer = null;

    function showToast(message) {
        const existing = document.querySelector('.custom-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'custom-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 300);
        }, 2000);
    }

    function formatBeijingTime(isoStr) {
        if (!isoStr) return '未知时间';
        try {
            const date = new Date(isoStr);
            if (isNaN(date.getTime())) return isoStr;
            const beijing = new Date(date.getTime() + 8 * 60 * 60 * 1000);
            const y = beijing.getUTCFullYear();
            const m = String(beijing.getUTCMonth() + 1).padStart(2, '0');
            const d = String(beijing.getUTCDate()).padStart(2, '0');
            const h = String(beijing.getUTCHours()).padStart(2, '0');
            const min = String(beijing.getUTCMinutes()).padStart(2, '0');
            return y + '-' + m + '-' + d + ' ' + h + ':' + min;
        } catch (e) {
            return isoStr;
        }
    }

    // ===== 删除消息 =====
    async function deleteMessage(index) {
        if (index < 0 || index >= allMessages.length) return;
        const msg = allMessages[index];
        const msgId = msg.message_id;
        try {
            if (msgId) await deleteMessageFromDB(msgId);
            allMessages.splice(index, 1);
            updateUI();
            showToast('🗑️ 已删除');
        } catch (err) {
            showToast('❌ 删除失败');
        }
    }

    // ===== 搜索 =====
    function performSearch(query) {
        if (!query.trim()) {
            searchDropdown.classList.remove('show');
            searchResults = [];
            searchDisplayCount = SEARCH_BATCH_SIZE;
            return;
        }
        const q = query.trim().toLowerCase();
        searchResults = [];
        for (let i = 0; i < allMessages.length; i++) {
            const msg = allMessages[i];
            if ((msg._text || '').toLowerCase().includes(q)) {
                searchResults.push({ index: i, msg });
                if (searchResults.length > 2000) break;
            }
        }
        searchDisplayCount = SEARCH_BATCH_SIZE;
        renderSearchResults();
    }

    function renderSearchResults() {
        if (searchResults.length === 0) {
            searchDropdown.innerHTML = '<div class="sd-empty">没有找到匹配的消息</div>';
            searchDropdown.classList.add('show');
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
            let name = isUser ? settings.userName : (settings.botName && settings.botName !== 'Bot' ?
                settings.botName : (msg._botName || 'Bot'));
            const time = formatBeijingTime(msg.create_time);
            let preview = msg._text || '';
            const q = searchInput.value.trim().toLowerCase();
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

        searchDropdown.innerHTML = html;
        searchDropdown.classList.add('show');

        // 绑定点击事件
        searchDropdown.querySelectorAll('.sd-item').forEach(el => {
            el.addEventListener('click', function() {
                const idx = parseInt(this.dataset.index);
                if (!isNaN(idx) && idx >= 0 && idx < allMessages.length) {
                    jumpToMessage(idx);
                    searchDropdown.classList.remove('show');
                    searchInput.value = '';
                    searchClear.classList.remove('show');
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
                renderSearchResults();
            });
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function jumpToMessage(index) {
        if (index < 0 || index >= allMessages.length) return;
        const container = messagesContainer;
        const itemH = getItemHeight();
        const targetScroll = Math.max(0, index * itemH - container.clientHeight / 3);
        container.scrollTo({ top: targetScroll, behavior: 'smooth' });

        // 清除之前的高亮
        const items = container.querySelectorAll('.msg-item');
        for (const item of items) {
            item.classList.remove('highlighted');
        }

        // 高亮目标消息
        setTimeout(() => {
            const items2 = container.querySelectorAll('.msg-item');
            for (const item of items2) {
                if (item.dataset && parseInt(item.dataset.index) === index) {
                    item.classList.add('highlighted');
                    item.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    // 3秒后移除高亮
                    setTimeout(() => {
                        item.classList.remove('highlighted');
                    }, 3000);
                    break;
                }
            }
        }, 400);
    }

    // ===== 导出MD =====
    function exportMD() {
        if (allMessages.length === 0) {
            showToast('❌ 没有消息可导出');
            return;
        }
        let md = '# 聊天记录导出\n\n';
        let count = 0;
        for (const msg of allMessages) {
            const isUser = msg._userType === 'user';
            let name = isUser ? settings.userName : (settings.botName && settings.botName !== 'Bot' ?
                settings.botName : (msg._botName || 'Bot'));
            md += name + ' (' + formatBeijingTime(msg.create_time) + '): ' + (msg._text || '') + '\n\n';
            if (++count > 50000) { md += '... (消息过多，截断)'; break; }
        }
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'chat_export_' + new Date().toISOString().slice(0, 10) + '.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('✅ 导出完成');
    }

    // ===== 确认弹窗 =====
    function confirmAction() {
        return new Promise((resolve) => {
            confirmOverlay.classList.add('open');
            pendingConfirm = resolve;
        });
    }

    confirmOk.addEventListener('click', function() {
        confirmOverlay.classList.remove('open');
        if (pendingConfirm) { pendingConfirm(true);
            pendingConfirm = null; }
    });
    confirmCancel.addEventListener('click', function() {
        confirmOverlay.classList.remove('open');
        if (pendingConfirm) { pendingConfirm(false);
            pendingConfirm = null; }
    });
    confirmOverlay.addEventListener('click', function(e) {
        if (e.target === this) {
            confirmOverlay.classList.remove('open');
            if (pendingConfirm) { pendingConfirm(false);
                pendingConfirm = null; }
        }
    });

    // ===== UI更新 =====
    function updateUI() {
        const container = messagesContainer;
        const total = allMessages.length;
        if (total === 0) {
            container.innerHTML =
                '<div style="text-align:center;padding:60px 20px;color:#999;font-size:16px;">暂无消息</div>';
            updateFooter();
            return;
        }
        const itemH = getItemHeight();
        const scrollTop = container.scrollTop || 0;
        const start = Math.max(0, Math.floor(scrollTop / itemH) - 3);
        const end = Math.min(total, Math.ceil((scrollTop + container.clientHeight) / itemH) + 3);
        renderStart = start;
        renderEnd = end;
        renderMessages(container, start, end);
        updateFooter();
    }

    function updateFooter() {
        const total = allMessages.length;
        msgCount.textContent = '总消息: ' + total.toLocaleString() + ' 条';
        const sizeMB = (new Blob([JSON.stringify(allMessages)]).size / (1024 * 1024)).toFixed(1);
        sDataSize.textContent = '数据大小: ' + sizeMB + ' MB';
    }

    function applySettings() {
        const botName = settings.botName || 'Bot';
        title.textContent = '与 ' + botName + ' 的对话';

        if (settings.bgImage) {
            messagesContainer.style.backgroundImage = 'url(' + settings.bgImage + ')';
        } else {
            messagesContainer.style.backgroundImage = 'none';
            messagesContainer.style.backgroundColor = 'var(--bg-color)';
        }

        sUserName.value = settings.userName || '';
        sBotName.value = settings.botName || '';
        sUserAvatarPreview.src = settings.userAvatar || '';
        sBotAvatarPreview.src = settings.botAvatar || '';
        sBgPreview.src = settings.bgImage || '';

        if (isDataLoaded && allMessages.length > 0) updateUI();
    }

    // ===== 数据加载 =====
    async function loadDataFromDB() {
        try {
            const msgs = await loadAllMessagesFromDB();
            if (msgs && msgs.length > 0) {
                allMessages = msgs.sort((a, b) => (a.create_time || '').localeCompare(b.create_time || ''));
                isDataLoaded = true;
                showMessagesView();
                updateUI();
                // 恢复滚动位置
                loadScrollPosition();
                setTimeout(() => {
                    messagesContainer.scrollTop = savedScrollTop;
                }, 50);
                return true;
            }
            return false;
        } catch (err) {
            return false;
        }
    }

    async function loadSettings() {
        try {
            const saved = await loadSettingsFromDB();
            Object.assign(settings, saved);
            applySettings();
        } catch (err) {}
    }

    function showMessagesView() {
        uploadZone.style.display = 'none';
        messagesContainer.style.display = 'block';
        footer.style.display = 'flex';
        progressWrap.classList.remove('show');
    }

    function showUploadView() {
        uploadZone.style.display = 'flex';
        messagesContainer.style.display = 'none';
        footer.style.display = 'none';
        progressWrap.classList.remove('show');
        fileInput.value = '';
        isDataLoaded = false;
    }

    // ===== 上传处理 =====
    function handleFile(file) {
        if (isParsing) return;
        if (!file || !file.name.endsWith('.json')) {
            showToast('❌ 请上传 JSON 文件');
            return;
        }

        isParsing = true;
        progressWrap.classList.add('show');
        progressBar.style.width = '0%';
        pstatus.textContent = '0%';
        pname.textContent = file.name;
        pdetail.textContent = '准备解析...';

        parseJSONFileComplete(
            file,
            (progress) => {
                progressBar.style.width = progress + '%';
                pstatus.textContent = progress + '%';
                pdetail.textContent = '解析中...';
            },
            async (messages, botName) => {
                isParsing = false;
                if (messages.length === 0) {
                    showToast('❌ 未解析到任何消息');
                    progressWrap.classList.remove('show');
                    return;
                }

                messages.sort((a, b) => (a.create_time || '').localeCompare(b.create_time || ''));
                allMessages = messages;
                if (botName && botName !== 'Bot') settings.botName = botName;

                try {
                    await clearAllMessagesDB();
                    for (let i = 0; i < allMessages.length; i += 5000) {
                        await saveMessagesToDB(allMessages.slice(i, i + 5000));
                    }
                    await saveSettingsToDB(settings);
                    isDataLoaded = true;
                    showMessagesView();
                    applySettings();
                    updateUI();
                    pdetail.textContent = '✅ 完成！共 ' + allMessages.length.toLocaleString() + ' 条消息';
                    pstatus.textContent = '✅ 完成';
                    showToast('✅ 导入完成');
                    // 滚动到底部
                    setTimeout(() => {
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }, 100);
                } catch (err) {
                    showToast('❌ 保存失败');
                }
            },
            (err) => {
                isParsing = false;
                showToast('❌ ' + err);
                progressWrap.classList.remove('show');
            }
        );
    }

    // ===== 设置面板 =====
    function openSettings() {
        settingsOverlay.classList.add('open');
        sUserName.value = settings.userName || '';
        sBotName.value = settings.botName || '';
        sUserAvatarPreview.src = settings.userAvatar || '';
        sBotAvatarPreview.src = settings.botAvatar || '';
        sBgPreview.src = settings.bgImage || '';
    }

    function closeSettings() {
        settingsOverlay.classList.remove('open');
    }

    function imageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e.target.error);
            reader.readAsDataURL(file);
        });
    }

    // ===== 事件绑定 =====
    uploadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        fileInput.click();
    });

    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            handleFile(this.files[0]);
        }
        this.value = '';
    });

    let searchTimer = null;
    searchInput.addEventListener('input', function() {
        const val = this.value;
        if (val.trim()) {
            searchClear.classList.add('show');
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => performSearch(val), 200);
        } else {
            searchClear.classList.remove('show');
            searchDropdown.classList.remove('show');
            searchResults = [];
            searchDisplayCount = SEARCH_BATCH_SIZE;
        }
    });
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            this.value = '';
            searchClear.classList.remove('show');
            searchDropdown.classList.remove('show');
            searchResults = [];
            searchDisplayCount = SEARCH_BATCH_SIZE;
            this.blur();
        }
        if (e.key === 'Enter') {
            const first = searchDropdown.querySelector('.sd-item');
            if (first) first.click();
        }
    });
    searchClear.addEventListener('click', function() {
        searchInput.value = '';
        this.classList.remove('show');
        searchDropdown.classList.remove('show');
        searchResults = [];
        searchDisplayCount = SEARCH_BATCH_SIZE;
        searchInput.focus();
    });
    document.addEventListener('click', function(e) {
        const wrap = document.getElementById('search-wrap');
        if (!wrap.contains(e.target)) {
            searchDropdown.classList.remove('show');
        }
    });

    settingsBtn.addEventListener('click', openSettings);
    settingsClose.addEventListener('click', closeSettings);
    settingsOverlay.addEventListener('click', function(e) {
        if (e.target === this) closeSettings();
    });

    sSave.addEventListener('click', async function() {
        settings.userName = sUserName.value.trim() || '我';
        settings.botName = sBotName.value.trim() || 'Bot';
        try {
            await saveSettingsToDB(settings);
            title.textContent = '与 ' + settings.botName + ' 的对话';
            if (isDataLoaded && allMessages.length > 0) updateUI();
            closeSettings();
            showToast('✅ 设置已保存');
        } catch (err) {
            showToast('❌ 保存失败');
        }
    });

    sUserAvatarInput.addEventListener('change', async function() {
        if (this.files && this.files[0]) {
            try {
                settings.userAvatar = await imageToBase64(this.files[0]);
                sUserAvatarPreview.src = settings.userAvatar;
            } catch (err) { showToast('❌ 图片读取失败'); }
        }
        this.value = '';
    });
    sBotAvatarInput.addEventListener('change', async function() {
        if (this.files && this.files[0]) {
            try {
                settings.botAvatar = await imageToBase64(this.files[0]);
                sBotAvatarPreview.src = settings.botAvatar;
            } catch (err) { showToast('❌ 图片读取失败'); }
        }
        this.value = '';
    });
    sBgInput.addEventListener('change', async function() {
        if (this.files && this.files[0]) {
            try {
                settings.bgImage = await imageToBase64(this.files[0]);
                sBgPreview.src = settings.bgImage;
                messagesContainer.style.backgroundImage = 'url(' + settings.bgImage + ')';
            } catch (err) { showToast('❌ 图片读取失败'); }
        }
        this.value = '';
    });

    sUploadJson.addEventListener('click', function() { closeSettings();
        fileInput.click(); });
    sExportMd.addEventListener('click', exportMD);
    sClearData.addEventListener('click', function() {
        confirmOverlay.classList.add('open');
        confirmTitle.textContent = '⚠️ 清空所有数据';
        confirmDesc.textContent = '确定要清空所有聊天记录和设置吗？此操作不可恢复！';
        const okHandler = async function() {
            confirmOverlay.classList.remove('open');
            confirmOk.removeEventListener('click', okHandler);
            try {
                await clearAllMessagesDB();
                const db = await getDB();
                const tx = db.transaction(SETTINGS_STORE, 'readwrite');
                const store = tx.objectStore(SETTINGS_STORE);
                for (const key of ['userName', 'botName', 'userAvatar', 'botAvatar', 'bgImage']) {
                    store.delete(key);
                }
                await new Promise((resolve, reject) => {
                    tx.oncomplete = resolve;
                    tx.onerror = () => reject(tx.error);
                });
                allMessages = [];
                isDataLoaded = false;
                settings = { userName: '我', botName: 'Bot', userAvatar: '', botAvatar: '', bgImage: '' };
                applySettings();
                showUploadView();
                showToast('🗑️ 已清空所有数据');
                localStorage.removeItem('chat_scroll_top');
            } catch (err) {
                showToast('❌ 清空失败');
            }
        };
        confirmOk.addEventListener('click', okHandler);
        const cancelHandler = function() {
            confirmOverlay.classList.remove('open');
            confirmOk.removeEventListener('click', okHandler);
            confirmCancel.removeEventListener('click', cancelHandler);
        };
        confirmCancel.addEventListener('click', cancelHandler);
    });

    // ===== 滚动事件 - 优化流畅度 =====
    messagesContainer.addEventListener('scroll', function() {
        if (!isDataLoaded || allMessages.length === 0) return;

        // 保存滚动位置
        saveScrollPosition();

        if (isScrolling) return;
        isScrolling = true;

        if (scrollRAF) cancelAnimationFrame(scrollRAF);
        scrollRAF = requestAnimationFrame(() => {
            try {
                const itemH = getItemHeight();
                const total = allMessages.length;
                const scrollTop = this.scrollTop;
                const clientHeight = this.clientHeight;

                const start = Math.max(0, Math.floor(scrollTop / itemH) - 2);
                const end = Math.min(total, Math.ceil((scrollTop + clientHeight) / itemH) + 2);

                // 只有在变化较大时才重新渲染
                if (Math.abs(start - renderStart) > 3 || Math.abs(end - renderEnd) > 3) {
                    renderStart = start;
                    renderEnd = end;
                    renderMessages(this, start, end);
                } else {
                    // 只更新padding
                    const wrapper = this.querySelector('div:first-child');
                    if (wrapper) {
                        wrapper.style.paddingTop = Math.max(0, start * itemH) + 'px';
                        wrapper.style.paddingBottom = Math.max(0, (total - end) * itemH) + 'px';
                    }
                }
            } catch (e) {}
            isScrolling = false;
            scrollRAF = null;
        });
    });

    let resizeTimeout = null;
    window.addEventListener('resize', function() {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (isDataLoaded && allMessages.length > 0) updateUI();
        }, 300);
    });

    // 页面关闭时保存滚动位置
    window.addEventListener('beforeunload', function() {
        saveScrollPosition();
    });

    // ===== 初始化 =====
    async function init() {
        await loadSettings();
        const hasData = await loadDataFromDB();
        if (!hasData) {
            showUploadView();
        } else {
            showMessagesView();
            updateUI();
            // 恢复滚动位置
            loadScrollPosition();
            setTimeout(() => {
                messagesContainer.scrollTop = savedScrollTop;
            }, 50);
        }
    }

    init();

})();
