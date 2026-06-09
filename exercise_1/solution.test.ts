import { ParkingGarage as _ParkingGarage } from "./solution";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ParkingGarage = _ParkingGarage as any;

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

// ── Level 1: Basic Parking ────────────────────────────────────────────────────

level(1, "Basic parking", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let garage: any;

  beforeEach(() => {
    garage = new ParkingGarage(3);
  });

  test("starts with full availability", () => {
    expect(garage.getAvailableSpots()).toBe(3);
  });

  test("park returns true on success", () => {
    expect(garage.park("A")).toBe(true);
  });

  test("park reduces available spots", () => {
    garage.park("A");
    expect(garage.getAvailableSpots()).toBe(2);
  });

  test("isParked returns true after parking", () => {
    garage.park("A");
    expect(garage.isParked("A")).toBe(true);
  });

  test("isParked returns false for unknown vehicle", () => {
    expect(garage.isParked("Z")).toBe(false);
  });

  test("parking same vehicle twice returns false", () => {
    garage.park("A");
    expect(garage.park("A")).toBe(false);
  });

  test("parking when full returns false", () => {
    garage.park("A");
    garage.park("B");
    garage.park("C");
    expect(garage.park("D")).toBe(false);
    expect(garage.getAvailableSpots()).toBe(0);
  });

  test("unpark returns true and frees a spot", () => {
    garage.park("A");
    expect(garage.unpark("A")).toBe(true);
    expect(garage.getAvailableSpots()).toBe(3);
    expect(garage.isParked("A")).toBe(false);
  });

  test("unpark unknown vehicle returns false", () => {
    expect(garage.unpark("Z")).toBe(false);
  });

  test("can park again after unparking", () => {
    garage.park("A");
    garage.park("B");
    garage.park("C");
    garage.unpark("B");
    expect(garage.park("D")).toBe(true);
  });
});

// ── Level 2: Vehicle Types ────────────────────────────────────────────────────

level(2, "Vehicle types", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let garage: any;

  beforeEach(() => {
    garage = new ParkingGarage(2, 2, 2); // 2 compact, 2 regular, 2 large
  });

  test("compact parks in compact spot first", () => {
    expect(garage.park("A", "COMPACT")).toBe(true);
    expect(garage.getAvailableSpots("COMPACT")).toBe(1);
    expect(garage.getAvailableSpots("REGULAR")).toBe(2);
  });

  test("regular parks in regular spot first", () => {
    expect(garage.park("A", "REGULAR")).toBe(true);
    expect(garage.getAvailableSpots("REGULAR")).toBe(1);
    expect(garage.getAvailableSpots("LARGE")).toBe(2);
  });

  test("large can only park in large spot", () => {
    expect(garage.park("A", "LARGE")).toBe(true);
    expect(garage.getAvailableSpots("LARGE")).toBe(1);
  });

  test("compact overflows to regular when compact full", () => {
    garage.park("A", "COMPACT");
    garage.park("B", "COMPACT");
    garage.park("C", "COMPACT"); // overflows to regular
    expect(garage.getAvailableSpots("COMPACT")).toBe(0);
    expect(garage.getAvailableSpots("REGULAR")).toBe(1);
  });

  test("compact overflows to large when compact and regular full", () => {
    garage.park("A", "COMPACT");
    garage.park("B", "COMPACT");
    garage.park("C", "REGULAR");
    garage.park("D", "REGULAR");
    garage.park("E", "COMPACT"); // overflows to large
    expect(garage.getAvailableSpots("LARGE")).toBe(1);
  });

  test("regular overflows to large when regular full", () => {
    garage.park("A", "REGULAR");
    garage.park("B", "REGULAR");
    garage.park("C", "REGULAR"); // overflows to large
    expect(garage.getAvailableSpots("LARGE")).toBe(1);
  });

  test("large returns false when large spots full", () => {
    garage.park("A", "LARGE");
    garage.park("B", "LARGE");
    expect(garage.park("C", "LARGE")).toBe(false);
  });

  test("large does not use compact or regular spots", () => {
    garage.park("A", "LARGE");
    garage.park("B", "LARGE");
    expect(garage.park("C", "LARGE")).toBe(false);
    expect(garage.getAvailableSpots("COMPACT")).toBe(2);
    expect(garage.getAvailableSpots("REGULAR")).toBe(2);
  });

  test("unpark frees the correct spot type", () => {
    garage.park("A", "COMPACT");
    garage.unpark("A");
    expect(garage.getAvailableSpots("COMPACT")).toBe(2);
  });
});

// ── Level 3: Fees ─────────────────────────────────────────────────────────────

level(3, "Parking fees", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let garage: any;
  const HOUR = 3600_000; // ms

  beforeEach(() => {
    garage = new ParkingGarage(2, 2, 2);
  });

  test("compact: 2/hr exact hour", () => {
    garage.park("A", "COMPACT", 0);
    expect(garage.unpark("A", HOUR)).toBe(2);
  });

  test("regular: 3/hr exact hour", () => {
    garage.park("A", "REGULAR", 0);
    expect(garage.unpark("A", HOUR)).toBe(3);
  });

  test("large: 5/hr exact hour", () => {
    garage.park("A", "LARGE", 0);
    expect(garage.unpark("A", HOUR)).toBe(5);
  });

  test("partial hour rounds up", () => {
    garage.park("A", "COMPACT", 0);
    expect(garage.unpark("A", HOUR + 1)).toBe(4); // 1h + 1ms → 2 hours → $4
  });

  test("zero duration still charges 1 hour minimum", () => {
    garage.park("A", "REGULAR", 0);
    expect(garage.unpark("A", 0)).toBe(3);
  });

  test("unpark unknown vehicle returns null", () => {
    expect(garage.unpark("Z", HOUR)).toBeNull();
  });

  test("getRevenue accumulates across sessions", () => {
    garage.park("A", "COMPACT", 0);
    garage.park("B", "REGULAR", 0);
    garage.unpark("A", HOUR);     // $2
    garage.unpark("B", HOUR * 2); // $6
    expect(garage.getRevenue()).toBe(8);
  });

  test("getRevenue is 0 with no completed sessions", () => {
    garage.park("A", "COMPACT", 0);
    expect(garage.getRevenue()).toBe(0);
  });
});

// ── Level 4: Reporting ────────────────────────────────────────────────────────

level(4, "Reporting", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let garage: any;

  beforeEach(() => {
    garage = new ParkingGarage(2, 2, 2);
  });

  test("getCurrentlyParked returns sorted vehicleIds", () => {
    garage.park("C", "COMPACT", 0);
    garage.park("A", "REGULAR", 0);
    garage.park("B", "LARGE", 0);
    expect(garage.getCurrentlyParked()).toEqual(["A", "B", "C"]);
  });

  test("getCurrentlyParked excludes unparked vehicles", () => {
    garage.park("A", "COMPACT", 0);
    garage.park("B", "COMPACT", 0);
    garage.unpark("A", 1000);
    expect(garage.getCurrentlyParked()).toEqual(["B"]);
  });

  test("getCurrentlyParked returns empty when garage is empty", () => {
    expect(garage.getCurrentlyParked()).toEqual([]);
  });

  test("getVehiclesByType filters by type", () => {
    garage.park("A", "COMPACT", 0);
    garage.park("B", "REGULAR", 0);
    garage.park("C", "COMPACT", 0);
    expect(garage.getVehiclesByType("COMPACT")).toEqual(["A", "C"]);
    expect(garage.getVehiclesByType("REGULAR")).toEqual(["B"]);
    expect(garage.getVehiclesByType("LARGE")).toEqual([]);
  });

  test("getLongestParkedVehicle returns earliest entry", () => {
    garage.park("A", "COMPACT", 1000);
    garage.park("B", "COMPACT", 500);
    garage.park("C", "LARGE", 2000);
    expect(garage.getLongestParkedVehicle()).toBe("B");
  });

  test("getLongestParkedVehicle returns null when empty", () => {
    expect(garage.getLongestParkedVehicle()).toBeNull();
  });

  test("getRevenueByType only counts that type", () => {
    const HOUR = 3600_000;
    garage.park("A", "COMPACT", 0);
    garage.park("B", "REGULAR", 0);
    garage.unpark("A", HOUR);     // $2 compact
    garage.unpark("B", HOUR * 2); // $6 regular
    expect(garage.getRevenueByType("COMPACT")).toBe(2);
    expect(garage.getRevenueByType("REGULAR")).toBe(6);
    expect(garage.getRevenueByType("LARGE")).toBe(0);
  });
});
