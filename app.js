## 1. index.html

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>聊天记录查看器</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <div id="app">
        <!-- ===== 顶部 ===== -->
        <header id="header">
            <div id="top-row">
                <button class="icon-btn calendar-btn" id="calendar-btn" aria-label="日历"></button>
                <span id="title">与 Bot 的回忆录</span>
                <button class="icon-btn settings-btn" id="settings-btn" aria-label="设置"></button>
            </div>
            <div id="search-row">
                <div id="search-wrap">
                    <input type="text" id="search-input" placeholder="搜索" autocomplete="off">
                    <button id="search-clear" aria-label="清除搜索">✕</button>
                    <div id="search-dropdown"></div>
                </div>
            </div>
        </header>

        <!-- ===== 日历面板 ===== -->
        <div id="calendar-overlay">
            <div id="calendar-panel">
                <div class="cal-header">
                    <span class="cal-month" id="calendar-month">2026年 八月 ▼</span>
                    <div class="cal-nav">
                        <button id="calendar-prev">◀</button>
                        <button id="calendar-next">▶</button>
                    </div>
                </div>
                <div class="cal-weekdays">
                    <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
                </div>
                <div class="cal-days" id="calendar-days"></div>
            </div>
        </div>

        <!-- ===== 上传区域 ===== -->
        <div id="upload-zone">
            <div class="icon">📄</div>
            <button class="upload-btn" id="upload-btn">📁 上传JSON文件</button>
            <input type="file" id="file-input" accept=".json" style="display:none;">
            <div id="progress-wrap">
                <div id="progress-text">
                    <span class="pname" id="pname">文件名</span>
                    <span id="pstatus">0%</span>
                </div>
                <div id="progress-bar-bg">
                    <div id="progress-bar"></div>
                </div>
                <div style="font-size:12px;color:#888;" id="pdetail">准备解析...</div>
            </div>
        </div>

        <!-- ===== 消息列表 ===== -->
        <div id="messages-container" style="display:none;"></div>

        <!-- ===== 底部 ===== -->
        <footer id="footer" style="display:none;">
            <span class="fcount" id="msg-count">总消息: 0 条</span>
        </footer>
    </div>

    <!-- ===== 设置面板 ===== -->
    <div id="settings-overlay">
        <div id="settings-panel">
            <div class="s-header">
                <span>设置</span>
                <button id="settings-close">✕</button>
            </div>

            <div class="s-group">
                <div class="s-title">名称</div>
                <hr class="s-divider">
                <div class="s-row s-row-inline">
                    <label>我的名称</label>
                    <input type="text" id="s-user-name" placeholder="">
                </div>
                <div class="s-row s-row-inline">
                    <label>Bot 名称</label>
                    <input type="text" id="s-bot-name" placeholder="">
                </div>
            </div>

            <div class="s-group">
                <div class="s-title">头像</div>
                <hr class="s-divider">
                <div class="s-avatar-group">
                    <div class="s-avatar-item">
                        <label>我的头像</label>
                        <div class="s-avatar-row">
                            <img id="s-user-avatar-preview" class="preview" src="" alt="">
                            <span class="file-input-wrap">
                                <span class="file-btn">选择图片</span>
                                <input type="file" id="s-user-avatar-input" accept="image/*">
                            </span>
                        </div>
                    </div>
                    <div class="s-avatar-item">
                        <label>Bot 头像</label>
                        <div class="s-avatar-row">
                            <img id="s-bot-avatar-preview" class="preview" src="" alt="">
                            <span class="file-input-wrap">
                                <span class="file-btn">选择图片</span>
                                <input type="file" id="s-bot-avatar-input" accept="image/*">
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="s-group">
                <div class="s-title">聊天背景</div>
                <hr class="s-divider">
                <div class="s-row">
                    <label>背景图片</label>
                    <div class="s-avatar-row">
                        <span class="file-input-wrap">
                            <span class="file-btn">选择图片</span>
                            <input type="file" id="s-bg-input" accept="image/*">
                        </span>
                    </div>
                </div>
            </div>

            <div class="s-group">
                <div class="s-title">数据管理</div>
                <hr class="s-divider">
                <div class="s-data-row">
                    <button id="s-upload-json" class="primary">上传JSON</button>
                    <button id="s-export-md" class="primary">导出MD</button>
                    <button id="s-clear-data" class="danger">清空所有数据</button>
                </div>
                <div style="font-size:13px;color:#888;margin-top:10px;" id="s-data-size">数据大小: 0 MB</div>
            </div>

            <button class="s-save-btn" id="s-save">保存设置</button>
        </div>
    </div>

    <!-- ===== 确认弹窗 ===== -->
    <div id="confirm-overlay">
        <div id="confirm-box">
            <div class="c-icon">💔</div>
            <div class="c-title" id="confirm-title">确认删除</div>
            <div class="c-desc" id="confirm-desc">这是属于你们的回忆噢，删除后不可恢复！</div>
            <div class="c-actions">
                <button class="c-cancel" id="confirm-cancel">取消</button>
                <button class="c-confirm" id="confirm-ok">确定删除</button>
            </div>
        </div>
    </div>

    <script src="app.js"></script>
</body>
</html>
```


## 2. style.css

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
:root {
    --bg-color: #e8eaed;
    --bubble-bot-bg: #ffffff;
    --bubble-user-bg: #dcf8c6;
    --text-color: #1a1a1a;
    --time-color: #888;
    --shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    --radius: 12px;
    --max-width: 820px;
    --avatar-size: 40px;
    --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
html,
body {
    height: 100%;
    font-family: var(--font-family);
    background: var(--bg-color);
    color: #1a1a1a;
    overflow: hidden;
}
button {
    cursor: pointer;
    font-family: inherit;
    font-size: 14px;
    border: none;
    background: none;
    color: inherit;
}
input[type="text"],
input[type="file"] {
    font-family: inherit;
    font-size: 14px;
}

#app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    max-width: var(--max-width);
    margin: 0 auto;
    background: var(--bg-color);
    position: relative;
    overflow: hidden;
}

/* ===== 顶部导航 ===== */
#header {
    background: #fff;
    border-bottom: 1px solid #ddd;
    flex-shrink: 0;
    z-index: 10;
    padding: 12px 14px 10px 14px;
}

/* 第一行：日历 | 标题 | 设置 - flex 完美居中 */
#top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0 12px 0;
    min-height: 40px;
}
#top-row .icon-btn {
    flex-shrink: 0;
}
#title {
    font-size: 20px;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: 0.3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    flex: 1;
    min-width: 0;
    margin: 0 12px;
    line-height: 1.4;
}

/* 第二行：搜索框 */
#search-row {
    display: flex;
    align-items: center;
    width: 100%;
}
#search-wrap {
    flex: 1;
    position: relative;
    min-width: 0;
}
#search-input {
    width: 100%;
    padding: 6px 32px 6px 14px;
    border: 1px solid #ddd;
    border-radius: 20px;
    font-size: 14px;
    outline: none;
    background: #f1f3f4;
    transition: border 0.2s, background 0.2s;
    -webkit-appearance: none;
    height: 34px;
}
#search-input:focus {
    border-color: #1a73e8;
    background: #fff;
}
#search-input::placeholder {
    color: #aaa;
    font-size: 14px;
}
#search-clear {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #999;
    font-size: 16px;
    cursor: pointer;
    display: none;
    background: none;
    border: none;
    padding: 0 4px;
}
#search-clear.show {
    display: block;
}

/* ===== 顶部图标按钮 ===== */
.icon-btn {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    padding: 0;
    color: #555;
    flex-shrink: 0;
}
.icon-btn svg {
    width: 22px;
    height: 22px;
    stroke: currentColor;
    stroke-width: 2;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
}
.icon-btn:active {
    background: #e8eaed;
}
#top-row .icon-btn.calendar-btn {
    order: 0;
}
#top-row .icon-btn.settings-btn {
    order: 2;
}

/* ===== 日历面板 ===== */
#calendar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 150;
    display: none;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
}
#calendar-overlay.open {
    display: flex;
}
#calendar-panel {
    background: #fff;
    border-radius: 16px;
    padding: 20px 24px 24px;
    width: 92%;
    max-width: 380px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}
#calendar-panel .cal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}
#calendar-panel .cal-header .cal-month {
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: background 0.15s;
    user-select: none;
}
#calendar-panel .cal-header .cal-month:active {
    background: #f0f0f0;
}
#calendar-panel .cal-header .cal-nav {
    display: flex;
    gap: 12px;
}
#calendar-panel .cal-header .cal-nav button {
    font-size: 20px;
    color: #666;
    padding: 4px 10px;
    border-radius: 6px;
    background: none;
    border: none;
    cursor: pointer;
}
#calendar-panel .cal-header .cal-nav button:active {
    background: #f0f0f0;
}
#calendar-panel .cal-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    text-align: center;
    font-size: 13px;
    color: #999;
    margin-bottom: 6px;
}
#calendar-panel .cal-days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
}
#calendar-panel .cal-days .cal-day {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    border-radius: 50%;
    cursor: pointer;
    transition: background 0.15s;
    background: none;
    border: none;
    font-family: inherit;
    color: #ccc;
}
#calendar-panel .cal-days .cal-day.has-msg {
    color: #1a1a1a;
    font-weight: 600;
}
#calendar-panel .cal-days .cal-day.has-msg:active {
    background: #e8eaed;
}
#calendar-panel .cal-days .cal-day.empty {
    cursor: default;
}
#calendar-panel .cal-days .cal-day.today {
    background: #1a73e8;
    color: #fff !important;
    font-weight: 600;
}
#calendar-panel .cal-days .cal-day.today:active {
    background: #1557b0;
}
#calendar-panel .cal-days .cal-day.disabled {
    cursor: default;
    color: #e0e0e0;
}

/* ===== 月份选择器 ===== */
#month-picker-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 160;
    display: none;
    align-items: center;
    justify-content: center;
}
#month-picker-overlay.open {
    display: flex;
}
#month-picker-overlay .picker-bg {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.2);
}
#month-picker {
    position: relative;
    background: #fff;
    border-radius: 16px;
    padding: 20px 24px 24px;
    width: 80%;
    max-width: 320px;
    max-height: 70vh;
    overflow-y: auto;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}
#month-picker .picker-header {
    font-size: 18px;
    font-weight: 600;
    text-align: center;
    padding-bottom: 12px;
    border-bottom: 1px solid #eee;
    margin-bottom: 14px;
}
#month-picker .picker-years {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 14px;
}
#month-picker .picker-years button {
    padding: 8px 0;
    border-radius: 8px;
    border: 1px solid #eee;
    background: #f7f7f7;
    font-size: 14px;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s, border-color 0.15s;
}
#month-picker .picker-years button:active {
    background: #e8eaed;
}
#month-picker .picker-years button.active {
    background: #1a73e8;
    color: #fff;
    border-color: #1a73e8;
}
#month-picker .picker-years button.disabled {
    color: #ccc;
    cursor: default;
    background: #f7f7f7;
}
#month-picker .picker-months {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
}
#month-picker .picker-months button {
    padding: 8px 0;
    border-radius: 8px;
    border: 1px solid #eee;
    background: #f7f7f7;
    font-size: 14px;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s, border-color 0.15s;
}
#month-picker .picker-months button:active {
    background: #e8eaed;
}
#month-picker .picker-months button.active {
    background: #1a73e8;
    color: #fff;
    border-color: #1a73e8;
}
#month-picker .picker-months button.disabled {
    color: #ccc;
    cursor: default;
    background: #f7f7f7;
}

/* ===== 搜索下拉 ===== */
#search-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 70vh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    background: #ffffff;
    border-top: 1px solid #eeeeee;
    z-index: 100;
    margin: 0;
    padding: 0;
    display: none;
    touch-action: pan-y;
}
#search-dropdown.show {
    display: block;
}

.sd-header {
    padding: 8px 16px;
    font-size: 13px;
    color: #999999;
    background: #f7f7f7;
    border-bottom: 1px solid #eeeeee;
    box-sizing: border-box;
    flex-shrink: 0;
}

.sd-item {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    box-sizing: border-box;
    touch-action: pan-y;
}
.sd-item:active {
    background: #f5f5f5;
}

.sd-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    font-size: 14px;
}

.sd-name {
    font-weight: 500;
    color: #333333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 60%;
}

.sd-time {
    font-size: 12px;
    color: #999999;
    flex-shrink: 0;
}

.sd-preview {
    display: block;
    font-size: 14px;
    color: #666666;
    line-height: 1.4;
    white-space: nowrap;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
}

.sd-preview em {
    font-style: normal;
    color: #07c160;
    font-weight: 500;
}

.sd-more-btn {
    padding: 12px;
    text-align: center;
    color: #1677ff;
    font-size: 14px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    flex-shrink: 0;
}

.sd-empty {
    padding: 40px 20px;
    text-align: center;
    color: #999999;
    font-size: 14px;
}

/* ===== 消息列表 ===== */
#messages-container {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 12px 10px 8px 10px;
    background: var(--bg-color);
    position: relative;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    -webkit-overflow-scrolling: touch;
}
#messages-container::-webkit-scrollbar {
    width: 4px;
}
#messages-container::-webkit-scrollbar-track {
    background: transparent;
}
#messages-container::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 10px;
}

/* ===== 消息列表内部滚动容器 ===== */
#scroll-viewport {
    position: relative;
    width: 100%;
    min-height: 100%;
}

/* ===== 消息条目 ===== */
.msg-item {
    position: absolute;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    overflow: visible;
}

.msg-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    max-width: 92%;
}
.msg-row.user {
    align-self: flex-end;
    flex-direction: row-reverse;
    margin-left: auto;
}
.msg-row.bot {
    align-self: flex-start;
    flex-direction: row;
    margin-right: auto;
}

.msg-avatar {
    width: var(--avatar-size);
    height: var(--avatar-size);
    border-radius: 50%;
    flex-shrink: 0;
    object-fit: cover;
    background: #ccc;
    border: 1px solid #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.msg-body {
    display: flex;
    flex-direction: column;
    min-width: 50px;
    max-width: 100%;
}
.msg-header {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 13px;
    padding: 0 2px 3px 2px;
    flex-wrap: wrap;
}
.msg-header .mname {
    font-weight: 600;
    font-size: 15px;
}
.msg-header .mtime {
    color: var(--time-color);
    font-size: 12px;
}
.msg-row.user .msg-header {
    justify-content: flex-end;
}
.msg-row.bot .msg-header {
    justify-content: flex-start;
}

.msg-bubble {
    padding: 10px 14px;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    word-break: break-word;
    line-height: 1.7;
    font-size: 16px;
    position: relative;
    background: var(--bubble-bot-bg);
    border-top-left-radius: 4px;
}
.msg-row.user .msg-bubble {
    background: var(--bubble-user-bg);
    border-top-right-radius: 4px;
    border-top-left-radius: var(--radius);
}
.msg-row.bot .msg-bubble {
    background: var(--bubble-bot-bg);
    border-top-left-radius: 4px;
    border-top-right-radius: var(--radius);
}
.msg-bubble .text-content {
    white-space: pre-wrap;
}

/* ===== 操作按钮 ===== */
.msg-actions {
    display: flex;
    gap: 4px;
    margin-top: 4px;
    padding: 0 4px;
    opacity: 0.6;
    transition: opacity 0.2s;
}
.msg-item:hover .msg-actions {
    opacity: 1;
}
@media (max-width: 768px) {
    .msg-actions {
        opacity: 1;
    }
}

.msg-action-btn {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, transform 0.15s;
    padding: 0;
    color: #888;
}
.msg-action-btn svg {
    width: 16px;
    height: 16px;
    stroke: currentColor;
    stroke-width: 2;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    flex-shrink: 0;
}
.msg-action-btn:active {
    transform: scale(0.85);
}
.msg-action-btn.copy-btn:hover {
    background: #e8f0fe;
    color: #1a73e8;
}
.msg-action-btn.copy-btn:active {
    background: #d2e3fc;
}
.msg-action-btn.delete-btn:hover {
    background: #fde8e8;
    color: #e74c3c;
}
.msg-action-btn.delete-btn:active {
    background: #fccccc;
}

.msg-row.user .msg-actions {
    justify-content: flex-end;
}
.msg-row.bot .msg-actions {
    justify-content: flex-start;
}

/* ===== 底部 ===== */
#footer {
    flex-shrink: 0;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(4px);
    border-top: 1px solid #ddd;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 14px;
    color: #555;
}
#footer .fcount {
    font-weight: 500;
}

/* ===== 上传区域 ===== */
#upload-zone {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 30px 20px;
    background: var(--bg-color);
    gap: 24px;
    text-align: center;
}
#upload-zone .icon {
    font-size: 80px;
    opacity: 0.5;
}
#upload-zone .upload-btn {
    display: inline-block;
    padding: 16px 48px;
    background: #1a73e8;
    color: #fff;
    border-radius: 30px;
    font-size: 20px;
    font-weight: 600;
    transition: background 0.2s, transform 0.1s;
    cursor: pointer;
    border: none;
    font-family: inherit;
    box-shadow: 0 2px 10px rgba(26, 115, 232, 0.3);
}
#upload-zone .upload-btn:active {
    background: #1557b0;
    transform: scale(0.97);
}

/* ===== 进度条 ===== */
#progress-wrap {
    width: 100%;
    max-width: 400px;
    display: none;
    flex-direction: column;
    gap: 8px;
}
#progress-wrap.show {
    display: flex;
}
#progress-bar-bg {
    width: 100%;
    height: 8px;
    background: #e0e0e0;
    border-radius: 10px;
    overflow: hidden;
}
#progress-bar {
    height: 100%;
    width: 0%;
    background: #1a73e8;
    border-radius: 10px;
    transition: width 0.3s ease;
}
#progress-text {
    font-size: 14px;
    color: #555;
    display: flex;
    justify-content: space-between;
}
#progress-text .pname {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
#pdetail {
    font-size: 13px;
}

/* ===== 设置面板 ===== */
#settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 200;
    display: none;
    justify-content: flex-end;
    backdrop-filter: blur(2px);
}
#settings-overlay.open {
    display: flex;
}
#settings-panel {
    width: 100%;
    max-width: 400px;
    background: #fff;
    height: 100%;
    overflow-y: auto;
    padding: 22px 24px 30px;
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
    transform: translateX(100%);
    transition: transform 0.28s ease;
}
#settings-overlay.open #settings-panel {
    transform: translateX(0);
}
#settings-panel .s-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 22px;
    font-weight: 600;
    padding-bottom: 16px;
    border-bottom: 1px solid #eee;
    margin-bottom: 20px;
}
#settings-panel .s-header button {
    font-size: 24px;
    color: #888;
    padding: 0 4px;
    background: none;
    border: none;
}
#settings-panel .s-group {
    margin-bottom: 24px;
}
#settings-panel .s-group .s-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 10px;
}
#settings-panel .s-group .s-divider {
    border: none;
    border-top: 1px solid #eee;
    margin-bottom: 14px;
}
.s-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 14px;
}
.s-row label {
    font-size: 14px;
    color: #555;
    font-weight: 500;
}
.s-row input[type="text"] {
    padding: 10px 14px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 16px;
    outline: none;
    transition: border 0.2s;
}
.s-row input[type="text"]:focus {
    border-color: #1a73e8;
}

/* 名称行：label 和 input 同行 */
.s-row-inline {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
}
.s-row-inline label {
    min-width: 70px;
    flex-shrink: 0;
    font-size: 14px;
    color: #555;
    font-weight: 500;
}
.s-row-inline input[type="text"] {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 15px;
    outline: none;
    transition: border 0.2s;
}
.s-row-inline input[type="text"]:focus {
    border-color: #1a73e8;
}

/* 头像并排 */
.s-avatar-group {
    display: flex;
    flex-wrap: wrap;
    gap: 20px 30px;
}
.s-avatar-item {
    flex: 1;
    min-width: 140px;
}
.s-avatar-item label {
    font-size: 14px;
    color: #555;
    font-weight: 500;
    display: block;
    margin-bottom: 6px;
}
.s-avatar-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}
.s-avatar-row .preview {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid #ddd;
    background: transparent;
}
.s-avatar-row .file-input-wrap {
    position: relative;
    display: inline-block;
}
.s-avatar-row .file-input-wrap input[type="file"] {
    position: absolute;
    left: 0;
    top: 0;
    opacity: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
}
.s-avatar-row .file-btn {
    padding: 6px 16px;
    background: #f1f3f4;
    border-radius: 6px;
    font-size: 14px;
    color: #555;
    border: 1px solid #ddd;
    transition: background 0.15s;
    cursor: pointer;
    display: inline-block;
}
.s-avatar-row .file-btn:active {
    background: #d0d0d0;
}

.s-data-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 6px;
}
.s-data-row button {
    padding: 6px 16px;
    border-radius: 6px;
    font-size: 13px;
    background: #f1f3f4;
    transition: background 0.15s;
    border: none;
    font-family: inherit;
}
.s-data-row button:active {
    background: #d0d0d0;
}
.s-data-row .danger {
    color: #e74c3c;
}
.s-data-row .danger:active {
    background: #fde8e8;
}
.s-data-row .primary {
    color: #1a73e8;
}
.s-data-row .primary:active {
    background: #e8f0fe;
}
.s-save-btn {
    width: 100%;
    padding: 14px;
    background: #1a73e8;
    color: #fff;
    border-radius: 10px;
    font-size: 17px;
    font-weight: 600;
    border: none;
    font-family: inherit;
    transition: background 0.2s;
    margin-top: 12px;
}
.s-save-btn:active {
    background: #1557b0;
}

/* ===== 确认弹窗 ===== */
#confirm-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    z-index: 300;
    display: none;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
}
#confirm-overlay.open {
    display: flex;
}
#confirm-box {
    background: #fff;
    border-radius: 16px;
    padding: 32px 28px 24px;
    max-width: 340px;
    width: 90%;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
    text-align: center;
}
#confirm-box .c-icon {
    font-size: 44px;
    margin-bottom: 10px;
}
#confirm-box .c-title {
    font-size: 19px;
    font-weight: 600;
    margin-bottom: 8px;
    color: #1a1a1a;
}
#confirm-box .c-desc {
    font-size: 15px;
    color: #666;
    margin-bottom: 20px;
    line-height: 1.6;
}
#confirm-box .c-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
}
#confirm-box .c-actions button {
    padding: 10px 32px;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 500;
    border: none;
    font-family: inherit;
    transition: background 0.15s;
}
#confirm-box .c-actions .c-cancel {
    background: #f1f3f4;
    color: #333;
}
#confirm-box .c-actions .c-cancel:active {
    background: #d0d0d0;
}
#confirm-box .c-actions .c-confirm {
    background: #e74c3c;
    color: #fff;
}
#confirm-box .c-actions .c-confirm:active {
    background: #c0392b;
}

/* ===== Toast ===== */
.custom-toast {
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%) scale(0.9);
    background: rgba(0, 0, 0, 0.78);
    color: #fff;
    padding: 12px 26px;
    border-radius: 22px;
    font-size: 15px;
    z-index: 400;
    opacity: 0;
    transition: opacity 0.3s ease, transform 0.3s ease;
    pointer-events: none;
    font-family: system-ui, -apple-system, sans-serif;
    text-align: center;
    max-width: 85vw;
    backdrop-filter: blur(4px);
}
.custom-toast.show {
    opacity: 1;
    transform: translateX(-50%) scale(1);
}

/* ===== 高亮 ===== */
.msg-item.highlighted .msg-bubble {
    background-color: #ffeb3b !important;
    transition: background-color 0.5s ease;
}
@keyframes highlight-pulse {
    0%, 100% { background-color: #ffeb3b; }
    50% { background-color: #fff9cc; }
}
.msg-item.highlighted .msg-bubble {
    animation: highlight-pulse 0.8s ease 2;
}

/* ===== 响应式 ===== */
@media (max-width: 600px) {
    #header {
        padding: 8px 10px 6px 10px;
    }
    #top-row {
        padding: 0 0 10px 0;
        min-height: 34px;
    }
    #title {
        font-size: 18px;
        margin: 0 8px;
    }
    #top-row .icon-btn {
        width: 30px;
        height: 30px;
    }
    #top-row .icon-btn svg {
        width: 20px;
        height: 20px;
    }
    #search-input {
        font-size: 14px;
        padding: 5px 28px 5px 12px;
        height: 30px;
    }
    #messages-container {
        padding: 8px 6px 6px 6px;
    }
    .msg-row {
        max-width: 94%;
    }
    .msg-bubble {
        font-size: 15px;
        padding: 8px 12px;
    }
    .msg-header {
        font-size: 12px;
    }
    .msg-header .mname {
        font-size: 14px;
    }
    .msg-header .mtime {
        font-size: 11px;
    }
    .msg-avatar {
        width: 34px;
        height: 34px;
    }
    .msg-action-btn {
        width: 28px;
        height: 28px;
    }
    .msg-action-btn svg {
        width: 17px;
        height: 17px;
    }
    #footer {
        font-size: 13px;
        padding: 6px 12px;
    }
    #settings-panel {
        padding: 18px 18px 24px;
        max-width: 100%;
    }
    #upload-zone .icon {
        font-size: 60px;
    }
    #upload-zone .upload-btn {
        font-size: 18px;
        padding: 14px 36px;
    }
    #calendar-panel {
        padding: 16px 18px 20px;
        width: 95%;
    }
    #month-picker {
        padding: 16px 18px 20px;
        width: 88%;
    }
    .s-avatar-group {
        gap: 16px;
    }
    .s-avatar-item {
        min-width: 100px;
    }
    .s-avatar-row .preview {
        width: 40px;
        height: 40px;
    }
    .s-row-inline label {
        min-width: 60px;
        font-size: 13px;
    }
    .s-row-inline input[type="text"] {
        font-size: 14px;
        padding: 6px 10px;
    }
    .s-save-btn {
        font-size: 17px;
        padding: 12px;
    }
    #confirm-box {
        padding: 24px 20px 20px;
    }
    #confirm-box .c-icon {
        font-size: 36px;
    }
    .sd-item .sd-top {
        font-size: 14px;
    }
    .sd-item .sd-name {
        font-size: 14px;
    }
    .sd-item .sd-preview {
        font-size: 14px;
    }
    .sd-item {
        padding: 10px 14px;
    }
}
@media (max-width: 400px) {
    #title {
        font-size: 16px;
        margin: 0 6px;
    }
    #top-row .icon-btn {
        width: 28px;
        height: 28px;
    }
    #top-row .icon-btn svg {
        width: 18px;
        height: 18px;
    }
    #search-input {
        font-size: 13px;
        padding: 4px 24px 4px 10px;
        height: 28px;
    }
    .msg-bubble {
        font-size: 14px;
        padding: 6px 10px;
    }
    .msg-header .mname {
        font-size: 13px;
    }
    .msg-header .mtime {
        font-size: 10px;
    }
    .msg-avatar {
        width: 30px;
        height: 30px;
    }
    .msg-action-btn {
        width: 24px;
        height: 24px;
    }
    .msg-action-btn svg {
        width: 15px;
        height: 15px;
    }
    #upload-zone .upload-btn {
        font-size: 16px;
        padding: 12px 28px;
    }
    .sd-item .sd-top {
        font-size: 13px;
    }
    .sd-item .sd-name {
        font-size: 13px;
    }
    .sd-item .sd-preview {
        font-size: 13px;
    }
    .sd-item {
        padding: 8px 12px;
    }
    .s-row-inline label {
        min-width: 50px;
        font-size: 12px;
    }
    .s-row-inline input[type="text"] {
        font-size: 13px;
        padding: 5px 8px;
    }
    .s-avatar-item {
        min-width: 80px;
    }
    .s-avatar-row .preview {
        width: 36px;
        height: 36px;
    }
}
```


## 3. app.js

```javascript
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

    // 虚拟滚动状态
    let scrollViewport = null;
    const BUFFER_SIZE = 5;
    let visibleStart = 0;
    let visibleEnd = 0;
    let scrollFrameId = null;
    let itemHeights = [];
    let itemOffsets = [];
    let totalHeight = 0;

    // 搜索状态
    let searchMatchCache = [];
    let searchDisplayCount = 50;
    const SEARCH_BATCH_SIZE = 50;

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

    // ===== 虚拟滚动 =====

    function estimateItemHeight(msg) {
        const text = msg._text || '';
        const charCount = text.length;
        // 固定部分：头像 + 名称行 + 内边距
        let baseHeight = 44;
        // 气泡高度：每行20px，每行最多18个字符
        const lineWidth = 18;
        const lines = Math.max(1, Math.ceil(charCount / lineWidth));
        const bubbleHeight = lines * 20 + 12;
        baseHeight += bubbleHeight;
        // 按钮区域 + 底部间距（固定8px）
        baseHeight += 28;
        // 安全余量
        return Math.max(100, baseHeight + 4);
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
            title.textContent = '与 ' + settings.botName + ' 的回忆录';
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

        settingsBtn.innerHTML = getSettingsIcon();

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
```
