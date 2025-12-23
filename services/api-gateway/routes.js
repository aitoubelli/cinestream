const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = (app) => {
    app.use('/api/auth', createProxyMiddleware({
        target: 'http://localhost:4001',
        changeOrigin: true,
        cookieDomainRewrite: false
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
    app.use('/api/notifications', createProxyMiddleware({
        target: 'http://localhost:4005',
        changeOrigin: true,
        cookieDomainRewrite: false
    }));
};
