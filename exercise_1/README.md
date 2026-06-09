# Exercise 1 — Parking Garage

**Estimated time:** 25–35 minutes  
**Levels:** 4

## How to run

```bash
# from the repo root (code-exercises/)
LEVEL=1 npm test -- exercise_1        # run up to level 1
LEVEL=2 npm test -- exercise_1        # run up to level 2
LEVEL=1 npm run watch -- exercise_1   # watch mode, level 1 only
```

---

## Level 1 — Basic Parking

Implement a `ParkingGarage` class that manages a flat lot with a fixed number of spots.

```ts
class ParkingGarage {
  constructor(capacity: number)
  park(vehicleId: string): boolean         // false if full or vehicleId already parked
  unpark(vehicleId: string): boolean       // false if vehicleId not currently parked
  isParked(vehicleId: string): boolean
  getAvailableSpots(): number
}
```

**Examples:**

| Operations | Result |
|---|---|
| `new ParkingGarage(2)` | capacity 2 |
| `park("A")` | `true` |
| `park("A")` | `false` (already parked) |
| `park("B")` | `true` |
| `park("C")` | `false` (full) |
| `getAvailableSpots()` | `0` |
| `unpark("A")` | `true` |
| `getAvailableSpots()` | `1` |

---

## Level 2 — Vehicle Types

Extend the garage to support three vehicle types and matching spot types.

```ts
type VehicleType = 'COMPACT' | 'REGULAR' | 'LARGE'

class ParkingGarage {
  constructor(compactSpots: number, regularSpots: number, largeSpots: number)
  park(vehicleId: string, type: VehicleType): boolean
  unpark(vehicleId: string): boolean
  isParked(vehicleId: string): boolean
  getAvailableSpots(type: VehicleType): number   // spots of that physical type that are free
}
```

**Fit rules** (a vehicle can only fit in spots ≥ its size):
- `COMPACT` → fits in COMPACT, REGULAR, or LARGE (tries COMPACT first)
- `REGULAR` → fits in REGULAR or LARGE (tries REGULAR first)
- `LARGE` → fits in LARGE only

---

## Level 3 — Parking Fees

Add time-based fees.

```ts
class ParkingGarage {
  // ...previous methods...
  park(vehicleId: string, type: VehicleType, entryTime: number): boolean
  unpark(vehicleId: string, exitTime: number): number | null  // fee paid; null if vehicleId not found
  getRevenue(): number   // total fees collected from all completed sessions
}
```

**Rates** (per hour, partial hours round **up**):
- `COMPACT`: $2/hr
- `REGULAR`: $3/hr
- `LARGE`: $5/hr

---

## Level 4 — Reporting

Add query methods over the current state.

```ts
class ParkingGarage {
  // ...previous methods...
  getCurrentlyParked(): string[]                              // all parked vehicleIds, sorted A→Z
  getVehiclesByType(type: VehicleType): string[]             // parked vehicleIds of that type, sorted A→Z
  getLongestParkedVehicle(): string | null                   // vehicleId with the earliest entryTime; null if empty
  getRevenueByType(type: VehicleType): number               // total revenue collected from that vehicle type
}
```

---

## Constraints

- `vehicleId` and spot counts are always valid (non-empty strings, positive integers)
- `entryTime` and `exitTime` are integers (e.g. Unix ms); `exitTime >= entryTime` is guaranteed
- Time limit: 6 seconds | Memory limit: 4 GB
