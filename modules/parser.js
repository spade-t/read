// ===== JSON 解析和文本提取 =====

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