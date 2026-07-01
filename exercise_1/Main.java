public class Main {
  public static void main(String[] args) {
    ParkingGarage garage = new ParkingGarage(2, 1, 1);
    System.out.println("park A: " + garage.park("A", VehicleType.COMPACT, 0));
    System.out.println("available compact: " + garage.getAvailableSpots(VehicleType.COMPACT));
  }
}
