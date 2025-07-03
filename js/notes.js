// js/notes.js

const config = {
    // 你的Client ID
    clientId: 'Ov23liM8SUwOMiIlF1T0',
    
    // 你的仓库信息
    repoOwner: 'xyustc',
    repoName: 'xyustc.github.io',
    notePath: 'notes/diary.md',

    // 第四步中你部署在Vercel上的函数URL
    authProxyUrl: 'https://xyustc-github-io.vercel.app/api/github-callback'
};

// 全局变量来存储笔记文件的最新SHA值，用于更新
let currentFileSha = null;
let currentFilePath = null;

// DOM元素引用
const dom = {
    loginView: document.getElementById('login-view'),
    workspaceView: document.getElementById('workspace-view'),
    fileNavigator: document.getElementById('file-navigator'),
    fileTree: document.getElementById('file-tree'),
    editorContainer: document.getElementById('editor-container'),
    welcomeView: document.getElementById('welcome-view'),
    editorView: document.getElementById('editor-view'),
    loginBtn: document.getElementById('login-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    saveBtn: document.getElementById('save-btn'),
    newNoteBtn: document.getElementById('new-note-btn'),
    newFolderBtn: document.getElementById('new-folder-btn'),
    userInfo: document.getElementById('user-info'),
    userAvatar: document.getElementById('user-avatar'),
    userName: document.getElementById('user-name'),
    filePath: document.getElementById('file-path'),
    saveStatus: document.getElementById('save-status'),
    markdownEditor: document.getElementById('markdown-editor'),
    htmlPreview: document.getElementById('html-preview'),
    // View mode elements
    editorPanels: document.querySelector('.editor-panels'),
    viewModeEditBtn: document.getElementById('view-mode-edit'),
    viewModeSplitBtn: document.getElementById('view-mode-split'),
    viewModePreviewBtn: document.getElementById('view-mode-preview'),
};

/**
 * 主要的初始化函数
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM内容已加载，开始执行主逻辑。');
    setupEventListeners();
    initializeParticles();

    const accessToken = localStorage.getItem('github_access_token');
    const code = new URLSearchParams(window.location.search).get('code');
    
    console.log('检测到localStorage中的token:', accessToken);
    console.log('检测到URL中的code:', code);

    if (accessToken) {
        console.log('逻辑分支: 检测到accessToken，处理已认证的用户。');
        await handleAuthenticatedUser(accessToken);
    } else if (code) {
        console.log('逻辑分支: 检测到code，处理GitHub回调。');
        await handleGitHubCallback(code);
    } else {
        console.log('逻辑分支: 无token或code，显示登录视图。');
        showLoginView();
    }
});

/**
 * 设置所有的事件监听器
 */
function setupEventListeners() {
    dom.loginBtn.addEventListener('click', redirectToGitHubAuth);
    dom.logoutBtn.addEventListener('click', logout);
    dom.saveBtn.addEventListener('click', saveNote);
    dom.newNoteBtn.addEventListener('click', createNewNote);
    dom.newFolderBtn.addEventListener('click', createNewFolder);
    dom.markdownEditor.addEventListener('input', () => {
        const markdownText = dom.markdownEditor.value;
        dom.htmlPreview.innerHTML = marked.parse(markdownText);
        showSaveStatus('未保存的更改...');
    });
    setupViewModeControls();
}

/**
 * 设置视图模式控制按钮的事件监听器
 */
function setupViewModeControls() {
    // Set initial state from HTML 'active' class
    dom.editorPanels.classList.add('view-mode-split');

    const buttons = [
        { el: dom.viewModeEditBtn, mode: 'edit' },
        { el: dom.viewModeSplitBtn, mode: 'split' },
        { el: dom.viewModePreviewBtn, mode: 'preview' }
    ];

    buttons.forEach(buttonInfo => {
        if (!buttonInfo.el) return; // Guard against null elements
        buttonInfo.el.addEventListener('click', () => {
            // Remove active class from all buttons
            buttons.forEach(btn => btn.el.classList.remove('active'));
            // Add active class to the clicked button
            buttonInfo.el.classList.add('active');

            // Remove all view mode classes from the panel
            dom.editorPanels.classList.remove('view-mode-edit', 'view-mode-split', 'view-mode-preview');
            // Add the selected view mode class
            dom.editorPanels.classList.add(`view-mode-${buttonInfo.mode}`);
        });
    });
}

/**
 * 处理已认证的用户
 * @param {string} token - GitHub Access Token
 */
async function handleAuthenticatedUser(token) {
    const userData = await getGitHubUser(token);
    if (userData) {
        showWorkspaceView(userData);
        await loadAndRenderFileTree(token);
    } else {
        // Token无效或已过期
        logout();
    }
}

/**
 * 处理从GitHub回调过来的请求
 * @param {string} code - 从GitHub获取的临时授权码
 */
async function handleGitHubCallback(code) {
    console.log('步骤 6.1: 开始处理GitHub回调，获取到的code是:', code);
    try {
        showSaveStatus('正在验证身份...');
        console.log('步骤 6.2: 准备调用Vercel函数，URL是:', config.authProxyUrl);
        const accessToken = await getAccessToken(code);
        
        console.log('步骤 6.5: 成功从Vercel函数获取到AccessToken!');
        localStorage.setItem('github_access_token', accessToken);
        // 清理URL中的code，让地址栏更干净
        window.history.replaceState({}, document.title, window.location.pathname);
        await handleAuthenticatedUser(accessToken);
    } catch (error) {
        console.error('!!! 关键错误: 在 handleGitHubCallback 中捕获到错误:', error);
        showSaveStatus(`验证失败: ${error.message}`);
    }
}

/**
 * 重定向到GitHub授权页面
 */
function redirectToGitHubAuth() {
    const scope = 'repo';
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${config.clientId}&scope=${scope}&redirect_uri=${redirectUri}`;
    window.location.href = authUrl;
}

/**
 * 使用授权码code，通过Vercel函数获取Access Token
 * @param {string} code 
 * @returns {Promise<string>} Access Token
 */
async function getAccessToken(code) {
    console.log('步骤 6.3: 进入 getAccessToken 函数，准备向Vercel函数发送fetch请求。');
    const response = await fetch(config.authProxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
    });
    console.log('步骤 6.4: Fetch请求已发送，收到的响应状态是:', response.status, response.statusText);
    
    const responseBodyText = await response.text();
    console.log('从Vercel函数收到的原始响应体(Raw Response Body):', responseBodyText);

    if (!response.ok) {
        let errorData;
        try {
            errorData = JSON.parse(responseBodyText);
        } catch (e) {
            errorData = { error: '无法将错误响应解析为JSON', details: responseBodyText };
        }
        console.error('!!! 关键错误: 响应状态不是OK，即将抛出错误。解析后的错误数据:', errorData);
        throw new Error(errorData.error || `HTTP请求错误! 状态码: ${response.status}`);
    }
    
    const data = JSON.parse(responseBodyText);
    if (!data.accessToken) {
        console.error('!!! 关键错误: 响应成功，但返回的数据中没有accessToken。收到的数据:', data);
        throw new Error('收到的数据格式不正确，缺少accessToken。');
    }
    return data.accessToken;
}

/**
 * 获取GitHub用户信息
 * @param {string} token 
 * @returns {Promise<object|null>} 用户数据
 */
async function getGitHubUser(token) {
    const response = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `token ${token}` }
    });
    if (response.ok) {
        return await response.json();
    }
    return null;
}

/**
 * 加载并渲染文件树
 * @param {string} token 
 */
async function loadAndRenderFileTree(token) {
    try {
        // 1. 获取根目录内容，找到 'notes' 文件夹的 SHA
        const rootContentsUrl = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/contents/`;
        const rootResponse = await fetch(rootContentsUrl, { headers: { 'Authorization': `token ${token}` } });
        if (!rootResponse.ok) throw new Error('无法获取仓库根目录。');
        const rootContents = await rootResponse.json();
        const notesDir = rootContents.find(item => item.name === 'notes' && item.type === 'dir');

        if (!notesDir) {
            dom.fileTree.innerHTML = '<li>"notes" 文件夹不存在！</li>';
            // 可以在这里添加一个按钮来创建'notes'文件夹
            return;
        }

        // 2. 使用 'notes' 文件夹的 SHA 递归获取树
        const treeUrl = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/git/trees/${notesDir.sha}?recursive=true`;
        const treeResponse = await fetch(treeUrl, { headers: { 'Authorization': `token ${token}` } });
        if (!treeResponse.ok) throw new Error('无法获取文件树。');
        const treeData = await treeResponse.json();
        
        // 3. 构建层级数据结构
        const fileTree = buildTree(treeData.tree);

        // 4. 渲染UI
        renderTree(fileTree, dom.fileTree);

    } catch (error) {
        console.error("加载文件树失败:", error);
        dom.fileTree.innerHTML = `<li>加载目录失败: ${error.message}</li>`;
    }
}

/**
 * 将GitHub API返回的扁平路径列表转换为层级树结构
 * @param {Array} pathList - from GitHub trees API
 * @returns {Array}
 */
function buildTree(pathList) {
    const tree = [];
    const map = {}; // 用于快速查找已创建的节点

    pathList.forEach(item => {
        const parts = item.path.split('/');
        let currentLevel = tree;
        let currentPath = '';

        parts.forEach((part, index) => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            
            if (!map[currentPath]) {
                const newNode = {
                    name: part,
                    type: item.type === 'tree' ? 'folder' : 'file',
                    path: item.path,
                    children: item.type === 'tree' ? [] : undefined
                };

                map[currentPath] = newNode;
                
                if (index === 0) {
                    // 顶级节点
                    tree.push(newNode);
                } else {
                    const parentPath = parts.slice(0, index).join('/');
                    if (map[parentPath]) {
                        map[parentPath].children.push(newNode);
                    }
                }
            }
            if (map[currentPath] && item.type === 'tree') {
                currentLevel = map[currentPath].children;
            }
        });
    });

    return tree;
}

/**
 * 递归地将文件树JSON对象渲染为HTML
 * @param {Array} nodes - The array of nodes to render
 * @param {HTMLElement} parentElement - The element to append the rendered tree to
 */
function renderTree(nodes, parentElement) {
    parentElement.innerHTML = ''; // Clear previous tree
    const ul = document.createElement('ul');
    
    // Sort so folders come before files
    nodes.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
    });

    nodes.forEach(node => {
        if (node.name === '.gitkeep') return;

        const li = document.createElement('li');
        li.dataset.path = node.path;
        li.dataset.type = node.type;

        const icon = document.createElement('i');
        icon.className = `icon fas ${node.type === 'folder' ? 'fa-folder' : 'fa-file-alt'}`;
        li.appendChild(icon);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = node.name;
        li.appendChild(nameSpan);

        if (node.type === 'folder') {
            const childrenUl = document.createElement('ul');
            childrenUl.style.display = 'none';
            renderTree(node.children, childrenUl); // Recursive call
            li.appendChild(childrenUl);

            li.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = childrenUl.style.display !== 'none';
                childrenUl.style.display = isVisible ? 'none' : 'block';
                icon.className = `icon fas ${isVisible ? 'fa-folder' : 'fa-folder-open'}`;
            });
        } else { // It's a file
            li.addEventListener('click', (e) => {
                e.stopPropagation();
                // Handle active state for UI
                const currentActive = parentElement.querySelector('li.active');
                if (currentActive) {
                    currentActive.classList.remove('active');
                }
                li.classList.add('active');

                const token = localStorage.getItem('github_access_token');
                const relativePath = `notes/${node.path}`;
                loadNoteContent(token, relativePath);
            });
        }
        ul.appendChild(li);
    });

    parentElement.appendChild(ul);
}

/**
 * 加载笔记内容
 * @param {string} token 
 * @param {string} path - The full path to the note file from repo root
 */
async function loadNoteContent(token, path) {
    currentFilePath = path; // <-- 追踪当前文件路径
    const url = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/contents/${path}`;
    try {
        showEditorView(); // Show the editor pane first
        showSaveStatus('正在加载笔记...');
        dom.filePath.textContent = path; // Update file path in toolbar

        const response = await fetch(url, {
            headers: { 'Authorization': `token ${token}` }
        });

        if (response.status === 404) {
            dom.markdownEditor.value = `# 新的笔记\n\n这是在 ${path} 创建的一个新文件。`;
            dom.htmlPreview.innerHTML = marked.parse(dom.markdownEditor.value);
            currentFileSha = null;
            showSaveStatus('文件不存在，准备创建。');
            return;
        }

        if (!response.ok) {
            throw new Error(`加载文件失败: ${response.statusText}`);
        }

        const data = await response.json();
        const content = decodeURIComponent(escape(atob(data.content)));
        currentFileSha = data.sha;
        
        dom.markdownEditor.value = content;
        dom.htmlPreview.innerHTML = marked.parse(content);
        showSaveStatus('笔记加载成功！');

    } catch (error) {
        console.error(error);
        showSaveStatus(`错误: ${error.message}`);
    }
}

/**
 * 保存笔记内容
 */
async function saveNote() {
    const token = localStorage.getItem('github_access_token');
    if (!token) {
        alert('认证已过期，请重新登录。');
        logout();
        return;
    }
    if (!currentFilePath) {
        alert('没有打开任何文件，无法保存。');
        return;
    }

    const content = dom.markdownEditor.value;
    const encodedContent = btoa(unescape(encodeURIComponent(content)));

    const url = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/contents/${currentFilePath}`;
    
    const body = {
        message: `docs: update note ${new Date().toISOString()}`,
        content: encodedContent,
        sha: currentFileSha // 如果sha为null，GitHub API会创建文件；否则会更新文件
    };

    try {
        showSaveStatus('正在保存...');
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`保存失败: ${response.statusText}`);
        }

        const data = await response.json();
        currentFileSha = data.content.sha; // 更新SHA为最新版本
        showSaveStatus('保存成功！');
    } catch (error) {
        console.error(error);
        showSaveStatus(`错误: ${error.message}`);
    }
}

/**
 * 退出登录
 */
function logout() {
    localStorage.removeItem('github_access_token');
    showLoginView();
}

/**
 * UI切换和更新函数
 */
function showLoginView() {
    dom.loginView.style.display = 'block';
    dom.workspaceView.style.display = 'none';
    dom.userInfo.style.display = 'none';
}

function showWorkspaceView(userData) {
    dom.loginView.style.display = 'none';
    dom.workspaceView.style.display = 'grid';
    dom.userInfo.style.display = 'flex';
    dom.userAvatar.src = userData.avatar_url;
    dom.userName.textContent = userData.login;
    showWelcomeView();
}

function showWelcomeView() {
    dom.welcomeView.style.display = 'flex';
    dom.editorView.style.display = 'none';
}

function showEditorView() {
    dom.welcomeView.style.display = 'none';
    dom.editorView.style.display = 'block';
}

function showSaveStatus(message) {
    dom.saveStatus.textContent = message;
    // 简单地让状态在几秒后消失
    setTimeout(() => {
        if (dom.saveStatus.textContent === message) {
            dom.saveStatus.textContent = '';
        }
    }, 5000);
}

/**
 * 初始化粒子背景
 */
function initializeParticles() {
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            "particles": { "number": { "value": 80, "density": { "enable": true, "value_area": 800 } }, "color": { "value": "#ffffff" }, "shape": { "type": "circle", "stroke": { "width": 0, "color": "#000000" }, "polygon": { "nb_sides": 5 } }, "opacity": { "value": 0.5, "random": false, "anim": { "enable": false, "speed": 1, "opacity_min": 0.1, "sync": false } }, "size": { "value": 3, "random": true, "anim": { "enable": false, "speed": 40, "size_min": 0.1, "sync": false } }, "line_linked": { "enable": true, "distance": 150, "color": "#ffffff", "opacity": 0.4, "width": 1 }, "move": { "enable": true, "speed": 6, "direction": "none", "random": false, "straight": false, "out_mode": "out", "bounce": false, "attract": { "enable": false, "rotateX": 600, "rotateY": 1200 } } }, "interactivity": { "detect_on": "canvas", "events": { "onhover": { "enable": true, "mode": "repulse" }, "onclick": { "enable": true, "mode": "push" }, "resize": true }, "modes": { "grab": { "distance": 400, "line_linked": { "opacity": 1 } }, "bubble": { "distance": 400, "size": 40, "duration": 2, "opacity": 8, "speed": 3 }, "repulse": { "distance": 200, "duration": 0.4 }, "push": { "particles_nb": 4 }, "remove": { "particles_nb": 2 } } }, "retina_detect": true
        });
    }
}

/**
 * 创建新笔记
 */
async function createNewNote() {
    const fileName = prompt("请输入新笔记的文件名 (例如: my-note.md):");
    if (!fileName || !fileName.endsWith('.md')) {
        alert("无效的文件名。必须以 .md 结尾。");
        return;
    }

    // 假设新笔记创建在 'notes' 根目录下，可以后续增强为在当前选中目录下创建
    const path = `notes/${fileName}`;
    const token = localStorage.getItem('github_access_token');

    const content = `# ${fileName}\n\n`;
    const encodedContent = btoa(unescape(encodeURIComponent(content)));

    const url = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/contents/${path}`;

    try {
        showSaveStatus(`正在创建新笔记 ${fileName}...`);
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({
                message: `feat: create note ${fileName}`,
                content: encodedContent
                // sha为空，表示创建
            })
        });

        if (response.status === 422) {
             throw new Error(`文件 "${fileName}" 已存在。`);
        }
        if (!response.ok) {
            throw new Error(`创建失败: ${response.statusText}`);
        }
        
        showSaveStatus(`笔记 ${fileName} 创建成功！`);
        // 重新加载文件树以显示新文件
        await loadAndRenderFileTree(token);

    } catch (error) {
        console.error(error);
        showSaveStatus(`错误: ${error.message}`);
        alert(`错误: ${error.message}`);
    }
}

/**
 * 创建新文件夹
 */
async function createNewFolder() {
    const folderName = prompt("请输入新文件夹的名称:");
    if (!folderName) return;

    // 使用 .gitkeep 技巧创建文件夹
    const path = `notes/${folderName}/.gitkeep`;
    const token = localStorage.getItem('github_access_token');

    const encodedContent = btoa(""); // 空内容

    const url = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/contents/${path}`;

    try {
        showSaveStatus(`正在创建文件夹 ${folderName}...`);
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({
                message: `feat: create folder ${folderName}`,
                content: encodedContent
            })
        });
        
        if (response.status === 422) {
             throw new Error(`文件夹或文件 "${folderName}" 已存在。`);
        }
        if (!response.ok) {
            throw new Error(`创建失败: ${response.statusText}`);
        }
        
        showSaveStatus(`文件夹 ${folderName} 创建成功！`);
        await loadAndRenderFileTree(token);

    } catch (error) {
        console.error(error);
        showSaveStatus(`错误: ${error.message}`);
        alert(`错误: ${error.message}`);
    }
}