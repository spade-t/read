/* ========== 微信风格搜索结果（移动端专属） ========== */
.search-dropdown {
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
    list-style: none;
}

.sd-header {
    padding: 8px 16px;
    font-size: 13px;
    color: #999999;
    background: #f7f7f7;
    border-bottom: 1px solid #eeeeee;
    box-sizing: border-box;
}

.sd-item {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    box-sizing: border-box;
}
.sd-item:active {
    background: #f5f5f5;
}

.sd-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    font-size: 15px;
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

/* 核心：强制单行显示 + 末尾自动省略，和微信完全一致 */
.sd-preview {
    display: block;
    font-size: 14px;
    color: #666666;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
}

/* 关键词高亮 - 微信同款绿色 */
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
}

.sd-empty {
    padding: 40px 20px;
    text-align: center;
    color: #999999;
    font-size: 14px;
}
