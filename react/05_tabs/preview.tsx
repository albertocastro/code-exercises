import { Tabs } from "./solution";

export default function Demo() {
  return (
    <div>
      <h2>Tabs</h2>
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
