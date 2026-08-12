import { useEffect, useState } from "react";
import { addRuta, updateRuta, type Ruta } from "../lib/graph";

interface RutaFormProps {
  accessToken: string;
  onSaved: () => void | Promise<void>;
  editingRuta: Ruta | null;
  onCancelEdit: () => void;
}

export function RutaForm({ accessToken, onSaved, editingRuta, onCancelEdit }: RutaFormProps) {
  const [ruta, setRuta] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingRuta) {
      setRuta(editingRuta.ruta);
    }
  }, [editingRuta]);

  function resetForm() {
    setRuta("");
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

    if (!ruta.trim()) {
      setStatus("Por favor completa todos los campos requeridos.");
      return;
    }

    setSaving(true);
    setStatus("");

    try {
      if (editingRuta) {
        await updateRuta(accessToken, editingRuta.rowIndex, { ruta: ruta.trim() });
        setStatus("Actualizado exitosamente.");
        onCancelEdit();
        resetForm();
      } else {
        await addRuta(accessToken, { ruta: ruta.trim() });
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
      style={{ backgroundColor: editingRuta ? "#fff9e6" : "white", border: editingRuta ? "3px solid #f0ad4e" : undefined }}
    >
      <div>
        <p className="eyebrow" style={{ color: editingRuta ? "#f0ad4e" : undefined }}>
          {editingRuta ? "Editando ruta" : "Nueva entrada"}
        </p>
        <h2>{editingRuta ? "Editar ruta" : "Agregar ruta"}</h2>
      </div>

      <label>
        Ruta
        <input
          type="text"
          value={ruta}
          onChange={(event) => setRuta(event.target.value)}
          placeholder="Nombre de la ruta"
        />
      </label>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        {editingRuta && (
          <button type="button" className="secondary" style={{ flex: 1 }} onClick={handleCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" style={{ flex: 1 }} disabled={saving || !ruta.trim()}>
          {saving ? (editingRuta ? "Actualizando…" : "Guardando…") : (editingRuta ? "Actualizar" : "Guardar")}
        </button>
      </div>

      {status && <p className="status" role="status">{status}</p>}
    </form>
  );
}
