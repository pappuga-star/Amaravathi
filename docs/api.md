# Phase 1 API Overview

All protected endpoints require:

```text
Authorization: Bearer <jwt>
```

## Authentication

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/users` admin only

## Master Data

- `GET /api/tea-categories`
- `POST /api/tea-categories`
- `GET /api/tea-grades`
- `POST /api/tea-grades`

## Purchase Rates

- `GET /api/purchase-rates`
- `POST /api/purchase-rates`
- `GET /api/purchase-rates/search?q=<batch-code-or-tea-powder-or-supplier>`
- `GET /api/purchase-rates/lookup?batchCode=30%2F12%2F25`
- `GET /api/purchase-rates/:id`
- `PUT /api/purchase-rates/:id`
- `DELETE /api/purchase-rates/:id`

Create purchase batch:

```json
{
  "numberOfBags": 30,
  "purchaseDate": "2025-12-15",
  "supplierName": "ABC Tea Traders",
  "invoiceNumber": "INV-1001",
  "notes": "Sample batch",
  "items": [
    {
      "categoryId": "category-object-id",
      "teaGradeId": "tea-grade-object-id",
      "ratePerKg": 220,
      "quantityKg": 100
    }
  ]
}
```

The API auto-generates:

```text
batchCode = numberOfBags + "/" + purchaseMonth + "/" + lastTwoDigitsOfYear
```

## Reports

- `GET /api/reports/latest-purchase-rates`
- `GET /api/reports/latest-rates-by-tea-powder`
