import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { addPago, updatePago, type Pago } from "../lib/graph";

interface PagoFormProps {
  accessToken: string;
  onSaved: () => void | Promise<void>;
  editingPago: Pago | null;
  onCancelEdit: () => void;
}

export function PagoForm({ accessToken, onSaved, editingPago, onCancelEdit }: PagoFormProps) {
  const [pago, setPago] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ text: string; key: number } | null>(null);

  function triggerFlash(text: string) {
    setFlash({ text, key: Date.now() });
    setTimeout(() => setFlash(null), 2000);
  }

  useEffect(() => {
    if (editingPago) {
      setPago(editingPago.pago);
    }
  }, [editingPago]);

  function resetForm() {
    setPago("");
  }

  function handleCancel() {
    onCancelEdit();
    resetForm();
    setStatus("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setStatus("Inicia sesión antes de guardar.");
      return;
    }

    if (!pago.trim()) {
      setStatus("Por favor completa todos los campos requeridos.");
      return;
    }

    setSaving(true);
    setStatus("");

    try {
      if (editingPago) {
        await updatePago(accessToken, editingPago.rowIndex, { pago: pago.trim() });
        triggerFlash("Forma de pago actualizada");
        onCancelEdit();
        resetForm();
      } else {
        await addPago(accessToken, { pago: pago.trim() });
        triggerFlash("Forma de pago registrada");
        resetForm();
      }
      await onSaved();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <form
      className="card form"
      onSubmit={handleSubmit}
      style={{ backgroundColor: editingPago ? "#fff9e6" : "white", border: editingPago ? "3px solid #f0ad4e" : undefined }}
    >
      <div>
        <p className="eyebrow" style={{ color: editingPago ? "#f0ad4e" : undefined }}>
          {editingPago ? "Editando forma de pago" : "Nueva entrada"}
        </p>
        <h2>{editingPago ? "Editar forma de pago" : "Agregar forma de pago"}</h2>
      </div>

      <input
        type="text"
        value={pago}
        onChange={(event) => setPago(event.target.value)}
        placeholder="Nombre de la forma de pago"
        style={{
          width: "100%",
          padding: "1rem",
          fontSize: "0.88rem",
          minHeight: "72px",
          borderRadius: "8px",
          border: "2px solid #ddd",
          backgroundColor: pago ? "#2196F3" : "#888",
          color: "white",
          WebkitTextFillColor: "white",
          textAlign: "left",
        }}
      />

      <div style={{ display: "flex", gap: "0.5rem" }}>
        {editingPago && (
          <button type="button" className="secondary" style={{ flex: 1 }} onClick={handleCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" style={{ flex: 1 }} disabled={saving || !pago.trim()}>
          {saving ? (editingPago ? "Actualizando…" : "Guardando…") : (editingPago ? "Actualizar" : "Guardar")}
        </button>
      </div>

      {status && <p className="status" role="status">{status}</p>}
    </form>

    {flash &&
      createPortal(
        <div className="venta-toast-wrap">
          <div key={flash.key} className="venta-toast">
            {flash.text}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
