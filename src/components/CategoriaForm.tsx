import { useEffect, useState } from "react";
import { addCategoria, updateCategoria, type Categoria } from "../lib/graph";

interface CategoriaFormProps {
  accessToken: string;
  onSaved: () => void | Promise<void>;
  editingCategoria: Categoria | null;
  onCancelEdit: () => void;
}

export function CategoriaForm({ accessToken, onSaved, editingCategoria, onCancelEdit }: CategoriaFormProps) {
  const [categoria, setCategoria] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingCategoria) {
      setCategoria(editingCategoria.categoria);
    }
  }, [editingCategoria]);

  function resetForm() {
    setCategoria("");
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

    if (!categoria.trim()) {
      setStatus("Por favor completa todos los campos requeridos.");
      return;
    }

    setSaving(true);
    setStatus("");

    try {
      if (editingCategoria) {
        await updateCategoria(accessToken, editingCategoria.rowIndex, { categoria: categoria.trim() });
        setStatus("Actualizado exitosamente.");
        onCancelEdit();
        resetForm();
      } else {
        await addCategoria(accessToken, { categoria: categoria.trim() });
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
      style={{ backgroundColor: editingCategoria ? "#fff9e6" : "white", border: editingCategoria ? "3px solid #f0ad4e" : undefined }}
    >
      <div>
        <p className="eyebrow" style={{ color: editingCategoria ? "#f0ad4e" : undefined }}>
          {editingCategoria ? "Editando categoría" : "Nueva entrada"}
        </p>
        <h2>{editingCategoria ? "Editar categoría" : "Agregar categoría"}</h2>
      </div>

      <label>
        Categoría
        <input
          type="text"
          value={categoria}
          onChange={(event) => setCategoria(event.target.value)}
          placeholder="Nombre de la categoría"
        />
      </label>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        {editingCategoria && (
          <button type="button" className="secondary" style={{ flex: 1 }} onClick={handleCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" style={{ flex: 1 }} disabled={saving || !categoria.trim()}>
          {saving ? (editingCategoria ? "Actualizando…" : "Guardando…") : (editingCategoria ? "Actualizar" : "Guardar")}
        </button>
      </div>

      {status && <p className="status" role="status">{status}</p>}
    </form>
  );
}
