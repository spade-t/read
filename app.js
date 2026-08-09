// ===== 主程序 =====

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
    let allMessages = [];
    let isDataLoaded = false;
    let isParsing = false;
    let settings = {
        userName: '我',
        botName: 'Bot',
        userAvatar: '',
        botAvatar: '',
        bgImage: ''
    };
    let pendingConfirm = null;

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

    // ===== 删除消息 =====
    async function deleteMessage(index) {
        if (index < 0 || index >= allMessages.length) return;
        const msg = allMessages[index];
        const msgId = msg.message_id;
        try {
            if (msgId) await deleteMessageFromDB(msgId);
            allMessages.splice(index, 1);
            setMessages(allMessages);
            fullRebuild(messagesContainer);
            updateFooter();
            showToast('🗑️ 已删除');
        } catch (err) {
            showToast('❌ 删除失败');
        }
    }

    // ===== 更新底部 =====
    function updateFooter() {
        const total = allMessages.length;
        msgCount.textContent = '总消息: ' + total.toLocaleString() + ' 条';
        const sizeMB = (new Blob([JSON.stringify(allMessages)]).size / (1024 * 1024)).toFixed(1);
        sDataSize.textContent = '数据大小: ' + sizeMB + ' MB';
    }

    // ===== 应用设置 =====
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

        updateRendererSettings(settings);
        updateSearchSettings(settings);

        if (isDataLoaded && allMessages.length > 0) {
            fullRebuild(messagesContainer);
        }
    }

    // ===== 显示/隐藏视图 =====
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

    // ===== 加载数据 =====
    async function loadDataFromDB() {
        try {
            const msgs = await loadAllMessagesFromDB();
            if (msgs && msgs.length > 0) {
                allMessages = msgs.sort((a, b) => (a.create_time || '').localeCompare(b.create_time || ''));
                isDataLoaded = true;
                setMessages(allMessages);
                setSearchMessages(allMessages);
                showMessagesView();
                buildViewport(messagesContainer);
                fullRebuild(messagesContainer);
                updateFooter();
                // 恢复滚动位置 - 定位到第一条消息
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
                    setMessages(allMessages);
                    setSearchMessages(allMessages);
                    showMessagesView();
                    applySettings();
                    buildViewport(messagesContainer);
                    fullRebuild(messagesContainer);
                    updateFooter();
                    pdetail.textContent = '✅ 完成！共 ' + allMessages.length.toLocaleString() + ' 条消息';
                    pstatus.textContent = '✅ 完成';
                    showToast('✅ 导入完成');
                    // 定位到第一条消息
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

    // ===== 初始化渲染器 =====
    initRenderer(allMessages, settings, deleteMessage, confirmAction);
    initSearch(allMessages, settings, (idx) => jumpToMessage(messagesContainer, idx));

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

    // 搜索
    let searchTimer = null;
    searchInput.addEventListener('input', function() {
        const val = this.value;
        if (val.trim()) {
            searchClear.classList.add('show');
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => performSearch(val, searchInput, searchDropdown, searchClear), 200);
        } else {
            clearSearch(searchInput, searchDropdown, searchClear);
        }
    });
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            clearSearch(searchInput, searchDropdown, searchClear);
            this.blur();
        }
        if (e.key === 'Enter') {
            const first = searchDropdown.querySelector('.sd-item');
            if (first) first.click();
        }
    });
    searchClear.addEventListener('click', function() {
        clearSearch(searchInput, searchDropdown, searchClear);
        searchInput.focus();
    });
    document.addEventListener('click', function(e) {
        const wrap = document.getElementById('search-wrap');
        if (!wrap.contains(e.target)) {
            searchDropdown.classList.remove('show');
        }
    });

    // 设置
    settingsBtn.addEventListener('click', function() {
        openSettingsPanel(settingsOverlay, sUserName, sBotName, sUserAvatarPreview, sBotAvatarPreview, sBgPreview, settings);
    });
    settingsClose.addEventListener('click', function() { closeSettingsPanel(settingsOverlay); });
    settingsOverlay.addEventListener('click', function(e) {
        if (e.target === this) closeSettingsPanel(settingsOverlay);
    });

    // 设置保存
    setupSettingsEvents(
        sSave, sUserName, sBotName, sUserAvatarInput, sBotAvatarInput, sBgInput,
        sUserAvatarPreview, sBotAvatarPreview, sBgPreview, settingsOverlay, settings,
        async function(newSettings) {
            settings = newSettings;
            await saveSettingsToDB(settings);
            applySettings();
            showToast('✅ 设置已保存');
        }
    );

    // 数据管理
    sUploadJson.addEventListener('click', function() { closeSettingsPanel(settingsOverlay);
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
                setMessages(allMessages);
                setSearchMessages(allMessages);
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

    // 滚动监听
    setupScrollListener(messagesContainer);

    // Resize
    let resizeTimeout = null;
    window.addEventListener('resize', function() {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (isDataLoaded && allMessages.length > 0) {
                itemHeight = getItemHeight();
                fullRebuild(messagesContainer);
            }
        }, 300);
    });

    // 页面关闭保存
    window.addEventListener('beforeunload', function() {
        saveScrollPosition(messagesContainer);
    });

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

    // ===== 初始化 =====
    async function init() {
        await loadSettings();
        const hasData = await loadDataFromDB();
        if (!hasData) {
            showUploadView();
        } else {
            showMessagesView();
            buildViewport(messagesContainer);
            fullRebuild(messagesContainer);
            updateFooter();
            // 默认滚动到第一条消息（或恢复位置）
            const savedPos = loadScrollPosition();
            setTimeout(() => {
                messagesContainer.scrollTop = savedPos > 0 ? savedPos : 0;
            }, 50);
        }
    }

    init();

})();
