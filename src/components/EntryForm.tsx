import { useState, type FormEvent } from "react";
import { useMsal } from "@azure/msal-react";
import { addEntryRow } from "../lib/graph";

interface EntryFormProps {
  onSaved: () => void | Promise<void>;
}

export function EntryForm({ onSaved }: EntryFormProps) {
  const { instance, accounts } = useMsal();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const account = accounts[0];

    if (!account) {
      setStatus("Sign in before saving.");
      return;
    }

    const parsedAmount = Number(amount);
    if (!description.trim() || !Number.isFinite(parsedAmount)) {
      setStatus("Enter a description and a valid amount.");
      return;
    }

    setSaving(true);
    setStatus("");

    try {
      await addEntryRow(instance, account, {
        date,
        description: description.trim(),
        amount: parsedAmount
      });
      setDescription("");
      setAmount("");
      setStatus("Saved to Excel.");
      await onSaved();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The row could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">New entry</p>
        <h2>Add a row</h2>
      </div>

      <label>
        Date
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
      </label>

      <label>
        Description
        <input
          type="text"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What is this entry for?"
          required
        />
      </label>

      <label>
        Amount
        <input
          type="number"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
          step="0.01"
          required
        />
      </label>

      <button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save to Excel"}
      </button>

      {status && <p className="status" role="status">{status}</p>}
    </form>
  );
}
