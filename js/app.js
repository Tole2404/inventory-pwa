/**
 * app.js — Main application logic for Tracking Assets PWA
 */
(function () {
    'use strict';

    // DOM References
    const assetList = document.getElementById('asset-list');
    const emptyState = document.getElementById('empty-state');
    const loadingState = document.getElementById('loading-state');
    const searchInput = document.getElementById('search-input');
    const filterAudit = document.getElementById('filter-audit');
    const btnInstall = document.getElementById('btn-install');
    const btnAdd = document.getElementById('btn-add');
    const btnDeleteAll = document.getElementById('btn-delete-all');
    const btnExportExcel = document.getElementById('btn-export-excel');
    const btnImport = document.getElementById('btn-import');
    const fileImport = document.getElementById('file-import');
    const modalOverlay = document.getElementById('modal-overlay');
    const detailOverlay = document.getElementById('detail-overlay');
    const detailContent = document.getElementById('detail-content');
    const btnDetailClose = document.getElementById('btn-detail-close');
    const modalTitle = document.getElementById('modal-title');
    const auditOverlay = document.getElementById('audit-overlay');
    const auditForm = document.getElementById('audit-form');
    const auditId = document.getElementById('audit-id');
    const auditStatus = document.getElementById('audit-status');
    const auditVisual = document.getElementById('audit-visual');
    const auditLokasi = document.getElementById('audit-lokasi');
    const auditPetugas = document.getElementById('audit-petugas');
    const auditFoto = document.getElementById('audit-foto');
    const auditKeterangan = document.getElementById('audit-keterangan');
    const btnAuditClose = document.getElementById('btn-audit-close');
    const btnAuditCancel = document.getElementById('btn-audit-cancel');
    const auditInfo = document.getElementById('audit-info');
    const groupAuditFoto = document.getElementById('group-audit-foto');
    const auditFotoPreview = document.getElementById('audit-foto-preview');
    const auditImg = document.getElementById('audit-img');
    const btnAuditSave = document.getElementById('btn-audit-save');
    const btnAuditReset = document.getElementById('btn-audit-reset');
    const assetForm = document.getElementById('asset-form');
    const formId = document.getElementById('form-id');
    const formKode = document.getElementById('form-kode');
    const formNama = document.getElementById('form-nama');
    const formKategori = document.getElementById('form-kategori');
    const formLokasi = document.getElementById('form-lokasi');
    const formJumlah = document.getElementById('form-jumlah');
    const formKondisi = document.getElementById('form-kondisi');
    const formKeterangan = document.getElementById('form-keterangan');
    const btnModalClose = document.getElementById('btn-modal-close');
    const btnCancel = document.getElementById('btn-cancel');
    const confirmOverlay = document.getElementById('confirm-overlay');
    const confirmText = document.getElementById('confirm-text');
    const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');
    const connectivityBar = document.getElementById('connectivity-bar');
    const connectivityText = document.getElementById('connectivity-text');
    const toastEl = document.getElementById('toast');

    let deleteTargetId = null;
    let selectedIds = new Set();
    let checklistMode = false;

    // ── Init ──
    async function init() {
        // Restore last filter from localStorage
        if (filterAudit) {
            const savedFilter = localStorage.getItem('filterAudit') || 'all';
            filterAudit.value = savedFilter;
        }
        await renderAssets();
        updateConnectivity();
        window.addEventListener('online', () => { updateConnectivity(); showToast('Koneksi kembali online', 'success'); });
        window.addEventListener('offline', () => { updateConnectivity(); showToast('Anda sedang offline — data tetap tersedia', 'info'); });
    }

    function updateConnectivity() {
        if (navigator.onLine) {
            connectivityBar.className = 'connectivity-bar online show-online';
            connectivityText.textContent = 'Online';
            setTimeout(() => connectivityBar.classList.remove('show-online'), 2500);
        } else {
            connectivityBar.className = 'connectivity-bar offline';
            connectivityText.textContent = 'Offline — data lokal';
        }
    }

    // ── PWA Installation ──
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Update UI to notify the user they can add to home screen
        if (btnInstall) {
            btnInstall.style.display = 'flex';
        }
    });

    if (btnInstall) {
        btnInstall.addEventListener('click', async () => {
            if (deferredPrompt) {
                // Show the install prompt
                deferredPrompt.prompt();
                // Wait for the user to respond to the prompt
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                // We've used the prompt, and can't use it again, throw it away
                deferredPrompt = null;
                btnInstall.style.display = 'none';
            }
        });
    }

    window.addEventListener('appinstalled', () => {
        // Hide the app-provided install promotion
        if (btnInstall) btnInstall.style.display = 'none';
        deferredPrompt = null;
        console.log('PWA was installed');
    });

    // ── Render ──
    async function renderAssets() {
        assetList.style.display = 'none';
        emptyState.style.display = 'none';
        if (loadingState) loadingState.style.display = 'block';

        const query = searchInput.value.toLowerCase().trim();
        const allItems = await AssetsDB.getAll();
        updateStats(allItems);

        if (loadingState) loadingState.style.display = 'none';

        const filterVal = filterAudit ? filterAudit.value : 'all';

        if (!query && filterVal === 'all') {
            assetList.style.display = 'none';
            emptyState.style.display = 'block';
            emptyState.innerHTML = `
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <h3>Gunakan Fitur Pencarian</h3>
                <p>Silakan ketik nama, kode, atau lokasi pada kolom pencarian di atas untuk memunculkan data aset.</p>
            `;
            return;
        }

        let items = allItems.filter(i => {
            const matchesQuery = !query || 
                i.nama_barang.toLowerCase().includes(query) ||
                i.kode_barang.toLowerCase().includes(query) ||
                i.lokasi.toLowerCase().includes(query) ||
                (i.kategori && i.kategori.toLowerCase().includes(query));

            let matchesFilter = true;
            if (filterVal === 'audited') matchesFilter = !!i.audit_status;
            if (filterVal === 'pending') matchesFilter = !i.audit_status;

            return matchesQuery && matchesFilter;
        });

        // Sort by newest by default
        items.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

        if (items.length === 0) {
            assetList.style.display = 'none';
            emptyState.style.display = 'block';
            emptyState.innerHTML = `
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
                <h3>Tidak ada hasil</h3>
                <p>Tidak ditemukan aset yang cocok dengan kata kunci "<strong>${query}</strong>".</p>
            `;
        } else {
            assetList.style.display = '';
            emptyState.style.display = 'none';

            // Checklist toolbar only in 'audited' filter mode
            checklistMode = (filterVal === 'audited');

            if (checklistMode) {
                // Remove IDs that are no longer in this view
                const visibleIds = new Set(items.map(i => i.id));
                for (const id of selectedIds) {
                    if (!visibleIds.has(id)) selectedIds.delete(id);
                }

                const allChecked = items.length > 0 && items.every(i => selectedIds.has(i.id));
                const checkedCount = selectedIds.size;

                assetList.innerHTML = `
                    <div id="checklist-bar" style="grid-column:1/-1;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.35);border-radius:12px;padding:8px 12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;">
                            <input type="checkbox" id="chk-select-all" ${allChecked ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;accent-color:#6366f1;flex-shrink:0;">
                            <span style="font-size:13px;font-weight:600;">Pilih Semua</span>
                        </label>
                        <span style="background:rgba(99,102,241,0.25);color:#a5b4fc;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;">${checkedCount} dipilih</span>
                        <div style="margin-left:auto;display:flex;gap:6px;">
                            <button id="btn-bulk-reset" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;transition:opacity 0.2s;${checkedCount===0?'opacity:0.35;pointer-events:none;':'opacity:1;'}">🗑 Batalkan</button>
                            <button id="btn-bulk-export" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;transition:opacity 0.2s;${checkedCount===0?'opacity:0.35;pointer-events:none;':'opacity:1;'}">↓ Export</button>
                        </div>
                    </div>
                    ${items.map((item, i) => cardHTML(item, i, true)).join('')}
                `;

                // Wire checklist events
                const chkAll = document.getElementById('chk-select-all');
                if (chkAll) {
                    chkAll.addEventListener('change', () => {
                        if (chkAll.checked) items.forEach(i => selectedIds.add(i.id));
                        else selectedIds.clear();
                        renderAssets();
                    });
                }

                document.querySelectorAll('.card-checkbox').forEach(chk => {
                    chk.addEventListener('change', (e) => {
                        e.stopPropagation();
                        if (chk.checked) selectedIds.add(chk.dataset.id);
                        else selectedIds.delete(chk.dataset.id);
                        renderAssets();
                    });
                });

                // Bulk Reset
                const btnBulkReset = document.getElementById('btn-bulk-reset');
                if (btnBulkReset && checkedCount > 0) {
                    btnBulkReset.addEventListener('click', async () => {
                        if (!confirm(`Batalkan audit untuk ${checkedCount} aset yang dipilih?`)) return;
                        for (const id of selectedIds) {
                            await AssetsDB.update({ id, audit_status:'', audit_visual:'', audit_lokasi:'', audit_petugas:'', audit_keterangan:'', audit_foto:'' });
                        }
                        selectedIds.clear();
                        showToast(`${checkedCount} data audit berhasil dibatalkan!`, 'success');
                        await renderAssets();
                    });
                }

                // Bulk Export
                const btnBulkExport = document.getElementById('btn-bulk-export');
                if (btnBulkExport && checkedCount > 0) {
                    btnBulkExport.addEventListener('click', () => {
                        if (btnExportExcel) btnExportExcel.click();
                    });
                }

            } else {
                selectedIds.clear();
                checklistMode = false;
                assetList.innerHTML = items.map((item, i) => cardHTML(item, i, false)).join('');
            }
        }
    }

    function cardHTML(item, idx, showCheckbox) {
        const sc = String(item.kondisi).toLowerCase().replace(/[^a-z]/g, '');
        const auditBadge = item.audit_petugas ? `<div style="background:rgba(16,185,129,0.2);color:#34d399;padding:4px 8px;border-radius:12px;font-size:11px;display:inline-block;margin-top:8px;">✅ Diaudit: ${esc(item.audit_petugas)}</div>` : '';
        const isChecked = selectedIds.has(item.id);

        // Checkbox placed at bottom-left inside card-actions, click toggles selection without opening modal
        const checkboxHtml = showCheckbox ? `<label class="card-checkbox-label" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;padding:6px 10px;border-radius:8px;background:${isChecked ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)'};border:1px solid ${isChecked ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'};transition:all 0.2s;">
            <input type="checkbox" class="card-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''} style="width:15px;height:15px;cursor:pointer;accent-color:#6366f1;" onclick="event.stopPropagation()">
            <span style="font-size:11px;font-weight:600;color:${isChecked ? '#a5b4fc' : '#94a3b8'};">${isChecked ? 'Dipilih' : 'Pilih'}</span>
        </label>` : '';

        return `<div class="asset-card" style="animation-delay:${idx * 0.04}s;position:relative;${isChecked ? 'border-color:rgba(99,102,241,0.6);box-shadow:0 0 0 2px rgba(99,102,241,0.25);' : ''}" onclick="${showCheckbox ? '' : `appAudit('${item.id}')`}">
            <div class="card-header">
                <div class="card-title-group">
                    <div class="card-kode">${esc(item.kode_barang)}</div>
                    <div class="card-nama" title="${esc(item.nama_barang)}">${esc(item.nama_barang)}</div>
                </div>
                <div style="text-align:right">
                    <span class="status-badge ${sc}">${esc(item.kondisi)}</span>
                    <br>${auditBadge}
                </div>
            </div>
            <div class="card-details">
                <div class="detail-item"><span class="detail-label">Kategori</span><span class="detail-value">${esc(item.kategori || '-')}</span></div>
                <div class="detail-item"><span class="detail-label">Lokasi</span><span class="detail-value">${esc(item.lokasi)}</span></div>
            </div>
            ${!showCheckbox ? `<div class="card-actions-single">
                <button class="btn-detail">
                    <span>Lihat Detail</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
            </div>` : `<div class="card-actions-single" style="display:flex;justify-content:space-between;align-items:center;">
                ${checkboxHtml}
                <button class="btn-detail" onclick="event.stopPropagation();appAudit('${item.id}')">
                    <span>Edit Audit</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
            </div>`}
        </div>`;
    }

    window.appAudit = async function (id) {
        const item = await AssetsDB.getById(id);
        if (!item) return showToast('Data tidak ditemukan', 'error');

        auditId.value = id;

        auditInfo.innerHTML = `
            <div><strong>Kode:</strong> ${esc(item.kode_barang)}</div>
            <div><strong>Nama:</strong> ${esc(item.nama_barang)}</div>
            <div><strong>Lokasi:</strong> ${esc(item.lokasi)}</div>
            <div><strong>Kategori:</strong> ${esc(item.kategori || '-')}</div>
        `;

        auditStatus.value = item.audit_status || "";
        auditVisual.value = item.audit_visual || "";
        auditLokasi.value = item.audit_lokasi || "";
        auditPetugas.value = item.audit_petugas || "";
        auditKeterangan.value = item.audit_keterangan || "";

        // Show Reset button only if already audited
        if (btnAuditReset) {
            btnAuditReset.style.display = item.audit_status ? 'inline-flex' : 'none';
        }

        if (item.audit_status === 'Rusak') {
            groupAuditFoto.style.display = 'block';
        } else {
            groupAuditFoto.style.display = 'none';
        }

        if (item.audit_status === 'Hilang') {
            auditVisual.disabled = true;
            auditLokasi.disabled = true;
            auditVisual.style.opacity = '0.5';
            auditLokasi.style.opacity = '0.5';
        } else {
            auditVisual.disabled = false;
            auditLokasi.disabled = false;
            auditVisual.style.opacity = '1';
            auditLokasi.style.opacity = '1';
        }

        if (item.audit_foto) {
            auditImg.src = item.audit_foto;
            auditFotoPreview.style.display = 'block';
        } else {
            auditImg.src = '';
            auditFotoPreview.style.display = 'none';
        }

        auditFoto.value = '';
        auditOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    if (auditStatus) {
        auditStatus.addEventListener('change', function () {
            if (this.value === 'Rusak') {
                groupAuditFoto.style.display = 'block';
            } else {
                groupAuditFoto.style.display = 'none';
                if (auditFoto) auditFoto.value = '';
                if (auditFotoPreview) auditFotoPreview.style.display = 'none';
                if (auditImg) auditImg.src = '';
            }

            if (this.value === 'Hilang') {
                auditVisual.value = '';
                auditVisual.disabled = true;
                auditVisual.style.opacity = '0.5';
                auditLokasi.value = '';
                auditLokasi.disabled = true;
                auditLokasi.style.opacity = '0.5';
            } else {
                auditVisual.disabled = false;
                auditVisual.style.opacity = '1';
                auditLokasi.disabled = false;
                auditLokasi.style.opacity = '1';
            }
        });
    }

    if (auditFoto) {
        auditFoto.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                // Validasi Mimetype Gambar Secara Realtime
                if (!file.type.startsWith('image/')) {
                    showToast('Hanya diperbolehkan upload file gambar (JPG/PNG/dsb)!', 'error');
                    this.value = '';
                    auditFotoPreview.style.display = 'none';
                    return;
                }
                // Validasi Batas 2MB Secara Realtime
                if (file.size > 2 * 1024 * 1024) {
                    showToast('Ukuran foto tidak boleh lebih besar dari 2MB!', 'error');
                    this.value = '';
                    auditFotoPreview.style.display = 'none';
                    return;
                }
                const reader = new FileReader();
                reader.onload = function (evt) {
                    const img = new Image();
                    img.onload = function () {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;

                        // Agresif: Max lebar 700px agar muat gampang di database Firestore (bukan upload Storage)
                        const MAX_WIDTH = 700;
                        if (width > MAX_WIDTH) {
                            height = Math.round((height * MAX_WIDTH) / width);
                            width = MAX_WIDTH;
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        // Kompres jadi JPEG kuliatas 60% (hasil antara 100-300KB)
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);

                        // Validasi ukuran foto untuk Supabase (Max ~1MB per field)
                        if (dataUrl.length > 900000) {
                            showToast('Gambar sangat rumit, kompresi gagal di bawah limit. Coba ambil foto lain!', 'error');
                            auditFoto.value = '';
                            if (auditFotoPreview) auditFotoPreview.style.display = 'none';
                            return;
                        }

                        if (auditImg) auditImg.src = dataUrl;
                        if (auditFotoPreview) auditFotoPreview.style.display = 'block';
                    }
                    img.src = evt.target.result;
                }
                reader.readAsDataURL(file);
            } else {
                auditFotoPreview.style.display = 'none';
            }
        });
    }

    if (auditForm) {
        auditForm.addEventListener('submit', async e => {
            e.preventDefault();

            const btnText = btnAuditSave.textContent;
            btnAuditSave.textContent = 'Menyimpan...';
            btnAuditSave.disabled = true;

            try {
                // Di sini auditImg.src sudah berisi Base64 string dari HTML5 Canvas! (Sudah mini ~200KB)
                // Jadi kita LANGSUNG tembak teks ini ke database! (Fully Offline Supported!)
                let fileUrl = auditImg.src || '';

                const auditData = {
                    id: auditId.value,
                    audit_status: auditStatus.value,
                    audit_visual: auditVisual.value,
                    audit_lokasi: auditLokasi.value,
                    audit_petugas: auditPetugas.value,
                    audit_keterangan: auditKeterangan.value.trim(),
                };

                if (fileUrl) auditData.audit_foto = fileUrl;

                await AssetsDB.update(auditData);
                showToast('Hasil Audit Tersimpan!', 'success');
                closeAudit();
                await renderAssets();
            } catch (err) {
                console.error(err);
                showToast('Gagal menyimpan: ' + err.message, 'error');
            } finally {
                btnAuditSave.textContent = btnText;
                btnAuditSave.disabled = false;
            }
        });
    }

    function closeAudit() {
        auditOverlay.classList.remove('active');
        document.body.style.overflow = '';
        auditForm.reset();
    }
    if (btnAuditClose) btnAuditClose.addEventListener('click', closeAudit);
    if (btnAuditCancel) btnAuditCancel.addEventListener('click', closeAudit);
    if (auditOverlay) auditOverlay.addEventListener('click', e => { if (e.target === auditOverlay) closeAudit(); });

    if (btnAuditReset) {
        btnAuditReset.addEventListener('click', async () => {
            const id = auditId.value;
            if (!id || !confirm('Batalkan data audit aset ini?')) return;
            await AssetsDB.update({ id, audit_status: '', audit_visual: '', audit_lokasi: '', audit_petugas: '', audit_keterangan: '', audit_foto: '' });
            showToast('Data audit berhasil dibatalkan!', 'success');
            closeAudit();
            await renderAssets();
        });
    }

    function updateStats(items) {
        document.querySelector('#stat-total .stat-value').textContent = items.length;
    }



    // ── Modal ──
    function openModal(title) {
        modalTitle.textContent = title;
        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => formKode.focus(), 300);
    }
    function closeModal() {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        assetForm.reset();
        formId.value = '';
    }

    btnAdd.addEventListener('click', () => { assetForm.reset(); formId.value = ''; openModal('Tambah Aset'); });

    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', async () => {
            const btnText = btnExportExcel.innerHTML;
            btnExportExcel.innerHTML = '<span>⏳ Mengekspor...</span>';
            btnExportExcel.disabled = true;

            try {
                const allItems = await AssetsDB.getAll();
                // If user has selected items via checkboxes, export only those; otherwise export all audited
                let items;
                if (selectedIds.size > 0) {
                    items = allItems.filter(item => selectedIds.has(item.id) && item.audit_status);
                } else {
                    items = allItems.filter(item => item.audit_status);
                }

                if (!items || items.length === 0) {
                    showToast('Belum ada data yang diaudit, tidak ada yang bisa diekspor.', 'error');
                    btnExportExcel.innerHTML = btnText;
                    btnExportExcel.disabled = false;
                    return;
                }

                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Laporan_Audit');

                // Define Columns
                worksheet.columns = [
                    { width: 5 }, { width: 15 }, { width: 25 }, { width: 15 }, { width: 15 },
                    { width: 20 }, { width: 15 }, { width: 20 }, { width: 25 }, { width: 25 },
                    { width: 35 }, { width: 35 }
                ];

                // Add Headers
                worksheet.addRow(["No.", "Asset Code", "Asset Name", "Class", "Subclass", "Kondisi", "", "Location", "Validasi Lokasi (Sesuai / Pindah)", "Petugas Cek", "Foto Kondisi Kerusakan", "Keterangan"]);
                worksheet.addRow(["", "", "", "", "", "Status Inventory (Normal / Rusak / Hilang)", "visual ( OK / NG )", "", "", "", "", ""]);

                // Merging header cells
                worksheet.mergeCells('A1:A2');
                worksheet.mergeCells('B1:B2');
                worksheet.mergeCells('C1:C2');
                worksheet.mergeCells('D1:D2');
                worksheet.mergeCells('E1:E2');
                worksheet.mergeCells('F1:G1');
                worksheet.mergeCells('H1:H2');
                worksheet.mergeCells('I1:I2');
                worksheet.mergeCells('J1:J2');
                worksheet.mergeCells('K1:K2');
                worksheet.mergeCells('L1:L2');

                // Style Headers
                for(let i = 1; i <= 2; i++) {
                    worksheet.getRow(i).eachCell(cell => {
                        cell.font = { bold: true };
                        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                    });
                }

                // Append Data
                for (let idx = 0; idx < items.length; idx++) {
                    const item = items[idx];
                    const row = worksheet.addRow([
                        idx + 1,
                        item.kode_barang || '',
                        item.nama_barang || '',
                        item.kategori || '',
                        item.subkategori || '',
                        item.audit_status || '',
                        item.audit_status === 'Hilang' ? 'freeze' : (item.audit_visual || ''),
                        item.lokasi || '',
                        item.audit_status === 'Hilang' ? 'freeze' : (item.audit_lokasi || ''),
                        item.audit_petugas || '',
                        '', // Placeholder for image
                        item.audit_keterangan || ''
                    ]);
                    
                    row.eachCell(cell => {
                        cell.alignment = { vertical: 'middle', wrapText: true };
                        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                    });

                    // Embed Image if exists
                    if (item.audit_foto) {
                        try {
                            const b64 = await new Promise((resolve) => {
                                // Skip if not a valid data URL
                                if (typeof item.audit_foto !== 'string' || !item.audit_foto.startsWith('data:image')) {
                                    return resolve(null);
                                }
                                const img = new Image();
                                img.onerror = () => resolve(null);
                                img.onload = () => {
                                    try {
                                        const cvs = document.createElement('canvas');
                                        cvs.width = img.width;
                                        cvs.height = img.height;
                                        const ctx = cvs.getContext('2d');
                                        ctx.drawImage(img, 0, 0);
                                        resolve(cvs.toDataURL('image/png').split('base64,')[1]);
                                    } catch(e) {
                                        resolve(null);
                                    }
                                };
                                img.src = item.audit_foto;
                            });

                            if (b64) {
                                const imageId = workbook.addImage({
                                    base64: b64,
                                    extension: 'png',
                                });
                                
                                // Adjust row height for image
                                row.height = 100;

                                worksheet.addImage(imageId, {
                                    tl: { col: 10.1, row: row.number - 1 + 0.1 },
                                    br: { col: 10.9, row: row.number - 0.1 },
                                    editAs: 'oneCell'
                                });
                            } else {
                                // No valid image data — leave cell empty
                            }
                        } catch (e) {
                            console.error('Add image to excel error:', e);
                            // Leave cell empty on error
                        }
                    }
                    // No else — if no foto, column stays empty
                }

                // Generate Buffer using WriteBuffer
                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const dateSplit = new Date().toISOString().split('T')[0];
                saveAs(blob, `Laporan_Audit_Aset_${dateSplit}.xlsx`);

                showToast('Laporan Excel berhasil didownload!', 'success');
            } catch (err) {
                console.error(err);
                showToast('Gagal mengekspor laporan: ' + err.message, 'error');
            } finally {
                btnExportExcel.innerHTML = btnText;
                btnExportExcel.disabled = false;
            }
        });
    }

    if (btnImport && fileImport) {
        btnImport.addEventListener('click', () => {
            fileImport.click();
        });

        fileImport.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (loadingState) {
                assetList.style.display = 'none';
                emptyState.style.display = 'none';
                loadingState.style.display = 'block';
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    let importedCount = 0;

                    // Hitung total baris di seluruh sheet terlebih dahulu
                    let totalRows = 0;
                    const allRows = [];
                    for (const sheetName of workbook.SheetNames) {
                        const worksheet = workbook.Sheets[sheetName];
                        // MENGGUNAKAN { header: 1 } agar data dibaca langsung sebagai array baris-per-baris
                        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                        if (rows && rows.length > 0) {
                            totalRows += rows.length;
                            allRows.push(...rows);
                        }
                    }

                    for (let i = 0; i < allRows.length; i++) {
                        const row = allRows[i];
                        if (!row || row.length < 2) continue; // Abaikan baris kosong

                        // Memperbarui UI Teks Loading dengan Persentase
                        const loadingText = document.getElementById('loading-text');
                        if (loadingText) {
                            const percent = Math.floor(((i + 1) / totalRows) * 100);
                            loadingText.innerHTML = `Melacak Anti-Ganda: <strong>${percent}%</strong><br><small>(${i + 1} dari ${totalRows} Aset)</small>`;
                        }

                        // JIKA kebetulan baris pertama adalah judul (Header), lewati saja
                        const firstCol = String(row[0] || '').toLowerCase().trim();
                        const secondCol = String(row[1] || '').toLowerCase().trim();
                        if (firstCol === 'status' || secondCol.includes('kode')) continue;

                        // EKSTRAKSI KHUSUS sesuai struktur kolom dataset
                        // 0=status | 1=assetcode | 2=assetname | 3=class | 4=subclass | 5=(gap) | 6=(gap) | 7=(gap) | 8=type | 9=location
                        const kondisiStr = row[0] ? String(row[0]).trim() : 'Aktif';

                        // ID KRUSIAL: kode dari kolom B (index 1)
                        let kodeStr = row[1] ? String(row[1]).trim() : '';
                        if (!kodeStr) {
                            kodeStr = `INV-${Math.floor(Math.random() * 100000)}`;
                        }

                        const nama        = row[2] ? String(row[2]).trim() : 'Tanpa Nama';
                        const kategori    = row[3] ? String(row[3]).trim() : '';
                        const subkategori = row[4] ? String(row[4]).trim() : '';
                        const tipe        = row[8] ? String(row[8]).trim() : '';
                        const lokasi      = row[9] ? String(row[9]).trim() : '-';

                        let kondisi = 'Active';
                        const ks = String(kondisiStr).toLowerCase();
                        if (ks.includes('inactive') || ks.includes('nonaktif') || ks.includes('rusak') || ks.includes('hilang')) kondisi = 'Inactive';

                        const asset = {
                            kode_barang:  kodeStr,
                            nama_barang:  nama,
                            kategori:     kategori,
                            subkategori:  subkategori,
                            tipe:         tipe,
                            lokasi:       lokasi,
                            jumlah:       1,
                            kondisi:      kondisi,
                        };

                        await AssetsDB.add(asset);
                        importedCount++;
                    }

                    fileImport.value = ''; // Reset file input

                    if (importedCount > 0) {
                        showToast(`${importedCount} data dari semua sheet berhasil diimport!`, 'success');
                    } else {
                        showToast('File kosong atau tidak ada data yang valid', 'error');
                    }

                    await renderAssets();
                } catch (err) {
                    console.error('Import error:', err);
                    showToast('Gagal memproses file Excel/CSV', 'error');
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    btnModalClose.addEventListener('click', closeModal);
    btnCancel.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

    // ── Form Submit ──
    assetForm.addEventListener('submit', async e => {
        e.preventDefault();
        const asset = {
            kode_barang: formKode.value.trim(),
            nama_barang: formNama.value.trim(),
            kategori: formKategori.value,
            lokasi: formLokasi.value.trim(),
            jumlah: parseInt(formJumlah.value, 10) || 1,
            kondisi: formKondisi.value,
            keterangan: formKeterangan.value.trim(),
        };
        try {
            if (formId.value) {
                asset.id = formId.value;
                const existing = await AssetsDB.getById(asset.id);
                if (existing) asset.tanggal = existing.tanggal;
                await AssetsDB.update(asset);
                showToast('Aset berhasil diperbarui', 'success');
            } else {
                await AssetsDB.add(asset);
                showToast('Aset berhasil ditambahkan', 'success');
            }
            closeModal();
            await renderAssets();
        } catch (err) {
            showToast('Gagal menyimpan: ' + err.message, 'error');
        }
    });

    // ── Edit ──
    window.appEditAsset = async function (id) {
        const item = await AssetsDB.getById(id);
        if (!item) return showToast('Data tidak ditemukan', 'error');
        formId.value = item.id;
        formKode.value = item.kode_barang;
        formNama.value = item.nama_barang;
        formKategori.value = item.kategori || '';
        formLokasi.value = item.lokasi;
        formJumlah.value = item.jumlah;
        formKondisi.value = item.kondisi;
        formKeterangan.value = item.keterangan || '';
        openModal('Edit Aset');
    };

    // ── Delete ──
    if (btnDeleteAll) {
        btnDeleteAll.addEventListener('click', () => {
            deleteTargetId = 'all';
            confirmText.textContent = 'Apakah Anda yakin ingin menghapus SEMUA data aset? Aksi ini tidak dapat dibatalkan.';
            confirmOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    window.appDeleteAsset = function (id, name) {
        deleteTargetId = id;
        confirmText.textContent = 'Apakah Anda yakin ingin menghapus "' + name + '"?';
        confirmOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };
    btnConfirmDelete.addEventListener('click', async () => {
        if (deleteTargetId === 'all') {
            await AssetsDB.clear();
            showToast('Semua data berhasil dikosongkan!', 'success');
            await renderAssets();
            deleteTargetId = null;
        } else if (deleteTargetId !== null) {
            await AssetsDB.delete(deleteTargetId);
            showToast('Aset berhasil dihapus', 'success');
            await renderAssets();
            deleteTargetId = null;
        }
        confirmOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });
    btnConfirmCancel.addEventListener('click', () => {
        deleteTargetId = null;
        confirmOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });
    confirmOverlay.addEventListener('click', e => {
        if (e.target === confirmOverlay) { deleteTargetId = null; confirmOverlay.classList.remove('active'); document.body.style.overflow = ''; }
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (confirmOverlay.classList.contains('active')) { deleteTargetId = null; confirmOverlay.classList.remove('active'); document.body.style.overflow = ''; }
            else if (auditOverlay && auditOverlay.classList.contains('active')) closeAudit();
            else if (modalOverlay.classList.contains('active')) closeModal();
        }
    });

    // ── Search & Filter ──
    let st;
    searchInput.addEventListener('input', () => { clearTimeout(st); st = setTimeout(renderAssets, 250); });
    if (filterAudit) filterAudit.addEventListener('change', () => {
        localStorage.setItem('filterAudit', filterAudit.value);
        selectedIds.clear();
        clearTimeout(st);
        st = setTimeout(renderAssets, 250);
    });

    // ── Utilities ──
    function showToast(msg, type) {
        toastEl.textContent = msg;
        toastEl.className = 'toast ' + type + ' show';
        setTimeout(() => toastEl.classList.remove('show'), 3000);
    }
    function formatDate(iso) {
        if (!iso) return '-';
        return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    function esc(s) {
        if (!s) return '';
        const m = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return s.replace(/[&<>"']/g, c => m[c]);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
