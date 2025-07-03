// api/github-callback.js

// 这是一个在Vercel服务器上运行的Node.js函数。
// Vercel的Hobby套餐默认支持Node.js。
export default async function handler(request, response) {
    // 为本地开发和线上访问设置CORS（跨域资源共享）策略
    // 允许任何来源(*)访问，这在开发阶段很方便。
    // 在生产环境中，可以将其收紧为您部署后的前端URL。
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 浏览器在发送POST请求前，会先发送一个OPTIONS预检请求。
    // 我们需要正确响应它，否则POST请求会被浏览器阻止。
    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // 从前端发来的请求体中解析出'code'
    const { code } = request.body;
    if (!code) {
        return response.status(400).json({ error: 'Authorization code not provided.' });
    }

    // 从Vercel的环境变量中安全地读取机密信息
    // 我们稍后会在Vercel的网站上配置这两个变量。
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error('Server configuration error: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not set.');
        return response.status(500).json({ error: 'Server configuration error.' });
    }

    try {
        // 使用我们的凭证和收到的code，向GitHub请求access_token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json', // 要求GitHub返回JSON格式的数据
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
            }),
        });

        const tokenData = await tokenResponse.json();

        // 如果GitHub返回错误（例如code已过期）
        if (tokenData.error) {
            return response.status(400).json({ error: tokenData.error_description });
        }

        // 成功！将获取到的access_token返回给前端页面。
        return response.status(200).json({ accessToken: tokenData.access_token });

    } catch (error) {
        console.error('Internal Server Error:', error);
        return response.status(500).json({ error: 'Failed to exchange access token.' });
    }
} 