# Inventory Module Guide

## Overview

The inventory module manages fixed assets, stock items, suppliers, purchases, and asset maintenance for each workspace.

## Screens

- `/inventory`
- `/inventory/assets`
- `/inventory/assets/:id`
- `/inventory/items`
- `/inventory/categories`
- `/inventory/suppliers`
- `/inventory/purchases`
- `/inventory/maintenance`
- `/inventory/reports`

## API endpoints

- `GET /api/inventory/categories`
- `POST /api/inventory/categories`
- `PATCH /api/inventory/categories/:id`
- `DELETE /api/inventory/categories/:id`
- `GET /api/inventory/assets`
- `POST /api/inventory/assets`
- `GET /api/inventory/assets/:id`
- `PATCH /api/inventory/assets/:id`
- `DELETE /api/inventory/assets/:id`
- `GET /api/inventory/items`
- `POST /api/inventory/items`
- `POST /api/inventory/items/:id/stock`
- `GET /api/inventory/suppliers`
- `POST /api/inventory/suppliers`
- `GET /api/inventory/purchases`
- `POST /api/inventory/purchases`
- `GET /api/inventory/maintenance`
- `POST /api/inventory/maintenance`
- `GET /api/inventory/reports/assets`
- `GET /api/inventory/reports/stock`
- `GET /api/inventory/reports/purchases`
