# Panduan Manajemen Resep (Recipe / Bill of Materials)

Dokumen ini merinci penggunaan dan konsep teknis dari fitur **Resep (Recipe / BOM)** yang diterapkan pada sistem POS Planet Cinema.

---

## 1. Konsep Resep
Resep digunakan untuk memecah produk jadi (**FINISHED_GOOD**) menjadi bahan penyusun/mentah (**RAW_MATERIAL** atau **PACKAGING**) saat transaksi penjualan terjadi.

* **FINISHED_GOOD**: Produk akhir yang memiliki nilai harga jual dan dipesan oleh pelanggan (misal: *Teh Manis Cup*).
* **RAW_MATERIAL**: Bahan baku mentah yang disimpan di dapur operasional (misal: *Teh Celup*, *Gula*).
* **PACKAGING**: Kemasan pembungkus (misal: *Cup Teh*).

---

## 2. Cara Mengonfigurasi Resep (Bagi Admin)
1. Buka halaman **Produk** di menu navigasi.
2. Cari produk bertipe **FINISHED_GOOD** (misalnya *Teh Manis Cup*).
3. Anda akan melihat tombol **"Resep"** berwarna hijau di kolom Aksi (tombol ini hanya muncul jika produk bertipe FINISHED_GOOD).
4. Klik tombol **"Resep"** untuk membuka modal konfigurasi.
5. Klik **"+ Tambah Bahan Komponen"** untuk menambahkan bahan baku baru:
   * Pilih bahan mentah / kemasan dari daftar drop-down.
   * Masukkan kuantitas (jumlah) bahan yang dikonsumsi untuk membuat **satu** unit produk jadi.
   * Satuan (Unit) stok akan otomatis disamakan dengan satuan dasar bahan baku tersebut.
6. Klik **"Simpan Resep"** untuk menyimpan perubahan.

---

## 3. Alur Pengurangan Stok (Recipe Consumption)
* **Kapan Terjadi**: Deduksi stok resep terjadi secara otomatis pada saat order diselesaikan (**Checkout / Complete Order**).
* **Lokasi Pengurangan**: Stok dideplesiasi secara eksklusif dari Penyimpanan Dapur Default (**`KITCHEN_STORAGE`**). Sistem tidak akan memotong stok di Gudang Utama (**`MAIN_STORAGE`**).
* **Pencatatan Buku Besar**: Setiap bahan resep yang berkurang akan dicatat sebagai entri di **StockLedger** dengan tipe mutasi **`RECIPE_CONSUMPTION`** dan ditautkan langsung ke nomor ID Order penjualan asal.
* **Kebijakan Stok Negatif**: Jika persediaan bahan mentah di Penyimpanan Dapur kurang dari kuantitas yang dibutuhkan resep, transaksi penjualan **tetap diizinkan** berlanjut sesuai aturan dapur POS saat ini, dan stok bahan tersebut di dapur akan berkurang hingga bernilai negatif (misal: `-50 gram`).
* **Produk Tanpa Resep**: Produk `FINISHED_GOOD` yang tidak dikonfigurasikan memiliki resep akan tetap menggunakan perilaku standar sistem POS (yaitu mendepresiasi stok produk jadi itu sendiri jika pelacakan stok diaktifkan).
