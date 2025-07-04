// js/notes.js (Final Corrected Version)

const config = {
    clientId: 'Ov23liM8SUwOMiIlF1T0',
    repoOwner: 'xyustc',
    repoName: 'xyustc.github.io',
    notePath: 'notes/diary.md', // This is now a default/fallback
    authProxyUrl: 'https://xyustc-github-io.vercel.app/api/github-callback'
};

let currentFileSha = null;
let currentFilePath = null;

const dom = {
    loginBtn: document.getElementById('login-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    userInfo: document.getElementById('user-info'),
    userAvatar: document.getElementById('user-avatar'),
    userName: document.getElementById('user-name'),
    workspaceView: document.getElementById('workspace-view'),
    fileNavigator: document.getElementById('file-navigator'),
    fileTree: document.getElementById('file-tree'),
    newNoteBtn: document.getElementById('new-note-btn'),
    newFolderBtn: document.getElementById('new-folder-btn'),
    editorContainer: document.getElementById('editor-container'),
    welcomeView: document.getElementById('welcome-view'),
    editorView: document.getElementById('editor-view'),
    editorToolbar: document.querySelector('.editor-toolbar'),
    filePath: document.getElementById('file-path'),
    saveStatus: document.getElementById('save-status'),
    saveBtn: document.getElementById('save-btn'),
    markdownEditor: document.getElementById('markdown-editor'),
    htmlPreview: document.getElementById('html-preview'),
    editorPanels: document.querySelector('.editor-panels'),
    viewModeEditBtn: document.getElementById('view-mode-edit'),
    viewModeSplitBtn: document.getElementById('view-mode-split'),
    viewModePreviewBtn: document.getElementById('view-mode-preview'),
};

document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    setupViewModeControls();
    initializeParticles();
    showWorkspaceView();
    const code = new URLSearchParams(window.location.search).get('code');
    const accessToken = localStorage.getItem('github_access_token');
    if (code) {
        await handleGitHubCallback(code);
    } else if (accessToken) {
        await enterEditMode(accessToken);
    } else {
        await enterReadOnlyMode();
    }
});

function setupEventListeners() {
    dom.loginBtn.addEventListener('click', redirectToGitHubAuth);
    dom.logoutBtn.addEventListener('click', logout);
    dom.saveBtn.addEventListener('click', saveNote);
    dom.newNoteBtn.addEventListener('click', createNewNote);
    dom.newFolderBtn.addEventListener('click', createNewFolder);
    dom.markdownEditor.addEventListener('input', () => {
        if(marked) dom.htmlPreview.innerHTML = marked.parse(dom.markdownEditor.value);
        showSaveStatus('未保存的更改...');
    });
}

function setupViewModeControls() {
    if (!dom.editorPanels) return;
    dom.editorPanels.classList.add('view-mode-split');
    const buttons = [
        { el: dom.viewModeEditBtn, mode: 'edit' },
        { el: dom.viewModeSplitBtn, mode: 'split' },
        { el: dom.viewModePreviewBtn, mode: 'preview' }
    ];
    buttons.forEach(buttonInfo => {
        if (!buttonInfo.el) return;
        buttonInfo.el.addEventListener('click', () => {
            buttons.forEach(btn => btn.el.classList.remove('active'));
            buttonInfo.el.classList.add('active');
            dom.editorPanels.classList.remove('view-mode-edit', 'view-mode-split', 'view-mode-preview');
            dom.editorPanels.classList.add(`view-mode-${buttonInfo.mode}`);
        });
    });
}

async function githubApiRequest(url, token, options = {}) {
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `token ${token}`;
    }
    if (options.body) {
        headers['Content-Type'] = 'application/json';
    }
    return fetch(url, { ...options, headers });
}

async function enterReadOnlyMode() {
    dom.loginBtn.style.display = 'inline-flex';
    dom.userInfo.style.display = 'none';
    dom.newNoteBtn.style.display = 'none';
    dom.newFolderBtn.style.display = 'none';
    dom.saveBtn.style.display = 'none';
    dom.markdownEditor.setAttribute('readonly', true);
    if(dom.editorToolbar) dom.editorToolbar.style.display = 'none';
    showWelcomeView();
    await loadAndRenderFileTree(null);
}

async function enterEditMode(token) {
    const userData = await getGitHubUser(token);
    if (!userData) {
        logout();
        return;
    }
    dom.loginBtn.style.display = 'none';
    dom.userInfo.style.display = 'flex';
    dom.userAvatar.src = userData.avatar_url;
    dom.userName.textContent = userData.login;
    
    dom.newNoteBtn.style.display = 'block';
    dom.newFolderBtn.style.display = 'block';
    dom.saveBtn.style.display = 'block';
    dom.markdownEditor.removeAttribute('readonly');
    if(dom.editorToolbar) dom.editorToolbar.style.display = 'flex';
    
    await loadAndRenderFileTree(token);
}

async function handleGitHubCallback(code) {
    try {
        showSaveStatus('正在验证身份...');
        const accessToken = await getAccessToken(code);
        localStorage.setItem('github_access_token', accessToken);
        window.history.replaceState({}, document.title, window.location.pathname);
        await enterEditMode(accessToken);
    } catch (error) {
        showSaveStatus(`验证失败: ${error.message}`);
        await enterReadOnlyMode();
    }
}

function redirectToGitHubAuth() {
    const scope = 'repo';
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${config.clientId}&scope=${scope}&redirect_uri=${redirectUri}`;
    window.location.href = authUrl;
}

function logout() {
    localStorage.removeItem('github_access_token');
    currentFilePath = null;
    currentFileSha = null;
    window.location.href = window.location.pathname;
}

async function getAccessToken(code) {
    const response = await fetch(config.authProxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '无法获取Access Token');
    }
    const data = await response.json();
    return data.accessToken;
}

async function getGitHubUser(token) {
    const response = await githubApiRequest('https://api.github.com/user', token);
    if (response.ok) return await response.json();
    return null;
}

async function loadAndRenderFileTree(token) {
    try {
        const rootContentsUrl = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/contents/`;
        const rootResponse = await githubApiRequest(rootContentsUrl, token);
        if (!rootResponse.ok) throw new Error('无法获取仓库根目录。');
        const rootContents = await rootResponse.json();
        const notesDir = rootContents.find(item => item.name === 'notes' && item.type === 'dir');
        if (!notesDir) {
            dom.fileTree.innerHTML = '<li>"notes" 文件夹不存在！</li>';
            return;
        }
        const treeUrl = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/git/trees/${notesDir.sha}?recursive=true`;
        const treeResponse = await githubApiRequest(treeUrl, token);
        if (!treeResponse.ok) throw new Error('无法获取文件树。');
        const treeData = await treeResponse.json();
        const fileTree = buildTree(treeData.tree);
        renderTree(fileTree, dom.fileTree);
    } catch (error) {
        dom.fileTree.innerHTML = `<li>加载目录失败: ${error.message}</li>`;
    }
}

function buildTree(pathList) {
    const tree = [];
    const map = {};
    pathList.forEach(item => {
        const parts = item.path.split('/');
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
                    tree.push(newNode);
                } else {
                    const parentPath = parts.slice(0, index).join('/');
                    if (map[parentPath]) {
                        map[parentPath].children.push(newNode);
                    }
                }
            }
        });
    });
    return tree;
}

function renderTree(nodes, parentElement) {
    parentElement.innerHTML = '';
    const ul = document.createElement('ul');
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
            renderTree(node.children, childrenUl);
            li.appendChild(childrenUl);
            li.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = childrenUl.style.display !== 'none';
                childrenUl.style.display = isVisible ? 'none' : 'block';
                icon.className = `icon fas ${isVisible ? 'fa-folder' : 'fa-folder-open'}`;
            });
        } else {
            li.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.file-tree li.active').forEach(activeEl => activeEl.classList.remove('active'));
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

async function loadNoteContent(token, path) {
    currentFilePath = path;
    const url = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/contents/${path}`;
    try {
        showEditorView();
        showSaveStatus('正在加载笔记...');
        dom.filePath.textContent = path;
        const response = await githubApiRequest(url, token);
        if (response.status === 404) {
            dom.markdownEditor.value = `# 新的笔记\n\n这是在 ${path} 创建的一个新文件。`;
            if(marked) dom.htmlPreview.innerHTML = marked.parse(dom.markdownEditor.value);
            currentFileSha = null;
            showSaveStatus('文件不存在，准备创建。');
            return;
        }
        if (!response.ok) throw new Error(`加载文件失败: ${response.statusText}`);
        const data = await response.json();
        const content = decodeURIComponent(escape(atob(data.content)));
        currentFileSha = data.sha;
        dom.markdownEditor.value = content;
        if(marked) dom.htmlPreview.innerHTML = marked.parse(dom.markdownEditor.value);
        showSaveStatus('笔记加载成功！');
    } catch (error) {
        showSaveStatus(`错误: ${error.message}`);
    }
}

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
        message: `docs: update note ${currentFilePath}`,
        content: encodedContent,
        sha: currentFileSha
    };
    try {
        showSaveStatus('正在保存...');
        const response = await githubApiRequest(url, token, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error(`保存失败: ${response.statusText}`);
        const data = await response.json();
        currentFileSha = data.content.sha;
        showSaveStatus('保存成功！');
    } catch (error) {
        showSaveStatus(`错误: ${error.message}`);
    }
}

async function createNewNote() {
    const fileName = prompt("请输入新笔记的文件名 (例如: my-note.md):");
    if (!fileName || !fileName.endsWith('.md')) {
        alert("无效的文件名。必须以 .md 结尾。");
        return;
    }
    const path = `notes/${fileName}`;
    const token = localStorage.getItem('github_access_token');
    const content = `# ${fileName}\n\n`;
    const encodedContent = btoa(unescape(encodeURIComponent(content)));
    const url = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/contents/${path}`;
    try {
        showSaveStatus(`正在创建新笔记 ${fileName}...`);
        const response = await githubApiRequest(url, token, {
            method: 'PUT',
            body: JSON.stringify({
                message: `feat: create note ${fileName}`,
                content: encodedContent
            })
        });
        if (response.status === 422) throw new Error(`文件 "${fileName}" 已存在。`);
        if (!response.ok) throw new Error(`创建失败: ${response.statusText}`);
        showSaveStatus(`笔记 ${fileName} 创建成功！`);
        await loadAndRenderFileTree(token);
    } catch (error) {
        alert(`错误: ${error.message}`);
    }
}

async function createNewFolder() {
    const folderName = prompt("请输入新文件夹的名称:");
    if (!folderName) return;
    const path = `notes/${folderName}/.gitkeep`;
    const token = localStorage.getItem('github_access_token');
    const encodedContent = btoa("");
    const url = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/contents/${path}`;
    try {
        showSaveStatus(`正在创建文件夹 ${folderName}...`);
        const response = await githubApiRequest(url, token, {
            method: 'PUT',
            body: JSON.stringify({
                message: `feat: create folder ${folderName}`,
                content: encodedContent
            })
        });
        if (response.status === 422) throw new Error(`文件夹或文件 "${folderName}" 已存在。`);
        if (!response.ok) throw new Error(`创建失败: ${response.statusText}`);
        showSaveStatus(`文件夹 ${folderName} 创建成功！`);
        await loadAndRenderFileTree(token);
    } catch (error) {
        alert(`错误: ${error.message}`);
    }
}

function showWorkspaceView() {
    if(dom.workspaceView) dom.workspaceView.style.display = 'grid';
}

function showWelcomeView() {
    if(dom.welcomeView) dom.welcomeView.style.display = 'flex';
    if(dom.editorView) dom.editorView.style.display = 'none';
}

function showEditorView() {
    if(dom.welcomeView) dom.welcomeView.style.display = 'none';
    if(dom.editorView) dom.editorView.style.display = 'block';
}

function showSaveStatus(message) {
    if(!dom.saveStatus) return;
    dom.saveStatus.textContent = message;
    setTimeout(() => {
        if (dom.saveStatus.textContent === message) {
            dom.saveStatus.textContent = '';
        }
    }, 5000);
}

function initializeParticles() {
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            "particles": { "number": { "value": 80, "density": { "enable": true, "value_area": 800 } }, "color": { "value": "#ffffff" }, "shape": { "type": "circle", "stroke": { "width": 0, "color": "#000000" }, "polygon": { "nb_sides": 5 } }, "opacity": { "value": 0.5, "random": false, "anim": { "enable": false, "speed": 1, "opacity_min": 0.1, "sync": false } }, "size": { "value": 3, "random": true, "anim": { "enable": false, "speed": 40, "size_min": 0.1, "sync": false } }, "line_linked": { "enable": true, "distance": 150, "color": "#ffffff", "opacity": 0.4, "width": 1 }, "move": { "enable": true, "speed": 6, "direction": "none", "random": false, "straight": false, "out_mode": "out", "bounce": false, "attract": { "enable": false, "rotateX": 600, "rotateY": 1200 } } }, "interactivity": { "detect_on": "canvas", "events": { "onhover": { "enable": true, "mode": "repulse" }, "onclick": { "enable": true, "mode": "push" }, "resize": true }, "modes": { "grab": { "distance": 400, "line_linked": { "opacity": 1 } }, "bubble": { "distance": 400, "size": 40, "duration": 2, "opacity": 8, "speed": 3 }, "repulse": { "distance": 200, "duration": 0.4 }, "push": { "particles_nb": 4 }, "remove": { "particles_nb": 2 } } }, "retina_detect": true
        });
    }
}