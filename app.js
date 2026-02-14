const AUTH = {
  username: 'admin',
  password: 'admin123',
};

const SESSION_KEY = 'sub-compiler-session';

const loginForm = document.getElementById('loginForm');
const loginCard = document.getElementById('loginCard');
const dashboard = document.getElementById('dashboard');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const compilerForm = document.getElementById('compilerForm');
const subscriptionUrlInput = document.getElementById('subscriptionUrl');
const nginxSnippet = document.getElementById('nginxSnippet');

const sourceTemplate = document.getElementById('sourceTemplate');
const mergeList = document.getElementById('mergeList');
const addSourceBtn = document.getElementById('addSourceBtn');
const mergeBtn = document.getElementById('mergeBtn');
const mergeError = document.getElementById('mergeError');
const mergedRaw = document.getElementById('mergedRaw');
const mergedBase64 = document.getElementById('mergedBase64');

function showDashboard() {
  loginCard.classList.add('hidden');
  dashboard.classList.remove('hidden');
  dashboard.setAttribute('aria-hidden', 'false');
}

function showLogin() {
  dashboard.classList.add('hidden');
  dashboard.setAttribute('aria-hidden', 'true');
  loginCard.classList.remove('hidden');
}

function isAuthenticated() {
  return localStorage.getItem(SESSION_KEY) === 'ok';
}

function addSource(value = '') {
  const fragment = sourceTemplate.content.cloneNode(true);
  const sourceItem = fragment.querySelector('.source-item');
  const input = fragment.querySelector('.source-input');
  const removeBtn = fragment.querySelector('.remove-source');

  input.value = value;

  removeBtn.addEventListener('click', () => {
    sourceItem.remove();
  });

  mergeList.appendChild(fragment);
}

function safeBase64Decode(input) {
  try {
    return decodeURIComponent(
      Array.from(atob(input), (ch) => `%${ch.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
    );
  } catch {
    return null;
  }
}

function safeBase64Encode(input) {
  return btoa(
    encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16))),
  );
}

function normalizeSubscriptionText(text) {
  const compact = text.replace(/\s+/g, '');
  const maybeBase64 = /^[A-Za-z0-9+/=]+$/.test(compact) && compact.length > 20;

  if (maybeBase64) {
    const decoded = safeBase64Decode(compact);
    if (decoded && /\n|vmess:\/\/|vless:\/\/|trojan:\/\/|ss:\/\//i.test(decoded)) {
      return decoded;
    }
  }

  return text;
}

async function readSourceContent(inputValue) {
  const value = inputValue.trim();
  if (!value) {
    return '';
  }

  if (/^https?:\/\//i.test(value)) {
    const response = await fetch(value);
    if (!response.ok) {
      throw new Error(`Источник недоступен: ${value}`);
    }

    return response.text();
  }

  return value;
}

if (isAuthenticated()) {
  showDashboard();
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (username === AUTH.username && password === AUTH.password) {
    localStorage.setItem(SESSION_KEY, 'ok');
    loginError.textContent = '';
    showDashboard();
    return;
  }

  loginError.textContent = 'Неверный логин или пароль. Используйте admin / admin123.';
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem(SESSION_KEY);
  showLogin();
});

compilerForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const panelUrl = document.getElementById('panelUrl').value.trim().replace(/\/$/, '');
  const inboundId = document.getElementById('inboundId').value.trim();
  const clientEmail = encodeURIComponent(document.getElementById('clientEmail').value.trim());
  const apiToken = encodeURIComponent(document.getElementById('apiToken').value.trim());
  const proxyHost = document.getElementById('proxyHost').value.trim();
  const rawPath = document.getElementById('subscriptionPath').value.trim();
  const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

  const compiledUrl = `https://${proxyHost}${normalizedPath}?client=${clientEmail}&inbound=${inboundId}`;

  subscriptionUrlInput.value = compiledUrl;
  nginxSnippet.value = `location ${normalizedPath} {\n    proxy_pass ${panelUrl}/panel/api/inbounds/getClientTrafficsByEmail/${clientEmail};\n    proxy_set_header Authorization "Bearer ${apiToken}";\n    proxy_set_header X-Inbound-ID "${inboundId}";\n    proxy_set_header Host $host;\n    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n}`;
});

addSourceBtn.addEventListener('click', () => {
  addSource();
});

mergeBtn.addEventListener('click', async () => {
  mergeError.textContent = '';
  mergedRaw.value = '';
  mergedBase64.value = '';

  const sourceInputs = Array.from(document.querySelectorAll('.source-input'));
  const filledSources = sourceInputs.map((item) => item.value.trim()).filter(Boolean);

  if (!filledSources.length) {
    mergeError.textContent = 'Добавьте хотя бы один источник подписки.';
    return;
  }

  try {
    const texts = await Promise.all(filledSources.map(readSourceContent));
    const allLines = texts
      .map(normalizeSubscriptionText)
      .flatMap((text) => text.split(/\r?\n/))
      .map((line) => line.trim())
      .filter(Boolean);

    const uniqueLines = [...new Set(allLines)];

    if (!uniqueLines.length) {
      mergeError.textContent = 'Не удалось получить данные подписки из источников.';
      return;
    }

    const unifiedRaw = uniqueLines.join('\n');
    mergedRaw.value = unifiedRaw;
    mergedBase64.value = safeBase64Encode(unifiedRaw);
  } catch (error) {
    mergeError.textContent = `Ошибка объединения: ${error.message}`;
  }
});

addSource('');
addSource('');
