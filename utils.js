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

function saveScrollPosition(container) {
    if (container) {
        try {
            localStorage.setItem('chat_scroll_top', String(container.scrollTop));
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