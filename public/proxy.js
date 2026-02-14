const proxyInput = document.querySelector('#proxy-url');
const proxyFrame = document.querySelector('#proxy-frame');
const navForm = document.querySelector('#nav-form');
const goButton = document.querySelector('#go-btn');

function normalizeUrl(rawInput) {
  if (!rawInput) return '';
  const trimmed = rawInput.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function scramjetProxyUrl(targetUrl) {
  const encoded = encodeURIComponent(targetUrl);
  return `/scramjet/proxy?url=${encoded}`;
}

function navigateTo(rawTarget) {
  const target = normalizeUrl(rawTarget);
  if (!target) {
    return;
  }

  proxyInput.value = target;
  proxyFrame.src = scramjetProxyUrl(target);

  const nextPageUrl = new URL(window.location.href);
  nextPageUrl.searchParams.set('url', target);
  window.history.replaceState(null, '', nextPageUrl);
}

const initialUrl = new URL(window.location.href).searchParams.get('url') || 'https://example.com';
navigateTo(initialUrl);

navForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  navigateTo(proxyInput.value);
});

goButton?.addEventListener('click', () => {
  navigateTo(proxyInput.value);
});
