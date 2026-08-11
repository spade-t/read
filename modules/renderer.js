// ===== 虚拟滚动渲染 - 动态高度版本 =====

let allMessages = [];
let settings = { userName: '我', botName: 'Bot', userAvatar: '', botAvatar: '', bgImage: '' };
let scrollViewport = null;
const BUFFER_SIZE = 5;
let visibleStart = 0;
let visibleEnd = 0;
let scrollFrameId = null;
let deleteMessageCallback = null;
let confirmActionCallback = null;
let messagesContainerRef = null;

// 存储每条消息的高度和偏移量
let itemHeights = [];
let itemOffsets = [];
let totalHeight = 0;

// 是否已测量过真实高度
let heightMeasured = false;

// ===== 外部依赖引用（由 app.js 注入） =====
let _formatBeijingTime = null;
let _showToast = null;
let _fallbackCopy = null;
let _saveScrollPosition = null;

function setDependencies(formatBeijingTime, showToast, fallbackCopy, saveScrollPosition) {
    _formatBeijingTime = formatBeijingTime;
    _showToast = showToast;
    _fallbackCopy = fallbackCopy;
    _saveScrollPosition = saveScrollPosition;
}

function initRenderer(messages, settingsObj, deleteFn, confirmFn, container) {
    allMessages = messages;
    settings = settingsObj;
    deleteMessageCallback = deleteFn;
    confirmActionCallback = confirmFn;
    messagesContainerRef = container;
    buildHeightCache();
}

function setMessages(messages) {
    allMessages = messages;
    buildHeightCache();
}

// ===== 预估消息高度（仅用于初始占位，实际会被测量覆盖） =====
function estimateItemHeight(msg) {
    const text = msg._text || '';
    const charCount = text.length;
    const lineWidth = 20;
    const lines = Math.max(1, Math.ceil(charCount / lineWidth));
    const bubbleHeight = lines * 22 + 16;
    return 52 + bubbleHeight + 34;
}

// ===== 构建高度缓存 =====
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
    heightMeasured = false;
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

function buildViewport(container) {
    if (!scrollViewport) {
        scrollViewport = document.createElement('div');
        scrollViewport.id = 'scroll-viewport';
        scrollViewport.style.position = 'relative';
        scrollViewport.style.width = '100%';
        scrollViewport.style.minHeight = '100%';
        container.appendChild(scrollViewport);
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
    const time = _formatBeijingTime ? _formatBeijingTime(msg.create_time) : '';

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
    copyBtn.dataset.action = 'copy';
    copyBtn.dataset.index = index;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'msg-action-btn delete-btn';
    deleteBtn.textContent = '删除';
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

// ===== 事件委托 =====
function setupMessageEvents(container) {
    container.addEventListener('click', function(e) {
        const btn = e.target.closest('.msg-action-btn');
        if (!btn) return;

        const action = btn.dataset.action;
        const index = parseInt(btn.dataset.index);
        if (isNaN(index) || index < 0 || index >= allMessages.length) return;

        const msg = allMessages[index];

        if (action === 'copy') {
            const text = msg._text || '';
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => _showToast ? _showToast('✅ 已复制') : alert('已复制'));
            } else {
                if (_fallbackCopy) {
                    _fallbackCopy(text);
                } else {
                    const ta = document.createElement('textarea');
                    ta.value = text;
                    ta.style.cssText = 'position:fixed;opacity:0;';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    if (_showToast) _showToast('✅ 已复制');
                }
            }
            e.stopPropagation();
        } else if (action === 'delete') {
            e.stopPropagation();
            if (confirmActionCallback) {
                confirmActionCallback().then((ok) => {
                    if (ok && deleteMessageCallback) {
                        deleteMessageCallback(index);
                    }
                }).catch(() => {});
            }
        }
    });
}

function fullRebuild(container) {
    buildHeightCache();
    const viewport = buildViewport(container);

    const total = allMessages.length;
    if (total === 0) {
        viewport.innerHTML =
            '<div style="text-align:center;padding:60px 20px;color:#999;font-size:16px;position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);">暂无消息</div>';
        viewport.style.height = '100%';
        return;
    }

    viewport.style.height = totalHeight + 'px';
    viewport.innerHTML = '';

    const containerHeight = container.clientHeight || 600;
    const scrollTop = container.scrollTop || 0;

    const range = findVisibleRange(scrollTop, containerHeight);
    visibleStart = range.start;
    visibleEnd = range.end;

    const fragment = document.createDocumentFragment();
    for (let i = visibleStart; i < visibleEnd; i++) {
        fragment.appendChild(createMessageElement(allMessages[i], i));
    }
    viewport.appendChild(fragment);
}

function updateViewport(container) {
    if (!scrollViewport || allMessages.length === 0) return;

    const containerHeight = container.clientHeight || 600;
    const scrollTop = container.scrollTop || 0;

    const range = findVisibleRange(scrollTop, containerHeight);
    const start = range.start;
    const end = range.end;

    // 更新所有现有节点的位置
    const children = scrollViewport.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.dataset && child.dataset.index !== undefined) {
            const idx = parseInt(child.dataset.index);
            child.style.top = itemOffsets[idx] + 'px';
            child.style.height = itemHeights[idx] + 'px';
        }
    }

    // 如果范围变化大，进行增删
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

        // 更新所有节点的位置
        for (const idx in childMap) {
            const el = childMap[idx];
            const index = parseInt(idx);
            el.style.top = itemOffsets[index] + 'px';
            el.style.height = itemHeights[index] + 'px';
            el.dataset.index = index;
        }
    }
}

function setupScrollListener(container) {
    container.addEventListener('scroll', function() {
        if (allMessages.length === 0) return;

        if (_saveScrollPosition) {
            _saveScrollPosition(container);
        }

        if (scrollFrameId) {
            cancelAnimationFrame(scrollFrameId);
        }

        scrollFrameId = requestAnimationFrame(() => {
            scrollFrameId = null;
            updateViewport(container);
        });
    });
}

function jumpToMessage(container, index) {
    if (index < 0 || index >= allMessages.length) return;
    const targetScroll = Math.max(0, itemOffsets[index] - container.clientHeight / 3);
    container.scrollTo({ top: targetScroll, behavior: 'smooth' });

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

function updateRendererSettings(newSettings) {
    settings = newSettings;
    buildHeightCache();
    if (messagesContainerRef) {
        fullRebuild(messagesContainerRef);
    }
}

function refreshRenderer() {
    buildHeightCache();
    if (messagesContainerRef) {
        fullRebuild(messagesContainerRef);
    }
}

function rebuildAfterDelete() {
    buildHeightCache();
    if (messagesContainerRef) {
        fullRebuild(messagesContainerRef);
    }
}
