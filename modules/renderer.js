// ===== 虚拟滚动渲染 =====

let allMessages = [];
let settings = { userName: '我', botName: 'Bot', userAvatar: '', botAvatar: '', bgImage: '' };
let scrollViewport = null;
let itemHeight = 130;  // 增大基础高度
const BUFFER_SIZE = 5;
let visibleStart = 0;
let visibleEnd = 0;
let scrollFrameId = null;
let deleteMessageCallback = null;
let confirmActionCallback = null;
let messagesContainerRef = null;

function initRenderer(messages, settingsObj, deleteFn, confirmFn, container) {
    allMessages = messages;
    settings = settingsObj;
    deleteMessageCallback = deleteFn;
    confirmActionCallback = confirmFn;
    messagesContainerRef = container;
}

function setMessages(messages) {
    allMessages = messages;
}

function getItemHeight() {
    // 根据屏幕宽度调整
    if (window.innerWidth <= 400) return 115;
    if (window.innerWidth <= 600) return 125;
    return 135;
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
    const time = formatBeijingTime(msg.create_time);

    const item = document.createElement('div');
    item.className = 'msg-item';
    item.dataset.index = index;
    item.style.position = 'absolute';
    item.style.left = '0';
    item.style.right = '0';
    item.style.top = (index * itemHeight) + 'px';
    item.style.height = itemHeight + 'px';
    item.style.paddingBottom = '16px';

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
    copyBtn.textContent = '📋 复制';
    copyBtn.dataset.action = 'copy';
    copyBtn.dataset.index = index;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'msg-action-btn delete-btn';
    deleteBtn.textContent = '🗑️ 删除';
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

// ===== 事件委托：监听容器上的点击 =====
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
                navigator.clipboard.writeText(text).then(() => showToast('✅ 已复制'));
            } else {
                fallbackCopy(text);
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
    itemHeight = getItemHeight();
    const viewport = buildViewport(container);

    const total = allMessages.length;
    if (total === 0) {
        viewport.innerHTML =
            '<div style="text-align:center;padding:60px 20px;color:#999;font-size:16px;position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);">暂无消息</div>';
        viewport.style.height = '100%';
        return;
    }

    viewport.style.height = (total * itemHeight) + 'px';
    viewport.innerHTML = '';

    const containerHeight = container.clientHeight || 600;
    const scrollTop = container.scrollTop || 0;

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - BUFFER_SIZE);
    const end = Math.min(total, Math.ceil((scrollTop + containerHeight) / itemHeight) + BUFFER_SIZE);

    visibleStart = start;
    visibleEnd = end;

    const fragment = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
        fragment.appendChild(createMessageElement(allMessages[i], i));
    }
    viewport.appendChild(fragment);
}

function updateViewport(container) {
    if (!scrollViewport || allMessages.length === 0) return;

    const total = allMessages.length;
    const containerHeight = container.clientHeight || 600;
    const scrollTop = container.scrollTop || 0;

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - BUFFER_SIZE);
    const end = Math.min(total, Math.ceil((scrollTop + containerHeight) / itemHeight) + BUFFER_SIZE);

    // 先更新所有现有节点的位置
    const children = scrollViewport.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.dataset && child.dataset.index !== undefined) {
            const idx = parseInt(child.dataset.index);
            child.style.top = (idx * itemHeight) + 'px';
            child.style.height = itemHeight + 'px';
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

        // 再次更新所有节点的位置
        for (const idx in childMap) {
            const el = childMap[idx];
            const index = parseInt(idx);
            el.style.top = (index * itemHeight) + 'px';
            el.style.height = itemHeight + 'px';
            el.dataset.index = index;
        }
    }
}

function setupScrollListener(container) {
    container.addEventListener('scroll', function() {
        if (allMessages.length === 0) return;

        saveScrollPosition(container);

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
    const targetScroll = Math.max(0, index * itemHeight - container.clientHeight / 3);
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
}
