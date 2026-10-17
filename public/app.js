/**
 * LedgerZero AI - Frontend Dashboard Controller (Industry-Grade)
 * Connects to local backend REST API with Gemma 2 / Llama 3.2 open-weight support
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const rawTextInput = document.getElementById('rawTextInput');
  const modelSelector = document.getElementById('modelSelector');
  const processBtn = document.getElementById('processBtn');
  const seedBtn = document.getElementById('seedBtn');
  const scheduleCBtn = document.getElementById('scheduleCBtn');
  const agentStepper = document.getElementById('agentStepper');
  const airgapText = document.getElementById('airgapText');
  const activeModelLabel = document.getElementById('activeModelLabel');
  
  // Image preview elements
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imagePreview = document.getElementById('imagePreview');
  const removeImageBtn = document.getElementById('removeImageBtn');
  let currentBase64Image = null;

  // Metrics elements
  const totalSpentVal = document.getElementById('totalSpentVal');
  const deductibleVal = document.getElementById('deductibleVal');
  const taxSavingsVal = document.getElementById('taxSavingsVal');
  const docCountVal = document.getElementById('docCountVal');
  const apiSavedVal = document.getElementById('apiSavedVal');

  // Chart & Table elements
  const categoryChartSvg = document.getElementById('categoryChartSvg');
  const tableBody = document.getElementById('tableBody');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const categoryBreakdown = document.getElementById('categoryBreakdown');

  // Schedule C Modal elements
  const scheduleCModal = document.getElementById('scheduleCModal');
  const closeScheduleCBtn = document.getElementById('closeScheduleCBtn');
  const closeScheduleCFooterBtn = document.getElementById('closeScheduleCFooterBtn');
  const scheduleCTableBody = document.getElementById('scheduleCTableBody');
  const schedTotalDeductible = document.getElementById('schedTotalDeductible');
  const schedCashSaved = document.getElementById('schedCashSaved');

  // Edit Modal elements
  const editModal = document.getElementById('editModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const editForm = document.getElementById('editForm');
  const editDocId = document.getElementById('editDocId');
  const editVendor = document.getElementById('editVendor');
  const editDate = document.getElementById('editDate');
  const editTotal = document.getElementById('editTotal');
  const editInvoiceNumber = document.getElementById('editInvoiceNumber');
  const editCategory = document.getElementById('editCategory');

  let currentDocuments = [];

  // ==========================================
  // INITIALIZATION
  // ==========================================
  async function init() {
    await checkStatus();
    await loadDocuments();
    await loadStats();
    await loadBenchmark();
    setupEventListeners();
  }

  // Check health and local open-weight model availability
  async function checkStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      
      if (data.localLLM && data.localLLM.online) {
        airgapText.textContent = `Ollama Online (${data.localLLM.activeModel})`;
        activeModelLabel.textContent = `Model: ${data.localLLM.activeModel}`;
        
        // Populate model selector if models exist
        if (data.localLLM.models && data.localLLM.models.length > 0) {
          modelSelector.innerHTML = '<option value="auto">Auto (Ollama Default)</option>';
          data.localLLM.models.forEach((m) => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = `${m} (Local Open-Weight)`;
            modelSelector.appendChild(opt);
          });
          modelSelector.innerHTML += '<option value="heuristic">Built-in Heuristic Engine (< 5ms)</option>';
        }
      } else {
        airgapText.textContent = '100% Offline (Local Heuristic Engine)';
        activeModelLabel.textContent = 'Model: Built-in Engine (< 5ms)';
      }
    } catch (err) {
      console.warn('Status check failed:', err);
    }
  }

  // Load all documents
  async function loadDocuments() {
    try {
      const queryParams = new URLSearchParams();
      if (categoryFilter.value) queryParams.set('category', categoryFilter.value);
      if (searchInput.value) queryParams.set('search', searchInput.value);

      const res = await fetch(`/api/documents?${queryParams.toString()}`);
      currentDocuments = await res.json();
      renderTable(currentDocuments);
      renderChart(currentDocuments);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }

  // Load financial & tax stats
  async function loadStats() {
    try {
      const res = await fetch('/api/stats');
      const stats = await res.json();

      totalSpentVal.textContent = `$${stats.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      deductibleVal.textContent = `$${stats.totalDeductible.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      taxSavingsVal.textContent = `$${stats.totalTaxSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      docCountVal.textContent = `${stats.totalDocuments} receipts & invoices logged`;

      renderCategoryChips(stats.categoryCounts);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  // Load benchmark metrics & cloud cost savings ticker
  async function loadBenchmark() {
    try {
      const res = await fetch('/api/benchmark');
      const bench = await res.json();
      apiSavedVal.textContent = bench.cloudApiCostAvoided || '$0.00';
    } catch (err) {
      console.warn('Benchmark fetch failed:', err);
    }
  }

  // Render SVG Category Spend & Deduction Chart
  function renderChart(docs) {
    if (!categoryChartSvg) return;

    if (!docs || docs.length === 0) {
      categoryChartSvg.innerHTML = '<text x="350" y="85" text-anchor="middle" fill="#64748b" font-size="13">Ingest invoices to view live tax category breakdown</text>';
      return;
    }

    const catSpend = {};
    docs.forEach((d) => {
      const cat = d.tax_categorization?.category || 'General';
      catSpend[cat] = (catSpend[cat] || 0) + (d.total || 0);
    });

    const categories = Object.keys(catSpend);
    const maxVal = Math.max(...Object.values(catSpend), 100);
    const barWidth = Math.min(80, Math.floor(620 / categories.length));
    const gap = Math.floor((680 - categories.length * barWidth) / (categories.length + 1));

    let svgHtml = '';
    categories.forEach((cat, idx) => {
      const val = catSpend[cat];
      const barHeight = Math.max(12, Math.round((val / maxVal) * 100));
      const x = gap + idx * (barWidth + gap);
      const y = 125 - barHeight;
      const shortName = cat.split('&')[0].trim().slice(0, 10);

      svgHtml += `
        <g class="chart-bar-group">
          <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="url(#blueGradient)" opacity="0.9"></rect>
          <text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" fill="#f8fafc" font-size="10" font-family="'JetBrains Mono', monospace">$${Math.round(val)}</text>
          <text x="${x + barWidth / 2}" y="145" text-anchor="middle" fill="#94a3b8" font-size="9">${shortName}</text>
        </g>
      `;
    });

    categoryChartSvg.innerHTML = `
      <defs>
        <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>
      </defs>
      ${svgHtml}
    `;
  }

  // Render Table
  function renderTable(docs) {
    tableBody.innerHTML = '';

    if (!docs || docs.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    docs.forEach((doc) => {
      const tr = document.createElement('tr');
      const isAuditPass = doc.validation?.auditStatus === 'IRS Audit Ready';

      tr.innerHTML = `
        <td style="font-family: var(--font-mono); font-size: 0.8rem;">${doc.date || 'N/A'}</td>
        <td>
          <div style="font-weight: 700; color: #fff;">${escapeHtml(doc.vendor || 'Unknown')}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(doc.invoice_number || 'No Ref')}</div>
        </td>
        <td><span class="badge-tag">${escapeHtml(doc.tax_categorization?.category || 'General')}</span></td>
        <td style="font-family: var(--font-mono); font-weight: 700;">$${(doc.total || 0).toFixed(2)}</td>
        <td style="font-family: var(--font-mono); color: var(--accent-green);">$${(doc.tax_categorization?.deductible_amount || 0).toFixed(2)}</td>
        <td style="font-family: var(--font-mono); color: var(--accent-gold); font-weight: 600;">$${(doc.tax_categorization?.estimated_tax_savings || 0).toFixed(2)}</td>
        <td>
          <span class="audit-badge ${isAuditPass ? 'audit-pass' : 'audit-warn'}">
            ${isAuditPass ? '✓ Audit Ready' : '⚠ Review'}
          </span>
        </td>
        <td>
          <button class="btn-icon" title="Edit" onclick="window.editDoc('${doc.id}')">✏️</button>
          <button class="btn-icon" title="Delete" onclick="window.deleteDoc('${doc.id}')">🗑️</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // Render Category breakdown chips
  function renderCategoryChips(categoryCounts) {
    categoryBreakdown.innerHTML = '';
    if (!categoryCounts || Object.keys(categoryCounts).length === 0) {
      categoryBreakdown.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">No category data yet.</span>';
      return;
    }

    for (const [category, count] of Object.entries(categoryCounts)) {
      const chip = document.createElement('div');
      chip.className = 'category-chip';
      chip.innerHTML = `
        <div class="chip-header">
          <span>${escapeHtml(category)}</span>
          <span>${count} items</span>
        </div>
        <div class="chip-deductible">IRS Schedule C Write-off</div>
      `;
      categoryBreakdown.appendChild(chip);
    }
  }

  // ==========================================
  // PROCESS DOCUMENT FLOW
  // ==========================================
  async function processDocument(text, filename = 'invoice.txt', imageBase64 = null) {
    if ((!text || text.trim().length === 0) && !imageBase64) {
      alert('Please enter text or upload an invoice/receipt file first.');
      return;
    }

    processBtn.disabled = true;
    agentStepper.style.display = 'block';

    updateStepper(1);
    await delay(250);

    updateStepper(2);

    try {
      const selectedModel = modelSelector.value === 'auto' ? null : modelSelector.value;
      const res = await fetch('/api/documents/process-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          filename,
          model: selectedModel,
          imageBase64: imageBase64 || currentBase64Image
        })
      });

      updateStepper(3);
      await delay(200);

      updateStepper(4);
      await delay(200);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Processing failed');

      rawTextInput.value = '';
      clearImagePreview();
      await loadDocuments();
      await loadStats();
      await loadBenchmark();

      setTimeout(() => {
        agentStepper.style.display = 'none';
        resetStepper();
      }, 1200);
    } catch (err) {
      alert('Error processing document: ' + err.message);
      agentStepper.style.display = 'none';
      resetStepper();
    } finally {
      processBtn.disabled = false;
    }
  }

  function updateStepper(step) {
    for (let i = 1; i <= 4; i++) {
      const item = document.getElementById(`step${i}`);
      if (i < step) {
        item.className = 'step-item completed';
      } else if (i === step) {
        item.className = 'step-item active';
      } else {
        item.className = 'step-item';
      }
    }
  }

  function resetStepper() {
    for (let i = 1; i <= 4; i++) {
      const item = document.getElementById(`step${i}`);
      item.className = 'step-item';
    }
  }

  function clearImagePreview() {
    currentBase64Image = null;
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';
  }

  // ==========================================
  // IRS SCHEDULE C MODAL FLOW
  // ==========================================
  async function openScheduleCModal() {
    try {
      const res = await fetch('/api/irs-schedule-c');
      const data = await res.json();

      scheduleCTableBody.innerHTML = '';
      for (const [lineCode, info] of Object.entries(data.lines)) {
        if (info.count > 0) {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td style="font-family: var(--font-mono); font-size: 0.8rem; font-weight: 600; color: #60a5fa;">${escapeHtml(lineCode)}</td>
            <td>${escapeHtml(info.name)}</td>
            <td>${info.count}</td>
            <td style="font-family: var(--font-mono);">$${info.total.toFixed(2)}</td>
            <td style="font-family: var(--font-mono); font-weight: bold; color: var(--accent-green);">$${info.deductible.toFixed(2)}</td>
          `;
          scheduleCTableBody.appendChild(tr);
        }
      }

      schedTotalDeductible.textContent = `$${data.totalAllowableDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      schedCashSaved.textContent = `$${data.estimatedCashSaved.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

      scheduleCModal.style.display = 'flex';
    } catch (e) {
      alert('Failed to load Schedule C form: ' + e.message);
    }
  }

  // ==========================================
  // EVENT LISTENERS & DROPZONE
  // ==========================================
  function setupEventListeners() {
    // Process button
    processBtn.addEventListener('click', () => {
      processDocument(rawTextInput.value, 'pasted_receipt.txt', currentBase64Image);
    });

    // Schedule C button
    scheduleCBtn.addEventListener('click', openScheduleCModal);
    closeScheduleCBtn.addEventListener('click', () => (scheduleCModal.style.display = 'none'));
    closeScheduleCFooterBtn.addEventListener('click', () => (scheduleCModal.style.display = 'none'));

    // Remove image button
    removeImageBtn.addEventListener('click', clearImagePreview);

    // Seed samples button
    seedBtn.addEventListener('click', async () => {
      seedBtn.disabled = true;
      seedBtn.textContent = '⏳ Loading Invoices...';
      try {
        const res = await fetch('/api/seed-samples', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          await loadDocuments();
          await loadStats();
          await loadBenchmark();
        }
      } catch (e) {
        alert('Failed to seed sample documents: ' + e.message);
      } finally {
        seedBtn.disabled = false;
        seedBtn.textContent = '⚡ Load Sample Invoices';
      }
    });

    // Filter and search
    searchInput.addEventListener('input', loadDocuments);
    categoryFilter.addEventListener('change', loadDocuments);

    // File input change
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleFileSelected(file);
    });

    // Dropzone drag-and-drop
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleFileSelected(e.dataTransfer.files[0]);
      } else {
        const text = e.dataTransfer.getData('text');
        if (text) rawTextInput.value = text;
      }
    });

    // View JSON summary
    document.getElementById('viewJsonSummaryBtn').addEventListener('click', async () => {
      const res = await fetch('/api/export/tax-summary');
      const data = await res.json();
      alert(`Schedule C Tax Summary:\nGrand Total: $${data.grandTotal}\nTotal Write-off: $${data.totalDeductible}\nEstimated Cash Saved: $${data.totalEstimatedSavings}`);
    });

    // Modal close
    closeModalBtn.addEventListener('click', () => (editModal.style.display = 'none'));
    cancelModalBtn.addEventListener('click', () => (editModal.style.display = 'none'));

    // Edit form submit
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = editDocId.value;
      const updatedData = {
        vendor: editVendor.value,
        date: editDate.value,
        total: parseFloat(editTotal.value),
        invoice_number: editInvoiceNumber.value,
        category: editCategory.value
      };

      try {
        const res = await fetch(`/api/documents/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        });
        if (res.ok) {
          editModal.style.display = 'none';
          await loadDocuments();
          await loadStats();
        }
      } catch (err) {
        alert('Failed to update: ' + err.message);
      }
    });
  }

  function handleFileSelected(file) {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        currentBase64Image = e.target.result.split(',')[1];
        imagePreview.src = e.target.result;
        imagePreviewContainer.style.display = 'block';
        rawTextInput.placeholder = `Image selected: ${file.name}. Click "Run Local AI Agent" to parse with open-weight vision model.`;
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        processDocument(text, file.name);
      };
      reader.readAsText(file);
    }
  }

  // Global window functions for table action buttons
  window.editDoc = (id) => {
    const doc = currentDocuments.find((d) => d.id === id);
    if (!doc) return;

    editDocId.value = doc.id;
    editVendor.value = doc.vendor || '';
    editDate.value = doc.date || '';
    editTotal.value = doc.total || 0;
    editInvoiceNumber.value = doc.invoice_number || '';
    editCategory.value = doc.tax_categorization?.category || 'Office Supplies & Rent';

    editModal.style.display = 'flex';
  };

  window.deleteDoc = async (id) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadDocuments();
        await loadStats();
        await loadBenchmark();
      }
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
  };

  // Utilities
  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  init();
});
