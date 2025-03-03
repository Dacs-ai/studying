// 初始化页面
function initializePage() {
    const courseList = document.getElementById('courseList');
    courseList.innerHTML = ''; // 清空现有内容
    
    // 生成课程列表
    for (let courseName in courseData) {
        createCourseElement(courseName);
    }
}

// 创建课程元素
function createCourseElement(courseName) {
    const courseList = document.getElementById('courseList');
    const courseDiv = document.createElement('div');
    courseDiv.className = 'course-item';
    courseDiv.setAttribute('role', 'treeitem');
    courseDiv.setAttribute('aria-expanded', 'false');
    courseDiv.innerHTML = `
        <h3>
            <span class="course-title" 
                  onclick="toggleCourse(this.parentElement)"
                  role="button"
                  tabindex="0"
                  aria-label="课程：${courseName}">
                ${courseName}
            </span>
            <button class="edit-title-btn" 
                    onclick="editTitle(this, '${courseName}')"
                    aria-label="编辑课程名称">
                编辑
            </button>
        </h3>
        <div class="course-sections" 
             role="group" 
             aria-label="${courseName}的内容分类">
            <div onclick="showContent('${courseName}', '逐字稿')"
                 role="button"
                 tabindex="0"
                 aria-label="查看${courseName}的逐字稿">
                逐字稿
            </div>
            <div onclick="showContent('${courseName}', '思维导图')"
                 role="button"
                 tabindex="0"
                 aria-label="查看${courseName}的思维导图">
                思维导图
            </div>
            <div onclick="showContent('${courseName}', '优秀想法')"
                 role="button"
                 tabindex="0"
                 aria-label="查看${courseName}的优秀想法">
                优秀想法
            </div>
        </div>
    `;
    courseList.appendChild(courseDiv);
}

// 切换课程的展开/收起状态
function toggleCourse(element) {
    // 确保我们获取到 h3 元素
    const h3 = element.tagName === 'H3' ? element : element.closest('h3');
    const sections = h3.nextElementSibling;
    sections.classList.toggle('active');
}

// 显示内容
function showContent(courseName, section) {
    const contentArea = document.getElementById('contentArea');
    const content = courseData[courseName][section];
    
    if (section === '思维导图') {
        // 显示图片上传和预览界面
        contentArea.innerHTML = `
            <h2>${courseName} - ${section}</h2>
            <div class="image-upload-container">
                <input type="file" 
                       id="imageUpload" 
                       accept="image/*" 
                       style="display: none"
                       onchange="handleImageUpload(event, '${courseName}')">
                <label for="imageUpload" class="upload-button">
                    <i class="fas fa-upload"></i>
                    上传思维导图
                </label>
                ${content ? `
                    <div style="margin-top: 20px;">
                        <img src="${content}" class="image-preview" alt="思维导图">
                    </div>
                ` : '<p class="no-image-text">暂无思维导图，请上传</p>'}
            </div>
        `;
    } else {
        // 其他内容的显示保持不变
        let displayContent = content;
        if (section === '优秀想法') {
            displayContent = Array.isArray(content) && content.length > 0 
                ? content.join('<br>')
                : '暂无内容';
        } else {
            displayContent = content || '暂无内容';
        }
        
        contentArea.innerHTML = `
            <h2>${courseName} - ${section}</h2>
            <div class="content-body">
                ${displayContent}
            </div>
            <div class="edit-section">
                <button onclick="editContent('${courseName}', '${section}')">编辑内容</button>
            </div>
        `;
    }
}

// 编辑内容
function editContent(courseName, section) {
    const content = courseData[courseName][section];
    const contentArea = document.getElementById('contentArea');
    
    let editHTML = '';
    if (section === '优秀想法') {
        editHTML = `
            <textarea id="editArea" rows="10" style="width: 100%; margin-bottom: 10px;">${Array.isArray(content) ? content.join('\n') : ''}</textarea>
            <p class="hint">每行一个想法</p>
        `;
    } else {
        editHTML = `
            <textarea id="editArea" rows="10" style="width: 100%; margin-bottom: 10px;">${content || ''}</textarea>
        `;
    }
    
    contentArea.innerHTML = `
        <h2>${courseName} - ${section}</h2>
        ${editHTML}
        <button onclick="saveContent('${courseName}', '${section}')">保存</button>
    `;
}

// 保存内容
function saveContent(courseName, section) {
    const editArea = document.getElementById('editArea');
    let content = editArea.value;
    
    if (section === '优秀想法') {
        content = content.split('\n').filter(item => item.trim() !== '');
    }
    
    courseData[courseName][section] = content;
    localStorage.setItem('courseData', JSON.stringify(courseData));
    
    showContent(courseName, section);
}

// 从 utils.js 导入 askQuestion 函数
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
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API错误:', errorData);
            throw new Error(errorData.error?.message || '请求失败');
        }
        
        clearTimeout(timeoutId);
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

// 添加编辑标题功能
function editTitle(button, oldName) {
    const titleSpan = button.previousElementSibling;
    const currentTitle = titleSpan.textContent;
    
    // 创建输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'course-title-input';
    input.value = currentTitle;
    
    // 替换标题为输入框
    titleSpan.replaceWith(input);
    input.focus();
    button.textContent = '保存';
    button.onclick = () => saveTitle(input, button, oldName);

    // 添加按键监听
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveTitle(input, button, oldName);
        }
    });

    // 添加失焦保存
    input.addEventListener('blur', () => {
        setTimeout(() => saveTitle(input, button, oldName), 200);
    });
}

// 保存标题
function saveTitle(input, button, oldName) {
    const newName = input.value.trim();
    
    if (newName && newName !== oldName) {
        // 创建新的数据条目
        courseData[newName] = courseData[oldName];
        // 删除旧的数据条目
        delete courseData[oldName];
        
        // 保存到本地存储
        localStorage.setItem('courseData', JSON.stringify(courseData));
        
        // 重新初始化页面
        initializePage();
    } else {
        // 如果名称未改变，仅恢复显示
        const span = document.createElement('span');
        span.className = 'course-title';
        span.textContent = oldName;
        span.onclick = () => toggleCourse(span.parentElement);
        input.replaceWith(span);
        button.textContent = '编辑';
        button.onclick = () => editTitle(button, oldName);
    }
}

// 修改图片上传处理函数
async function handleImageUpload(event, courseName) {
    try {
        const file = event.target.files[0];
        if (!file) return;

        // 检查文件大小
        if (file.size > 10 * 1024 * 1024) { // 10MB限制
            showToast('图片大小不能超过10MB', 'error');
            return;
        }

        // 显示加载状态
        const uploadButton = event.target.nextElementSibling;
        uploadButton.classList.add('loading');

        // 压缩图片
        const compressedBlob = await compressImage(file);
        
        // 保存到IndexedDB
        await courseDB.saveImage(courseName, compressedBlob);
        
        // 更新课程数据
        courseData[courseName]['思维导图'] = URL.createObjectURL(compressedBlob);
        
        // 保存课程数据
        await courseDB.saveCourse({
            id: courseName,
            ...courseData[courseName]
        });

        // 重新显示内容
        showContent(courseName, '思维导图');
        showToast('图片上传成功', 'success');
    } catch (error) {
        handleError(error, '图片上传失败');
    } finally {
        const uploadButton = event.target.nextElementSibling;
        uploadButton.classList.remove('loading');
    }
}

// 添加图片预览功能
function toggleImageZoom(img) {
    const overlay = document.querySelector('.overlay') || 
                   document.createElement('div');
    overlay.className = 'overlay';
    
    if (!document.body.contains(overlay)) {
        document.body.appendChild(overlay);
    }

    img.classList.toggle('zoomed');
    overlay.classList.toggle('active');
    
    overlay.onclick = () => {
        img.classList.remove('zoomed');
        overlay.classList.remove('active');
    };
}

// 页面加载时初始化
window.onload = initializePage; 

// 修改欢迎页面的样式，让它在页面中间显示
const contentArea = document.getElementById('contentArea');
contentArea.innerHTML = `
    <div class="welcome-screen">
        <h1>欢迎使用财富课学习笔记</h1>
        <p>请从左侧选择课程开始学习</p>
        <p>快捷键提示：</p>
        <ul>
            <li>Alt + / : 快速搜索</li>
            <li>Alt + 1-9 : 快速访问课程</li>
            <li>Esc : 关闭图片预览</li>
        </ul>
    </div>
`; 