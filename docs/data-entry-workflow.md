# Phase 1 Data Entry Workflow

## One-Time Setup

1. Create categories: Dust, Leaf, Lumsa, Color, Tea Powder, Addon.
2. Create tea powder names / grades under each category.

## Purchase Entry

1. Open Admin.
2. Go to Purchase Batches.
3. Enter number of bags, purchase date, supplier / bill name, invoice number, and notes.
4. Enter tea powder items JSON with category, tea powder, rate per kg, and optional quantity kg.
5. Save.

Batch code is generated automatically from number of bags and purchase date.

## Daily Verification

1. Open User frontend.
2. Login as operator.
3. Search by batch code, tea powder name, or supplier / bill name.
4. Verify category, tea powder name, and rate per kg.
5. Print the result if needed.

No formula costing, customer recipe, selling price, inventory, or accounting workflow is part of Phase 1.
