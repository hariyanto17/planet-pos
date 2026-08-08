# Audit & Rekomendasi - Manajemen Resep (Recipe / Bill of Materials)

Dokumen ini merinci hasil audit codebase planet-pos terkait implementasi fitur Resep (Recipe/BOM) untuk tipe inventaris `RAW_MATERIAL` dan `PACKAGING`.

---

## A. Arsitektur Saat Ini (Current Architecture)

1. **Prisma Schema (`schema.prisma`)**:
   * Enum `InventoryType` sudah terdefinisi dengan nilai: `FINISHED_GOOD`, `RAW_MATERIAL`, dan `PACKAGING`.
   * Model `Product` memiliki kolom `inventoryType` dengan nilai default `FINISHED_GOOD`.
   * **Manajemen Resep**: Saat ini **tidak ada model atau relasi** terkait resep (seperti `Recipe` atau `RecipeItem`) di dalam database schema.
2. **Alur Deduksi Stok POS (`orders/service.ts`)**:
   * Pengurangan stok otomatis terjadi pada fungsi `deductInventoryForOrder` saat pesanan diselesaikan.
   * Saat ini, sistem **hanya mendegradasi stok** jika `product.trackInventory === true` dan `product.inventoryType === "FINISHED_GOOD"`.
   * Logika ini secara langsung menulis entri ledger dengan tipe pergerakan `SALE` untuk produk yang dipesan itu sendiri. Pengurangan tidak meluas ke bahan baku (`RAW_MATERIAL`) atau kemasan (`PACKAGING`) karena resep belum terhubung.

---

## B. Rekomendasi Arsitektur Resep (Recommended Recipe Architecture)

* **RAW_MATERIAL & PACKAGING**: Berfungsi murni sebagai komponen resep. Tipe produk ini tidak dijual langsung di POS kasir (tidak memiliki harga eceran).
* **FINISHED_GOOD**: Produk akhir yang dijual di POS (misal: *Popcorn Salted XL*). Hanya produk bertipe `FINISHED_GOOD` yang dapat dikonfigurasi memiliki resep.
* **Flow Sederhana**:
  * Ketika `FINISHED_GOOD` yang memiliki resep terjual, sistem tidak memotong stok produk `FINISHED_GOOD` itu sendiri (karena barang tersebut diproduksi secara instan saat ada pesanan).
  * Sebagai gantinya, sistem akan melakukan query relasi resep produk tersebut dan mendepresiasi/memotong stok untuk setiap bahan komponen (`RAW_MATERIAL` dan `PACKAGING`) yang terdaftar dalam resep.

---

## C. Rekomendasi Model Database (Recommended Database Model)

Untuk mendukung kebutuhan UAT/MVP dengan kompleksitas minimal, kita cukup menambahkan dua model baru di `schema.prisma`:

```prisma
model Recipe {
  id        String       @id @default(uuid())
  productId String       @unique
  product   Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
  items     RecipeItem[]
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
}

model RecipeItem {
  id                 String   @id @default(uuid())
  recipeId           String
  recipe             Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  componentProductId String
  componentProduct   Product  @relation(name: "ComponentProduct", fields: [componentProductId], references: [id])
  quantity           Decimal  @db.Decimal(10, 3)
  unitId             String
  unit               Unit     @relation(fields: [unitId], references: [id])
}
```

* **Relasi ke Product**:
  * `Recipe` terikat satu-ke-satu (`@unique`) dengan produk induk (`FINISHED_GOOD`).
  * `RecipeItem` mengarah ke produk komponen bahan baku (`RAW_MATERIAL` atau `PACKAGING`).

---

## D. Rekomendasi Lokasi UI (Recommended UI Location)

### Pilihan Terbaik: **C. Products → Recipe / BOM**
* **Mengapa**: Menambahkan tab/tombol kelola resep langsung di dalam menu pengelolaan produk (`/products`) adalah pilihan paling intuitif. Admin dapat mengedit produk, memilih tab "Resep", dan menambahkan bahan penyusunnya. Ini mencegah pembuatan halaman manajemen baru dan menjaga panel navigasi tetap bersih.

---

## E. Alur Pengurangan Stok (Recommended Inventory Deduction Flow)

Alur deduksi stok yang diusulkan saat checkout pesanan:

```
                  Pesanan Selesai
                         ↓
           Iterasi setiap produk dalam pesanan
                         ↓
         Apakah produk memiliki relasi Resep?
              ├── YA: Cari semua RecipeItem (Komponen)
              │       ↓
              │       Potong stok untuk masing-masing Komponen
              │       (Gudang: KITCHEN_STORAGE default)
              │
              └── TIDAK: Potong stok produk FINISHED_GOOD itu sendiri
                         (Jika trackInventory === true)
```

---

## F. Hubungan dengan Tipe Gudang (Recommended Warehouse Flow)

* Operasi POS kasir dan penjualan makanan/minuman selalu disuplai dari dapur operasional (**`KITCHEN_STORAGE`** default).
* Deduksi stok resep (`RAW_MATERIAL` dan `PACKAGING`) harus otomatis didepresiasi dari **`KITCHEN_STORAGE`** default.
* Gudang **`MAIN_STORAGE`** bertindak sebagai penampung grosir dan hanya berkurang stoknya jika ada transaksi *Warehouse Transfer* ke dapur.

---

## G. Rekomendasi Ledger Pergerakan (Recommended Ledger Movement)

Kami merekomendasikan penambahan movement type baru di `StockMovementType` enum:
* **`RECIPE_CONSUMPTION`**

### Perbandingan Trade-offs:
* **Menggunakan `SALE`**: Sederhana karena tidak perlu mengubah enum, namun sulit melacak laporan audit (apakah stok berkurang karena dijual utuh, atau dikonsumsi sebagai bahan baku resep).
* **Menggunakan `RECIPE_CONSUMPTION` (Direkomendasikan)**: Sangat bersih untuk audit log. Administrator dapat memfilter laporan mutasi dan langsung melihat pengeluaran bahan mentah dapur yang murni disebabkan oleh konversi resep selama penjualan.

---

## H. Penanganan Satuan (Unit Handling)

* Database POS harus menyimpan kuantitas stok menggunakan **Base Unit** terkecil yang konsisten (misalnya, selalu menyimpan tepung dalam satuan `gram`, air dalam `ml`, dan cup dalam `pcs`).
* Resep juga didefinisikan menggunakan satuan dasar tersebut.
* **Tanpa Konversi Rumit**: Menghindari overhead konversi dinamis (kg -> gram) di tingkat runtime aplikasi. Input stok saat penerimaan barang (*Receive Stock*) juga harus disesuaikan dengan satuan terkecil tersebut agar kalkulasi pengurangan sisa stok tetap akurat.

---

## I. Aturan Validasi (Validation Rules)

1. Hanya produk dengan `inventoryType = FINISHED_GOOD` yang diperbolehkan memiliki resep.
2. Komponen bahan resep (`RecipeItem.componentProductId`) wajib memiliki `inventoryType` bernilai `RAW_MATERIAL` atau `PACKAGING`.
3. Produk tidak boleh merujuk ke dirinya sendiri sebagai komponen (mencegah siklus tak terbatas).
4. Kuantitas bahan dalam resep harus lebih besar dari 0 (`quantity > 0`).

---

## J. Skenario UAT Resep (UAT Flow)

1. **Pembuatan Produk**:
   * *Teh Manis Cup* -> `FINISHED_GOOD`
   * *Teh Celup* -> `RAW_MATERIAL` (satuan: `pcs`)
   * *Gula* -> `RAW_MATERIAL` (satuan: `gram`)
   * *Cup Teh* -> `PACKAGING` (satuan: `pcs`)
2. **Set Stok Awal** di Dapur:
   * Teh Celup: 100 pcs
   * Gula: 1000 gram
   * Cup Teh: 100 pcs
3. **Konfigurasi Resep** (*Teh Manis Cup*):
   * 1x Teh Celup
   * 20g Gula
   * 1x Cup Teh
4. **Eksekusi Penjualan**:
   * Jual 2x *Teh Manis Cup* di POS.
5. **Verifikasi Hasil Akhir**:
   * Stok dapur otomatis berkurang menjadi:
     * Teh Celup: 98 pcs (-2)
     * Gula: 960 gram (-40g)
     * Cup Teh: 98 pcs (-2)
   * Terbentuk entri StockLedger dengan movement type `RECIPE_CONSUMPTION` yang mengarah ke masing-masing bahan tersebut.

---

## K. Berkas yang Memerlukan Perubahan (Required Changes)

### Backend:
* `prisma/schema.prisma` (Menambahkan model `Recipe` & `RecipeItem`, memperbarui enum `StockMovementType`)
* `src/modules/orders/service.ts` (Memodifikasi `deductInventoryForOrder` untuk mendeteksi resep)
* `src/modules/products/` (Menambahkan endpoint CRUD resep dan validasi Joi baru)

### Frontend:
* `src/app/(authenticated)/products/page.tsx` (Form modal untuk konfig resep bahan)
* `src/lib/api/productApi.ts` (Panggilan mutation & query API resep)
