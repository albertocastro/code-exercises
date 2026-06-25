import { Tabs } from "./solution";

export default function Demo() {
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Tabs</h2>
        <p>Switch panels with clicks, then add ARIA and keyboard support.</p>
      </div>
      <Tabs
        tabs={[
          { label: "Profile", content: <p>Your profile details.</p> },
          { label: "Settings", content: <p>App settings live here.</p> },
          { label: "Billing", content: <p>Invoices and payment methods.</p> },
        ]}
      />
    </div>
  );
}
