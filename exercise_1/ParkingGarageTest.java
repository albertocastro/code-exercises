import java.util.*;

public class ParkingGarageTest {
  static final List<Row> rows = new ArrayList<>(); static int maxLevel = Integer.MAX_VALUE;
  interface Fn { void run() throws Exception; } record Row(String name, String status, String error, int line) {}
  public static void main(String[] args) {
    if (args.length > 0) maxLevel = Integer.parseInt(args[0]);
    test(1, "starts with full availability", 8, () -> eq(3, new ParkingGarage(3).getAvailableSpots()));
    test(1, "park returns true on success", 9, () -> eq(true, new ParkingGarage(3).park("A")));
    test(1, "parking same vehicle twice returns false", 10, () -> { ParkingGarage g = new ParkingGarage(3); g.park("A"); eq(false, g.park("A")); });
    test(1, "unpark frees a spot", 11, () -> { ParkingGarage g = new ParkingGarage(1); g.park("A"); eq(true, g.unpark("A")); eq(1, g.getAvailableSpots()); });
    test(2, "compact parks in compact first", 12, () -> { ParkingGarage g = new ParkingGarage(2, 2, 2); eq(true, g.park("A", VehicleType.COMPACT)); eq(1, g.getAvailableSpots(VehicleType.COMPACT)); });
    test(2, "large can only use large", 13, () -> { ParkingGarage g = new ParkingGarage(1, 1, 1); eq(true, g.park("A", VehicleType.LARGE)); eq(false, g.park("B", VehicleType.LARGE)); });
    test(3, "compact hourly fee", 14, () -> { ParkingGarage g = new ParkingGarage(1, 1, 1); g.park("A", VehicleType.COMPACT, 0); eq(2, g.unpark("A", 3_600_000)); });
    test(3, "revenue accumulates", 15, () -> { ParkingGarage g = new ParkingGarage(1, 1, 1); g.park("A", VehicleType.REGULAR, 0); g.unpark("A", 7_200_000); eq(6, g.getRevenue()); });
    test(4, "currently parked sorted", 16, () -> { ParkingGarage g = new ParkingGarage(3, 3, 3); g.park("C"); g.park("A"); eq(List.of("A", "C"), g.getCurrentlyParked()); });
    test(4, "longest parked vehicle", 17, () -> { ParkingGarage g = new ParkingGarage(3, 3, 3); g.park("B", VehicleType.COMPACT, 5); g.park("A", VehicleType.COMPACT, 1); eq("A", g.getLongestParkedVehicle()); });
    print();
  }
  static void test(int l, String n, int line, Fn fn){ if(l>maxLevel){rows.add(new Row(n,"skip",null,line));return;} try{fn.run();rows.add(new Row(n,"pass",null,line));}catch(Throwable e){rows.add(new Row(n,"fail",e.toString(),line));}}
  static void eq(Object e,Object a){ if(!Objects.equals(e,a)) throw new AssertionError("Expected "+e+" but got "+a); }
  static void print(){ long p=rows.stream().filter(r->r.status.equals("pass")).count(),f=rows.stream().filter(r->r.status.equals("fail")).count(),s=rows.stream().filter(r->r.status.equals("skip")).count(); StringBuilder o=new StringBuilder("{\"rows\":["); for(int i=0;i<rows.size();i++){Row r=rows.get(i); if(i>0)o.append(","); o.append("{\"name\":\"").append(esc(r.name)).append("\",\"status\":\"").append(r.status).append("\",\"line\":").append(r.line); if(r.error!=null)o.append(",\"error\":\"").append(esc(r.error)).append("\""); o.append("}");} o.append("],\"passed\":").append(p).append(",\"failed\":").append(f).append(",\"skipped\":").append(s).append("}"); System.out.println(o);}
  static String esc(String s){return s.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n");}
}
