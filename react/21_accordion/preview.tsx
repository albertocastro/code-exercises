import { Accordion, AccordionItem } from "./solution";

export default function Demo() {
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Accordion</h2>
        <p>Single-open by default; pass allowMultiple to keep several open.</p>
      </div>
      <Accordion>
        <AccordionItem title="What is React?">A library for building UIs.</AccordionItem>
        <AccordionItem title="What is JSX?">Syntax sugar for React.createElement.</AccordionItem>
        <AccordionItem title="What are hooks?">Functions to use state and effects.</AccordionItem>
      </Accordion>
    </div>
  );
}
