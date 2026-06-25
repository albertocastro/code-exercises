import { InfiniteList } from "./solution";

export default function Demo() {
  // 4 pages of 10, then empty.
  const fetchPage = (page: number) =>
    new Promise<string[]>((res) =>
      setTimeout(
        () => res(page < 4 ? Array.from({ length: 10 }, (_, i) => `Item ${page * 10 + i + 1}`) : []),
        300
      )
    );
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Infinite Scroll</h2>
        <p>Scroll the list to load more (4 pages).</p>
      </div>
      <div style={{ maxHeight: 260, overflow: "auto" }}>
        <InfiniteList fetchPage={fetchPage} pageSize={10} />
      </div>
    </div>
  );
}
