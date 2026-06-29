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
  // TODO Level 1: clicking the header toggles `open`; reflect it in aria-expanded
  //   and render the panel (role="region") with `children` only when open.
  return (
    <div className="accordion-item">
      <button className="accordion-header" aria-expanded={false}>
        {title}
      </button>
      {/* TODO Level 1: render the panel here when open */}
    </div>
  );
}
