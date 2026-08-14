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

    const calendarBtn = $('calendar-btn');
    const calendarOverlay = $('calendar-overlay');
    const calendarMonth = $('calendar-month');
    const calendarDays = $('calendar-days');
    const calendarPrev = $('calendar-prev');
    const calendarNext = $('calendar-next');

    const themeBtns = document.querySelectorAll('.theme-btn');

    const actionMenu = $('action-menu');
    const msBar = $('multi-select-bar');
    const msCancel = $('ms-cancel');
    const msCount = $('ms-count');
    const msCopy = $('ms-copy');
    const msDelete = $('ms-delete');

    // ===== 全局状态 =====
    const DB_NAME = 'ChatViewerDB';
    const STORE_NAME = 'messages';
    const SETTINGS_STORE = 'settings';
    const HEIGHTS_STORE = 'heights';
    const DB_VERSION = 3;

    let allMessages = [];
    let isDataLoaded = false;
    let isParsing = false;
    let db = null;
    let settings = {
        userName: '我',
        botName: 'Bot',
        userAvatar: '',
        botAvatar: '',
        bgImage: '',
        darkMode: false
    };
    let pendingConfirm = null;

    // ===== 虚拟滚动状态 =====
    let scrollViewport = null;
    const BUFFER_SIZE = 5;
    let visibleStart = 0;
    let visibleEnd = 0;
    let scrollFrameId = null;
    let itemHeights = [];
    let itemOffsets = [];
    let totalHeight = 0;

    // 固定间距
    const ITEM_BOTTOM_GAP = 16;

    // 搜索状态
    let searchMatchCache = [];
    let searchDisplayCount = 50;
    const SEARCH_BATCH_SIZE = 50;

    // 多选状态
    let multiSelectMode = false;
    let selectedSet = new Set();

    // 日历状态
    let calendarYear = 2026;
    let calendarMonthIndex = 8;
    let messageDateMap = {};
    let maxDateStr = '';
    let maxYear = 2026;
    let maxMonth = 7;
    let maxDay = 31;

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

    // ===== SVG 图标 =====

    function getCopyIcon() {
        return `<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
    }

    function getDeleteIcon() {
        return `<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
    }

    function getCheckIcon() {
        return `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`;
    }

    function getMultiSelectIcon() {
        return `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 12 11 14 15 10"/></svg>`;
    }

    function getSettingsIcon() {
        return `<svg viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }

    function getCalendarIcon() {
        return `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/></svg>`;
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
                if (!d.objectStoreNames.contains(HEIGHTS_STORE)) {
                    d.createObjectStore(HEIGHTS_STORE, { keyPath: 'id' });
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

    async function saveHeightsToDB(heights) {
        const db = await getDB();
        const tx = db.transaction(HEIGHTS_STORE, 'readwrite');
        const store = tx.objectStore(HEIGHTS_STORE);
        store.put({ id: 'heights', data: heights });
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    }

    async function loadHeightsFromDB() {
        const db = await getDB();
        const tx = db.transaction(HEIGHTS_STORE, 'readonly');
        const store = tx.objectStore(HEIGHTS_STORE);
        return new Promise((resolve, reject) => {
            const req = store.get('heights');
            req.onsuccess = () => resolve(req.result?.data || null);
            req.onerror = () => reject(req.error);
        });
    }

    async function clearHeightsDB() {
        const db = await getDB();
        const tx = db.transaction(HEIGHTS_STORE, 'readwrite');
        const store = tx.objectStore(HEIGHTS_STORE);
        store.delete('heights');
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

    // ===== 深色模式 =====

    function applyDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        settings.darkMode = enabled;

        themeBtns.forEach(btn => {
            const theme = btn.dataset.theme;
            if (theme === 'dark' && enabled) {
                btn.classList.add('active');
            } else if (theme === 'light' && !enabled) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // ===== 高度测量 =====

    function createMeasureElement(msg, index, containerWidth) {
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
        item.style.position = 'relative';
        item.style.height = 'auto';
        item.style.paddingBottom = ITEM_BOTTOM_GAP + 'px';

        const row = document.createElement('div');
        row.className = 'msg-row ' + (isUser ? 'user' : 'bot');

        // 复选框 - 测量时模拟多选模式（占空间）
        const checkbox = document.createElement('div');
        checkbox.className = 'msg-checkbox';
        checkbox.style.display = 'flex';
        checkbox.style.visibility = 'visible';
        checkbox.style.opacity = '0';
        checkbox.style.pointerEvents = 'none';

        const avatarImg = document.createElement('img');
        avatarImg.className = 'msg-avatar';
        avatarImg.src = avatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Ccircle cx="20" cy="20" r="20" fill="%23ccc"/%3E%3Ctext x="20" y="26" font-size="18" text-anchor="middle" fill="%23999"%3E' +
            (isUser ? '我' : 'B') + '%3C/text%3E%3C/svg%3E';
        avatarImg.alt = displayName;

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

        body.appendChild(header);
        body.appendChild(bubble);

        // 顺序：checkbox → avatar → body (Bot) 或 checkbox → body → avatar (User)
        row.appendChild(checkbox);
        if (isUser) {
            row.appendChild(body);
            row.appendChild(avatarImg);
        } else {
            row.appendChild(avatarImg);
            row.appendChild(body);
        }

        item.appendChild(row);
        return item;
    }

    async function measureAllMessages(messages, onProgress) {
        const total = messages.length;
        if (total === 0) return [];

        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            left: -9999px;
            top: 0;
            width: ${messagesContainer.clientWidth || 600}px;
            visibility: hidden;
            pointer-events: none;
        `;
        document.body.appendChild(container);

        const heights = [];
        const batchSize = 500;

        for (let start = 0; start < total; start += batchSize) {
            const end = Math.min(start + batchSize, total);
            const fragment = document.createDocumentFragment();
            const items = [];

            for (let i = start; i < end; i++) {
                const el = createMeasureElement(messages[i], i);
                fragment.appendChild(el);
                items.push(el);
            }

            container.innerHTML = '';
            container.appendChild(fragment);

            await new Promise(r => requestAnimationFrame(r));

            for (let i = 0; i < items.length; i++) {
                heights[start + i] = items[i].offsetHeight;
            }

            const progress = Math.round((end / total) * 100);
            if (onProgress) onProgress(progress);

            await new Promise(r => setTimeout(r, 0));
        }

        document.body.removeChild(container);
        return heights;
    }

    // ===== 虚拟滚动 =====

    function buildHeightCache(heights) {
        const count = allMessages.length;
        itemHeights = heights;
        itemOffsets = new Array(count);
        totalHeight = 0;

        for (let i = 0; i < count; i++) {
            itemOffsets[i] = totalHeight;
            totalHeight += itemHeights[i] || 100;
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

        const isSelected = selectedSet.has(index);

        const item = document.createElement('div');
        item.className = 'msg-item';
        item.dataset.index = index;
        item.style.position = 'absolute';
        item.style.left = '0';
        item.style.right = '0';
        item.style.top = itemOffsets[index] + 'px';
        item.style.height = itemHeights[index] + 'px';

        const row = document.createElement('div');
        row.className = 'msg-row ' + (isUser ? 'user' : 'bot');

        // 复选框 - 统一在最左（display由CSS控制）
        const checkbox = document.createElement('div');
        checkbox.className = 'msg-checkbox' + (isSelected ? ' checked' : '');
        checkbox.dataset.index = index;
        checkbox.innerHTML = getCheckIcon();

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

        body.appendChild(header);
        body.appendChild(bubble);

        // 顺序：checkbox → avatar → body (Bot) 或 checkbox → body → avatar (User)
        row.appendChild(checkbox);
        if (isUser) {
            row.appendChild(body);
            row.appendChild(avatarImg);
        } else {
            row.appendChild(avatarImg);
            row.appendChild(body);
        }

        item.appendChild(row);

        item.addEventListener('click', function(e) {
            if (!multiSelectMode) return;
            const idx = parseInt(this.dataset.index);
            if (!isNaN(idx) && idx >= 0 && idx < allMessages.length) {
                toggleSelect(idx);
            }
        });

        return item;
    }

    function fullRebuild() {
        const viewport = buildViewport();

        const total = allMessages.length;
        if (total === 0 || itemHeights.length === 0) {
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

        if (multiSelectMode) {
            messagesContainer.classList.add('multi-select-mode');
        } else {
            messagesContainer.classList.remove('multi-select-mode');
        }

        updateFooter();
    }

    function updateViewport() {
        if (!scrollViewport || allMessages.length === 0 || itemHeights.length === 0) return;

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
        if (index < 0 || index >= allMessages.length || itemOffsets.length === 0) return;

        const targetOffset = itemOffsets[index];
        const containerHeight = messagesContainer.clientHeight;
        const newScroll = Math.max(0, targetOffset - containerHeight / 3);
        messagesContainer.scrollTo({ top: newScroll, behavior: 'smooth' });

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

    // ===== 长按菜单 =====

    let longPressTimer = null;
    let longPressTarget = null;

    function setupLongPress() {
        messagesContainer.addEventListener('touchstart', function(e) {
            const item = e.target.closest('.msg-item');
            if (!item || multiSelectMode) return;
            longPressTarget = item;
            longPressTimer = setTimeout(() => {
                const idx = parseInt(item.dataset.index);
                if (!isNaN(idx) && idx >= 0 && idx < allMessages.length) {
                    showActionMenu(item, idx);
                    if (navigator.vibrate) navigator.vibrate(10);
                }
                longPressTarget = null;
            }, 350);
        }, { passive: true });

        messagesContainer.addEventListener('touchmove', function(e) {
            clearTimeout(longPressTimer);
            longPressTarget = null;
        }, { passive: true });

        messagesContainer.addEventListener('touchend', function(e) {
            clearTimeout(longPressTimer);
            longPressTarget = null;
        }, { passive: true });

        messagesContainer.addEventListener('contextmenu', function(e) {
            if (multiSelectMode) return;
            const item = e.target.closest('.msg-item');
            if (item) {
                e.preventDefault();
                const idx = parseInt(item.dataset.index);
                if (!isNaN(idx) && idx >= 0 && idx < allMessages.length) {
                    showActionMenu(item, idx, e.clientX, e.clientY);
                }
            }
        });
    }

    function showActionMenu(item, index, x, y) {
        const msg = allMessages[index];
        const rect = item.getBoundingClientRect();

        const items = actionMenu.querySelectorAll('.action-item');
        const icons = [
            getCopyIcon(),
            getDeleteIcon(),
            getMultiSelectIcon()
        ];
        items.forEach((el, i) => {
            el.querySelector('.action-icon').innerHTML = icons[i];
        });

        const menuX = x || Math.min(rect.left + 20, window.innerWidth - 220);
        const menuY = y || Math.max(10, rect.top - 10);
        actionMenu.style.left = Math.max(10, Math.min(menuX, window.innerWidth - 220)) + 'px';
        actionMenu.style.top = Math.min(menuY, window.innerHeight - 120) + 'px';
        actionMenu.style.display = 'block';

        const handlers = {
            copy: function() {
                actionMenu.style.display = 'none';
                const text = msg._text || '';
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(text).then(() => showToast('✅ 已复制'));
                } else {
                    fallbackCopy(text);
                }
            },
            delete: function() {
                actionMenu.style.display = 'none';
                confirmAction('确定要删除这条消息吗？', '这是你们的回忆噢！').then((ok) => {
                    if (ok) deleteMessage(index);
                }).catch(() => {});
            },
            'multi-select': function() {
                actionMenu.style.display = 'none';
                enterMultiSelect();
                selectedSet.add(index);
                updateMultiSelectUI();
                fullRebuild();
            }
        };

        const cleanup = function() {
            actionMenu.style.display = 'none';
            actionMenu.removeEventListener('click', clickHandler);
            document.removeEventListener('click', outsideHandler);
        };

        const clickHandler = function(e) {
            const itemEl = e.target.closest('.action-item');
            if (!itemEl) return;
            const action = itemEl.dataset.action;
            if (handlers[action]) handlers[action]();
        };

        const outsideHandler = function(e) {
            if (!actionMenu.contains(e.target)) {
                cleanup();
            }
        };

        actionMenu.addEventListener('click', clickHandler);
        setTimeout(() => {
            document.addEventListener('click', outsideHandler);
        }, 10);
    }

    // ===== 多选功能 =====

    function enterMultiSelect() {
        multiSelectMode = true;
        selectedSet.clear();
        msBar.style.display = 'flex';
        messagesContainer.classList.add('multi-select-mode');
        updateMultiSelectUI();
        fullRebuild();
    }

    function exitMultiSelect() {
        multiSelectMode = false;
        selectedSet.clear();
        msBar.style.display = 'none';
        messagesContainer.classList.remove('multi-select-mode');
        fullRebuild();
    }

    function toggleSelect(index) {
        if (selectedSet.has(index)) {
            selectedSet.delete(index);
        } else {
            selectedSet.add(index);
        }
        updateMultiSelectUI();
        const checkboxes = messagesContainer.querySelectorAll('.msg-checkbox');
        checkboxes.forEach(el => {
            const idx = parseInt(el.dataset.index);
            if (!isNaN(idx)) {
                el.classList.toggle('checked', selectedSet.has(idx));
            }
        });
    }

    function updateMultiSelectUI() {
        const count = selectedSet.size;
        msCount.textContent = '已选 ' + count + ' 条';
        msCopy.innerHTML = getCopyIcon();
        msDelete.innerHTML = getDeleteIcon();
    }

    async function batchCopy() {
        if (selectedSet.size === 0) {
            showToast('⚠️ 请先选择消息');
            return;
        }
        const indices = [...selectedSet].sort((a, b) => a - b);
        const texts = indices.map(i => allMessages[i]._text || '').join('\n---\n');
        if (navigator.clipboard) {
            navigator.clipboard.writeText(texts).then(() => {
                showToast('✅ 已复制 ' + indices.length + ' 条');
                exitMultiSelect();
            });
        } else {
            fallbackCopy(texts);
            exitMultiSelect();
        }
    }

    async function batchDelete() {
        if (selectedSet.size === 0) {
            showToast('⚠️ 请先选择消息');
            return;
        }
        const count = selectedSet.size;
        confirmAction('确定要删除选中的 ' + count + ' 条消息吗？', '这是你们的回忆噢！').then(async (ok) => {
            if (!ok) return;
            const indices = [...selectedSet].sort((a, b) => b - a);
            for (const idx of indices) {
                const msg = allMessages[idx];
                if (msg.message_id) await deleteMessageFromDB(msg.message_id);
                allMessages.splice(idx, 1);
            }
            selectedSet.clear();
            const newHeights = [];
            for (let i = 0; i < allMessages.length; i++) {
                newHeights[i] = 100;
            }
            itemHeights = newHeights;
            pstatus.textContent = '⏳ 重新测量...';
            const measured = await measureAllMessages(allMessages, (p) => {
                pstatus.textContent = p + '%';
                pdetail.textContent = '重新测量高度 ' + p + '%';
            });
            await saveHeightsToDB(measured);
            buildHeightCache(measured);
            exitMultiSelect();
            fullRebuild();
            showToast('🗑️ 已删除 ' + count + ' 条消息');
            pstatus.textContent = '✅ 完成';
            pdetail.textContent = '已删除 ' + count + ' 条消息';
        }).catch(() => {});
    }

    // ===== 删除单条 =====

    async function deleteMessage(index) {
        if (index < 0 || index >= allMessages.length) return;
        const msg = allMessages[index];
        const msgId = msg.message_id;
        try {
            if (msgId) await deleteMessageFromDB(msgId);
            allMessages.splice(index, 1);
            const measured = await measureAllMessages(allMessages, (p) => {
                pstatus.textContent = p + '%';
                pdetail.textContent = '重新测量高度 ' + p + '%';
            });
            await saveHeightsToDB(measured);
            buildHeightCache(measured);
            fullRebuild();
            showToast('🗑️ 已删除');
        } catch (err) {
            showToast('❌ 删除失败');
        }
    }

    // ===== 搜索功能 =====

    function performSearch(query) {
        if (!query.trim()) {
            searchDropdown.classList.remove('show');
            searchMatchCache = [];
            return;
        }

        const q = query.trim().toLowerCase();
        searchMatchCache = [];

        for (let i = 0; i < allMessages.length; i++) {
            const msg = allMessages[i];
            const text = (msg._text || '').toLowerCase();
            if (text.includes(q)) {
                searchMatchCache.push({
                    index: i,
                    msg: msg,
                    keyword: q
                });
                if (searchMatchCache.length > 2000) break;
            }
        }

        renderSearchResults();
    }

    function generateSearchPreview(fullText, keyword) {
        if (!fullText) return '';
        if (!keyword) return escapeHtml(fullText);

        const lowerText = fullText.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();
        const keywordIndex = lowerText.indexOf(lowerKeyword);

        if (keywordIndex === -1) {
            return escapeHtml(fullText);
        }

        const kwLen = keyword.length;
        const textLen = fullText.length;

        const MAX_TOTAL = 20;
        const half = Math.floor((MAX_TOTAL - kwLen) / 2);

        if (textLen <= MAX_TOTAL) {
            const before = escapeHtml(fullText.substring(0, keywordIndex));
            const hit = escapeHtml(fullText.substring(keywordIndex, keywordIndex + kwLen));
            const after = escapeHtml(fullText.substring(keywordIndex + kwLen));
            return before + '<em>' + hit + '</em>' + after;
        }

        let start = Math.max(0, keywordIndex - half);
        let end = Math.min(textLen, keywordIndex + kwLen + half);

        let totalLen = end - start;
        if (totalLen > MAX_TOTAL) {
            const adjust = totalLen - MAX_TOTAL;
            start = Math.min(start + adjust, keywordIndex);
        }

        const hasPrefix = start > 0;
        const hasSuffix = end < textLen;

        let snippet = fullText.substring(start, end);
        const snippetKeywordStart = keywordIndex - start;
        const snippetKeywordEnd = snippetKeywordStart + kwLen;

        const beforeHit = escapeHtml(snippet.substring(0, snippetKeywordStart));
        const hitText = escapeHtml(snippet.substring(snippetKeywordStart, snippetKeywordEnd));
        const afterHit = escapeHtml(snippet.substring(snippetKeywordEnd));

        let result = '';
        if (hasPrefix) result += '...';
        result += beforeHit + '<em>' + hitText + '</em>' + afterHit;
        if (hasSuffix) result += '...';

        return result;
    }

    function renderSearchResults() {
        const total = searchMatchCache.length;

        if (total === 0) {
            searchDropdown.innerHTML = '<div class="sd-empty">没有找到匹配的消息</div>';
            searchDropdown.classList.add('show');
            return;
        }

        const displayTotal = Math.min(searchDisplayCount, total);
        const hasMore = displayTotal < total;

        let html = '<div class="sd-header">共 ' + total + ' 条结果</div>';

        for (let i = 0; i < displayTotal; i++) {
            const match = searchMatchCache[i];
            const msg = match.msg;
            const keyword = match.keyword;

            const isUser = msg._userType === 'user';
            let name = isUser ? settings.userName : (settings.botName && settings.botName !== 'Bot' ?
                settings.botName : (msg._botName || 'Bot'));
            const time = formatBeijingTime(msg.create_time);
            const fullText = msg._text || '';

            const preview = generateSearchPreview(fullText, keyword);

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

        searchDropdown.querySelectorAll('.sd-item').forEach(el => {
            el.addEventListener('click', function() {
                const idx = parseInt(this.dataset.index);
                if (!isNaN(idx) && idx >= 0 && idx < allMessages.length) {
                    jumpToMessage(idx);
                    searchDropdown.classList.remove('show');
                    searchInput.value = '';
                    searchClear.classList.remove('show');
                    searchMatchCache = [];
                    searchDisplayCount = SEARCH_BATCH_SIZE;
                }
            });
        });

        const moreBtn = document.getElementById('sd-more-btn');
        if (moreBtn) {
            const newMoreBtn = moreBtn.cloneNode(true);
            moreBtn.parentNode.replaceChild(newMoreBtn, moreBtn);
            newMoreBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                searchDisplayCount += SEARCH_BATCH_SIZE;
                renderSearchResults();
            });
        }
    }

    // ===== 日历功能 =====

    function buildDateMap() {
        messageDateMap = {};
        maxDateStr = '';
        for (const msg of allMessages) {
            if (msg.create_time) {
                const d = new Date(msg.create_time);
                const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                if (!messageDateMap[key]) {
                    messageDateMap[key] = [];
                }
                messageDateMap[key].push(msg);
                if (key > maxDateStr) {
                    maxDateStr = key;
                }
            }
        }
        if (maxDateStr) {
            const parts = maxDateStr.split('-').map(Number);
            maxYear = parts[0];
            maxMonth = parts[1];
            maxDay = parts[2];
        }
    }

    function renderCalendar(year, month) {
        const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
        calendarMonth.textContent = year + '年 ' + monthNames[month] + ' ▼';

        const isMonthAfterMax = (year > maxYear) || (year === maxYear && (month + 1) > maxMonth);

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

        let html = '';

        if (isMonthAfterMax) {
            html = '<div style="grid-column:1/-1;text-align:center;padding:30px 0;color:#ccc;font-size:14px;">📭 没有聊天记录</div>';
            calendarDays.innerHTML = html;
            return;
        }

        for (let i = 0; i < firstDay; i++) {
            html += '<div class="cal-day empty"></div>';
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
            const hasMsg = messageDateMap[dateStr] && messageDateMap[dateStr].length > 0;
            const isToday = dateStr === todayStr;

            let isDisabled = false;
            if (year === maxYear && (month + 1) === maxMonth && d > maxDay) {
                isDisabled = true;
            }

            let cls = 'cal-day';
            if (isDisabled) {
                cls += ' disabled';
            } else if (isToday) {
                cls += ' today';
            } else if (hasMsg) {
                cls += ' has-msg';
            }

            html += '<button class="' + cls + '" data-date="' + dateStr + '"' +
                (hasMsg && !isDisabled ? '' : ' disabled') + '>' + d + '</button>';
        }

        calendarDays.innerHTML = html;

        calendarDays.querySelectorAll('.cal-day.has-msg:not(.disabled)').forEach(el => {
            el.addEventListener('click', function() {
                const dateStr = this.dataset.date;
                const msgs = messageDateMap[dateStr] || [];
                if (msgs.length > 0) {
                    const firstMsg = msgs[0];
                    const idx = allMessages.indexOf(firstMsg);
                    if (idx >= 0) {
                        calendarOverlay.classList.remove('open');
                        jumpToMessage(idx);
                    }
                }
            });
        });
    }

    // ===== 月份选择器 =====

    function openMonthPicker() {
        const overlay = document.createElement('div');
        overlay.id = 'month-picker-overlay';
        overlay.className = 'open';
        overlay.innerHTML = `
            <div class="picker-bg"></div>
            <div id="month-picker">
                <div class="picker-header">选择年月</div>
                <div class="picker-years" id="picker-years"></div>
                <div class="picker-months" id="picker-months"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        const yearsContainer = overlay.querySelector('#picker-years');
        const monthsContainer = overlay.querySelector('#picker-months');

        const minYear = Math.min(2024, maxYear);
        const currentYear = new Date().getFullYear();
        const yearRange = Math.max(minYear, currentYear - 2);
        const yearEnd = Math.max(maxYear, currentYear);

        let yearHtml = '';
        for (let y = yearEnd; y >= yearRange; y--) {
            const isActive = y === calendarYear;
            const isDisabled = y > maxYear;
            yearHtml += `<button class="${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}" data-year="${y}">${y}年</button>`;
        }
        yearsContainer.innerHTML = yearHtml;

        const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
        let monthHtml = '';
        for (let m = 0; m < 12; m++) {
            const isActive = m === calendarMonthIndex && calendarYear <= maxYear;
            const isDisabled = (calendarYear > maxYear) || (calendarYear === maxYear && (m + 1) > maxMonth);
            monthHtml += `<button class="${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}" data-month="${m}">${monthNames[m]}</button>`;
        }
        monthsContainer.innerHTML = monthHtml;

        overlay.querySelector('.picker-bg').addEventListener('click', function() {
            overlay.remove();
        });

        yearsContainer.querySelectorAll('button:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', function() {
                calendarYear = parseInt(this.dataset.year);
                const monthBtns = monthsContainer.querySelectorAll('button');
                const activeMonth = calendarMonthIndex;
                monthBtns.forEach((b, idx) => {
                    const isDisabled = (calendarYear > maxYear) || (calendarYear === maxYear && (idx + 1) > maxMonth);
                    b.classList.toggle('active', idx === activeMonth && !isDisabled);
                    b.classList.toggle('disabled', isDisabled);
                });
                yearsContainer.querySelectorAll('button').forEach(b => {
                    b.classList.toggle('active', parseInt(b.dataset.year) === calendarYear);
                });
                renderCalendar(calendarYear, calendarMonthIndex);
            });
        });

        monthsContainer.querySelectorAll('button:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', function() {
                calendarMonthIndex = parseInt(this.dataset.month);
                monthsContainer.querySelectorAll('button').forEach(b => {
                    b.classList.toggle('active', parseInt(b.dataset.month) === calendarMonthIndex);
                });
                renderCalendar(calendarYear, calendarMonthIndex);
                overlay.remove();
            });
        });

        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                overlay.remove();
            }
        });
    }

    function openCalendar() {
        const now = new Date();
        if (maxDateStr) {
            calendarYear = maxYear;
            calendarMonthIndex = maxMonth - 1;
        } else {
            calendarYear = now.getFullYear();
            calendarMonthIndex = now.getMonth();
        }
        buildDateMap();
        renderCalendar(calendarYear, calendarMonthIndex);
        calendarOverlay.classList.add('open');
    }

    function closeCalendar() {
        calendarOverlay.classList.remove('open');
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
    function confirmAction(title, desc) {
        return new Promise((resolve) => {
            confirmTitle.textContent = title || '确认删除';
            confirmDesc.textContent = desc || '确定要删除吗？';
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
        title.textContent = '与 ' + botName + ' 的回忆录';

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
        applyDarkMode(settings.darkMode || false);

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

                let heights = await loadHeightsFromDB();
                if (heights && heights.length === allMessages.length) {
                    itemHeights = heights;
                } else {
                    pstatus.textContent = '⏳ 测量高度...';
                    heights = await measureAllMessages(allMessages, (p) => {
                        pstatus.textContent = p + '%';
                        pdetail.textContent = '测量高度 ' + p + '%';
                    });
                    await saveHeightsToDB(heights);
                    itemHeights = heights;
                    pstatus.textContent = '✅ 完成';
                    pdetail.textContent = '已加载 ' + allMessages.length.toLocaleString() + ' 条消息';
                    setTimeout(() => {
                        pstatus.textContent = '';
                        pdetail.textContent = '';
                    }, 1500);
                }

                buildHeightCache(itemHeights);
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
            console.error('加载数据失败:', err);
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
        exitMultiSelect();
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

                    pstatus.textContent = '⏳ 测量高度...';
                    const heights = await measureAllMessages(allMessages, (p) => {
                        progressBar.style.width = p + '%';
                        pstatus.textContent = p + '%';
                        pdetail.textContent = '测量高度 ' + p + '%';
                    });

                    await saveHeightsToDB(heights);
                    itemHeights = heights;
                    buildHeightCache(heights);

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
                    console.error(err);
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
        themeBtns.forEach(btn => {
            const theme = btn.dataset.theme;
            if (theme === 'dark' && settings.darkMode) {
                btn.classList.add('active');
            } else if (theme === 'light' && !settings.darkMode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
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
            searchMatchCache = [];
            searchDisplayCount = SEARCH_BATCH_SIZE;
        }
    });

    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchClear.classList.remove('show');
            searchDropdown.classList.remove('show');
            searchMatchCache = [];
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
        searchMatchCache = [];
        searchDisplayCount = SEARCH_BATCH_SIZE;
        searchInput.focus();
    });

    document.addEventListener('click', function(e) {
        const wrap = document.getElementById('search-wrap');
        if (!wrap.contains(e.target)) {
            searchDropdown.classList.remove('show');
        }
        if (actionMenu.style.display === 'block' && !actionMenu.contains(e.target)) {
            actionMenu.style.display = 'none';
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
        settings.darkMode = document.body.classList.contains('dark-mode');
        try {
            await saveSettingsToDB(settings);
            applySettings();
            closeSettings();
            showToast('✅ 设置已保存');
        } catch (err) {
            showToast('❌ 保存失败');
        }
    });

    themeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const theme = this.dataset.theme;
            const isDark = theme === 'dark';
            applyDarkMode(isDark);
        });
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
                messagesContainer.style.backgroundImage = 'url(' + settings.bgImage + ')';
            } catch (err) { showToast('❌ 图片读取失败'); }
        }
        this.value = '';
    });

    sUploadJson.addEventListener('click', function() { closeSettings();
        fileInput.click(); });
    sExportMd.addEventListener('click', exportMD);

    sClearData.addEventListener('click', function() {
        confirmAction('确定要清空所有聊天记录和设置吗？', '此操作不可恢复！').then(async (ok) => {
            if (!ok) return;
            try {
                await clearAllMessagesDB();
                await clearHeightsDB();
                const db = await getDB();
                const tx = db.transaction(SETTINGS_STORE, 'readwrite');
                const store = tx.objectStore(SETTINGS_STORE);
                for (const key of ['userName', 'botName', 'userAvatar', 'botAvatar', 'bgImage', 'darkMode']) {
                    store.delete(key);
                }
                await new Promise((resolve, reject) => {
                    tx.oncomplete = resolve;
                    tx.onerror = () => reject(tx.error);
                });
                allMessages = [];
                itemHeights = [];
                itemOffsets = [];
                totalHeight = 0;
                isDataLoaded = false;
                settings = { userName: '我', botName: 'Bot', userAvatar: '', botAvatar: '', bgImage: '', darkMode: false };
                applySettings();
                showUploadView();
                exitMultiSelect();
                showToast('🗑️ 已清空所有数据');
                localStorage.removeItem('chat_scroll_top');
            } catch (err) {
                showToast('❌ 清空失败');
                console.error(err);
            }
        }).catch(() => {});
    });

    // ===== 多选事件 =====
    msCancel.addEventListener('click', exitMultiSelect);
    msCopy.addEventListener('click', batchCopy);
    msDelete.addEventListener('click', batchDelete);

    // ===== 日历事件 =====
    calendarBtn.innerHTML = getCalendarIcon();

    calendarBtn.addEventListener('click', openCalendar);

    calendarOverlay.addEventListener('click', function(e) {
        if (e.target === this) closeCalendar();
    });

    calendarMonth.addEventListener('click', function() {
        if (maxDateStr) {
            openMonthPicker();
        } else {
            showToast('📭 暂无聊天记录');
        }
    });

    calendarPrev.addEventListener('click', function() {
        calendarMonthIndex--;
        if (calendarMonthIndex < 0) {
            calendarMonthIndex = 11;
            calendarYear--;
        }
        if (calendarYear > maxYear || (calendarYear === maxYear && (calendarMonthIndex + 1) > maxMonth)) {
            calendarYear = maxYear;
            calendarMonthIndex = maxMonth - 1;
        }
        renderCalendar(calendarYear, calendarMonthIndex);
    });

    calendarNext.addEventListener('click', function() {
        calendarMonthIndex++;
        if (calendarMonthIndex > 11) {
            calendarMonthIndex = 0;
            calendarYear++;
        }
        if (calendarYear > maxYear || (calendarYear === maxYear && (calendarMonthIndex + 1) > maxMonth)) {
            calendarYear = maxYear;
            calendarMonthIndex = maxMonth - 1;
        }
        renderCalendar(calendarYear, calendarMonthIndex);
    });

    // ===== 设置图标 =====
    settingsBtn.innerHTML = getSettingsIcon();

    // ===== 滚动事件 =====
    messagesContainer.addEventListener('scroll', function() {
        if (!isDataLoaded || allMessages.length === 0 || itemHeights.length === 0) return;

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
            if (isDataLoaded && allMessages.length > 0 && itemHeights.length > 0) {
                fullRebuild();
            }
        }, 300);
    });

    // ===== 页面关闭保存 =====
    window.addEventListener('beforeunload', function() {
        saveScrollPosition();
        if (multiSelectMode) exitMultiSelect();
    });

    // ===== 初始化 =====
    async function init() {
        await loadSettings();
        setupLongPress();

        settingsBtn.innerHTML = getSettingsIcon();
        calendarBtn.innerHTML = getCalendarIcon();

        msCopy.innerHTML = getCopyIcon();
        msDelete.innerHTML = getDeleteIcon();

        const isDark = settings.darkMode || false;
        themeBtns.forEach(btn => {
            const theme = btn.dataset.theme;
            if (theme === 'dark' && isDark) {
                btn.classList.add('active');
            } else if (theme === 'light' && !isDark) {
                btn.classList.add('active');
            }
        });

        const hasData = await loadDataFromDB();
        if (!hasData) {
            showUploadView();
        } else {
            buildDateMap();
            if (maxDateStr) {
                calendarYear = maxYear;
                calendarMonthIndex = maxMonth - 1;
            }
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
