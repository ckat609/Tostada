import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [categoriaModalOpen, setCategoriaModalOpen] = useState(false);
  const [flash, setFlash] = useState<{ text: string; key: number } | null>(null);

  function triggerFlash(text: string) {
    setFlash({ text, key: Date.now() });
    setTimeout(() => setFlash(null), 2000);
  }

  const sortedCategorias = [...categorias].sort((a, b) => a.categoria.localeCompare(b.categoria));
  const sortedSabores = [...sabores].sort((a, b) => a.sabor.localeCompare(b.sabor));
  const sortedPresentaciones = [...presentaciones].sort((a, b) => a.presentacion.localeCompare(b.presentacion));
  const selectedCategoria = sortedCategorias.find((c) => c.correlativo === categoriaCorrelativo);

  useEffect(() => {
    if (categoriaModalOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalBodyPosition = document.body.style.position;

      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.position = originalBodyPosition;
        document.body.style.width = "";
      };
    }
  }, [categoriaModalOpen]);

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
        triggerFlash("Producto actualizado");
        onCancelEdit();
        resetForm();
      } else {
        await addProducto(accessToken, {
          producto: producto.trim(),
          categoria: categoriaCorrelativo,
          presentaciones: selectedPresentaciones,
          sabores: selectedSabores
        });
        triggerFlash("Producto registrado");
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
        style={{ backgroundColor: editingProducto ? "#fff9e6" : "white", border: editingProducto ? "3px solid #f0ad4e" : undefined }}
      >
        <div>
          <p className="eyebrow" style={{ color: editingProducto ? "#f0ad4e" : undefined }}>
            {editingProducto ? "Editando producto" : "Nueva entrada"}
          </p>
          <h2>{editingProducto ? "Editar producto" : "Agregar producto"}</h2>
        </div>

        <input
          type="text"
          value={producto}
          onChange={(event) => setProducto(event.target.value)}
          placeholder="Nombre del producto"
          style={{
            width: "100%",
            padding: "1rem",
            fontSize: "0.88rem",
            minHeight: "72px",
            borderRadius: "8px",
            border: "2px solid #ddd",
            backgroundColor: producto ? "#2196F3" : "#888",
            color: "white",
            WebkitTextFillColor: "white",
            textAlign: "left",
          }}
        />

        <button
          type="button"
          onClick={() => setCategoriaModalOpen(true)}
          style={{
            width: "100%",
            padding: "1rem",
            fontSize: "0.88rem",
            minHeight: "72px",
            borderRadius: "8px",
            border: "2px solid #ddd",
            backgroundColor: categoriaCorrelativo ? "#2196F3" : "#888",
            cursor: "pointer",
            textAlign: "left",
            color: "white",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {selectedCategoria?.categoria || "Selecciona categoría"}
        </button>

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

      {categoriaModalOpen &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              zIndex: 1000,
              overflow: "auto",
            }}
            onClick={() => setCategoriaModalOpen(false)}
          >
            <div
              style={{
                backgroundColor: "white",
                borderTopLeftRadius: "16px",
                borderTopRightRadius: "16px",
                maxHeight: "80vh",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: "1.5rem",
                  borderBottom: "1px solid #e0e0e0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "1.3rem" }}>Selecciona Categoría</h3>
                <button
                  onClick={() => setCategoriaModalOpen(false)}
                  style={{
                    border: "none",
                    background: "none",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    padding: "0.5rem",
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
              <div
                style={{
                  padding: "1rem",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {sortedCategorias.map((c) => (
                  <button
                    key={c.correlativo}
                    onClick={() => {
                      setCategoriaCorrelativo(c.correlativo);
                      setCategoriaModalOpen(false);
                    }}
                    style={{
                      padding: "1.25rem",
                      fontSize: "1.1rem",
                      border: "2px solid #ddd",
                      backgroundColor: categoriaCorrelativo === c.correlativo ? "#e3f2fd" : "white",
                      borderColor: categoriaCorrelativo === c.correlativo ? "#2196F3" : "#ddd",
                      borderRadius: "8px",
                      cursor: "pointer",
                      minHeight: "70px",
                      transition: "all 0.2s",
                      color: "#000",
                    }}
                  >
                    {c.categoria}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}

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
