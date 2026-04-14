const http = require('node:http');
const https = require('node:https');

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:5000';
const DEFAULT_EAS_PROJECT_ID = '8619fca2-e155-4a37-bbb7-ceccf5bb0c21';

function isExpoConfigCommand() {
  return process.argv.some((arg) => arg === 'config');
}

function shouldRunServerCheck() {
  const easBuild = process.env.EAS_BUILD === '1' || process.env.EAS_BUILD === 'true';
  return !easBuild && !isExpoConfigCommand() && process.env.EXPO_DISABLE_SERVER_CHECK !== '1';
}

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
  const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() || DEFAULT_EAS_PROJECT_ID;

  if (shouldRunServerCheck()) {
    checkServerStatus(apiBaseUrl);
  }

  const currentExtra = config.extra || {};
  const currentEas = currentExtra.eas || {};

  return {
    ...config,
    extra: {
      ...currentExtra,
      eas: {
        ...currentEas,
        projectId: easProjectId,
      },
      devSessionId: `${Date.now()}`,
    },
  };
};
