import { ReactNode, useState } from "react";

/**
 * Build a compound Accordion: <Accordion><AccordionItem title=…>…</AccordionItem></Accordion>.
 * See README.md.
 *
 * The tests rely on each item's header being a button (name = title) with
 * aria-expanded, and the panel content only present when expanded.
 */
export function Accordion({
  children,
}: {
  children: ReactNode;
  allowMultiple?: boolean;
}) {
  // TODO Level 2: coordinate items so only ONE is open at a time (share state
  //   via React context rather than per-item local state).
  // TODO Level 3: an `allowMultiple` prop lets several panels stay open.
  return <div className="exercise-card">{children}</div>;
}

export function AccordionItem({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="accordion-item">
      <button className="accordion-header" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {title}
      </button>
      {open && <div role="region">{children}</div>}
    </div>
  );
}
