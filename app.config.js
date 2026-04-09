const http = require('node:http');
const https = require('node:https');

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:5000';

function checkServerStatus(apiBaseUrl) {
  const normalizedBaseUrl = apiBaseUrl.replace(/\/+$/, '');
  const statusUrl = `${normalizedBaseUrl}/status`;

  let parsedUrl;
  try {
    parsedUrl = new URL(statusUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid URL';
    console.log(`[ServerCheck] OFFLINE ${statusUrl} (${message})`);
    return;
  }

  const client = parsedUrl.protocol === 'https:' ? https : http;
  const request = client.request(
    parsedUrl,
    {
      method: 'GET',
      timeout: 1500,
      headers: { Accept: 'application/json' },
    },
    (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        const statusCode = response.statusCode ?? 0;
        const isHttpOk = statusCode >= 200 && statusCode < 300;

        let onlineFlag = isHttpOk;
        let modelMode = 'unknown';

        try {
          const parsed = JSON.parse(body);
          if (typeof parsed.online === 'boolean') {
            onlineFlag = parsed.online;
          }
          if (typeof parsed.model_mode === 'string') {
            modelMode = parsed.model_mode;
          }
        } catch {
          // Non-JSON response still counts as reachable if HTTP status is OK.
        }

        if (onlineFlag && isHttpOk) {
          console.log(`[ServerCheck] RUNNING ${statusUrl} (mode=${modelMode})`);
        } else {
          console.log(`[ServerCheck] OFFLINE ${statusUrl} (http=${statusCode})`);
        }
      });
    }
  );

  request.on('timeout', () => {
    request.destroy(new Error('timeout'));
  });

  request.on('error', (error) => {
    const message = error instanceof Error ? error.message : 'network error';
    console.log(`[ServerCheck] OFFLINE ${statusUrl} (${message})`);
  });

  request.end();
}

module.exports = ({ config }) => {
  const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  const apiBaseUrl = envApiBaseUrl || DEFAULT_API_BASE_URL;
  checkServerStatus(apiBaseUrl);
  return {
    ...config,
    extra: {
      ...(config.extra || {}),
      devSessionId: `${Date.now()}`,
    },
  };
};
