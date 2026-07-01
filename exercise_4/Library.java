import java.util.*;

public class Library {
  public boolean addBook(String id, String title, int totalCopies) {
    // TODO Level 1: add a new book unless the id already exists.
    return false;
  }

  public boolean checkout(String bookId, String userId) {
    // TODO Level 1: check out one available copy.
    return false;
  }

  public boolean checkout(String bookId, String userId, long dueDate) {
    // TODO Level 3: check out one available copy with a due date.
    return false;
  }

  public Object returnBook(String bookId, String userId) {
    // TODO Level 1/2: return false on failure, null on success, or next user id.
    return false;
  }

  public Integer getAvailableCopies(String bookId) {
    // TODO Level 1: return null when the book does not exist.
    return null;
  }

  public List<String> getBooksCheckedOutBy(String userId) {
    // TODO Level 1: return sorted book ids currently checked out by the user.
    return List.of();
  }

  public boolean addToWaitlist(String bookId, String userId) {
    // TODO Level 2: add a user to the book waitlist.
    return false;
  }

  public List<String> getWaitlist(String bookId) {
    // TODO Level 2: return waitlisted users in order.
    return List.of();
  }

  public Integer getWaitlistPosition(String bookId, String userId) {
    // TODO Level 2: return a 1-based waitlist position, or null.
    return null;
  }

  public List<String> getOverdueBooks(long currentTime) {
    // TODO Level 3: return sorted book ids with at least one overdue checkout.
    return List.of();
  }

  public List<String> getOverdueByUser(String userId, long currentTime) {
    // TODO Level 3: return sorted overdue book ids for this user.
    return List.of();
  }

  public Integer getDaysOverdue(String bookId, String userId, long currentTime) {
    // TODO Level 3: floor overdue days, 0 if not overdue, null if not checked out.
    return null;
  }
}
