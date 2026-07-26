Saya sangat setuju memisahkan **Order** dan **Payment**. Bahkan saya akan sedikit meningkatkan desainnya agar menjadi **enterprise-ready** tetapi tetap sederhana untuk MVP.

Prinsip yang akan saya gunakan adalah:

* **Order** = transaksi penjualan.
* **OrderItem** = snapshot produk.
* **Payment** = transaksi pembayaran.
* **Promotion** = master promo.
* **Tax** = master pajak.
* **Snapshot** = harga, pajak, promo disimpan saat transaksi sehingga histori tidak berubah.

Dengan desain ini Anda bisa menambah:

* QRIS Gateway
* Midtrans
* Xendit
* Split Payment
* Refund
* Multiple Payment
* Voucher
* Membership

tanpa mengubah struktur database.

---

# Enum

```prisma
enum UserRole {
  ADMIN
  ACCOUNTING
  CASHIER
  KITCHEN
}

enum OrderType {
  DINE_IN
  PICKUP
}

enum OrderStatus {
  NEW
  PREPARING
  READY
  COMPLETED
  CANCELLED
}

enum PaymentMethod {
  CASH
  QRIS
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  CANCELLED
  REFUNDED
}

enum PromotionType {
  PERCENT
  PACKAGE
}
```

---

# Master Data

```
User

Category

Product

Table

Tax

Promotion

PromotionItem
```

---

# Transaction

```
Order

OrderItem

Payment
```

---

# Audit

```
AuditLog
```

---

# RELATION

```
Category
    │
    └──── Product
                │
                │
Promotion ─ PromotionItem
                │
                ▼
            Product


User
   │
   ├────────────── Order (Cashier)
   │
   ├────────────── Promotion (Created By)
   │
   └────────────── AuditLog


Table
   │
   └────────────── Order


Order
   │
   ├──────────── OrderItem
   │
   └──────────── Payment


Tax (master)
```

---

# USER

```prisma
model User {

  id String @id @default(cuid())

  fullName String

  username String @unique

  passwordHash String

  role UserRole

  isActive Boolean @default(true)

  createdAt DateTime @default(now())

  updatedAt DateTime @updatedAt

  orders Order[]

  promotions Promotion[]

  auditLogs AuditLog[]
}
```

---

# CATEGORY

```prisma
model Category {

  id String @id @default(cuid())

  name String

  isActive Boolean @default(true)

  createdAt DateTime @default(now())

  updatedAt DateTime @updatedAt

  products Product[]
}
```

---

# PRODUCT

```prisma
model Product {

  id String @id @default(cuid())

  categoryId String

  category Category @relation(fields:[categoryId], references:[id])

  sku String? @unique

  name String

  imageUrl String?

  price Decimal @db.Decimal(12,2)

  isActive Boolean @default(true)

  createdAt DateTime @default(now())

  updatedAt DateTime @updatedAt

  promotionItems PromotionItem[]
}
```

---

# TABLE

```prisma
model Table {

  id String @id @default(cuid())

  code String @unique

  name String

  isActive Boolean @default(true)

  createdAt DateTime @default(now())

  updatedAt DateTime @updatedAt

  orders Order[]
}
```

---

# TAX

Master saja.

```prisma
model Tax {

  id String @id @default(cuid())

  name String

  percentage Decimal @db.Decimal(5,2)

  isActive Boolean @default(true)

  createdAt DateTime @default(now())

  updatedAt DateTime @updatedAt
}
```

---

# PROMOTION

```prisma
model Promotion {

  id String @id @default(cuid())

  createdById String

  createdBy User @relation(fields:[createdById], references:[id])

  name String

  type PromotionType

  percentValue Decimal? @db.Decimal(5,2)

  packagePrice Decimal? @db.Decimal(12,2)

  startDate DateTime?

  endDate DateTime?

  isActive Boolean @default(true)

  createdAt DateTime @default(now())

  updatedAt DateTime @updatedAt

  items PromotionItem[]
}
```

---

# PROMOTION ITEM

```prisma
model PromotionItem {

  id String @id @default(cuid())

  promotionId String

  promotion Promotion @relation(fields:[promotionId], references:[id])

  productId String

  product Product @relation(fields:[productId], references:[id])

  quantity Int
}
```

---

# ORDER

Ini adalah inti transaksi.

```prisma
model Order {

  id String @id @default(cuid())

  orderNumber String @unique

  customerName String

  cashierId String?

  cashier User? @relation(fields:[cashierId], references:[id])

  tableId String?

  table Table? @relation(fields:[tableId], references:[id])

  orderType OrderType

  status OrderStatus

  subtotal Decimal @db.Decimal(12,2)

  discountAmount Decimal @db.Decimal(12,2)

  taxAmount Decimal @db.Decimal(12,2)

  grandTotal Decimal @db.Decimal(12,2)

  notes String?

  createdAt DateTime @default(now())

  updatedAt DateTime @updatedAt

  items OrderItem[]

  payments Payment[]
}
```

Perhatikan bahwa saya membuat:

```text
Payment[]
```

Walaupun MVP hanya satu pembayaran.

Karena nanti bisa menjadi

```
Cash 20.000

+

QRIS 50.000
```

tanpa migrasi.

---

# ORDER ITEM

Snapshot lengkap.

```prisma
model OrderItem {

  id String @id @default(cuid())

  orderId String

  order Order @relation(fields:[orderId], references:[id])

  productId String

  productName String

  unitPrice Decimal @db.Decimal(12,2)

  quantity Int

  subtotal Decimal @db.Decimal(12,2)

  promotionName String?

  discountAmount Decimal @db.Decimal(12,2)
}
```

Walaupun Product berubah nama.

Histori tetap aman.

---

# PAYMENT

Menurut saya ini adalah model paling penting.

```prisma
model Payment {

  id String @id @default(cuid())

  orderId String

  order Order @relation(fields:[orderId], references:[id])

  method PaymentMethod

  status PaymentStatus

  amount Decimal @db.Decimal(12,2)

  estimatedCash Decimal? @db.Decimal(12,2)

  receivedCash Decimal? @db.Decimal(12,2)

  changeAmount Decimal? @db.Decimal(12,2)

  referenceNumber String?

  paidAt DateTime?

  createdAt DateTime @default(now())

  updatedAt DateTime @updatedAt
}
```

Contoh QRIS

```
method

QRIS

status

PAID

referenceNumber

QRIS-239483294
```

Contoh Cash

```
method

CASH

estimatedCash

100000

receivedCash

100000

change

18000
```

---

# AUDIT LOG

```prisma
model AuditLog {

  id String @id @default(cuid())

  userId String

  user User @relation(fields:[userId], references:[id])

  action String

  entity String

  entityId String

  payload Json?

  createdAt DateTime @default(now())
}
```

# Yang akan saya tambahkan untuk versi 2 (sangat saya rekomendasikan)

Saya sebenarnya masih ingin menyempurnakan desain ini dengan beberapa tabel tambahan agar lebih fleksibel tanpa mengubah struktur inti:

| Model                | Fungsi                                                                                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OrderTax`           | Menyimpan snapshot setiap jenis pajak yang diterapkan pada transaksi (misalnya PPN dan Service Charge) sehingga histori tetap akurat meskipun tarif berubah.                                        |
| `OrderDiscount`      | Menyimpan detail promo atau diskon yang digunakan, termasuk nama promo, tipe, dan nilai diskon sebagai snapshot.                                                                                    |
| `PaymentTransaction` | Menyimpan histori komunikasi dengan payment gateway (QRIS, Midtrans, Xendit, dll.), sehingga satu `Payment` dapat memiliki beberapa percobaan pembayaran atau callback tanpa mengotori tabel utama. |
| `SystemSetting`      | Menyimpan konfigurasi aplikasi seperti nama bioskop, footer struk, default tax, printer, timezone, dan pengaturan umum lainnya.                                                                     |

Dengan tambahan tersebut, desain database sudah berada pada level yang cukup matang untuk aplikasi POS F&B profesional, namun tetap sederhana untuk diimplementasikan pada MVP karena sebagian besar tabel tambahan hanya mulai digunakan ketika fitur tersebut benar-benar dibutuhkan.
