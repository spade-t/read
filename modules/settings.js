// ===== 设置面板 =====

let settingsData = {};
let settingsCallbacks = [];

function initSettings(initialSettings, onSave) {
    settingsData = { ...initialSettings };
    settingsCallbacks.push(onSave);
}

function getSettings() {
    return settingsData;
}

function updateSettings(newSettings) {
    settingsData = { ...settingsData, ...newSettings };
    for (const cb of settingsCallbacks) {
        if (typeof cb === 'function') cb(settingsData);
    }
}

function openSettingsPanel(overlay, userNameInput, botNameInput, userAvatarPreview, botAvatarPreview, bgPreview, settings) {
    overlay.classList.add('open');
    userNameInput.value = settings.userName || '';
    botNameInput.value = settings.botName || '';
    userAvatarPreview.src = settings.userAvatar || '';
    botAvatarPreview.src = settings.botAvatar || '';
    bgPreview.src = settings.bgImage || '';
}

function closeSettingsPanel(overlay) {
    overlay.classList.remove('open');
}

function setupSettingsEvents(
    saveBtn, userNameInput, botNameInput, userAvatarInput, botAvatarInput, bgInput,
    userAvatarPreview, botAvatarPreview, bgPreview, overlay, settings, onSave
) {
    saveBtn.addEventListener('click', async function() {
        const newSettings = {
            userName: userNameInput.value.trim() || '我',
            botName: botNameInput.value.trim() || 'Bot',
            userAvatar: settings.userAvatar || '',
            botAvatar: settings.botAvatar || '',
            bgImage: settings.bgImage || ''
        };
        if (onSave) await onSave(newSettings);
        overlay.classList.remove('open');
    });

    userAvatarInput.addEventListener('change', async function() {
        if (this.files && this.files[0]) {
            try {
                settings.userAvatar = await imageToBase64(this.files[0]);
                userAvatarPreview.src = settings.userAvatar;
            } catch (err) { showToast('❌ 图片读取失败'); }
        }
        this.value = '';
    });

    botAvatarInput.addEventListener('change', async function() {
        if (this.files && this.files[0]) {
            try {
                settings.botAvatar = await imageToBase64(this.files[0]);
                botAvatarPreview.src = settings.botAvatar;
            } catch (err) { showToast('❌ 图片读取失败'); }
        }
        this.value = '';
    });

    bgInput.addEventListener('change', async function() {
        if (this.files && this.files[0]) {
            try {
                settings.bgImage = await imageToBase64(this.files[0]);
                bgPreview.src = settings.bgImage;
            } catch (err) { showToast('❌ 图片读取失败'); }
        }
        this.value = '';
    });
}