public class Main {
  public static void main(String[] args) {
    Library library = new Library();
    System.out.println(library.addBook("b1", "Dune", 2));
    System.out.println(library.checkout("b1", "alice"));
    System.out.println(library.getAvailableCopies("b1"));
  }
}
