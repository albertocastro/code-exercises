import java.util.*;

public class TaskManagerTest {
  static final List<Row> rows=new ArrayList<>(); static int maxLevel=Integer.MAX_VALUE; interface Fn{void run()throws Exception;} record Row(String name,String status,String error,int line){}
  public static void main(String[] args){if(args.length>0)maxLevel=Integer.parseInt(args[0]);
    test(1,"addTask returns true",8,()->eq(true,new TaskManager().addTask("t1","Task")));
    test(1,"active tasks sorted",9,()->{TaskManager t=new TaskManager();t.addTask("b","B");t.addTask("a","A");eq(List.of("a","b"),t.getActiveTasks());});
    test(1,"complete removes active",10,()->{TaskManager t=new TaskManager();t.addTask("a","A");eq(true,t.completeTask("a"));eq(List.of(),t.getActiveTasks());});
    test(2,"next task by priority",11,()->{TaskManager t=new TaskManager();t.addTask("a","A",1);t.addTask("b","B",3);eq("b",t.getNextTask());});
    test(2,"update priority",12,()->{TaskManager t=new TaskManager();t.addTask("a","A",1);eq(true,t.updatePriority("a",5));eq("a",t.getNextTask());});
    test(3,"overdue tasks",13,()->{TaskManager t=new TaskManager();t.addTask("a","A",1,10);t.addTask("b","B",1,5);eq(List.of("b","a"),t.getOverdueTasks(20));});
    test(3,"urgent overdue",14,()->{TaskManager t=new TaskManager();t.addTask("a","A",1,1);t.addTask("b","B",9,1);eq("b",t.getUrgentTask(2));});
    test(4,"dependency blocks completion",15,()->{TaskManager t=new TaskManager();t.addTask("a","A",1,1);t.addTask("b","B",1,1);t.addDependency("b","a");eq(false,t.canComplete("b"));});
    test(4,"ready tasks",16,()->{TaskManager t=new TaskManager();t.addTask("a","A",1,1);eq(List.of("a"),t.getReadyTasks());});
    print();}
  static void test(int l,String n,int line,Fn fn){if(l>maxLevel){rows.add(new Row(n,"skip",null,line));return;}try{fn.run();rows.add(new Row(n,"pass",null,line));}catch(Throwable e){rows.add(new Row(n,"fail",e.toString(),line));}}
  static void eq(Object e,Object a){if(!Objects.equals(e,a))throw new AssertionError("Expected "+e+" but got "+a);}
  static void print(){long p=rows.stream().filter(r->r.status.equals("pass")).count(),f=rows.stream().filter(r->r.status.equals("fail")).count(),s=rows.stream().filter(r->r.status.equals("skip")).count();StringBuilder o=new StringBuilder("{\"rows\":[");for(int i=0;i<rows.size();i++){Row r=rows.get(i);if(i>0)o.append(",");o.append("{\"name\":\"").append(esc(r.name)).append("\",\"status\":\"").append(r.status).append("\",\"line\":").append(r.line);if(r.error!=null)o.append(",\"error\":\"").append(esc(r.error)).append("\"");o.append("}");}o.append("],\"passed\":").append(p).append(",\"failed\":").append(f).append(",\"skipped\":").append(s).append("}");System.out.println(o);}
  static String esc(String s){return s.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n");}
}
