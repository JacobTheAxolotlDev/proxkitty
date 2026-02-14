const launchForm = document.querySelector('#launch-form');
const urlInput = document.querySelector('#url-input');

function normalizeUrl(rawInput) {
  if (!rawInput) return '';
  const trimmed = rawInput.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

launchForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const target = normalizeUrl(urlInput.value);

  if (!target) {
    return;
  }

  const destination = `/proxy.html?url=${encodeURIComponent(target)}`;
  window.location.assign(destination);
});
