// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 错误处理函数
function handleError(error, message = '操作失败，请稍后重试') {
    console.error(error);
    showToast(message, 'error');
}

// 提示框函数
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    document.body.appendChild(toast);

    // 动画显示
    setTimeout(() => toast.classList.add('show'), 10);

    // 3秒后消失
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);

    // 通知屏幕阅读器
    announceToScreenReader(message);
}

// 内容验证函数
function sanitizeContent(content) {
    // 基础的XSS防护
    return String(content)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// 图片压缩函数
async function compressImage(file, maxWidth = 1920) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (maxWidth * height) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.8);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// 导出笔记
function exportNotes() {
    try {
        const data = {
            timestamp: new Date().toISOString(),
            courses: courseData
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `财富课笔记_${new Date().toLocaleDateString()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        showToast('笔记导出成功', 'success');
    } catch (error) {
        handleError(error, '笔记导出失败');
    }
}

// 导入笔记
async function importNotes(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // 验证数据格式
                if (!data.courses) {
                    throw new Error('无效的笔记文件格式');
                }
                
                // 更新课程数据
                courseData = data.courses;
                localStorage.setItem('courseData', JSON.stringify(courseData));
                
                // 重新初始化页面
                initializePage();
                showToast('笔记导入成功', 'success');
            } catch (error) {
                handleError(error, '笔记导入失败');
            }
        };
        reader.readAsText(file);
    } catch (error) {
        handleError(error, '笔记导入失败');
    }
}

// 搜索笔记
function searchNotes() {
    const keyword = document.getElementById('searchInput').value.trim();
    if (!keyword) {
        showToast('请输入搜索关键词', 'error');
        return;
    }
    
    const results = [];
    for (let courseName in courseData) {
        const course = courseData[courseName];
        
        // 搜索逐字稿
        if (course.逐字稿.includes(keyword)) {
            results.push({
                course: courseName,
                section: '逐字稿',
                preview: getPreview(course.逐字稿, keyword)
            });
        }
        
        // 搜索优秀想法
        if (Array.isArray(course.优秀想法)) {
            const matchedIdeas = course.优秀想法.filter(idea => 
                idea.includes(keyword)
            );
            if (matchedIdeas.length > 0) {
                results.push({
                    course: courseName,
                    section: '优秀想法',
                    preview: matchedIdeas.join('; ')
                });
            }
        }
    }
    
    displaySearchResults(results, keyword);
}

// 获取预览文本
function getPreview(text, keyword, length = 100) {
    const index = text.indexOf(keyword);
    const start = Math.max(0, index - length / 2);
    const end = Math.min(text.length, index + keyword.length + length / 2);
    let preview = text.substring(start, end);
    
    if (start > 0) preview = '...' + preview;
    if (end < text.length) preview = preview + '...';
    
    return preview.replace(new RegExp(keyword, 'g'), `<span class="highlight">${keyword}</span>`);
}

// 显示搜索结果
function displaySearchResults(results, keyword) {
    const contentArea = document.getElementById('contentArea');
    
    if (results.length === 0) {
        contentArea.innerHTML = `
            <h2>搜索结果</h2>
            <p>未找到包含 "${keyword}" 的内容</p>
        `;
        return;
    }
    
    contentArea.innerHTML = `
        <h2>搜索结果 (${results.length})</h2>
        <div class="search-results">
            ${results.map(result => `
                <div class="search-result-item" onclick="showContent('${result.course}', '${result.section}')">
                    <div class="search-result-title">${result.course} - ${result.section}</div>
                    <div class="search-result-preview">${result.preview}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// 主题切换
function initTheme() {
    // 检查系统主题偏好
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    
    // 如果没有保存的主题设置，则使用系统偏好
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon();

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            updateThemeIcon();
        }
    });

    // 添加滚动监听
    const debouncedScroll = debounce(() => {
        const button = document.getElementById('themeToggle');
        if (window.scrollY > 100) {
            button.classList.add('fixed');
        } else {
            button.classList.remove('fixed');
        }
    }, 100);

    // 优化滚动监听
    window.addEventListener('scroll', debouncedScroll, { passive: true });
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const button = document.getElementById('themeToggle');
    button.setAttribute('aria-pressed', newTheme === 'dark');
    
    // 通知屏幕阅读器
    announceToScreenReader(
        `已切换到${newTheme === 'dark' ? '深色' : '浅色'}模式`
    );
    
    updateThemeIcon();
}

function updateThemeIcon() {
    const button = document.getElementById('themeToggle');
    const icon = button.querySelector('i');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

// 键盘导航
function initKeyboardNav() {
    document.addEventListener('keydown', (e) => {
        // Alt + / 聚焦搜索框
        if (e.altKey && e.key === '/') {
            e.preventDefault();
            document.getElementById('searchInput').focus();
        }
        
        // Alt + 数字键快速访问课程
        if (e.altKey && /^[1-9]$/.test(e.key)) {
            e.preventDefault();
            const index = parseInt(e.key) - 1;
            const courseItems = document.querySelectorAll('.course-item');
            if (courseItems[index]) {
                courseItems[index].querySelector('.course-title').click();
            }
        }
        
        // Esc 关闭放大的图片
        if (e.key === 'Escape') {
            const zoomedImg = document.querySelector('.image-preview.zoomed');
            if (zoomedImg) {
                toggleImageZoom(zoomedImg);
            }
        }
    });
}

// 添加无障碍支持
function initAccessibility() {
    // 添加ARIA标签
    document.querySelectorAll('.course-item').forEach((item, index) => {
        item.setAttribute('role', 'listitem');
        item.setAttribute('aria-expanded', 'false');
        
        const title = item.querySelector('.course-title');
        title.setAttribute('role', 'button');
        title.setAttribute('tabindex', '0');
        title.setAttribute('data-tooltip', `按 Alt + ${index + 1} 快速访问`);
    });
    
    // 添加键盘事件监听
    document.querySelectorAll('[role="button"]').forEach(button => {
        button.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                button.click();
            }
        });
    });
}

// 添加图片懒加载
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// 添加笔记自动保存
const autoSave = debounce((courseName, section, content) => {
    try {
        courseData[courseName][section] = content;
        localStorage.setItem('courseData', JSON.stringify(courseData));
        showToast('自动保存成功', 'success');
    } catch (error) {
        handleError(error, '自动保存失败');
    }
}, 2000);

// 添加历史记录功能
function addToHistory(courseName, section) {
    const history = JSON.parse(localStorage.getItem('viewHistory') || '[]');
    const newEntry = { courseName, section, timestamp: Date.now() };
    
    history.unshift(newEntry);
    if (history.length > 10) history.pop(); // 保留最近10条记录
    
    localStorage.setItem('viewHistory', JSON.stringify(history));
}

// 添加数据备份功能
function backupData() {
    try {
        const data = {
            timestamp: new Date().toISOString(),
            courses: courseData,
            settings: {
                theme: localStorage.getItem('theme'),
                history: JSON.parse(localStorage.getItem('viewHistory') || '[]')
            }
        };
        
        // 可以选择上传到云存储或下载到本地
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `财富课笔记备份_${new Date().toLocaleDateString()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        showToast('备份成功', 'success');
    } catch (error) {
        handleError(error, '备份失败');
    }
}

// 添加语言支持
const i18n = {
    zh: {
        welcome: '欢迎使用财富课学习笔记',
        search: '搜索笔记内容...',
        // ... 其他翻译
    },
    en: {
        welcome: 'Welcome to Wealth Course Notes',
        search: 'Search notes...',
        // ... 其他翻译
    }
};

function setLanguage(lang) {
    document.documentElement.setAttribute('lang', lang);
    // 更新界面文本
    updateUIText(lang);
}

// 添加虚拟滚动支持
class VirtualScroller {
    constructor(container, items, itemHeight = 50) {
        this.container = container;
        this.items = items;
        this.itemHeight = itemHeight;
        this.totalHeight = items.length * itemHeight;
        this.visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2;
        this.scrollTop = 0;
        this.startIndex = 0;
        
        this.init();
    }
    
    init() {
        // 创建滚动容器
        this.scroller = document.createElement('div');
        this.scroller.style.height = `${this.totalHeight}px`;
        this.scroller.style.position = 'relative';
        this.container.appendChild(this.scroller);
        
        // 监听滚动事件
        this.container.addEventListener('scroll', this.onScroll.bind(this));
        
        // 初始渲染
        this.render();
    }
    
    onScroll() {
        this.scrollTop = this.container.scrollTop;
        this.render();
    }
    
    render() {
        this.startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.min(
            this.startIndex + this.visibleItems,
            this.items.length
        );
        
        // 清空当前内容
        this.scroller.innerHTML = '';
        
        // 渲染可见项
        for (let i = this.startIndex; i < endIndex; i++) {
            const item = this.items[i];
            const div = document.createElement('div');
            div.style.position = 'absolute';
            div.style.top = `${i * this.itemHeight}px`;
            div.style.height = `${this.itemHeight}px`;
            div.innerHTML = item;
            this.scroller.appendChild(div);
        }
    }
}

// 添加手势支持
function initGestureSupport() {
    let touchStartX = 0;
    let touchStartY = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        if (!touchStartX || !touchStartY) return;
        
        const touchEndX = e.touches[0].clientX;
        const touchEndY = e.touches[0].clientY;
        
        const deltaX = touchStartX - touchEndX;
        const deltaY = touchStartY - touchEndY;
        
        // 水平滑动大于垂直滑动，且滑动距离大于50px
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            if (deltaX > 0) {
                // 向左滑动，显示AI助手
                document.querySelector('.ai-sidebar').classList.add('show');
            } else {
                // 向右滑动，显示课程列表
                document.querySelector('.sidebar').classList.add('show');
            }
        }
        
        touchStartX = null;
        touchStartY = null;
    }, { passive: true });
}

// 添加数据加密支持
class DataEncryption {
    constructor(secretKey) {
        this.secretKey = secretKey;
    }
    
    async encrypt(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));
        
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(this.secretKey),
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        );
        
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encryptedData = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            dataBuffer
        );
        
        return {
            data: Array.from(new Uint8Array(encryptedData)),
            iv: Array.from(iv)
        };
    }
    
    async decrypt(encryptedData, iv) {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(this.secretKey),
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );
        
        const decryptedData = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(iv) },
            key,
            new Uint8Array(encryptedData)
        );
        
        return JSON.parse(new TextDecoder().decode(decryptedData));
    }
}

// 添加屏幕阅读器通知函数
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.className = 'sr-only';
    announcement.setAttribute('role', 'alert');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    // 2秒后移除通知
    setTimeout(() => {
        announcement.remove();
    }, 2000);
}

// 更新提示框函数
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    document.body.appendChild(toast);
    
    // 动画显示
    setTimeout(() => toast.classList.add('show'), 10);
    
    // 3秒后消失
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
    
    // 通知屏幕阅读器
    announceToScreenReader(message);
}

// 更新切换课程函数
function toggleCourse(element) {
    const sections = element.nextElementSibling;
    const expanded = sections.classList.toggle('active');
    element.setAttribute('aria-expanded', expanded);
    
    // 通知屏幕阅读器
    announceToScreenReader(
        expanded ? '展开课程内容' : '收起课程内容'
    );
}

// 更新主题切换函数
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const button = document.getElementById('themeToggle');
    button.setAttribute('aria-pressed', newTheme === 'dark');
    
    // 通知屏幕阅读器
    announceToScreenReader(
        `已切换到${newTheme === 'dark' ? '深色' : '浅色'}模式`
    );
    
    updateThemeIcon();
}

// 页面初始化时调用
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initKeyboardNav();
    initAccessibility();
    
    // 绑定主题切换事件
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
});

// 设置管理
class Settings {
    constructor() {
        this.init();
        this.bindEvents();
    }
    
    init() {
        // 从localStorage加载设置
        const settings = localStorage.getItem('settings');
        if (settings) {
            const { apiKey } = JSON.parse(settings);
            if (apiKey) {
                document.getElementById('apiKey').value = apiKey;
                this.enableAIFeatures();
            }
        }
    }
    
    bindEvents() {
        // 打开设置面板
        document.getElementById('settingsBtn').addEventListener('click', () => {
            const panel = document.getElementById('settingsPanel');
            panel.hidden = false;
            setTimeout(() => panel.classList.add('show'), 10);
            announceToScreenReader('打开设置面板');
        });
        
        // 关闭设置面板
        document.querySelector('.close-btn').addEventListener('click', () => {
            const panel = document.getElementById('settingsPanel');
            panel.classList.remove('show');
            setTimeout(() => panel.hidden = true, 300);
            announceToScreenReader('关闭设置面板');
        });
        
        // 显示/隐藏API密钥
        document.querySelector('.show-key').addEventListener('click', (e) => {
            const input = document.getElementById('apiKey');
            const icon = e.currentTarget.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
        
        // 保存设置
        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });
    }
    
    async saveSettings() {
        try {
            const apiKey = document.getElementById('apiKey').value.trim();
            
            if (!apiKey) {
                showToast('请输入API密钥', 'error');
                return;
            }
            
            // 验证API密钥
            const isValid = await this.validateApiKey(apiKey);
            if (!isValid) {
                showToast('无效的API密钥', 'error');
                return;
            }
            
            // 保存设置
            localStorage.setItem('settings', JSON.stringify({ apiKey }));
            
            // 启用AI功能
            this.enableAIFeatures();
            
            // 关闭设置面板
            document.getElementById('settingsPanel').classList.remove('show');
            showToast('设置保存成功', 'success');
            announceToScreenReader('设置已保存，AI助手已启用');
        } catch (error) {
            handleError(error, '保存设置失败');
        }
    }
    
    async validateApiKey(apiKey) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [{ 
                        role: "user", 
                        content: "Hello" 
                    }],
                    temperature: 0.7,
                    max_tokens: 100
                }),
                signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('API验证错误:', errorData);
                return false;
            }
            
            return response.ok;
        } catch (error) {
            console.error('API验证失败:', error);
            if (error.name === 'AbortError') {
                showToast('API 请求超时，请检查网络连接或代理设置', 'error');
                console.log('建议：\n1. 检查网络连接\n2. 确认API密钥正确\n3. 检查是否需要代理');
            } else {
                showToast(`API 连接失败: ${error.message}`, 'error');
            }
            return false;
        }
    }
    
    enableAIFeatures() {
        // 启用AI相关功能
        document.querySelector('.input-area').classList.remove('disabled');
        document.getElementById('userQuestion').disabled = false;
    }
}

// 初始化设置
document.addEventListener('DOMContentLoaded', () => {
    new Settings();
});

async function askQuestion() {
    const settings = localStorage.getItem('settings');
    if (!settings || !JSON.parse(settings).apiKey) {
        showToast('请先设置API密钥', 'error');
        document.getElementById('settingsBtn').click();
        return;
    }
    
    const question = document.getElementById('userQuestion').value.trim();
    if (!question) {
        showToast('请输入问题', 'error');
        return;
    }
    
    const chatHistory = document.getElementById('chatHistory');
    chatHistory.innerHTML += `
        <div class="user-message">${sanitizeContent(question)}</div>
        <div class="ai-message loading">正在思考...</div>
    `;
    
    try {
        const { apiKey } = JSON.parse(settings);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [{ role: "user", content: question }],
                temperature: 0.7,
                max_tokens: 2000
            }),
            signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API错误:', errorData);
            throw new Error(errorData.error?.message || '请求失败');
        }
        
        const data = await response.json();
        const aiMessage = chatHistory.querySelector('.ai-message.loading');
        aiMessage.classList.remove('loading');
        aiMessage.innerHTML = sanitizeContent(data.choices[0].message.content);
        
        document.getElementById('userQuestion').value = '';
    } catch (error) {
        console.error('完整错误信息:', error);
        let errorMessage = 'AI回答失败';
        if (error.name === 'AbortError') {
            errorMessage = '请求超时，请检查网络连接或代理设置';
            console.log('建议：\n1. 检查网络连接\n2. 确认API密钥正确\n3. 尝试刷新页面\n4. 检查是否需要代理');
        } else if (error.message.includes('API key')) {
            errorMessage = 'API密钥无效或已过期';
        } else if (error.message.includes('insufficient_quota')) {
            errorMessage = 'API配额不足';
        } else if (error.message.includes('rate_limit_exceeded')) {
            errorMessage = '请求过于频繁，请稍后再试';
        } else {
            errorMessage = `请求失败: ${error.message}`;
        }
        handleError(error, errorMessage);
        chatHistory.querySelector('.ai-message.loading')?.remove();
    }
} 