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
            const { data, error } = await _db.from(TABLE).select('*').order('tanggal', { ascending: false });
            if (error) throw error;
            return data || [];
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
