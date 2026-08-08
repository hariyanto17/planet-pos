# Alur Transfer Produk Gudang (Dengan Kontrol Akses Penugasan)

Dokumen ini merinci implementasi **saat ini** untuk alur Transfer Produk Gudang dalam proyek ini setelah penerapan kontrol akses tingkat gudang.

---

## 1. Gambaran Umum (Overview)

**Transfer Gudang** memindahkan inventaris fisik antar gudang yang berbeda (misalnya, dari gudang utama/penyimpanan pusat ke outlet penjualan ritel atau penyimpanan dapur).

### Aturan Penugasan & Kontrol Akses
* **Pengguna WAREHOUSE**:
  * Harus ditugaskan ke **tepat satu gudang aktif** (`User.warehouseId` wajib diisi).
  * Hanya diizinkan melihat stok dan mutasi dari gudang penugasan mereka.
  * Pembuatan transfer dibatasi: Gudang asal harus merupakan gudang penugasan mereka.
  * Penyelesaian transfer dibatasi: Hanya dapat menerima transfer yang bertujuan ke gudang penugasan mereka.
* **Pengguna KITCHEN**:
  * **Tidak memiliki penugasan gudang individu** (`User.warehouseId` selalu `null`).
  * Semua staf dapur berbagi akses ke **Penyimpanan Dapur Default** (gudang bertipe `KITCHEN_STORAGE` dengan bendera `isDefaultKitchenStorage = true`).
  * Dapat meminta/membuat transfer stok dari gudang mana pun, namun gudang tujuan dikunci secara otomatis ke Penyimpanan Dapur Default.
  * Hanya dapat menyelesaikan transfer yang bertujuan ke Penyimpanan Dapur.
* **Pengguna ADMIN**:
  * Memiliki akses penuh tanpa batasan penugasan gudang. Bisa mengelola semua stok, transfer, dan mengubah penugasan staf.

---

## 2. Alur Transfer Aktual

Alur transfer aktual yang diberlakukan oleh codebase backend dan frontend adalah sebagai berikut:

```
[ Pengguna ADMIN / WAREHOUSE / KITCHEN ]
           ↓
   Dashboard Inventaris (Stok Admin)
           ↓
   Klik Tombol "Transfer"
           ↓
   Pengisian Modal Transfer (Dibatasi secara dinamis sesuai peran):
   - WAREHOUSE: Gudang Asal dikunci ke gudang penugasannya (Disabled). Gudang Tujuan bebas dipilih.
   - KITCHEN: Gudang Tujuan dikunci ke Penyimpanan Dapur (Disabled). Gudang Asal bebas dipilih.
   - ADMIN: Bebas memilih Asal dan Tujuan.
           ↓
   Klik "Buat Transfer" -> Menyimpan Dokumen StockTransfer berstatus DRAFT di Database.
   (Belum ada pengurangan atau penambahan stok!)
           ↓
   API Backend dipanggil untuk Menyelesaikan Transfer:
   POST /api/inventory/transfer/:id/complete
   (Keamanan backend memverifikasi peran dan penugasan sebelum memproses transaksi ledger secara atomik)
           ↓
   Status berubah menjadi: COMPLETED (Stok Gudang & Buku Besar Ledger Diperbarui secara atomik)
```

---

## 3. Matriks Otorisasi Peran & Gudang (RBAC & Assignment)

| Tindakan | ADMIN | WAREHOUSE (Gudang Y) | KITCHEN | CASHIER / ACCOUNTING |
|---|---|---|---|---|
| **Lihat Stok & Mutasi** | Semua Gudang | Hanya Gudang Y | Hanya Kitchen Storage | Semua Gudang (Read-Only) |
| **Buat Transfer** | Semua Gudang | Asal wajib Gudang Y | Tujuan wajib Kitchen Storage | ❌ |
| **Selesaikan / Terima** | Semua Gudang | Tujuan wajib Gudang Y | Tujuan wajib Kitchen Storage | ❌ |

---

## 4. Validasi Keamanan API (Backend Security Enforcement)

Backend memverifikasi seluruh permintaan dan tidak hanya mengandalkan status UI frontend:

1. **Query Stok & Pergerakan** (`GET /api/inventory/products` / `GET /api/inventory/movements`):
   * Jika peran adalah `WAREHOUSE`, parameter `warehouseId` dipaksa ke `req.user.warehouseId`. Percobaan mengirim `warehouseId` lain dibalas dengan `403 Forbidden`.
   * Jika peran adalah `KITCHEN`, parameter `warehouseId` dipaksa ke ID dari Penyimpanan Dapur default.
2. **Mutasi Stok (Adjustment, Waste, Receipt, Opening)**:
   * Jika peran adalah `WAREHOUSE`, `warehouseId` dalam body harus cocok dengan `req.user.warehouseId`. Jika tidak cocok, kembalikan `403 Forbidden`.
3. **Pembuatan Transfer** (`POST /api/inventory/transfer`):
   * WAREHOUSE: `sourceWarehouseId` harus cocok dengan `req.user.warehouseId`.
   * KITCHEN: `destinationWarehouseId` harus cocok dengan default `KITCHEN_STORAGE`.
4. **Penyelesaian Transfer** (`POST /api/inventory/transfer/:id/complete`):
   * WAREHOUSE: `transfer.destinationWarehouseId` harus cocok dengan `req.user.warehouseId`.
   * KITCHEN: `transfer.destinationWarehouse.warehouseType` harus berupa `KITCHEN_STORAGE`.

---

## 5. Status Transfer

Status yang didukung dalam implementasi kode adalah:

| Status | Arti | Siapa yang dapat mengubah | Status Berikutnya |
|---|---|---|---|
| **DRAFT** | Dokumen transfer telah dibuat tetapi belum dieksekusi. | Pengguna `ADMIN` atau `WAREHOUSE` | `COMPLETED` |
| **COMPLETED** | Transfer berhasil dieksekusi, stok diperbarui, dan catatan ledger ditulis. | `ADMIN`, `WAREHOUSE`, atau `KITCHEN` (sesuai aturan akses) | Tidak ada (Terminal) |
