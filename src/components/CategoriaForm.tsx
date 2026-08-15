import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [flash, setFlash] = useState<{ text: string; key: number } | null>(null);

  function triggerFlash(text: string) {
    setFlash({ text, key: Date.now() });
    setTimeout(() => setFlash(null), 2000);
  }

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
        triggerFlash("Categoría actualizada");
        onCancelEdit();
        resetForm();
      } else {
        await addCategoria(accessToken, { categoria: categoria.trim() });
        triggerFlash("Categoría registrada");
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
      style={{ backgroundColor: editingCategoria ? "#fff9e6" : "white", border: editingCategoria ? "3px solid #f0ad4e" : undefined }}
    >
      <div>
        <p className="eyebrow" style={{ color: editingCategoria ? "#f0ad4e" : undefined }}>
          {editingCategoria ? "Editando categoría" : "Nueva entrada"}
        </p>
        <h2>{editingCategoria ? "Editar categoría" : "Agregar categoría"}</h2>
      </div>

      <input
        type="text"
        value={categoria}
        onChange={(event) => setCategoria(event.target.value)}
        placeholder="Nombre de la categoría"
        style={{
          width: "100%",
          padding: "1rem",
          fontSize: "0.88rem",
          minHeight: "72px",
          borderRadius: "8px",
          border: "2px solid #ddd",
          backgroundColor: categoria ? "#2196F3" : "#888",
          color: "white",
          WebkitTextFillColor: "white",
          textAlign: "left",
        }}
      />

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
