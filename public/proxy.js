const proxyInput = document.querySelector('#proxy-url');
const proxyFrame = document.querySelector('#proxy-frame');
const navForm = document.querySelector('#nav-form');
const goButton = document.querySelector('#go-btn');
const statusBox = document.querySelector('#status');

const htmlProxySources = [
  {
    name: 'allorigins',
    buildUrl: (target) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`
  },
  {
    name: 'codetabs',
    buildUrl: (target) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`
  }
];

function normalizeUrl(rawInput) {
  if (!rawInput) return '';
  const trimmed = rawInput.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function setStatus(message, tone = 'info') {
  statusBox.textContent = message;
  statusBox.dataset.tone = tone;
}

function rewriteHtmlDocument(html, targetUrl) {
  const baseTag = `<base href="${targetUrl}">`;

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  }

  return `${baseTag}${html}`;
}

async function fetchThroughAnyProxy(targetUrl) {
  let lastError = null;

  for (const source of htmlProxySources) {
    try {
      const response = await fetch(source.buildUrl(targetUrl));
      if (!response.ok) {
        throw new Error(`${source.name} returned ${response.status}`);
      }
      const html = await response.text();
      return { html, source: source.name };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('No proxy source was available.');
}

async function navigateTo(rawTarget) {
  const target = normalizeUrl(rawTarget);
  if (!target) {
    return;
  }

  proxyInput.value = target;
  setStatus('Loading via public CORS-compatible proxy…', 'loading');

  const nextPageUrl = new URL(window.location.href);
  nextPageUrl.searchParams.set('url', target);
  window.history.replaceState(null, '', nextPageUrl);

  try {
    const { html, source } = await fetchThroughAnyProxy(target);
    proxyFrame.srcdoc = rewriteHtmlDocument(html, target);
    setStatus(`Loaded ${target} using ${source}. Dynamic sites may be partially broken in static mode.`, 'success');
  } catch (error) {
    proxyFrame.srcdoc = '';
    setStatus(`Failed to load ${target}. ${error?.message || 'Unknown error'}`, 'error');
  }
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
