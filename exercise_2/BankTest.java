import java.util.*;

public class BankTest {
  static final List<Row> rows=new ArrayList<>(); static int maxLevel=Integer.MAX_VALUE; interface Fn{void run()throws Exception;} record Row(String name,String status,String error,int line){}
  public static void main(String[] args){ if(args.length>0)maxLevel=Integer.parseInt(args[0]);
    test(1,"createAccount returns true",8,()->eq(true,new Bank().createAccount("alice",100)));
    test(1,"duplicate account returns false",9,()->{Bank b=new Bank();b.createAccount("alice",100);eq(false,b.createAccount("alice",50));});
    test(1,"deposit returns new balance",10,()->{Bank b=new Bank();b.createAccount("alice",100);eq(150.0,b.deposit("alice",50));});
    test(1,"withdraw insufficient returns null",11,()->{Bank b=new Bank();b.createAccount("alice",100);eq(null,b.withdraw("alice",200));});
    test(2,"transfer moves funds",12,()->{Bank b=new Bank();b.createAccount("a",500);b.createAccount("b",200);eq(true,b.transfer("a","b",100));eq(400.0,b.getBalance("a"));eq(300.0,b.getBalance("b"));});
    test(2,"top accounts sorted",13,()->{Bank b=new Bank();b.createAccount("a",100);b.createAccount("c",300);b.createAccount("b",200);eq(List.of("c","b"),b.getTopAccounts(2));});
    test(3,"deposit creates transaction",14,()->{Bank b=new Bank();b.createAccount("a",0);b.deposit("a",50);eq(1,b.getTransactionCount("a"));eq("DEPOSIT",b.getTransactionHistory("a").get(0).type);});
    test(3,"last transaction",15,()->{Bank b=new Bank();b.createAccount("a",0);b.deposit("a",50);b.deposit("a",25);eq(75.0,b.getLastTransaction("a").balanceAfter);});
    test(4,"premium interest",16,()->{Bank b=new Bank();b.createAccount("a",1000);b.setAccountTier("a",AccountTier.PREMIUM);eq(15.0,b.applyInterest());eq(1015.0,b.getBalance("a"));});
    test(4,"interest earned",17,()->{Bank b=new Bank();b.createAccount("a",1000);b.setAccountTier("a",AccountTier.PREMIUM);b.applyInterest();eq(15.0,b.getInterestEarned("a"));});
    print();}
  static void test(int l,String n,int line,Fn fn){if(l>maxLevel){rows.add(new Row(n,"skip",null,line));return;}try{fn.run();rows.add(new Row(n,"pass",null,line));}catch(Throwable e){rows.add(new Row(n,"fail",e.toString(),line));}}
  static void eq(Object e,Object a){if(e instanceof Double ed&&a instanceof Double ad){if(Math.abs(ed-ad)>1e-9)throw new AssertionError("Expected "+e+" but got "+a);return;} if(!Objects.equals(e,a))throw new AssertionError("Expected "+e+" but got "+a);}
  static void print(){long p=rows.stream().filter(r->r.status.equals("pass")).count(),f=rows.stream().filter(r->r.status.equals("fail")).count(),s=rows.stream().filter(r->r.status.equals("skip")).count();StringBuilder o=new StringBuilder("{\"rows\":[");for(int i=0;i<rows.size();i++){Row r=rows.get(i);if(i>0)o.append(",");o.append("{\"name\":\"").append(esc(r.name)).append("\",\"status\":\"").append(r.status).append("\",\"line\":").append(r.line);if(r.error!=null)o.append(",\"error\":\"").append(esc(r.error)).append("\"");o.append("}");}o.append("],\"passed\":").append(p).append(",\"failed\":").append(f).append(",\"skipped\":").append(s).append("}");System.out.println(o);}
  static String esc(String s){return s.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n");}
}
