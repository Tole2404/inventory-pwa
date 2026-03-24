// db.js (Supabase Edition)
const SUPABASE_URL = 'https://ureshufaiskkltturwrj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZXNodWZhaXNra2x0dHVyd3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzA2MDAsImV4cCI6MjA4OTkwNjYwMH0.sZx0X9bzCjA64ioiUKZgml3wsFJK8zLTekMCuefpMNU';

const _db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const TABLE = 'assets';

window.AssetsDB = {
    init: async function() {
        // No special init needed for Supabase
        return Promise.resolve();
    },

    getAll: async function() {
        try {
            let allData = [];
            let from = 0;
            const PAGE_SIZE = 1000;

            while (true) {
                const { data, error } = await _db
                    .from(TABLE)
                    .select('*')
                    .range(from, from + PAGE_SIZE - 1)
                    .order('tanggal', { ascending: false });

                if (error) throw error;
                if (!data || data.length === 0) break;

                allData = allData.concat(data);

                // Jika data yang dikembalikan kurang dari PAGE_SIZE, berarti sudah halaman terakhir
                if (data.length < PAGE_SIZE) break;

                from += PAGE_SIZE;
            }

            return allData;
        } catch (e) {
            console.error('Error getAll:', e);
            return [];
        }
    },

    getById: async function(id) {
        try {
            const { data, error } = await _db.from(TABLE).select('*').eq('id', id.toString()).single();
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('Error getById:', e);
            return null;
        }
    },

    add: async function(asset) {
        asset.tanggal = asset.tanggal || Date.now();
        try {
            // Use kode_barang as ID to prevent duplicates (same as Firebase logic)
            let docId = (asset.kode_barang || `INV-${Date.now()}`).toString().trim();
            docId = docId.replace(/[\/\#\.\$\[\]]/g, '-');
            asset.id = docId;

            // upsert: insert or update if ID already exists
            const { data, error } = await _db.from(TABLE).upsert(asset, { onConflict: 'id' }).select().single();
            if (error) throw error;
            return data.id;
        } catch (e) {
            console.error('Error add:', e);
            throw e;
        }
    },

    update: async function(asset) {
        asset.tanggal = Date.now();
        const id = asset.id;
        try {
            const { error } = await _db.from(TABLE).update(asset).eq('id', id.toString());
            if (error) throw error;
            return id;
        } catch (e) {
            console.error('Error update:', e);
            throw e;
        }
    },

    delete: async function(id) {
        try {
            const { error } = await _db.from(TABLE).delete().eq('id', id.toString());
            if (error) throw error;
        } catch (e) {
            console.error('Error delete:', e);
            throw e;
        }
    },

    uploadPhoto: async function(base64DataUrl, assetId) {
        try {
            // Convert Base64 data URL to Blob
            const res = await fetch(base64DataUrl);
            const blob = await res.blob();
            const ext = blob.type === 'image/png' ? 'png' : 'jpg';
            const fileName = `${assetId}_${Date.now()}.${ext}`;

            // Upload to Supabase Storage bucket 'audit-photos'
            const { data, error } = await _db.storage
                .from('audit-photos')
                .upload(fileName, blob, {
                    contentType: blob.type,
                    upsert: true
                });

            if (error) throw error;

            // Get public URL
            const { data: urlData } = _db.storage
                .from('audit-photos')
                .getPublicUrl(fileName);

            return urlData.publicUrl;
        } catch (e) {
            console.error('Error uploadPhoto:', e);
            throw e;
        }
    },

    deletePhoto: async function(photoUrl) {
        try {
            if (!photoUrl || !photoUrl.includes('audit-photos')) return;
            // Extract filename from URL
            const parts = photoUrl.split('/audit-photos/');
            if (parts.length < 2) return;
            const fileName = parts[1].split('?')[0];
            await _db.storage.from('audit-photos').remove([fileName]);
        } catch (e) {
            console.error('Error deletePhoto:', e);
        }
    },

    clear: async function() {
        try {
            // Delete all rows (neq '' matches all non-empty IDs)
            const { error } = await _db.from(TABLE).delete().neq('id', '____NONE____');
            if (error) throw error;
        } catch (e) {
            console.error('Error clear:', e);
            throw e;
        }
    }
};
