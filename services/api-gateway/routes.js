const { createProxyMiddleware } = require('http-proxy-middleware');

// Import authentication middlewares
const { authenticateToken, optionalAuthenticateToken } = require('./server');

module.exports = (app) => {
    app.use('/api/auth', createProxyMiddleware({
        target: 'http://localhost:4001',
        changeOrigin: true,
        timeout: 60000, // 60 seconds timeout
        proxyTimeout: 60000, // 60 seconds proxy timeout
        followRedirects: true,
        selfHandleResponse: false,
        onProxyReq: (proxyReq, req, res) => {
            // Ensure content-type is preserved
            if (req.body) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
        },
        onError: (err, req, res) => {
            console.error(`API Gateway: Proxy error for ${req.method} ${req.url}:`, err);
            res.status(500).json({ error: 'Proxy error' });
        }
    }));
    app.use('/api/user', createProxyMiddleware({
        target: 'http://localhost:4002',
        changeOrigin: true,
        pathRewrite: { '^/api/user': '' },
        onProxyReq: (proxyReq, req, res) => {
            // Ensure content-type is preserved and body is forwarded for POST/PUT/PATCH
            if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') && req.body) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
        },
    }));
    app.use('/api/watchlist', createProxyMiddleware({
        target: 'http://localhost:4002',
        changeOrigin: true,
        pathRewrite: { '^/api/watchlist': '/watchlist' },
        onProxyReq: (proxyReq, req, res) => {
            // Ensure content-type is preserved and body is forwarded for POST/PUT/PATCH
            if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') && req.body) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
        },
    }));
    app.use('/api/interactions', createProxyMiddleware({
        target: 'http://localhost:4004',
        changeOrigin: true,
        pathRewrite: {
            '^/api/interactions': '/interactions'
        },
        timeout: 60000, // 60 seconds timeout
        proxyTimeout: 60000, // 60 seconds proxy timeout
        onProxyReq: (proxyReq, req, res) => {
            // Ensure content-type is preserved and body is forwarded for POST/PUT/PATCH
            if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') && req.body) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
        },
        onError: (err, req, res) => {
            console.error(`API Gateway: Proxy error for ${req.method} ${req.url}:`, err);
            res.status(500).json({ error: 'Proxy error' });
        }
    }));
    app.use('/api/notifications', createProxyMiddleware({
        target: 'http://localhost:4005',
        changeOrigin: true,
        cookieDomainRewrite: false
    }));
    app.use('/api/browse', createProxyMiddleware({
        target: 'http://localhost:4003',
        changeOrigin: true,
        pathRewrite: { '^/api/browse': '/browse' }
    }));
    app.use('/api/content', createProxyMiddleware({
        target: 'http://localhost:4003',
        changeOrigin: true,
        pathRewrite: { '^/api/content': '' }
    }));

};
