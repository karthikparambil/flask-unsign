(() => {
  'use strict';

  const cookieInput = document.getElementById('cookie-input');
  const charCount = document.getElementById('char-count');
  const btnDecode = document.getElementById('btn-decode');
  const btnPaste = document.getElementById('btn-paste');
  const btnClear = document.getElementById('btn-clear');
  const btnCopyJson = document.getElementById('btn-copy-json');
  const btnToggleRaw = document.getElementById('btn-toggle-raw');
  const outputSection = document.getElementById('output-section');
  const errorSection = document.getElementById('error-section');
  const jsonOutput = document.getElementById('json-output');
  const dataTableWrapper = document.getElementById('data-table-wrapper');

  const inspectParts = document.getElementById('inspect-parts');
  const inspectCompressed = document.getElementById('inspect-compressed');
  const inspectTimestamp = document.getElementById('inspect-timestamp');
  const inspectSize = document.getElementById('inspect-size');
  const inspectKeys = document.getElementById('inspect-keys');
  const inspectSignature = document.getElementById('inspect-signature');

  const errorTitle = document.getElementById('error-title');
  const errorMessage = document.getElementById('error-message');
  const errorStack = document.getElementById('error-stack');

  let currentResult = null;
  let showRaw = false;

  function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = `> ${message}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  function updateCharCount() {
    const len = cookieInput.value.trim().length;
    charCount.textContent = `[${len} chars]`;
    btnDecode.disabled = len === 0;
  }

  function syntaxHighlight(json) {
    if (typeof json !== 'string') {
      json = JSON.stringify(json, null, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'json-key' : 'json-string';
        } else if (/true|false/.test(match)) {
          cls = 'json-bool';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  }

  function buildDataTable(data) {
    const rows = [];

    function flatten(obj, path) {
      if (obj === null || obj === undefined) {
        rows.push({ key: path, value: 'null', type: 'null' });
        return;
      }
      if (Array.isArray(obj)) {
        if (obj.length === 0) {
          rows.push({ key: path, value: '[]', type: 'array' });
        } else {
          obj.forEach((item, i) => flatten(item, `${path}[${i}]`));
        }
        return;
      }
      if (typeof obj === 'object') {
        const keys = Object.keys(obj);
        if (keys.length === 0) {
          rows.push({ key: path, value: '{}', type: 'object' });
        } else {
          keys.forEach(k => flatten(obj[k], path ? `${path}.${k}` : k));
        }
        return;
      }
      rows.push({ key: path, value: String(obj), type: typeof obj });
    }

    flatten(data, '');

    let html = '<table class="data-table"><thead><tr>';
    html += '<th>Key</th><th>Value</th><th>Type</th>';
    html += '</tr></thead><tbody>';

    rows.forEach(row => {
      const safeType = esc(row.type);
      html += `<tr>
        <td class="key-cell">${esc(row.key)}</td>
        <td class="value-cell">${esc(row.value)}</td>
        <td class="type-cell"><span class="type-badge ${safeType}">${safeType}</span></td>
      </tr>`;
    });

    html += '</tbody></table>';
    return html;
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function renderResult(result) {
    currentResult = result;
    showRaw = false;

    errorSection.classList.add('hidden');
    outputSection.classList.remove('hidden');

    jsonOutput.innerHTML = syntaxHighlight(result.payload);

    const parts = cookieInput.value.trim().replace(/^\./, '').split('.');
    inspectParts.textContent = parts.length;
    inspectCompressed.textContent = result.isCompressed ? 'Yes (zlib)' : 'No';
    inspectCompressed.style.color = result.isCompressed ? 'var(--amber)' : 'var(--green)';
    inspectTimestamp.textContent = result.timestamp
      ? result.timestamp.toLocaleString()
      : 'N/A';
    inspectSize.textContent = `${result.payloadSize} bytes`;
    inspectKeys.textContent = result.keyCount;
    inspectSignature.textContent = result.signature
      ? result.signature.substring(0, 20) + '...'
      : 'N/A';

    dataTableWrapper.innerHTML = buildDataTable(result.payload);

  }

  function renderError(error) {
    currentResult = null;
    outputSection.classList.add('hidden');
    errorSection.classList.remove('hidden');

    const msg = error.message || String(error);
    const lines = msg.split('\n');
    errorTitle.textContent = 'DECODE FAILED';
    errorMessage.textContent = lines[0];
    errorStack.textContent = msg;

  }

  async function handleDecode() {
    const input = cookieInput.value.trim();
    if (!input) return;

    btnDecode.disabled = true;
    btnDecode.querySelector('.decode-text').textContent = 'DECODING...';

    try {
      const result = await FlaskDecoder.decode(input);
      renderResult(result);
    } catch (err) {
      renderError(err);
    } finally {
      btnDecode.querySelector('.decode-text').textContent = 'DECODE →';
      btnDecode.disabled = cookieInput.value.trim().length === 0;
    }
  }

  cookieInput.addEventListener('input', updateCharCount);

  cookieInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleDecode();
    }
  });

  btnDecode.addEventListener('click', handleDecode);

  btnPaste.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      cookieInput.value = text;
      updateCharCount();
      cookieInput.focus();
      showToast('pasted from clipboard');
    } catch {
      showToast('clipboard access denied');
    }
  });

  btnClear.addEventListener('click', () => {
    cookieInput.value = '';
    updateCharCount();
    outputSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    currentResult = null;
    cookieInput.focus();
  });

  btnCopyJson.addEventListener('click', () => {
    if (!currentResult) return;
    const text = showRaw
      ? currentResult.payloadRaw
      : JSON.stringify(currentResult.payload, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      btnCopyJson.classList.add('copied');
      btnCopyJson.textContent = '[COPIED]';
      showToast('copied to clipboard');
      setTimeout(() => {
        btnCopyJson.classList.remove('copied');
        btnCopyJson.textContent = '[COPY]';
      }, 1500);
    });
  });

  btnToggleRaw.addEventListener('click', () => {
    if (!currentResult) return;
    showRaw = !showRaw;
    if (showRaw) {
      jsonOutput.textContent = currentResult.payloadRaw;
      btnToggleRaw.classList.add('copied');
      btnToggleRaw.textContent = '[PRETTY]';
    } else {
      jsonOutput.innerHTML = syntaxHighlight(currentResult.payload);
      btnToggleRaw.classList.remove('copied');
      btnToggleRaw.textContent = '[RAW]';
    }
  });

  document.querySelectorAll('.sample-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cookieInput.value = btn.dataset.cookie;
      updateCharCount();
      handleDecode();
    });
  });

  updateCharCount();
  cookieInput.focus();
})();
