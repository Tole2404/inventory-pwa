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
    const btnInstall = document.getElementById('btn-install');
    const btnAdd = document.getElementById('btn-add');
    const btnDeleteAll = document.getElementById('btn-delete-all');
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

    // ── Init ──
    async function init() {
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
        updateStorageInfo();

        if (loadingState) loadingState.style.display = 'none';

        if (!query) {
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

        let items = allItems.filter(i =>
            i.nama_barang.toLowerCase().includes(query) ||
            i.kode_barang.toLowerCase().includes(query) ||
            i.lokasi.toLowerCase().includes(query) ||
            (i.kategori && i.kategori.toLowerCase().includes(query))
        );

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
            assetList.innerHTML = items.map((item, i) => cardHTML(item, i)).join('');
        }
    }

    function cardHTML(item, idx) {
        const sc = String(item.kondisi).toLowerCase().replace(/[^a-z]/g, '');
        const auditBadge = item.audit_petugas ? `<div style="background:rgba(16,185,129,0.2);color:#34d399;padding:4px 8px;border-radius:12px;font-size:11px;display:inline-block;margin-top:8px;">✅ Diaudit: ${esc(item.audit_petugas)}</div>` : '';
        
        return `<div class="asset-card" style="animation-delay:${idx*0.04}s" onclick="appAudit('${item.id}')">
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
                <div class="detail-item"><span class="detail-label">Kategori</span><span class="detail-value">${esc(item.kategori||'-')}</span></div>
                <div class="detail-item"><span class="detail-label">Lokasi</span><span class="detail-value">${esc(item.lokasi)}</span></div>
            </div>
            <div class="card-actions-single">
                <button class="btn-detail">
                    <span>Lihat Detail</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
            </div>
        </div>`;
    }

    window.appAudit = async function(id) {
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
        
        if (item.audit_status === 'Rusak') {
            groupAuditFoto.style.display = 'block';
        } else {
            groupAuditFoto.style.display = 'none';
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
        auditStatus.addEventListener('change', function() {
            if (this.value === 'Rusak') {
                groupAuditFoto.style.display = 'block';
            } else {
                groupAuditFoto.style.display = 'none';
                if (auditFoto) auditFoto.value = '';
                if (auditFotoPreview) auditFotoPreview.style.display = 'none';
                if (auditImg) auditImg.src = '';
            }
        });
    }

    if (auditFoto) {
        auditFoto.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 2 * 1024 * 1024) {
                    showToast('Ukuran foto melebihi 2MB!', 'error');
                    this.value = '';
                    auditFotoPreview.style.display = 'none';
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(evt) {
                    auditImg.src = evt.target.result;
                    auditFotoPreview.style.display = 'block';
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
            
            const file = auditFoto.files[0];
            if (file && !navigator.onLine) {
                showToast('Gagal: Upload foto memerlukan koneksi Internet!', 'error');
                return;
            }

            const btnText = btnAuditSave.textContent;
            btnAuditSave.textContent = 'Menyimpan...';
            btnAuditSave.disabled = true;

            try {
                let fileUrl = auditImg.src && !auditImg.src.startsWith('data:') ? auditImg.src : '';
                if (file) {
                    const extension = file.name.split('.').pop() || 'jpg';
                    const filename = `${auditId.value}_${Date.now()}.${extension}`;
                    fileUrl = await AssetsDB.uploadPhoto(file, filename);
                }

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

    function updateStats(items) {
        document.querySelector('#stat-total .stat-value').textContent = items.length;
    }

    async function updateStorageInfo() {
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                const usage = estimate.usage; // in bytes
                const storageValue = document.getElementById('storage-value');
                if (storageValue) {
                    if (usage > 1024 * 1024) {
                        storageValue.textContent = (usage / (1024 * 1024)).toFixed(2) + ' MB';
                    } else {
                        storageValue.textContent = (usage / 1024).toFixed(1) + ' KB';
                    }
                }
            } catch (e) {
                console.error('Storage estimation error:', e);
            }
        }
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

                        // EKSTRAKSI KHUSUS (MENGANUT STRUKTUR FOTO EXCEL USER)
                        const kondisiStr = row[0] ? String(row[0]).trim() : 'Aktif';
                        
                        // ID KRUSIAL: Jika kode dicomot dari Kolom ke-2 (Index 1) => Tidak mungkin duplikasi!
                        let kodeStr = row[1] ? String(row[1]).trim() : '';
                        if (!kodeStr) { 
                            kodeStr = `INV-${Math.floor(Math.random() * 100000)}`; 
                        }

                        const nama = row[3] ? String(row[3]).trim() : 'Tanpa Nama';
                        const kategori = row[4] ? String(row[4]).trim() : 'Lainnya';
                        const lokasi = row[5] ? String(row[5]).trim() : '-';
                        const jumlahStr = 1;
                        const keterangan = row[6] ? String(row[6]).trim() : '';

                        let kondisi = 'Active';
                        const ks = String(kondisiStr).toLowerCase();
                        if (ks.includes('inactive') || ks.includes('nonaktif') || ks.includes('rusak') || ks.includes('hilang')) kondisi = 'Inactive';

                        const asset = {
                            kode_barang: kodeStr,
                            nama_barang: nama,
                            kategori: kategori,
                            lokasi: lokasi,
                            jumlah: parseInt(jumlahStr, 10) || 1,
                            kondisi: kondisi,
                            keterangan: keterangan,
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
