import { useEffect, useState } from "react";
import { addSabor, updateSabor, type Sabor } from "../lib/graph";

interface SaborFormProps {
  accessToken: string;
  onSaved: () => void | Promise<void>;
  editingSabor: Sabor | null;
  onCancelEdit: () => void;
}

export function SaborForm({ accessToken, onSaved, editingSabor, onCancelEdit }: SaborFormProps) {
  const [sabor, setSabor] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingSabor) {
      setSabor(editingSabor.sabor);
    }
  }, [editingSabor]);

  function resetForm() {
    setSabor("");
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

    if (!sabor.trim()) {
      setStatus("Por favor completa todos los campos requeridos.");
      return;
    }

    setSaving(true);
    setStatus("");

    try {
      if (editingSabor) {
        await updateSabor(accessToken, editingSabor.rowIndex, { sabor: sabor.trim() });
        setStatus("Actualizado exitosamente.");
        onCancelEdit();
        resetForm();
      } else {
        await addSabor(accessToken, { sabor: sabor.trim() });
        setStatus("Guardado exitosamente.");
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
    <form
      className="card form"
      onSubmit={handleSubmit}
      style={{ backgroundColor: editingSabor ? "#fff9e6" : "white", border: editingSabor ? "3px solid #f0ad4e" : undefined }}
    >
      <div>
        <p className="eyebrow" style={{ color: editingSabor ? "#f0ad4e" : undefined }}>
          {editingSabor ? "Editando sabor" : "Nueva entrada"}
        </p>
        <h2>{editingSabor ? "Editar sabor" : "Agregar sabor"}</h2>
      </div>

      <label>
        Sabor
        <input
          type="text"
          value={sabor}
          onChange={(event) => setSabor(event.target.value)}
          placeholder="Nombre del sabor"
        />
      </label>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        {editingSabor && (
          <button type="button" className="secondary" style={{ flex: 1 }} onClick={handleCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" style={{ flex: 1 }} disabled={saving || !sabor.trim()}>
          {saving ? (editingSabor ? "Actualizando…" : "Guardando…") : (editingSabor ? "Actualizar" : "Guardar")}
        </button>
      </div>

      {status && <p className="status" role="status">{status}</p>}
    </form>
  );
}
