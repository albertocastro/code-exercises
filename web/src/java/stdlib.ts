// A curated slice of the Java standard library — just enough surface area for
// the exercises in this repo (collections, concurrency, atomics, boxing, IO).
// This is deliberately NOT the whole JDK: it's a hand-picked set that makes the
// in-browser autocomplete useful without a language server. `detail` is the
// signature shown in the completion list; `doc` is the hover blurb.

export type Member = { name: string; detail: string; doc?: string };
export type JavaType = { doc?: string; members?: Member[]; statics?: Member[] };

const m = (name: string, detail: string, doc?: string): Member => ({ name, detail, doc });

export const STDLIB: Record<string, JavaType> = {
  String: {
    doc: "An immutable sequence of characters.",
    members: [
      m("length", "int length()"),
      m("charAt", "char charAt(int index)"),
      m("substring", "String substring(int begin, int end)"),
      m("indexOf", "int indexOf(String s)"),
      m("split", "String[] split(String regex)"),
      m("trim", "String trim()"),
      m("replace", "String replace(CharSequence a, CharSequence b)"),
      m("equals", "boolean equals(Object o)"),
      m("isEmpty", "boolean isEmpty()"),
      m("toLowerCase", "String toLowerCase()"),
      m("toUpperCase", "String toUpperCase()"),
      m("contains", "boolean contains(CharSequence s)"),
      m("startsWith", "boolean startsWith(String prefix)"),
    ],
    statics: [m("valueOf", "static String valueOf(Object o)"), m("format", "static String format(String fmt, Object... args)")],
  },
  StringBuilder: {
    doc: "A mutable sequence of characters.",
    members: [
      m("append", "StringBuilder append(Object o)"),
      m("insert", "StringBuilder insert(int offset, Object o)"),
      m("toString", "String toString()"),
      m("length", "int length()"),
      m("reverse", "StringBuilder reverse()"),
    ],
  },
  List: {
    doc: "An ordered collection (java.util.List).",
    members: [
      m("add", "boolean add(E e)"),
      m("get", "E get(int index)"),
      m("set", "E set(int index, E e)"),
      m("remove", "E remove(int index)"),
      m("size", "int size()"),
      m("isEmpty", "boolean isEmpty()"),
      m("contains", "boolean contains(Object o)"),
      m("indexOf", "int indexOf(Object o)"),
      m("clear", "void clear()"),
      m("forEach", "void forEach(Consumer<E> action)"),
      m("stream", "Stream<E> stream()"),
    ],
    statics: [m("of", "static List<E> of(E... elements)")],
  },
  Map: {
    doc: "A key/value mapping (java.util.Map).",
    members: [
      m("put", "V put(K key, V value)"),
      m("get", "V get(Object key)"),
      m("getOrDefault", "V getOrDefault(Object key, V def)"),
      m("containsKey", "boolean containsKey(Object key)"),
      m("remove", "V remove(Object key)"),
      m("size", "int size()"),
      m("keySet", "Set<K> keySet()"),
      m("values", "Collection<V> values()"),
      m("entrySet", "Set<Map.Entry<K,V>> entrySet()"),
      m("computeIfAbsent", "V computeIfAbsent(K key, Function<K,V> f)"),
      m("merge", "V merge(K key, V value, BiFunction<V,V,V> f)"),
      m("forEach", "void forEach(BiConsumer<K,V> action)"),
    ],
    statics: [m("of", "static Map<K,V> of(K k, V v, ...)")],
  },
  Set: {
    doc: "A collection with no duplicate elements.",
    members: [
      m("add", "boolean add(E e)"),
      m("contains", "boolean contains(Object o)"),
      m("remove", "boolean remove(Object o)"),
      m("size", "int size()"),
      m("isEmpty", "boolean isEmpty()"),
      m("stream", "Stream<E> stream()"),
    ],
    statics: [m("of", "static Set<E> of(E... elements)")],
  },
  Deque: {
    doc: "A double-ended queue.",
    members: [
      m("addFirst", "void addFirst(E e)"),
      m("addLast", "void addLast(E e)"),
      m("pollFirst", "E pollFirst()"),
      m("pollLast", "E pollLast()"),
      m("peekFirst", "E peekFirst()"),
      m("peekLast", "E peekLast()"),
      m("push", "void push(E e)"),
      m("pop", "E pop()"),
      m("size", "int size()"),
      m("isEmpty", "boolean isEmpty()"),
    ],
  },
  Queue: {
    members: [
      m("offer", "boolean offer(E e)"),
      m("poll", "E poll()"),
      m("peek", "E peek()"),
      m("size", "int size()"),
      m("isEmpty", "boolean isEmpty()"),
    ],
  },
  Optional: {
    members: [
      m("isPresent", "boolean isPresent()"),
      m("isEmpty", "boolean isEmpty()"),
      m("get", "T get()"),
      m("orElse", "T orElse(T other)"),
      m("map", "Optional<U> map(Function<T,U> f)"),
      m("ifPresent", "void ifPresent(Consumer<T> action)"),
    ],
  },
  // --- concurrency ---------------------------------------------------------
  AtomicInteger: {
    doc: "An int value that may be updated atomically.",
    members: [
      m("get", "int get()"),
      m("set", "void set(int v)"),
      m("incrementAndGet", "int incrementAndGet()"),
      m("decrementAndGet", "int decrementAndGet()"),
      m("getAndIncrement", "int getAndIncrement()"),
      m("addAndGet", "int addAndGet(int delta)"),
      m("compareAndSet", "boolean compareAndSet(int expect, int update)"),
    ],
  },
  AtomicLong: {
    doc: "A long value that may be updated atomically.",
    members: [
      m("get", "long get()"),
      m("set", "void set(long v)"),
      m("incrementAndGet", "long incrementAndGet()"),
      m("addAndGet", "long addAndGet(long delta)"),
      m("compareAndSet", "boolean compareAndSet(long expect, long update)"),
    ],
  },
  AtomicBoolean: {
    doc: "A boolean value that may be updated atomically.",
    members: [
      m("get", "boolean get()"),
      m("set", "void set(boolean v)"),
      m("compareAndSet", "boolean compareAndSet(boolean expect, boolean update)"),
    ],
  },
  AtomicReference: {
    members: [
      m("get", "V get()"),
      m("set", "void set(V v)"),
      m("compareAndSet", "boolean compareAndSet(V expect, V update)"),
      m("updateAndGet", "V updateAndGet(UnaryOperator<V> f)"),
    ],
  },
  ReentrantLock: {
    doc: "A reentrant mutual-exclusion Lock (java.util.concurrent.locks).",
    members: [
      m("lock", "void lock()"),
      m("unlock", "void unlock()"),
      m("tryLock", "boolean tryLock()"),
      m("newCondition", "Condition newCondition()"),
      m("isLocked", "boolean isLocked()"),
    ],
  },
  Lock: {
    members: [m("lock", "void lock()"), m("unlock", "void unlock()"), m("tryLock", "boolean tryLock()"), m("newCondition", "Condition newCondition()")],
  },
  Condition: {
    members: [m("await", "void await() throws InterruptedException"), m("signal", "void signal()"), m("signalAll", "void signalAll()")],
  },
  CountDownLatch: {
    members: [m("await", "void await() throws InterruptedException"), m("countDown", "void countDown()"), m("getCount", "long getCount()")],
  },
  Semaphore: {
    members: [m("acquire", "void acquire() throws InterruptedException"), m("release", "void release()"), m("tryAcquire", "boolean tryAcquire()"), m("availablePermits", "int availablePermits()")],
  },
  Thread: {
    doc: "A thread of execution.",
    members: [
      m("start", "void start()"),
      m("join", "void join() throws InterruptedException"),
      m("interrupt", "void interrupt()"),
      m("isAlive", "boolean isAlive()"),
      m("setDaemon", "void setDaemon(boolean on)"),
      m("getName", "String getName()"),
    ],
    statics: [
      m("sleep", "static void sleep(long millis) throws InterruptedException"),
      m("currentThread", "static Thread currentThread()"),
    ],
  },
  ExecutorService: {
    members: [
      m("submit", "Future<T> submit(Callable<T> task)"),
      m("execute", "void execute(Runnable command)"),
      m("shutdown", "void shutdown()"),
      m("awaitTermination", "boolean awaitTermination(long timeout, TimeUnit unit)"),
      m("invokeAll", "List<Future<T>> invokeAll(Collection<Callable<T>> tasks)"),
    ],
  },
  Future: {
    members: [m("get", "V get() throws InterruptedException, ExecutionException"), m("cancel", "boolean cancel(boolean mayInterrupt)"), m("isDone", "boolean isDone()")],
  },
};

// Classes accessed statically (Foo.bar(...)) with only static members worth listing.
export const STATIC_ONLY: Record<string, JavaType> = {
  System: {
    doc: "System utilities. `System.out` is the standard output stream.",
    statics: [
      m("out", "static final PrintStream out", "Standard output — use System.out.println(...)"),
      m("err", "static final PrintStream err"),
      m("currentTimeMillis", "static long currentTimeMillis()"),
      m("nanoTime", "static long nanoTime()"),
      m("getenv", "static String getenv(String name)"),
    ],
  },
  Math: {
    statics: [
      m("max", "static int max(int a, int b)"),
      m("min", "static int min(int a, int b)"),
      m("abs", "static int abs(int a)"),
      m("floor", "static double floor(double a)"),
      m("ceil", "static double ceil(double a)"),
      m("random", "static double random()"),
      m("pow", "static double pow(double a, double b)"),
    ],
  },
  Objects: {
    statics: [
      m("equals", "static boolean equals(Object a, Object b)"),
      m("hash", "static int hash(Object... values)"),
      m("requireNonNull", "static <T> T requireNonNull(T obj)"),
      m("toString", "static String toString(Object o)"),
    ],
  },
  Collections: {
    statics: [
      m("sort", "static <T> void sort(List<T> list)"),
      m("reverse", "static void reverse(List<?> list)"),
      m("emptyList", "static <T> List<T> emptyList()"),
      m("synchronizedList", "static <T> List<T> synchronizedList(List<T> list)"),
      m("unmodifiableList", "static <T> List<T> unmodifiableList(List<T> list)"),
    ],
  },
  Arrays: {
    statics: [
      m("asList", "static <T> List<T> asList(T... a)"),
      m("sort", "static void sort(int[] a)"),
      m("toString", "static String toString(Object[] a)"),
      m("fill", "static void fill(int[] a, int val)"),
    ],
  },
  Executors: {
    statics: [
      m("newFixedThreadPool", "static ExecutorService newFixedThreadPool(int n)"),
      m("newCachedThreadPool", "static ExecutorService newCachedThreadPool()"),
      m("newSingleThreadExecutor", "static ExecutorService newSingleThreadExecutor()"),
    ],
  },
  Integer: {
    statics: [m("parseInt", "static int parseInt(String s)"), m("valueOf", "static Integer valueOf(int i)"), m("MAX_VALUE", "static final int MAX_VALUE"), m("MIN_VALUE", "static final int MIN_VALUE")],
  },
  Long: {
    statics: [m("parseLong", "static long parseLong(String s)"), m("valueOf", "static Long valueOf(long i)"), m("MAX_VALUE", "static final long MAX_VALUE")],
  },
};

// Concrete types the parser maps to an interface's member set (so `new ArrayList<>()` gets List's members).
export const TYPE_ALIASES: Record<string, string> = {
  ArrayList: "List",
  LinkedList: "List",
  HashMap: "Map",
  ConcurrentHashMap: "Map",
  TreeMap: "Map",
  LinkedHashMap: "Map",
  HashSet: "Set",
  TreeSet: "Set",
  LinkedHashSet: "Set",
  ArrayDeque: "Deque",
  ConcurrentLinkedQueue: "Queue",
  LinkedBlockingQueue: "Queue",
  PriorityQueue: "Queue",
};

export const JAVA_KEYWORDS = [
  "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class", "continue",
  "default", "do", "double", "else", "enum", "extends", "final", "finally", "float", "for",
  "if", "implements", "import", "instanceof", "int", "interface", "long", "new", "package",
  "private", "protected", "public", "return", "short", "static", "super", "switch", "synchronized",
  "this", "throw", "throws", "transient", "try", "void", "volatile", "while", "true", "false", "null",
  "record", "var",
];

export type Snippet = { label: string; insertText: string; doc: string };

// insertText uses Monaco snippet syntax ($1, ${1:name}, $0).
export const JAVA_SNIPPETS: Snippet[] = [
  { label: "sysout", insertText: "System.out.println($0);", doc: "System.out.println(...)" },
  { label: "syserr", insertText: "System.err.println($0);", doc: "System.err.println(...)" },
  { label: "fori", insertText: "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}", doc: "indexed for loop" },
  { label: "foreach", insertText: "for (${1:var} ${2:item} : ${3:items}) {\n\t$0\n}", doc: "enhanced for loop" },
  { label: "while", insertText: "while (${1:condition}) {\n\t$0\n}", doc: "while loop" },
  { label: "synchronized", insertText: "synchronized (${1:this}) {\n\t$0\n}", doc: "synchronized block on a monitor" },
  { label: "trycatch", insertText: "try {\n\t$1\n} catch (${2:Exception} ${3:e}) {\n\t$0\n}", doc: "try/catch" },
  { label: "thread", insertText: "Thread ${1:t} = new Thread(() -> {\n\t$0\n});\n${1:t}.start();", doc: "create and start a thread" },
  { label: "main", insertText: "public static void main(String[] args) {\n\t$0\n}", doc: "main method" },
];
