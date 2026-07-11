# Dashboard API

Base path: `/api/dashboard`. Read-only aggregate data for the dashboard's summary/charts screen. All endpoints require auth (any role).

## `GET /api/dashboard/summary`

Response `200`:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalFarmers": 12,
      "totalGoats": 30,
      "recordingsLast7Days": 5,
      "recordingsLast30Days": 22,
      "pendingReviewCount": 3,
      "farmersNotReportedCount": 4,
      "lastSync": { "lastSyncAt": "2026-07-08T08:00:00.000Z", "lastStatus": "SUCCESS", "lastError": null }
    }
  }
}
```

`farmersNotReportedCount` uses a fixed 30-day window (see [`farmer.repository.js`](../architecture/database-schema.md)). `lastSync` mirrors [`GET /api/sync/status`](sync.md#get-apisyncstatus).

## `GET /api/dashboard/charts`

Aggregates the last 30 days of recordings.

Response `200`:
```json
{
  "success": true,
  "data": {
    "charts": {
      "recordingTrend": [ { "date": "2026-06-20", "count": 3 } ],
      "kidsBornByGender": { "male": 14, "female": 11 },
      "soldVsTarget": { "sold": 6, "targetOnly": 2 }
    }
  }
}
```

- `recordingTrend` — one point per day with ≥1 recording, sorted ascending.
- `kidsBornByGender` — sum of `maleKidCount`/`femaleKidCount` across the window (non-numeric values counted as 0).
- `soldVsTarget` — `sold` counts recordings where `sold` matches `/ya/i`; `targetOnly` counts recordings with a `saleTarget` set but not yet marked sold.

## `GET /api/dashboard/alerts`

Goats with no recording in the last 30 days.

Response `200`: `{ "success": true, "data": { "alerts": [ { "goatId": "…", "earTagNumber": 12, "farmerId": "…", "farmerName": "Budi" } ] } }`
