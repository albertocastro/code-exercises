import { useState } from "react";
import { Modal } from "./solution";

export default function Demo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Accessible Modal</h2>
        <p>Open it, then close with Esc, the ×, or the backdrop.</p>
      </div>
      <button className="exercise-button" onClick={() => setOpen(true)}>
        Open modal
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Hello">
        <p>This is the modal body.</p>
      </Modal>
    </div>
  );
}
