# Reports & Accounting REST API Documentation

All endpoints require authentication and are restricted to users with the following roles:
- `ADMIN`
- `ACCOUNTING`

Requesting reports without valid authentication headers or correct roles will return a `403 Forbidden` error.

---

## 1. Financial Overview Summary
`GET /api/reports/summary`

### Parameters
- `startDate` (IsoDate String, e.g. `2026-07-01`)
- `endDate` (IsoDate String, e.g. `2026-07-25`)

### Response Example
```json
{
  "data": {
    "sales": {
      "totalOrders": 120,
      "completedOrders": 115,
      "cancelledOrders": 5,
      "grossRevenue": 4500000,
      "discount": 100000,
      "netRevenue": 4400000,
      "averageOrderValue": 38260
    },
    "orders": {
      "dineIn": 80,
      "takeaway": 40
    }
  },
  "meta": {
    "generatedAt": "2026-07-25T10:00:00.000Z",
    "timezone": "Asia/Jakarta",
    "businessDateRange": {
      "startDate": "2026-07-01",
      "endDate": "2026-07-25"
    },
    "currency": "Rp"
  }
}
```

---

## 2. Daily Sales Trend
`GET /api/reports/sales`

### Parameters
- `startDate` (IsoDate String)
- `endDate` (IsoDate String)

### Response Example
```json
{
  "data": [
    {
      "date": "2026-07-25",
      "orders": 120,
      "revenue": 4500000
    }
  ],
  "meta": {
    "generatedAt": "2026-07-25T10:00:00.000Z"
  }
}
```

---

## 3. Payment Collections & Reconciliation
`GET /api/reports/payments`

### Parameters
- `startDate` (IsoDate String)
- `endDate` (IsoDate String)

### Response Example
```json
{
  "data": {
    "expectedRevenue": 5000000,
    "collectedRevenue": 4500000,
    "outstandingAmount": 500000,
    "readyButUnpaidOrders": 5,
    "readyButUnpaidAmount": 125000,
    "paymentBreakdown": {
      "cash": 3000000,
      "qris": 1500000
    }
  },
  "meta": {
    "generatedAt": "2026-07-25T10:00:00.000Z",
    "timezone": "Asia/Jakarta",
    "businessDateRange": {
      "startDate": "2026-07-01",
      "endDate": "2026-07-25"
    },
    "currency": "Rp"
  }
}
```

---

## 4. Payment Collection Status
`GET /api/reports/payment-status`

### Parameters
- `startDate` (IsoDate String)
- `endDate` (IsoDate String)

### Response Example
```json
{
  "data": {
    "paid": {
      "count": 100,
      "amount": 5000000
    },
    "pending": {
      "count": 15,
      "amount": 750000
    },
    "cancelled": {
      "count": 3,
      "amount": 100000
    }
  },
  "meta": {
    "generatedAt": "2026-07-25T10:00:00.000Z"
  }
}
```

---

## 5. Product Sales Ranking
`GET /api/reports/products`

### Parameters
- `startDate` (IsoDate String)
- `endDate` (IsoDate String)
- `page` (number, default `1`)
- `limit` (number, default `20`)
- `categoryId` (string, optional)

### Response Example
```json
{
  "data": [
    {
      "productId": "prod-123",
      "productName": "Sweet Popcorn",
      "sku": "POP-SWT",
      "category": "Snacks",
      "quantitySold": 450,
      "revenue": 11250000,
      "orderCount": 380
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 100,
    "totalPages": 5
  },
  "meta": {
    "generatedAt": "2026-07-25T10:00:00.000Z"
  }
}
```
