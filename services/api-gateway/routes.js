const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = (app) => {
    app.use('/api/auth', createProxyMiddleware({
        target: 'http://localhost:4001',
        changeOrigin: true,
        timeout: 60000, // 60 seconds timeout
        proxyTimeout: 60000, // 60 seconds proxy timeout
        followRedirects: true,
        selfHandleResponse: false,
        cookieDomainRewrite: {
            '*': ''
        },
        onProxyReq: (proxyReq, req, res) => {
            console.log(`API Gateway: Forwarding ${req.method} ${req.url} to auth service`);
            console.log(`API Gateway: Request headers:`, req.headers);
            // Ensure content-type is preserved
            if (req.body) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
        },
        onProxyRes: (proxyRes, req, res) => {
            console.log(`API Gateway: Received response from auth service with status ${proxyRes.statusCode}`);
            // Remove secure flag from cookies to allow http
            if (proxyRes.headers['set-cookie']) {
                proxyRes.headers['set-cookie'] = proxyRes.headers['set-cookie'].map(cookie =>
                    cookie.replace(/; secure/gi, '')
                );
            }
        },
        onError: (err, req, res) => {
            console.error(`API Gateway: Proxy error for ${req.method} ${req.url}:`, err);
            res.status(500).json({ error: 'Proxy error' });
        }
    }));
    app.use('/api/user', createProxyMiddleware({
        target: 'http://localhost:4002',
        changeOrigin: true
    }));
    app.use('/api/content', createProxyMiddleware({
        target: 'http://localhost:4003',
        changeOrigin: true,
        pathRewrite: { '^/api/content': '' }
    }));
    app.use('/api/interactions', createProxyMiddleware({
        target: 'http://localhost:4004',
        changeOrigin: true
    }));
    app.use('/api/notifications', createProxyMiddleware({
        target: 'http://localhost:4005',
        changeOrigin: true,
        cookieDomainRewrite: false
    }));
};
