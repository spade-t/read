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

    // 虚拟滚动状态 - 动态高度
    let scrollViewport = null;
    const BUFFER_SIZE = 5;
    let visibleStart = 0;
    let visibleEnd = 0;
    let scrollFrameId = null;
    let itemHeights = [];
    let itemOffsets = [];
    let totalHeight = 0;

    // 搜索状态
    let searchResults = [];
    let searchDisplayCount = 50;
    const SEARCH_BATCH_SIZE = 50;

    // ===== 工具函数 =====

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

        clearTimeout(window._toastTimer);
        window._toastTimer = setTimeout(() => {
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

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

    function imageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e.target.error);
            reader.readAsDataURL(file);
        });
    }

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
            return pos !== null ? parseInt(pos, 10) || 0 : 0;
        } catch (e) {
            return 0;
        }
    }

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
                    if (parsed.text) return parsed.text.trim();
                    if (parsed.content) return parsed.content.trim();
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
                    if (parsed.text) return parsed.text.trim();
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

    // ===== SVG 图标 =====

    function getCopyIcon() {
        return `<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
    }

    function getDeleteIcon() {
        return `<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
    }

    // ===== 动态高度虚拟滚动 =====

    function estimateItemHeight(msg) {
        const text = msg._text || '';
        const charCount = text.length;
        let baseHeight = 48;
        const lineWidth = 22;
        const lines = Math.max(1, Math.ceil(charCount / lineWidth));
        const bubbleHeight = lines * 22 + 16;
        baseHeight += bubbleHeight;
        baseHeight += 28;
        return Math.max(120, baseHeight);
    }

    function buildHeightCache() {
        const count = allMessages.length;
        itemHeights = new Array(count);
        itemOffsets = new Array(count);
        totalHeight = 0;
        for (let i = 0; i < count; i++) {
            const h = estimateItemHeight(allMessages[i]);
            itemHeights[i] = h;
            itemOffsets[i] = totalHeight;
            totalHeight += h;
        }
    }

    function findVisibleRange(scrollTop, containerHeight) {
        const count = allMessages.length;
        if (count === 0) return { start: 0, end: 0 };

        let start = 0;
        let end = count - 1;
        while (start < end) {
            const mid = Math.floor((start + end) / 2);
            if (itemOffsets[mid] + itemHeights[mid] < scrollTop) {
                start = mid + 1;
            } else {
                end = mid;
            }
        }
        start = Math.max(0, start - BUFFER_SIZE);

        const bottom = scrollTop + containerHeight;
        end = start;
        while (end < count && itemOffsets[end] < bottom + BUFFER_SIZE * 100) {
            end++;
        }
        end = Math.min(count, end + BUFFER_SIZE);

        return { start, end };
    }

    function buildViewport() {
        if (!scrollViewport) {
            scrollViewport = document.createElement('div');
            scrollViewport.id = 'scroll-viewport';
            scrollViewport.style.position = 'relative';
            scrollViewport.style.width = '100%';
            scrollViewport.style.minHeight = '100%';
            messagesContainer.appendChild(scrollViewport);
        }
        return scrollViewport;
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
        item.style.position = 'absolute';
        item.style.left = '0';
        item.style.right = '0';
        item.style.top = itemOffsets[index] + 'px';
        item.style.height = itemHeights[index] + 'px';
        item.style.paddingBottom = '0px';

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

        // ===== 操作按钮 - SVG 图标 =====
        const actions = document.createElement('div');
        actions.className = 'msg-actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'msg-action-btn copy-btn';
        copyBtn.innerHTML = getCopyIcon();
        copyBtn.title = '复制';
        copyBtn.dataset.action = 'copy';
        copyBtn.dataset.index = index;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'msg-action-btn delete-btn';
        deleteBtn.innerHTML = getDeleteIcon();
        deleteBtn.title = '删除';
        deleteBtn.dataset.action = 'delete';
        deleteBtn.dataset.index = index;

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

    function fullRebuild() {
        buildHeightCache();
        const viewport = buildViewport();

        const total = allMessages.length;
        if (total === 0) {
            viewport.innerHTML =
                '<div style="text-align:center;padding:60px 20px;color:#999;font-size:16px;position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);">暂无消息</div>';
            viewport.style.height = '100%';
            updateFooter();
            return;
        }

        viewport.style.height = totalHeight + 'px';
        viewport.innerHTML = '';

        const containerHeight = messagesContainer.clientHeight || 600;
        const scrollTop = messagesContainer.scrollTop || 0;

        const range = findVisibleRange(scrollTop, containerHeight);
        visibleStart = range.start;
        visibleEnd = range.end;

        const fragment = document.createDocumentFragment();
        for (let i = visibleStart; i < visibleEnd; i++) {
            fragment.appendChild(createMessageElement(allMessages[i], i));
        }
        viewport.appendChild(fragment);

        updateFooter();
    }

    function updateViewport() {
        if (!scrollViewport || allMessages.length === 0) return;

        const containerHeight = messagesContainer.clientHeight || 600;
        const scrollTop = messagesContainer.scrollTop || 0;

        const range = findVisibleRange(scrollTop, containerHeight);
        const start = range.start;
        const end = range.end;

        const children = scrollViewport.children;
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.dataset && child.dataset.index !== undefined) {
                const idx = parseInt(child.dataset.index);
                child.style.top = itemOffsets[idx] + 'px';
                child.style.height = itemHeights[idx] + 'px';
            }
        }

        if (Math.abs(start - visibleStart) > 2 || Math.abs(end - visibleEnd) > 2) {
            visibleStart = start;
            visibleEnd = end;

            const childMap = {};
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (child.dataset && child.dataset.index !== undefined) {
                    childMap[child.dataset.index] = child;
                }
            }

            const needed = new Set();
            for (let i = start; i < end; i++) {
                needed.add(i);
            }

            const toRemove = [];
            for (const idx in childMap) {
                if (!needed.has(parseInt(idx))) {
                    toRemove.push(childMap[idx]);
                }
            }
            for (const el of toRemove) {
                if (el.parentNode) el.parentNode.removeChild(el);
                delete childMap[el.dataset.index];
            }

            const fragment = document.createDocumentFragment();
            for (let i = start; i < end; i++) {
                if (!childMap[i]) {
                    const el = createMessageElement(allMessages[i], i);
                    fragment.appendChild(el);
                    childMap[i] = el;
                }
            }
            if (fragment.children.length > 0) {
                scrollViewport.appendChild(fragment);
            }

            for (const idx in childMap) {
                const el = childMap[idx];
                const index = parseInt(idx);
                el.style.top = itemOffsets[index] + 'px';
                el.style.height = itemHeights[index] + 'px';
                el.dataset.index = index;
            }
        }
    }

    function jumpToMessage(index) {
        if (index < 0 || index >= allMessages.length) return;
        const targetScroll = Math.max(0, itemOffsets[index] - messagesContainer.clientHeight / 3);
        messagesContainer.scrollTo({ top: targetScroll, behavior: 'smooth' });

        setTimeout(() => {
            if (scrollViewport) {
                const items = scrollViewport.querySelectorAll('.msg-item');
                for (const item of items) {
                    item.classList.remove('highlighted');
                    if (item.dataset && parseInt(item.dataset.index) === index) {
                        item.classList.add('highlighted');
                        setTimeout(() => {
                            item.classList.remove('highlighted');
                        }, 3000);
                    }
                }
            }
        }, 400);
    }

    // ===== 消息事件委托 =====
    function setupMessageEvents() {
        messagesContainer.addEventListener('click', function(e) {
            const btn = e.target.closest('.msg-action-btn');
            if (!btn) return;

            const action = btn.dataset.action;
            const index = parseInt(btn.dataset.index);
            if (isNaN(index) || index < 0 || index >= allMessages.length) return;

            const msg = allMessages[index];

            if (action === 'copy') {
                const text = msg._text || '';
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(text).then(() => showToast('✅ 已复制'));
                } else {
                    fallbackCopy(text);
                }
                e.stopPropagation();
            } else if (action === 'delete') {
                e.stopPropagation();
                confirmAction().then((ok) => {
                    if (ok) {
                        deleteMessage(index);
                    }
                }).catch(() => {});
            }
        });
    }

    // ===== 删除消息 =====
    async function deleteMessage(index) {
        if (index < 0 || index >= allMessages.length) return;
        const msg = allMessages[index];
        const msgId = msg.message_id;
        try {
            if (msgId) await deleteMessageFromDB(msgId);
            allMessages.splice(index, 1);
            fullRebuild();
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

    // ===== 生成搜索预览（带高亮和截断） =====
    function generateSearchPreview(fullText, keyword, maxLength) {
        if (!fullText) return '';
        if (!keyword) return escapeHtml(fullText);

        const lowerText = fullText.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();
        const keywordIndex = lowerText.indexOf(lowerKeyword);

        // 如果没找到关键词，直接返回截断文本
        if (keywordIndex === -1) {
            if (fullText.length > maxLength) {
                return escapeHtml(fullText.substring(0, maxLength)) + '...';
            }
            return escapeHtml(fullText);
        }

        const kwLen = keyword.length;
        const textLen = fullText.length;

        // 如果文本本身不长，直接高亮显示
        if (textLen <= maxLength) {
            const before = escapeHtml(fullText.substring(0, keywordIndex));
            const hit = escapeHtml(fullText.substring(keywordIndex, keywordIndex + kwLen));
            const after = escapeHtml(fullText.substring(keywordIndex + kwLen));
            return before + '<em>' + hit + '</em>' + after;
        }

        // 长文本：截取关键词前后部分
        const contextBefore = 20; // 关键词前面保留的字符数
        const contextAfter = 30; // 关键词后面保留的字符数

        let start = Math.max(0, keywordIndex - contextBefore);
        let end = Math.min(textLen, keywordIndex + kwLen + contextAfter);

        // 调整start到合适位置，避免截断在中间
        let prefixDots = '';
        if (start > 0) {
            // 尽量从单词/字符边界开始
            prefixDots = '...';
        }

        let suffixDots = '';
        if (end < textLen) {
            suffixDots = '...';
        }

        // 提取片段
        let snippet = fullText.substring(start, end);

        // 计算关键词在片段中的位置
        const snippetKeywordStart = keywordIndex - start;
        const snippetKeywordEnd = snippetKeywordStart + kwLen;

        // 构建带高亮的预览
        let result = '';
        if (prefixDots) {
            result += prefixDots;
        }

        // 对片段进行转义和高亮
        const beforeHit = escapeHtml(snippet.substring(0, snippetKeywordStart));
        const hitText = escapeHtml(snippet.substring(snippetKeywordStart, snippetKeywordEnd));
        const afterHit = escapeHtml(snippet.substring(snippetKeywordEnd));

        result += beforeHit + '<em>' + hitText + '</em>' + afterHit;

        if (suffixDots) {
            result += suffixDots;
        }

        return result;
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
        const q = searchInput.value.trim().toLowerCase();

        let html = '<div class="sd-header">共 ' + total + ' 条结果</div>';

        for (let i = 0; i < displayTotal; i++) {
            const match = searchResults[i];
            const msg = match.msg;
            const isUser = msg._userType === 'user';
            let name = isUser ? settings.userName : (settings.botName && settings.botName !== 'Bot' ?
                settings.botName : (msg._botName || 'Bot'));
            const time = formatBeijingTime(msg.create_time);
            const fullText = msg._text || '';

            // 使用新的预览生成函数
            const preview = generateSearchPreview(fullText, q, 60);

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

        // 重新绑定点击事件
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
            // 移除旧的事件监听
            const newMoreBtn = moreBtn.cloneNode(true);
            moreBtn.parentNode.replaceChild(newMoreBtn, moreBtn);
            newMoreBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                searchDisplayCount += SEARCH_BATCH_SIZE;
                renderSearchResults();
            });
        }
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

        if (isDataLoaded && allMessages.length > 0) {
            fullRebuild();
        }
    }

    // ===== 数据加载 =====
    async function loadDataFromDB() {
        try {
            const msgs = await loadAllMessagesFromDB();
            if (msgs && msgs.length > 0) {
                allMessages = msgs.sort((a, b) => (a.create_time || '').localeCompare(b.create_time || ''));
                isDataLoaded = true;
                showMessagesView();
                buildViewport();
                fullRebuild();
                const savedPos = loadScrollPosition();
                setTimeout(() => {
                    messagesContainer.scrollTop = savedPos > 0 ? savedPos : 0;
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
        if (scrollViewport) {
            scrollViewport.innerHTML = '';
        }
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
                    buildViewport();
                    fullRebuild();
                    pdetail.textContent = '✅ 完成！共 ' + allMessages.length.toLocaleString() + ' 条消息';
                    pstatus.textContent = '✅ 完成';
                    showToast('✅ 导入完成');
                    setTimeout(() => {
                        messagesContainer.scrollTop = 0;
                        localStorage.setItem('chat_scroll_top', '0');
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
            searchInput.value = '';
            searchClear.classList.remove('show');
            searchDropdown.classList.remove('show');
            searchResults = [];
            searchDisplayCount = SEARCH_BATCH_SIZE;
            searchInput.blur();
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
            if (isDataLoaded && allMessages.length > 0) {
                fullRebuild();
            }
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

    // ===== 滚动事件 =====
    messagesContainer.addEventListener('scroll', function() {
        if (!isDataLoaded || allMessages.length === 0) return;

        saveScrollPosition();

        if (scrollFrameId) {
            cancelAnimationFrame(scrollFrameId);
        }

        scrollFrameId = requestAnimationFrame(() => {
            scrollFrameId = null;
            updateViewport();
        });
    });

    // ===== Resize =====
    let resizeTimeout = null;
    window.addEventListener('resize', function() {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (isDataLoaded && allMessages.length > 0) {
                fullRebuild();
            }
        }, 300);
    });

    // ===== 页面关闭保存 =====
    window.addEventListener('beforeunload', function() {
        saveScrollPosition();
    });

    // ===== 初始化 =====
    async function init() {
        await loadSettings();
        setupMessageEvents();
        const hasData = await loadDataFromDB();
        if (!hasData) {
            showUploadView();
        } else {
            showMessagesView();
            buildViewport();
            fullRebuild();
            const savedPos = loadScrollPosition();
            setTimeout(() => {
                messagesContainer.scrollTop = savedPos > 0 ? savedPos : 0;
            }, 50);
        }
    }

    init();

})();
