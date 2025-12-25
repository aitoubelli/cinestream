// shared/logging.js - Human-readable logging utility for local development

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function getStatusColor(status) {
    if (status >= 200 && status < 300) return colors.green;
    if (status >= 300 && status < 400) return colors.cyan;
    if (status >= 400 && status < 500) return colors.yellow;
    if (status >= 500) return colors.red;
    return colors.white;
}

function formatTime(ms) {
    if (ms < 10) return ms.toFixed(3);
    if (ms < 100) return ms.toFixed(2);
    return ms.toFixed(1);
}

function requestLogger(req, res, next) {
    const start = process.hrtime.bigint();

    // Override res.end to log after response
    const originalEnd = res.end;
    res.end = function (...args) {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1000000; // Convert to milliseconds

        const timestamp = new Date().toISOString();
        const method = req.method;
        const url = req.originalUrl || req.url;
        const status = res.statusCode;
        const statusColor = getStatusColor(status);

        const log = `${colors.yellow}${timestamp}${colors.reset} ${colors.bright}${method}${colors.reset} ${url} ${statusColor}${status}${colors.reset} ${formatTime(durationMs)} ms`;

        console.log(log);

        // Call original end
        originalEnd.apply(this, args);
    };

    next();
}

function startupLogger(serviceName, port) {
    const timestamp = new Date().toISOString();
    console.log(`${colors.yellow}${timestamp}${colors.reset} ${serviceName} listening on port ${port}`);
}

module.exports = {
    requestLogger,
    startupLogger
};
