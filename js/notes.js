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

// DOM元素引用
const dom = {
    loginView: document.getElementById('login-view'),
    editorView: document.getElementById('editor-view'),
    loginBtn: document.getElementById('login-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    saveBtn: document.getElementById('save-btn'),
    userInfo: document.getElementById('user-info'),
    userAvatar: document.getElementById('user-avatar'),
    userName: document.getElementById('user-name'),
    filePath: document.getElementById('file-path'),
    saveStatus: document.getElementById('save-status'),
    markdownEditor: document.getElementById('markdown-editor'),
    htmlPreview: document.getElementById('html-preview'),
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
    dom.markdownEditor.addEventListener('input', () => {
        const markdownText = dom.markdownEditor.value;
        dom.htmlPreview.innerHTML = marked.parse(markdownText);
        showSaveStatus('未保存的更改...');
    });
}

/**
 * 处理已认证的用户
 * @param {string} token - GitHub Access Token
 */
async function handleAuthenticatedUser(token) {
    const userData = await getGitHubUser(token);
    if (userData) {
        showEditorView(userData);
        await loadNoteContent(token);
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
 * 加载笔记内容
 * @param {string} token 
 */
async function loadNoteContent(token) {
    const url = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/contents/${config.notePath}`;
    try {
        showSaveStatus('正在加载笔记...');
        const response = await fetch(url, {
            headers: { 'Authorization': `token ${token}` }
        });

        if (response.status === 404) {
            // 文件不存在，准备创建新文件
            dom.markdownEditor.value = `# 新的笔记\n\n这是在 ${config.notePath} 创建的一个新文件。`;
            dom.htmlPreview.innerHTML = marked.parse(dom.markdownEditor.value);
            currentFileSha = null; // 确保SHA是null，这样保存时会是创建操作
            showSaveStatus('文件不存在，准备创建。');
            return;
        }

        if (!response.ok) {
            throw new Error(`加载文件失败: ${response.statusText}`);
        }

        const data = await response.json();
        // GitHub API返回的内容是Base64编码的，需要解码
        const content = decodeURIComponent(escape(atob(data.content)));
        currentFileSha = data.sha; // 保存SHA值以备更新
        
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

    const content = dom.markdownEditor.value;
    // 内容需要编码为Base64
    const encodedContent = btoa(unescape(encodeURIComponent(content)));

    const url = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/contents/${config.notePath}`;
    
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
    dom.editorView.style.display = 'none';
    dom.userInfo.style.display = 'none';
}

function showEditorView(userData) {
    dom.loginView.style.display = 'none';
    dom.editorView.style.display = 'block';
    dom.userInfo.style.display = 'flex';
    dom.userAvatar.src = userData.avatar_url;
    dom.userName.textContent = userData.login;
    dom.filePath.textContent = `${config.repoOwner}/${config.repoName}/${config.notePath}`;
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