import java.util.*;

enum VehicleType { COMPACT, REGULAR, LARGE }

public class ParkingGarage {
  public ParkingGarage(int compactCapacity) {
    this(compactCapacity, 0, 0);
  }

  public ParkingGarage(int compactCapacity, int regularCapacity, int largeCapacity) {
  }

  public boolean park(String vehicleId) {
    return park(vehicleId, VehicleType.COMPACT);
  }

  public boolean park(String vehicleId, VehicleType type) {
    return park(vehicleId, type, 0L);
  }

  public boolean park(String vehicleId, VehicleType type, long entryTime) {
    return false;
  }

  public Object unpark(String vehicleId) {
    return false;
  }

  public Object unpark(String vehicleId, long exitTime) {
    return null;
  }

  public boolean isParked(String vehicleId) {
    return false;
  }

  public int getAvailableSpots() {
    return getAvailableSpots(VehicleType.COMPACT);
  }

  public int getAvailableSpots(VehicleType type) {
    return 0;
  }

  public int getRevenue() {
    return 0;
  }

  public List<String> getCurrentlyParked() {
    return new ArrayList<>();
  }

  public List<String> getVehiclesByType(VehicleType type) {
    return new ArrayList<>();
  }

  public String getLongestParkedVehicle() {
    return null;
  }

  public int getRevenueByType(VehicleType type) {
    return 0;
  }
}
