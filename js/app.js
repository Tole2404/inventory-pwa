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
        return `<div class="asset-card" style="animation-delay:${idx*0.04}s" onclick="appDetail('${item.id}')">
            <div class="card-header">
                <div class="card-title-group">
                    <div class="card-kode">${esc(item.kode_barang)}</div>
                    <div class="card-nama" title="${esc(item.nama_barang)}">${esc(item.nama_barang)}</div>
                </div>
                <span class="status-badge ${sc}">${esc(item.kondisi)}</span>
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

    window.appDetail = async function(id) {
        const item = await AssetsDB.getById(id);
        if (!item) return showToast('Data tidak ditemukan', 'error');

        const ket = item.keterangan ? `<div class="detail-keterangan"><strong>Catatan:</strong><br>${esc(item.keterangan).replace(/\\n/g, '<br>')}</div>` : '';
        const dt = formatDate(item.tanggal);
        const sc = String(item.kondisi).toLowerCase().replace(/[^a-z]/g, '');

        detailContent.innerHTML = `
            <table class="detail-table">
                <tr><td>Kode Barang</td><td>${esc(item.kode_barang)}</td></tr>
                <tr><td>Nama Barang</td><td><strong>${esc(item.nama_barang)}</strong></td></tr>
                <tr><td>Kategori</td><td>${esc(item.kategori || '-')}</td></tr>
                <tr><td>Lokasi</td><td>${esc(item.lokasi)}</td></tr>
                <tr><td>Status</td><td><span class="status-badge ${sc}">${esc(item.kondisi)}</span></td></tr>
            </table>
            ${ket}
        `;
        detailOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    if (btnDetailClose) {
        btnDetailClose.addEventListener('click', () => {
            detailOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
        detailOverlay.addEventListener('click', e => {
            if (e.target === detailOverlay) {
                detailOverlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

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
                    
                    for (const sheetName of workbook.SheetNames) {
                        const worksheet = workbook.Sheets[sheetName];
                        const json = XLSX.utils.sheet_to_json(worksheet);

                        if (!json || json.length === 0) continue;

                        for (const row of json) {
                            // Helper to loosely match column names
                            const getVal = (obj, keys) => {
                                const foundKey = Object.keys(obj).find(k => keys.some(key => k.toLowerCase().replace(/[^a-z0-9]/g, '') === key.toLowerCase().replace(/[^a-z0-9]/g)) || keys.some(key => k.toLowerCase().includes(key.toLowerCase())));
                                return foundKey ? obj[foundKey] : null;
                            };

                            const kode = getVal(row, ['kodebarang', 'kode', 'assetcode', 'assetco']) || `INV-${Math.floor(Math.random() * 100000)}`;
                            const nama = getVal(row, ['namabarang', 'nama', 'assetname', 'assetna', 'item']) || 'Tanpa Nama';
                            const kategori = getVal(row, ['kategori', 'category', 'jenis', 'type', 'tipe', 'group', 'golongan', 'klasifikasi']) || 'Lainnya';
                            const lokasi = getVal(row, ['lokasi', 'location']) || '-';
                            const jumlahStr = getVal(row, ['jumlah', 'quantity', 'qty']) || '1';
                            const kondisiStr = getVal(row, ['kondisi', 'status']) || 'Aktif';
                            const keterangan = getVal(row, ['keterangan', 'note', 'description', 'desc']) || '';
                            
                            // normalize kondisi
                            let kondisi = 'Active';
                            const ks = String(kondisiStr).toLowerCase();
                            if (ks.includes('inactive') || ks.includes('nonaktif') || ks.includes('rusak') || ks.includes('hilang')) kondisi = 'Inactive';

                            const asset = {
                                kode_barang: String(kode).trim(),
                                nama_barang: String(nama).trim(),
                                kategori: String(kategori).trim(),
                                lokasi: String(lokasi).trim(),
                                jumlah: parseInt(jumlahStr, 10) || 1,
                                kondisi: kondisi,
                                keterangan: String(keterangan).trim(),
                            };
                            
                            await AssetsDB.add(asset);
                            importedCount++;
                        }
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
            else if (detailOverlay && detailOverlay.classList.contains('active')) { detailOverlay.classList.remove('active'); document.body.style.overflow = ''; }
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
