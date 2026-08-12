import { useEffect, useState } from "react";
import { addProducto, updateProducto, type Producto, type Categoria, type Sabor, type Presentacion } from "../lib/graph";

interface ProductoFormProps {
  accessToken: string;
  categorias: Categoria[];
  sabores: Sabor[];
  presentaciones: Presentacion[];
  onSaved: () => void | Promise<void>;
  editingProducto: Producto | null;
  onCancelEdit: () => void;
}

export function ProductoForm({ accessToken, categorias, sabores, presentaciones, onSaved, editingProducto, onCancelEdit }: ProductoFormProps) {
  const [producto, setProducto] = useState("");
  const [categoriaCorrelativo, setCategoriaCorrelativo] = useState("");
  const [selectedSabores, setSelectedSabores] = useState<string[]>([]);
  const [selectedPresentaciones, setSelectedPresentaciones] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const sortedCategorias = [...categorias].sort((a, b) => a.categoria.localeCompare(b.categoria));
  const sortedSabores = [...sabores].sort((a, b) => a.sabor.localeCompare(b.sabor));
  const sortedPresentaciones = [...presentaciones].sort((a, b) => a.presentacion.localeCompare(b.presentacion));

  useEffect(() => {
    if (editingProducto) {
      setProducto(editingProducto.producto);
      setCategoriaCorrelativo(editingProducto.categoria);
      setSelectedSabores(editingProducto.sabores ? editingProducto.sabores.split(",").filter(s => s.trim()) : []);
      setSelectedPresentaciones(editingProducto.presentaciones ? editingProducto.presentaciones.split(",").filter(p => p.trim()) : []);
    }
  }, [editingProducto]);

  function resetForm() {
    setProducto("");
    setCategoriaCorrelativo("");
    setSelectedSabores([]);
    setSelectedPresentaciones([]);
  }

  function handleCancel() {
    onCancelEdit();
    resetForm();
    setStatus("");
  }

  function toggleSabor(correlativo: string) {
    setSelectedSabores(prev =>
      prev.includes(correlativo)
        ? prev.filter(s => s !== correlativo)
        : [...prev, correlativo]
    );
  }

  function togglePresentacion(correlativo: string) {
    setSelectedPresentaciones(prev =>
      prev.includes(correlativo)
        ? prev.filter(p => p !== correlativo)
        : [...prev, correlativo]
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setStatus("Inicia sesión antes de guardar.");
      return;
    }

    if (!producto.trim()) {
      setStatus("Por favor ingresa un nombre de producto.");
      return;
    }

    if (!categoriaCorrelativo) {
      setStatus("Por favor selecciona una categoría.");
      return;
    }

    if (selectedPresentaciones.length === 0) {
      setStatus("Selecciona al menos una presentación.");
      return;
    }

    setSaving(true);
    setStatus("");

    try {
      if (editingProducto) {
        await updateProducto(accessToken, editingProducto.rowIndex, {
          producto: producto.trim(),
          categoria: categoriaCorrelativo,
          presentaciones: selectedPresentaciones,
          sabores: selectedSabores
        });
        setStatus("Actualizado exitosamente.");
        onCancelEdit();
        resetForm();
      } else {
        await addProducto(accessToken, {
          producto: producto.trim(),
          categoria: categoriaCorrelativo,
          presentaciones: selectedPresentaciones,
          sabores: selectedSabores
        });
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
      style={{ backgroundColor: editingProducto ? "#fff9e6" : "white", border: editingProducto ? "3px solid #f0ad4e" : undefined }}
    >
      <div>
        <p className="eyebrow" style={{ color: editingProducto ? "#f0ad4e" : undefined }}>
          {editingProducto ? "Editando producto" : "Nueva entrada"}
        </p>
        <h2>{editingProducto ? "Editar producto" : "Agregar producto"}</h2>
      </div>

      <label>
        Producto
        <input
          type="text"
          value={producto}
          onChange={(event) => setProducto(event.target.value)}
          placeholder="Nombre del producto"
        />
      </label>

      <label>
        Categoría
        <select
          value={categoriaCorrelativo}
          onChange={(event) => setCategoriaCorrelativo(event.target.value)}
          style={{
            backgroundColor: categoriaCorrelativo ? "#e3f2fd" : "#fafbfc",
            borderColor: categoriaCorrelativo ? "#2196F3" : "#cfd8dc"
          }}
        >
          <option value="">Selecciona categoría</option>
          {sortedCategorias.map((c) => (
            <option key={c.correlativo} value={c.correlativo}>{c.categoria}</option>
          ))}
        </select>
      </label>

      <div>
        <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
          Presentaciones (selecciona al menos una)
        </label>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "0.5rem",
          padding: "0.75rem",
          border: "1px solid #ddd",
          borderRadius: "4px",
          backgroundColor: "#fafbfc"
        }}>
          {sortedPresentaciones.map((p) => (
            <label
              key={p.correlativo}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                cursor: "pointer",
                padding: "0.75rem",
                borderRadius: "6px",
                backgroundColor: selectedPresentaciones.includes(p.correlativo) ? "#e3f2fd" : "white",
                border: selectedPresentaciones.includes(p.correlativo) ? "2px solid #2196F3" : "1px solid #ddd",
                transition: "all 0.2s"
              }}
            >
              <input
                type="checkbox"
                checked={selectedPresentaciones.includes(p.correlativo)}
                onChange={() => togglePresentacion(p.correlativo)}
                style={{
                  cursor: "pointer",
                  width: "18px",
                  height: "18px",
                  accentColor: "#2196F3"
                }}
              />
              <span style={{ fontSize: "1rem", flex: 1 }}>{p.presentacion}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
          Sabores (opcional)
        </label>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "0.5rem",
          padding: "0.75rem",
          border: "1px solid #ddd",
          borderRadius: "4px",
          backgroundColor: "#fafbfc"
        }}>
          {sortedSabores.map((s) => (
            <label
              key={s.correlativo}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                cursor: "pointer",
                padding: "0.75rem",
                borderRadius: "6px",
                backgroundColor: selectedSabores.includes(s.correlativo) ? "#e3f2fd" : "white",
                border: selectedSabores.includes(s.correlativo) ? "2px solid #2196F3" : "1px solid #ddd",
                transition: "all 0.2s"
              }}
            >
              <input
                type="checkbox"
                checked={selectedSabores.includes(s.correlativo)}
                onChange={() => toggleSabor(s.correlativo)}
                style={{
                  cursor: "pointer",
                  width: "18px",
                  height: "18px",
                  accentColor: "#2196F3"
                }}
              />
              <span style={{ fontSize: "1rem", flex: 1 }}>{s.sabor}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        {editingProducto && (
          <button type="button" className="secondary" style={{ flex: 1 }} onClick={handleCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" style={{ flex: 1 }} disabled={saving || !producto.trim() || !categoriaCorrelativo || selectedPresentaciones.length === 0}>
          {saving ? (editingProducto ? "Actualizando…" : "Guardando…") : (editingProducto ? "Actualizar" : "Guardar")}
        </button>
      </div>

      {status && <p className="status" role="status">{status}</p>}
    </form>
  );
}
