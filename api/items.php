<?php
/**
 * items.php — Simple REST API for Assets Inventory
 * Uses a flat JSON file as storage (no database server needed)
 * 
 * Endpoints:
 *   GET    /api/items.php          → Get all items
 *   GET    /api/items.php?id=1     → Get single item
 *   POST   /api/items.php          → Add item
 *   PUT    /api/items.php?id=1     → Update item
 *   DELETE /api/items.php?id=1     → Delete item
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataFile = __DIR__ . '/data.json';

// Initialize data file if not exists
if (!file_exists($dataFile)) {
    file_put_contents($dataFile, json_encode(['items' => [], 'nextId' => 1], JSON_PRETTY_PRINT));
}

// Read data
function readData() {
    global $dataFile;
    $content = file_get_contents($dataFile);
    return json_decode($content, true) ?: ['items' => [], 'nextId' => 1];
}

// Write data
function writeData($data) {
    global $dataFile;
    file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// Response helper
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? intval($_GET['id']) : null;

switch ($method) {
    case 'GET':
        $data = readData();
        if ($id) {
            $found = null;
            foreach ($data['items'] as $item) {
                if ($item['id'] === $id) { $found = $item; break; }
            }
            if ($found) {
                jsonResponse($found);
            } else {
                jsonResponse(['error' => 'Item tidak ditemukan'], 404);
            }
        } else {
            jsonResponse($data['items']);
        }
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || empty($input['kode_barang']) || empty($input['nama_barang'])) {
            jsonResponse(['error' => 'kode_barang dan nama_barang wajib diisi'], 400);
        }
        $data = readData();
        $newItem = [
            'id' => $data['nextId']++,
            'kode_barang' => $input['kode_barang'],
            'nama_barang' => $input['nama_barang'],
            'kategori' => $input['kategori'] ?? '',
            'lokasi' => $input['lokasi'] ?? '',
            'jumlah' => intval($input['jumlah'] ?? 1),
            'kondisi' => $input['kondisi'] ?? 'Aktif',
            'keterangan' => $input['keterangan'] ?? '',
            'tanggal' => date('c'),
        ];
        $data['items'][] = $newItem;
        writeData($data);
        jsonResponse($newItem, 201);
        break;

    case 'PUT':
        if (!$id) jsonResponse(['error' => 'ID diperlukan'], 400);
        $input = json_decode(file_get_contents('php://input'), true);
        $data = readData();
        $found = false;
        foreach ($data['items'] as &$item) {
            if ($item['id'] === $id) {
                $item['kode_barang'] = $input['kode_barang'] ?? $item['kode_barang'];
                $item['nama_barang'] = $input['nama_barang'] ?? $item['nama_barang'];
                $item['kategori'] = $input['kategori'] ?? $item['kategori'];
                $item['lokasi'] = $input['lokasi'] ?? $item['lokasi'];
                $item['jumlah'] = intval($input['jumlah'] ?? $item['jumlah']);
                $item['kondisi'] = $input['kondisi'] ?? $item['kondisi'];
                $item['keterangan'] = $input['keterangan'] ?? $item['keterangan'];
                $item['tanggal_update'] = date('c');
                $found = true;
                jsonResponse($item);
            }
        }
        if (!$found) jsonResponse(['error' => 'Item tidak ditemukan'], 404);
        break;

    case 'DELETE':
        if (!$id) jsonResponse(['error' => 'ID diperlukan'], 400);
        $data = readData();
        $newItems = [];
        $found = false;
        foreach ($data['items'] as $item) {
            if ($item['id'] === $id) { $found = true; continue; }
            $newItems[] = $item;
        }
        if (!$found) jsonResponse(['error' => 'Item tidak ditemukan'], 404);
        $data['items'] = $newItems;
        writeData($data);
        jsonResponse(['message' => 'Item berhasil dihapus']);
        break;

    default:
        jsonResponse(['error' => 'Method tidak didukung'], 405);
}
