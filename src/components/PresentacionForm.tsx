import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { addPresentacion, updatePresentacion, type Presentacion } from "../lib/graph";

interface PresentacionFormProps {
  accessToken: string;
  onSaved: () => void | Promise<void>;
  editingPresentacion: Presentacion | null;
  onCancelEdit: () => void;
}

export function PresentacionForm({ accessToken, onSaved, editingPresentacion, onCancelEdit }: PresentacionFormProps) {
  const [presentacion, setPresentacion] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ text: string; key: number } | null>(null);

  function triggerFlash(text: string) {
    setFlash({ text, key: Date.now() });
    setTimeout(() => setFlash(null), 2000);
  }

  useEffect(() => {
    if (editingPresentacion) {
      setPresentacion(editingPresentacion.presentacion);
    }
  }, [editingPresentacion]);

  function resetForm() {
    setPresentacion("");
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

    if (!presentacion.trim()) {
      setStatus("Por favor completa todos los campos requeridos.");
      return;
    }

    setSaving(true);
    setStatus("");

    try {
      if (editingPresentacion) {
        await updatePresentacion(accessToken, editingPresentacion.rowIndex, { presentacion: presentacion.trim() });
        triggerFlash("Presentación actualizada");
        onCancelEdit();
        resetForm();
      } else {
        await addPresentacion(accessToken, { presentacion: presentacion.trim() });
        triggerFlash("Presentación registrada");
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
      style={{ backgroundColor: editingPresentacion ? "#fff9e6" : "white", border: editingPresentacion ? "3px solid #f0ad4e" : undefined }}
    >
      <div>
        <p className="eyebrow" style={{ color: editingPresentacion ? "#f0ad4e" : undefined }}>
          {editingPresentacion ? "Editando presentación" : "Nueva entrada"}
        </p>
        <h2>{editingPresentacion ? "Editar presentación" : "Agregar presentación"}</h2>
      </div>

      <input
        type="text"
        value={presentacion}
        onChange={(event) => setPresentacion(event.target.value)}
        placeholder="Nombre de la presentación"
        style={{
          width: "100%",
          padding: "1rem",
          fontSize: "0.88rem",
          minHeight: "72px",
          borderRadius: "8px",
          border: "2px solid #ddd",
          backgroundColor: presentacion ? "#2196F3" : "#888",
          color: "white",
          WebkitTextFillColor: "white",
          textAlign: "left",
        }}
      />

      <div style={{ display: "flex", gap: "0.5rem" }}>
        {editingPresentacion && (
          <button type="button" className="secondary" style={{ flex: 1 }} onClick={handleCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" style={{ flex: 1 }} disabled={saving || !presentacion.trim()}>
          {saving ? (editingPresentacion ? "Actualizando…" : "Guardando…") : (editingPresentacion ? "Actualizar" : "Guardar")}
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
