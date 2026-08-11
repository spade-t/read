document.addEventListener('DOMContentLoaded', async function() {
    'use strict';

    // ===== DOM 快捷获取 =====
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

    // ===== 全局常量（已同步CSS16px间距） =====
    const ITEM_BOTTOM_GAP = 16;
    const DB_NAME = 'ChatViewerDB';
    const STORE_NAME = 'messages';
    const SETTINGS_STORE = 'settings';
    const DB_VERSION = 2;
    const BUFFER_SIZE = 5;
    const SEARCH_BATCH_SIZE = 50;

    // ===== 全局状态 =====
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
    let scrollViewport = null;
    let visibleStart = 0;
    let visibleEnd = 0;
    let scrollFrameId = null;
    let itemHeights = [];
    let itemOffsets = [];
    let totalHeight = 0;
    let searchMatchCache = [];
    let searchDisplayCount = 50;
    let selectedIndex = -1;
    let calendarYear = new Date().getFullYear();
    let calendarMonthIndex = new Date().getMonth();
    let messageDateMap = {};
    let maxDateStr = '';
    let maxYear = calendarYear;
    let maxMonth = calendarMonthIndex + 1;
    let maxDay = 31;

    // ===== 工具函数 =====
    function showToast(message) {
        const old = document.querySelector('.custom-toast');
        if (old) old.remove();
        const toast = document.createElement('div');
        toast.className = 'custom-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        clearTimeout(window._toastTimer);
        window._toastTimer = setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    function formatBeijingTime(isoStr) {
        if (!isoStr) return '未知时间';
        try {
            const d = new Date(isoStr);
            if (isNaN(d.getTime())) return isoStr;
            const bj = new Date(d.getTime() + 8 * 3600 * 1000);
            const y = bj.getUTCFullYear();
            const m = String(bj.getUTCMonth() + 1).padStart(2, '0');
            const day = String(bj.getUTCDate()).padStart(2, '0');
            const h = String(bj.getUTCHours()).padStart(2, '0');
            const min = String(bj.getUTCMinutes()).padStart(2, '0');
            return `${y}-${m}-${day} ${h}:${min}`;
        } catch { return isoStr; }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;z-index:-999';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showToast('✅ 已复制文本');
        } catch {
            showToast('❌ 复制失败，请手动复制');
        }
        ta.remove();
    }

    function imageToBase64(file) {
        return new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onload = e => res(e.target.result);
            fr.onerror = rej;
            fr.readAsDataURL(file);
        });
    }

    function saveScrollPos() {
        if (messagesContainer && isDataLoaded) {
            localStorage.setItem('chat_scroll_top', String(messagesContainer.scrollTop));
        }
    }
    function loadScrollPos() {
        const val = localStorage.getItem('chat_scroll_top');
        return val ? Number(val) : 0;
    }

    // ===== SVG图标（修复缺失xmlns、深色可见） =====
    function getCopyIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
    }
    function getDeleteIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
    }

    // ===== 消息文本提取逻辑 =====
    function extractRealText(showContent) {
        if (!showContent) return '';
        if (typeof showContent === 'string') {
            try { return extractTextFromBlocks(JSON.parse(showContent)); }
            catch { return showContent.trim(); }
        }
        if (Array.isArray(showContent)) return extractTextFromBlocks(showContent);
        return String(showContent).trim();
    }
    function extractTextFromBlocks(blocks) {
        let out = '';
        for (const b of blocks) {
            if (b?.content_v2?.text_block?.text) out += b.content_v2.text_block.text;
            else if (b?.content) {
                try { const c = JSON.parse(b.content); out += c.text || c.content || ''; }
                catch { out += b.content; }
            } else if (b?.text) out += b.text;
        }
        return out.trim();
    }
    function extractFromAppendFields(msg) {
        if (!msg.append_fields) return '';
        for (const f of msg.append_fields) {
            if (f.content) try { const c = JSON.parse(f.content); if (c.text) return c.text.trim(); } catch { if (f.content.trim()) return f.content.trim(); }
            if (f.content_v2) try { const c = JSON.parse(f.content_v2); if (c.text_block?.text) return c.text_block.text.trim(); } catch { if (f.content_v2.trim()) return f.content_v2.trim(); }
            if (f.text?.trim()) return f.text.trim();
        }
        return '';
    }
    function extractMessageText(msg) {
        let t = extractRealText(msg.show_content);
        if (t) return t;
        t = extractFromAppendFields(msg);
        if (t) return t;
        if (msg.content) try { const c = JSON.parse(msg.content); return c.text || c.content || msg.content.trim(); } catch { return msg.content.trim(); }
        if (msg.text?.trim()) return msg.text.trim();
        return '[空消息]';
    }

    // ===== JSON文件解析 =====
    function parseMessagesFromJSON(jsonData) {
        let conv = [];
        if (Array.isArray(jsonData)) conv = jsonData;
        else if (jsonData.conversations) conv = jsonData.conversations;
        else if (jsonData.messages) return { messages: jsonData.messages.map(m => ({...m,_text:extractMessageText(m),_userType:m.user_type||'bot'})), botName:'Bot' };
        else for (const k in jsonData) if (Array.isArray(jsonData[k])) { conv = jsonData[k]; break; }
        const msgs = [];
        let botName = 'Bot';
        for (const c of conv) {
            if (c.bot_name) botName = c.bot_name;
            if (c.messages) for (const m of c.messages) msgs.push({...m,_text:extractMessageText(m),_userType:m.user_type||'bot',_botName:c.bot_name||botName});
        }
        return { messages: msgs, botName };
    }
    function parseJSONFile(file, onProgress, onComplete, onErr) {
        const fr = new FileReader();
        fr.onprogress = e => e.total && onProgress(Math.round(e.loaded/e.total*100));
        fr.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                const res = parseMessagesFromJSON(data);
                onComplete(res.messages, res.botName);
            } catch (err) onErr('JSON解析失败：' + err.message);
        };
        fr.onerror = () => onErr('读取文件失败');
        fr.readAsText(file);
    }

    // ===== IndexedDB 数据库 =====
    function openDB() {
        return new Promise((res, rej) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, {keyPath:'message_id'});
                if (!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE, {keyPath:'key'});
            };
            req.onsuccess = e => res(e.target.result);
            req.onerror = e => rej(e.target.error);
        });
    }
    async function getDB() { if (!db) db = await openDB(); return db; }
    async function saveMsgsDB(list) {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const st = tx.objectStore(STORE_NAME);
        list.forEach(m => st.put(m));
        await new Promise((res, rej) => { tx.oncomplete=res; tx.onerror=()=>rej(tx.error); });
    }
    async function loadAllMsgs() {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const st = tx.objectStore(STORE_NAME);
        return new Promise((res, rej) => { const r = st.getAll(); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
    }
    async function delMsg(id) {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        await new Promise((res, rej) => { tx.oncomplete=res; tx.onerror=()=>rej(tx.error); });
    }
    async function clearAllDB() {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        await new Promise((res, rej) => { tx.oncomplete=res; tx.onerror=()=>rej(tx.error); });
    }
    async function saveSetDB(set) {
        const db = await getDB();
        const tx = db.transaction(SETTINGS_STORE, 'readwrite');
        const st = tx.objectStore(SETTINGS_STORE);
        for (const [k,v] of Object.entries(set)) st.put({key:k, value:v});
        await new Promise((res, rej) => { tx.oncomplete=res; tx.onerror=()=>rej(tx.error); });
    }
    async function loadSetDB() {
        const db = await getDB();
        const tx = db.transaction(SETTINGS_STORE, 'readonly');
        const st = tx.objectStore(SETTINGS_STORE);
        const all = await new Promise((res, rej) => { const r=st.getAll(); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
        const out = {};
        all.forEach(i => out[i.key] = i.value);
        return out;
    }

    // ===== 深色模式切换 =====
    function applyDarkMode(flag) {
        document.body.classList.toggle('dark-mode', flag);
        settings.darkMode = flag;
        themeBtns.forEach(b => {
            const t = b.dataset.theme;
            b.classList.toggle('active', (t==='dark'&&flag) || (t==='light'&&!flag));
        });
    }

    // ===== 虚拟滚动高度估算 & 渲染 =====
    function estimateItemHeight(msg) {
        const text = msg._text || '';
        const chars = text.length;
        let base = 45;
        const lines = Math.max(1, Math.ceil(chars / 20));
        base += lines * 20 + 12;
        base += 24;
        base += ITEM_BOTTOM_GAP;
        return Math.max(95, base);
    }
    function buildHeightCache() {
        const len = allMessages.length;
        itemHeights = new Array(len);
        itemOffsets = new Array(len);
        totalHeight = 0;
        for (let i=0;i<len;i++) {
            const h = estimateItemHeight(allMessages[i]);
            itemHeights[i] = h;
            itemOffsets[i] = totalHeight;
            totalHeight += h;
        }
    }
    function findVisibleRange(top, containerH) {
        const len = allMessages.length;
        if (len === 0) return {start:0,end:0};
        let s=0,e=len-1;
        while(s<e) {
            const mid = Math.floor((s+e)/2);
            if (itemOffsets[mid]+itemHeights[mid] < top) s=mid+1;
            else e=mid;
        }
        s = Math.max(0, s - BUFFER_SIZE);
        const bottom = top + containerH;
        e = s;
        while(e<len && itemOffsets[e] < bottom + BUFFER_SIZE*100) e++;
        e = Math.min(len, e + BUFFER_SIZE);
        return {start:s, end:e};
    }
    function buildViewport() {
        if (!scrollViewport) {
            scrollViewport = document.createElement('div');
            scrollViewport.id = 'scroll-viewport';
            scrollViewport.style.cssText = 'position:relative;width:100%;min-height:100%;';
            messagesContainer.appendChild(scrollViewport);
        }
        return scrollViewport;
    }
    function createMsgEl(msg, idx) {
        const isUser = msg._userType === 'user';
        const name = isUser ? settings.userName : (settings.botName !== 'Bot' ? settings.botName : msg._botName || 'Bot');
        const avatar = isUser ? settings.userAvatar : settings.botAvatar;
        const time = formatBeijingTime(msg.create_time);

        const item = document.createElement('div');
        item.className = 'msg-item' + (selectedIndex === idx ? ' selected' : '');
        item.dataset.index = idx;
        item.style.top = itemOffsets[idx] + 'px';
        item.style.height = itemHeights[idx] + 'px';

        const row = document.createElement('div');
        row.className = 'msg-row ' + (isUser ? 'user' : 'bot');

        const avaImg = document.createElement('img');
        avaImg.className = 'msg-avatar';
        avaImg.src = avatar || `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Ccircle cx="20" cy="20" r="20" fill="%23ccc"/%3E%3Ctext x="20" y="26" font-size="18" text-anchor="middle" fill="%23999"%3E${isUser?'我':'B'}%3C/text%3E%3C/svg%3E`;
        avaImg.alt = name;

        const body = document.createElement('div');
        body.className = 'msg-body';

        const header = document.createElement('div');
        header.className = 'msg-header';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'mname';
        nameSpan.textContent = name;
        const timeSpan = document.createElement('span');
        timeSpan.className = 'mtime';
        timeSpan.textContent = '(' + time + ')';
        header.append(nameSpan, timeSpan);

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
        copyBtn.innerHTML = getCopyIcon();
        copyBtn.dataset.action = 'copy';
        copyBtn.dataset.index = idx;

        const delBtn = document.createElement('button');
        delBtn.className = 'msg-action-btn delete-btn';
        delBtn.innerHTML = getDeleteIcon();
        delBtn.dataset.action = 'delete';
        delBtn.dataset.index = idx;
        actions.append(copyBtn, delBtn);

        body.append(header, bubble, actions);
        row.append(avaImg, body);
        item.appendChild(row);

        item.addEventListener('click', e => {
            if (e.target.closest('.msg-action-btn')) return;
            const i = Number(item.dataset.index);
            selectedIndex = selectedIndex === i ? -1 : i;
            fullRebuild();
        });
        return item;
    }
    function fullRebuild() {
        buildHeightCache();
        const vp = buildViewport();
        const total = allMessages.length;
        if (total === 0) {
            vp.innerHTML = `<div style="text-align:center;padding:60px;color:#999;">暂无聊天记录</div>`;
            vp.style.height = '100%';
            updateFooter();
            return;
        }
        vp.style.height = totalHeight + 'px';
        vp.innerHTML = '';
        const containerH = messagesContainer.clientHeight || 600;
        const scrollTop = messagesContainer.scrollTop || 0;
        const range = findVisibleRange(scrollTop, containerH);
        visibleStart = range.start;
        visibleEnd = range.end;
        const frag = document.createDocumentFragment();
        for (let i=visibleStart;i<visibleEnd;i++) frag.appendChild(createMsgEl(allMessages[i], i));
        vp.appendChild(frag);
        updateFooter();
    }
    function jumpToMsg(idx) {
        if (idx <0 || idx >= allMessages.length) return;
        const offset = itemOffsets[idx];
        const h = messagesContainer.clientHeight;
        messagesContainer.scrollTo({top: Math.max(0, offset - h/3), behavior:'smooth'});
        setTimeout(() => {
            const items = scrollViewport.querySelectorAll('.msg-item');
            items.forEach(el => {
                el.classList.remove('highlighted');
                if (Number(el.dataset.index) === idx) {
                    el.classList.add('highlighted');
                    setTimeout(() => el.classList.remove('highlighted'), 3000);
                }
            });
        }, 400);
    }

    // ===== 删除单条消息 =====
    async function deleteMsg(idx) {
        const msg = allMessages[idx];
        const mid = msg.message_id;
        try {
            if (mid) await delMsg(mid);
            allMessages.splice(idx,1);
            if (selectedIndex === idx) selectedIndex = -1;
            else if (selectedIndex > idx) selectedIndex--;
            fullRebuild();
            showToast('已删除本条消息');
        } catch {
            showToast('删除失败');
        }
    }

    // ===== 搜索功能 =====
    function performSearch(q) {
        const kw = q.trim().toLowerCase();
        if (!kw) { searchDropdown.classList.remove('show'); searchMatchCache=[]; return; }
        searchMatchCache = [];
        for (let i=0;i<allMessages.length;i++) {
            const text = (allMessages[i]._text || '').toLowerCase();
            if (text.includes(kw)) {
                searchMatchCache.push({index:i, msg:allMessages[i], keyword:kw});
                if (searchMatchCache.length>2000) break;
            }
        }
        renderSearchResult();
    }
    function genPreview(text, kw) {
        if (!text) return '';
        const lText = text.toLowerCase();
        const lKw = kw.toLowerCase();
        const pos = lText.indexOf(lKw);
        if (pos === -1) return escapeHtml(text);
        const kwLen = lKw.length;
        const maxShow = 20;
        let start = Math.max(0, pos - Math.floor((maxShow - kwLen)/2));
        let end = Math.min(text.length, start + maxShow);
        let snippet = text.slice(start, end);
        const snipPos = pos - start;
        const before = escapeHtml(snippet.slice(0, snipPos));
        const hit = escapeHtml(snippet.slice(snipPos, snipPos + kwLen));
        const after = escapeHtml(snippet.slice(snipPos + kwLen));
        let res = '';
        if (start>0) res += '...';
        res += before + `<em>${hit}</em>` + after;
        if (end < text.length) res += '...';
        return res;
    }
    function renderSearchResult() {
        const total = searchMatchCache.length;
        if (total === 0) {
            searchDropdown.innerHTML = '<div class="sd-empty">无匹配消息</div>';
            searchDropdown.classList.add('show');
            return;
        }
        const showNum = Math.min(searchDisplayCount, total);
        const hasMore = showNum < total;
        let html = `<div class="sd-header">共 ${total} 条匹配结果</div>`;
        for (let i=0;i<showNum;i++) {
            const m = searchMatchCache[i];
            const msg = m.msg;
            const isUser = msg._userType === 'user';
            const name = isUser ? settings.userName : settings.botName || 'Bot';
            const time = formatBeijingTime(msg.create_time);
            const preview = genPreview(msg._text, m.keyword);
            html += `<div class="sd-item" data-index="${m.index}">
                <div class="sd-top">
                    <span class="sd-name">${escapeHtml(name)}</span>
                    <span class="sd-time">${escapeHtml(time)}</span>
                </div>
                <div class="sd-preview">${preview}</div>
            </div>`;
        }
        if (hasMore) html += `<div class="sd-more-btn" id="sd-more-btn">显示更多（剩余${total-showNum}条）</div>`;
        searchDropdown.innerHTML = html;
        searchDropdown.classList.add('show');
        // 点击跳转
        searchDropdown.querySelectorAll('.sd-item').forEach(el => {
            el.onclick = () => {
                const idx = Number(el.dataset.index);
                jumpToMsg(idx);
                searchDropdown.classList.remove('show');
                searchInput.value = '';
                searchClear.classList.remove('show');
                searchMatchCache = [];
                searchDisplayCount = SEARCH_BATCH_SIZE;
            };
        });
        const moreBtn = document.getElementById('sd-more-btn');
        if (moreBtn) moreBtn.onclick = e => {
            e.stopPropagation();
            searchDisplayCount += SEARCH_BATCH_SIZE;
            renderSearchResult();
        };
    }

    // ===== 日历逻辑 =====
    function buildDateMap() {
        messageDateMap = {};
        maxDateStr = '';
        allMessages.forEach(msg => {
            if (!msg.create_time) return;
            const d = new Date(msg.create_time);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            if (!messageDateMap[key]) messageDateMap[key] = [];
            messageDateMap[key].push(msg);
            if (key > maxDateStr) maxDateStr = key;
        });
        if (maxDateStr) {
            const [y,m,d] = maxDateStr.split('-').map(Number);
            maxYear = y; maxMonth = m; maxDay = d;
        }
    }
    function renderCalendar(y, m) {
        const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
        calendarMonth.textContent = `${y}年 ${monthNames[m]} ▼`;
        const afterMax = y > maxYear || (y === maxYear && m+1 > maxMonth);
        if (afterMax) {
            calendarDays.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:#ccc;">暂无记录</div>';
            return;
        }
        const firstDay = new Date(y, m, 1).getDay();
        const daysTotal = new Date(y, m+1, 0).getDate();
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        let html = '';
        for (let i=0;i<firstDay;i++) html += '<div class="cal-day empty"></div>';
        for (let d=1;d<=daysTotal;d++) {
            const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const hasMsg = !!messageDateMap[key];
            const isToday = key === todayKey;
            const dis = (y === maxYear && m+1 === maxMonth && d > maxDay);
            let cls = 'cal-day';
            if (dis) cls += ' disabled';
            else if (isToday) cls += ' today';
            else if (hasMsg) cls += ' has-msg';
            html += `<button class="${cls}" data-date="${key}" ${hasMsg&&!dis?'':'disabled'}>${d}</button>`;
        }
        calendarDays.innerHTML = html;
        calendarDays.querySelectorAll('.cal-day.has-msg:not(.disabled)').forEach(btn => {
            btn.onclick = () => {
                const key = btn.dataset.date;
                const firstMsg = messageDateMap[key][0];
                const idx = allMessages.indexOf(firstMsg);
                calendarOverlay.classList.remove('open');
                jumpToMsg(idx);
            };
        });
    }
    function openCalendar() {
        const now = new Date();
        if (maxDateStr) { calendarYear = maxYear; calendarMonthIndex = maxMonth -1; }
        else { calendarYear = now.getFullYear(); calendarMonthIndex = now.getMonth(); }
        buildDateMap();
        renderCalendar(calendarYear, calendarMonthIndex);
        calendarOverlay.classList.add('open');
    }

    // ===== 弹窗开关、确认弹窗 =====
    function openSettingPanel() { settingsOverlay.classList.add('open'); }
    function closeSettingPanel() { settingsOverlay.classList.remove('open'); }
    function closeCalendar() { calendarOverlay.classList.remove('open'); }
    function showConfirm(title, desc) {
        return new Promise(res => {
            confirmTitle.textContent = title;
            confirmDesc.textContent = desc;
            confirmOverlay.classList.add('open');
            pendingConfirm = res;
        });
    }

    // ===== 导出MD =====
    function exportMD() {
        if (allMessages.length === 0) return showToast('无消息可导出');
        let md = '# 聊天记录导出\n\n';
        allMessages.forEach(msg => {
            const isUser = msg._userType === 'user';
            const name = isUser ? settings.userName : settings.botName || 'Bot';
            md += `${name}（${formatBeijingTime(msg.create_time)}）：${msg._text}\n\n`;
        });
        const blob = new Blob([md], {type:'text/markdown;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `聊天记录_${new Date().toISOString().slice(0,10)}.md`;
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast('导出MD完成');
    }

    // ===== 页面视图切换 =====
    function showMessagesView() {
        uploadZone.style.display = 'none';
        messagesContainer.style.display = 'block';
        footer.style.display = 'flex';
    }
    function showUploadView() {
        uploadZone.style.display = 'flex';
        messagesContainer.style.display = 'none';
        footer.style.display = 'none';
    }
    function updateFooter() {
        msgCount.textContent = `总消息：${allMessages.length.toLocaleString()} 条`;
        const size = (new Blob([JSON.stringify(allMessages)]).size / 1024 / 1024).toFixed(1);
        sDataSize.textContent = `数据大小：${size} MB`;
    }
    function applyAllSettings() {
        title.textContent = `与 ${settings.botName || 'Bot'} 的回忆录`;
        messagesContainer.style.backgroundImage = settings.bgImage ? `url(${settings.bgImage})` : 'none';
        sUserName.value = settings.userName || '';
        sBotName.value = settings.botName || '';
        sUserAvatarPreview.src = settings.userAvatar || '';
        sBotAvatarPreview.src = settings.botAvatar || '';
        applyDarkMode(settings.darkMode);
        if (isDataLoaded && allMessages.length) fullRebuild();
    }

    // ===== 核心事件绑定（修复上传按钮、图标点击失效） =====
    function bindAllEvents() {
        // 顶部图标按钮
        calendarBtn.onclick = openCalendar;
        settingsBtn.onclick = openSettingPanel;
        settingsClose.onclick = closeSettingPanel;
        // 上传按钮唤起文件选择器（修复上传无响应）
        uploadBtn.onclick = () => fileInput.click();
        // 文件解析逻辑
        fileInput.onchange = async e => {
            const file = e.target.files[0];
            if (!file || isParsing) return;
            isParsing = true;
            progressWrap.classList.add('show');
            pname.textContent = file.name;
            pstatus.textContent = '0%';
            progressBar.style.width = '0%';
            parseJSONFile(file,
                per => {
                    pstatus.textContent = per + '%';
                    progressBar.style.width = per + '%';
                },
                async (msgs, botName) => {
                    allMessages = msgs.sort((a,b) => (a.create_time||'').localeCompare(b.create_time||''));
                    settings.botName = botName;
                    await saveMsgsDB(allMessages);
                    await saveSetDB(settings);
                    isDataLoaded = true;
                    progressWrap.classList.remove('show');
                    showMessagesView();
                    buildViewport();
                    fullRebuild();
                    setTimeout(() => messagesContainer.scrollTop = loadScrollPos(), 60);
                    showToast('文件加载成功');
                },
                err => {
                    progressWrap.classList.remove('show');
                    showToast(err);
                }
            );
            fileInput.value = '';
            isParsing = false;
        };
        // 搜索框
        searchInput.oninput = e => {
            const val = e.target.value;
            searchClear.classList.toggle('show', val.length > 0);
            performSearch(val);
        };
        searchClear.onclick = () => {
            searchInput.value = '';
            searchClear.classList.remove('show');
            searchDropdown.classList.remove('show');
            searchMatchCache = [];
        };
        // 日历翻页
        calendarPrev.onclick = () => {
            calendarMonthIndex--;
            if (calendarMonthIndex < 0) {
                calendarYear--;
                calendarMonthIndex = 11;
            }
            renderCalendar(calendarYear, calendarMonthIndex);
        };
        calendarNext.onclick = () => {
            calendarMonthIndex++;
            if (calendarMonthIndex > 11) {
                calendarYear++;
                calendarMonthIndex = 0;
            }
            renderCalendar(calendarYear, calendarMonthIndex);
        };
        calendarMonth.onclick = async () => {
            // 唤起年月选择弹窗（沿用原有逻辑）
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
            const yearsBox = overlay.querySelector('#picker-years');
            const monthsBox = overlay.querySelector('#picker-months');
            const nowY = new Date().getFullYear();
            const startY = Math.min(2024, maxYear);
            let yearHtml = '';
            for (let y = Math.max(maxYear, nowY); y >= startY; y--) {
                const act = y === calendarYear;
                const dis = y > maxYear;
                yearHtml += `<button class="${act?'active':''} ${dis?'disabled':''}" data-year="${y}">${y}年</button>`;
            }
            yearsBox.innerHTML = yearHtml;
            const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
            let monthHtml = '';
            for (let m=0;m<12;m++) {
                const act = m === calendarMonthIndex && calendarYear <= maxYear;
                const dis = calendarYear > maxYear || (calendarYear === maxYear && m+1 > maxMonth);
                monthHtml += `<button class="${act?'active':''} ${dis?'disabled':''}" data-month="${m}">${monthNames[m]}</button>`;
            }
            monthsBox.innerHTML = monthHtml;
            overlay.querySelector('.picker-bg').onclick = () => overlay.remove();
            yearsBox.querySelectorAll('button:not(.disabled)').forEach(btn => {
                btn.onclick = () => {
                    calendarYear = Number(btn.dataset.year);
                    yearsBox.querySelectorAll('button').forEach(b => b.classList.toggle('active', Number(b.dataset.year) === calendarYear));
                    monthsBox.querySelectorAll('button').forEach((b, idx) => {
                        const dis = calendarYear > maxYear || (calendarYear === maxYear && idx+1 > maxMonth);
                        b.classList.toggle('active', idx === calendarMonthIndex && !dis);
                        b.classList.toggle('disabled', dis);
                    });
                    renderCalendar(calendarYear, calendarMonthIndex);
                };
            });
            monthsBox.querySelectorAll('button:not(.disabled)').forEach(btn => {
                btn.onclick = () => {
                    calendarMonthIndex = Number(btn.dataset.month);
                    monthsBox.querySelectorAll('button').forEach(b => b.classList.toggle('active', Number(b.dataset.month) === calendarMonthIndex));
                    overlay.remove();
                    renderCalendar(calendarYear, calendarMonthIndex);
                };
            });
        };
        // 主题切换按钮
        themeBtns.forEach(btn => {
            btn.onclick = () => applyDarkMode(btn.dataset.theme === 'dark');
        });
        // 设置头像/背景上传
        sUserAvatarInput.onchange = async e => {
            const f = e.target.files[0];
            if (!f) return;
            settings.userAvatar = await imageToBase64(f);
            sUserAvatarPreview.src = settings.userAvatar;
            e.target.value = '';
        };
        sBotAvatarInput.onchange = async e => {
            const f = e.target.files[0];
            if (!f) return;
            settings.botAvatar = await imageToBase64(f);
            sBotAvatarPreview.src = settings.botAvatar;
            e.target.value = '';
        };
        sBgInput.onchange = async e => {
            const f = e.target.files[0];
            if (!f) return;
            settings.bgImage = await imageToBase64(f);
            messagesContainer.style.backgroundImage = `url(${settings.bgImage})`;
            e.target.value = '';
        };
        // 设置保存按钮
        sSave.onclick = async () => {
            settings.userName = sUserName.value.trim() || '我';
            settings.botName = sBotName.value.trim() || 'Bot';
            await saveSetDB(settings);
            applyAllSettings();
            closeSettingPanel();
            showToast('设置保存成功');
        };
        // 设置内重新上传
        sUploadJson.onclick = () => {
            closeSettingPanel();
            fileInput.click();
        };
        // 导出MD
        sExportMd.onclick = exportMD;
        // 清空全部数据
        sClearData.onclick = async () => {
            const ok = await showConfirm('清空全部聊天数据', '所有聊天记录将永久删除，无法恢复，确认清空？');
            if (!ok) return;
            await clearAllDB();
            allMessages = [];
            selectedIndex = -1;
            isDataLoaded = false;
            showUploadView();
            fullRebuild();
            showToast('已清空所有数据');
        };
        // 确认弹窗按钮
        confirmOk.onclick = () => {
            confirmOverlay.classList.remove('open');
            if (pendingConfirm) pendingConfirm(true);
            pendingConfirm = null;
        };
        confirmCancel.onclick = () => {
            confirmOverlay.classList.remove('open');
            if (pendingConfirm) pendingConfirm(false);
            pendingConfirm = null;
        };
        confirmOverlay.onclick = e => {
            if (e.target === confirmOverlay) {
                confirmOverlay.classList.remove('open');
                if (pendingConfirm) pendingConfirm(false);
                pendingConfirm = null;
            }
        };
        // 消息容器滚动监听（虚拟滚动刷新）
        messagesContainer.addEventListener('scroll', () => {
            saveScrollPos();
            if (scrollFrameId) cancelAnimationFrame(scrollFrameId);
            scrollFrameId = requestAnimationFrame(updateViewport);
        }, {passive:true});
        // 消息条目复制/删除委托
        messagesContainer.addEventListener('click', async e => {
            const btn = e.target.closest('.msg-action-btn');
            if (!btn) {
                if (e.target === messagesContainer || e.target.id === 'scroll-viewport') {
                    if (selectedIndex !== -1) {
                        selectedIndex = -1;
                        fullRebuild();
                    }
                }
                return;
            }
            e.stopPropagation();
            const idx = Number(btn.dataset.index);
            const action = btn.dataset.action;
            if (action === 'copy') {
                const text = allMessages[idx]._text;
                if (navigator.clipboard) navigator.clipboard.writeText(text).then(()=>showToast('已复制'));
                else fallbackCopy(text);
            } else if (action === 'delete') {
                const ok = await showConfirm('删除本条消息', '删除后无法恢复，确认删除？');
                if (ok) deleteMsg(idx);
            }
        }, true);
        // 点击空白关闭日历、设置
        calendarOverlay.onclick = e => { if (e.target === calendarOverlay) closeCalendar(); };
        settingsOverlay.onclick = e => { if (e.target === settingsOverlay) closeSettingPanel(); };
    }

    // ===== 页面初始化入口 =====
    async function initApp() {
        bindAllEvents();
        // 加载本地存储设置
        const savedSet = await loadSetDB();
        Object.assign(settings, savedSet);
        applyAllSettings();
        // 加载本地聊天记录
        const localMsgs = await loadAllMsgs();
        if (localMsgs && localMsgs.length > 0) {
            allMessages = localMsgs.sort((a,b) => (a.create_time||'').localeCompare(b.create_time||''));
            isDataLoaded = true;
            showMessagesView();
            buildViewport();
            fullRebuild();
            setTimeout(() => messagesContainer.scrollTop = loadScrollPos(), 80);
        } else {
            showUploadView();
        }
    }
    await initApp();
});
