import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { addVendedor, updateVendedor, type Vendedor } from "../lib/graph";

interface VendedorFormProps {
  accessToken: string;
  onSaved: () => void | Promise<void>;
  editingVendedor: Vendedor | null;
  onCancelEdit: () => void;
}

export function VendedorForm({ accessToken, onSaved, editingVendedor, onCancelEdit }: VendedorFormProps) {
  const [vendedor, setVendedor] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ text: string; key: number } | null>(null);

  function triggerFlash(text: string) {
    setFlash({ text, key: Date.now() });
    setTimeout(() => setFlash(null), 2000);
  }

  useEffect(() => {
    if (editingVendedor) {
      setVendedor(editingVendedor.vendedor);
    }
  }, [editingVendedor]);

  function resetForm() {
    setVendedor("");
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

    if (!vendedor.trim()) {
      setStatus("Por favor completa todos los campos requeridos.");
      return;
    }

    setSaving(true);
    setStatus("");

    try {
      if (editingVendedor) {
        await updateVendedor(accessToken, editingVendedor.rowIndex, { vendedor: vendedor.trim() });
        triggerFlash("Vendedor actualizado");
        onCancelEdit();
        resetForm();
      } else {
        await addVendedor(accessToken, { vendedor: vendedor.trim() });
        triggerFlash("Vendedor registrado");
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
      style={{ backgroundColor: editingVendedor ? "#fff9e6" : "white", border: editingVendedor ? "3px solid #f0ad4e" : undefined }}
    >
      <div>
        <p className="eyebrow" style={{ color: editingVendedor ? "#f0ad4e" : undefined }}>
          {editingVendedor ? "Editando vendedor" : "Nueva entrada"}
        </p>
        <h2>{editingVendedor ? "Editar vendedor" : "Agregar vendedor"}</h2>
      </div>

      <input
        type="text"
        value={vendedor}
        onChange={(event) => setVendedor(event.target.value)}
        placeholder="Nombre del vendedor"
        style={{
          width: "100%",
          padding: "1rem",
          fontSize: "0.88rem",
          minHeight: "72px",
          borderRadius: "8px",
          border: "2px solid #ddd",
          backgroundColor: vendedor ? "#2196F3" : "#888",
          color: "white",
          WebkitTextFillColor: "white",
          textAlign: "left",
        }}
      />

      <div style={{ display: "flex", gap: "0.5rem" }}>
        {editingVendedor && (
          <button type="button" className="secondary" style={{ flex: 1 }} onClick={handleCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" style={{ flex: 1 }} disabled={saving || !vendedor.trim()}>
          {saving ? (editingVendedor ? "Actualizando…" : "Guardando…") : (editingVendedor ? "Actualizar" : "Guardar")}
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
