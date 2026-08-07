import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { addEntryRow, updateRow, getProductos, getPresentaciones, getTamanos, getRutas, getClientes, type Producto, type Presentacion, type Tamano, type Ruta, type Cliente, type RecentRow } from "../lib/graph";

interface EntryFormProps {
  onSaved: () => void | Promise<void>;
  accessToken: string;
  editingRow: RecentRow | null;
  onCancelEdit: () => void;
}

type ModalType = "ruta" | "cliente" | "producto" | "presentacion" | "tamano" | "cantidad" | "fecha" | null;

export function EntryForm({ onSaved, accessToken, editingRow, onCancelEdit }: EntryFormProps) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ruta, setRuta] = useState("");
  const [cliente, setCliente] = useState("");
  const [description, setDescription] = useState("");
  const [productoCodigo, setProductoCodigo] = useState(""); // Store the presentacion codigo
  const [tamanoCodigo, setTamanoCodigo] = useState(""); // Store the tamano codigo
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [productosError, setProductosError] = useState<string>("");
  const [presentaciones, setPresentaciones] = useState<Presentacion[]>([]);
  const [loadingPresentaciones, setLoadingPresentaciones] = useState(false);
  const [tamanos, setTamanos] = useState<Tamano[]>([]);
  const [loadingTamanos, setLoadingTamanos] = useState(false);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loadingRutas, setLoadingRutas] = useState(false);
  const [rutasError, setRutasError] = useState<string>("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clientesError, setClientesError] = useState<string>("");
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (activeModal) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalBodyPosition = document.body.style.position;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.position = originalBodyPosition;
        document.body.style.width = '';
      };
    }
  }, [activeModal]);

  // Calendar state
  const currentDate = new Date(date);
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth());

  const selectedRuta = rutas.find(r => r.ruta === ruta);
  const filteredClientes = selectedRuta ? clientes.filter(c => c.ruta === selectedRuta.codigo) : [];

  // Get unique descripciones
  const uniqueDescripciones = [...new Set(productos.map(p => p.descripcion))].sort();

  // Get productos that match the selected description
  const productosForDescription = productos.filter(p => p.descripcion === description);

  // Get available presentaciones for selected producto
  const selectedProductoData = productosForDescription[0]; // All productos with same descripcion share presentaciones
  const availablePresentaciones = selectedProductoData
    ? selectedProductoData.presentacion
        .split(',')
        .map(codigo => codigo.trim())
        .map(codigo => presentaciones.find(p => p.codigo === codigo))
        .filter((p): p is Presentacion => p !== undefined)
    : [];

  // Get selected presentacion by codigo
  const selectedPresentacion = presentaciones.find(p => p.codigo === productoCodigo);

  // Get available tamanos for selected producto
  const availableTamanos = selectedProductoData
    ? selectedProductoData.tamano
        .split(',')
        .map(codigo => codigo.trim())
        .map(codigo => tamanos.find(t => t.codigo === codigo))
        .filter((t): t is Tamano => t !== undefined)
    : [];

  // Get selected tamano by codigo
  const selectedTamano = tamanos.find(t => t.codigo === tamanoCodigo);

  useEffect(() => {
    async function fetchProductos() {
      if (!accessToken) return;

      setLoadingProductos(true);
      setProductosError("");
      try {
        const products = await getProductos(accessToken);
        setProductos(products);
        if (products.length === 0) {
          setProductosError("No products found in 'descripcion' column");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load productos";
        setProductosError(message);
        console.error("Could not load productos:", error);
      } finally {
        setLoadingProductos(false);
      }
    }

    void fetchProductos();
  }, [accessToken]);

  useEffect(() => {
    async function fetchPresentaciones() {
      if (!accessToken) return;

      setLoadingPresentaciones(true);
      try {
        const pres = await getPresentaciones(accessToken);
        setPresentaciones(pres);
      } catch (error) {
        console.error("Could not load presentaciones:", error);
      } finally {
        setLoadingPresentaciones(false);
      }
    }

    void fetchPresentaciones();
  }, [accessToken]);

  useEffect(() => {
    async function fetchTamanos() {
      if (!accessToken) return;

      setLoadingTamanos(true);
      try {
        const tams = await getTamanos(accessToken);
        setTamanos(tams);
      } catch (error) {
        console.error("Could not load tamanos:", error);
      } finally {
        setLoadingTamanos(false);
      }
    }

    void fetchTamanos();
  }, [accessToken]);

  useEffect(() => {
    async function fetchRutas() {
      if (!accessToken) return;

      setLoadingRutas(true);
      setRutasError("");
      try {
        const rutasData = await getRutas(accessToken);
        setRutas(rutasData);
        if (rutasData.length === 0) {
          setRutasError("No rutas found");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load rutas";
        setRutasError(message);
        console.error("Could not load rutas:", error);
      } finally {
        setLoadingRutas(false);
      }
    }

    void fetchRutas();
  }, [accessToken]);

  useEffect(() => {
    async function fetchClientes() {
      if (!accessToken) return;

      setLoadingClientes(true);
      setClientesError("");
      try {
        const clients = await getClientes(accessToken);
        setClientes(clients);
        if (clients.length === 0) {
          setClientesError("No clientes found");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load clientes";
        setClientesError(message);
        console.error("Could not load clientes:", error);
      } finally {
        setLoadingClientes(false);
      }
    }

    void fetchClientes();
  }, [accessToken]);

  useEffect(() => {
    setProductoCodigo("");
    setTamanoCodigo("");
  }, [description]);

  useEffect(() => {
    setCliente("");
  }, [ruta]);

  // Load editing row data
  useEffect(() => {
    if (editingRow) {
      setDate(editingRow.fecha);
      setRuta(editingRow.ruta);
      setCliente(editingRow.cliente);
      // The presentacion and tamano codes are stored in editingRow
      // Find which producto has this presentacion code
      const producto = productos.find(p =>
        p.presentacion.split(',').map(c => c.trim()).includes(editingRow.presentacion)
      );
      if (producto) {
        setDescription(producto.descripcion);
        setProductoCodigo(editingRow.presentacion);
        setTamanoCodigo(editingRow.tamano);
      }
      setAmount(editingRow.cantidad);
    }
  }, [editingRow, productos]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setStatus("Inicia sesión antes de guardar.");
      return;
    }

    const parsedAmount = Number(amount);
    if (!date || !ruta || !cliente || !description.trim() || !productoCodigo || !tamanoCodigo || !amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setStatus("Por favor completa todos los campos requeridos.");
      return;
    }

    setSaving(true);
    setStatus("");

    try {
      if (editingRow) {
        // Update existing row
        await updateRow(accessToken, editingRow.rowIndex, {
          fecha: date,
          cliente: cliente,
          descripcion: description.trim(),
          presentacion: productoCodigo, // Store presentacion codigo
          tamano: tamanoCodigo, // Store tamano codigo
          cantidad: parsedAmount
        });
        setStatus("Actualizado exitosamente.");
        onCancelEdit();
        // Reset form
        setDate(new Date().toISOString().slice(0, 10));
        setRuta("");
        setCliente("");
        setDescription("");
        setProductoCodigo("");
        setTamanoCodigo("");
        setAmount("");
      } else {
        // Add new row
        await addEntryRow(accessToken, {
          fecha: date,
          cliente: cliente,
          descripcion: description.trim(),
          presentacion: productoCodigo, // Store presentacion codigo
          tamano: tamanoCodigo, // Store tamano codigo
          cantidad: parsedAmount
        });
        setAmount("");
        setStatus("Guardado exitosamente.");
      }
      await onSaved();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    onCancelEdit();
    // Reset form
    setDate(new Date().toISOString().slice(0, 10));
    setRuta("");
    setCliente("");
    setDescription("");
    setProductoCodigo("");
    setTamanoCodigo("");
    setAmount("");
    setStatus("");
  }

  return (
    <>
      <form className="card form" onSubmit={handleSubmit} style={{ fontSize: "1.1rem", backgroundColor: editingRow ? "#fff9e6" : "white", border: editingRow ? "3px solid #f0ad4e" : undefined }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p className="eyebrow" style={{ color: editingRow ? "#f0ad4e" : undefined }}>
              {editingRow ? "Editando entrada" : "Nueva entrada"}
            </p>
            <h2>{editingRow ? "Editar venta" : "Agregar venta"}</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setDate(new Date().toISOString().slice(0, 10));
              setRuta("");
              setCliente("");
              setDescription("");
              setProductoCodigo("");
              setTamanoCodigo("");
              setAmount("");
              setStatus("");
            }}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            Limpiar
          </button>
        </div>

        <button
          type="button"
          onClick={() => setActiveModal("fecha")}
          style={{
            width: "100%",
            padding: "1rem",
            fontSize: "1.1rem",
            minHeight: "56px",
            borderRadius: "8px",
            border: "2px solid #ddd",
            backgroundColor: date ? "#2196F3" : "#888",
            cursor: "pointer",
            textAlign: "left",
            color: "white",
            textTransform: "capitalize"
          }}
        >
          {new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </button>

        <div className="two-col-grid">
          <div>
            <button
              type="button"
              onClick={() => setActiveModal("ruta")}
              disabled={loadingRutas}
              style={{
                width: "100%",
                padding: "1rem",
                fontSize: "1.1rem",
                minHeight: "56px",
                borderRadius: "8px",
                border: "2px solid #ddd",
                backgroundColor: ruta ? "#2196F3" : "#888",
                cursor: "pointer",
                textAlign: "left",
                color: "white"
              }}
            >
              {loadingRutas ? "Cargando..." : ruta || "Ruta"}
            </button>
            {rutasError && <p className="status" style={{ color: "red", fontSize: "0.875rem", marginTop: "0.25rem" }}>{rutasError}</p>}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setActiveModal("cliente")}
              disabled={!ruta || loadingClientes}
              style={{
                width: "100%",
                padding: "1rem",
                fontSize: "1.1rem",
                minHeight: "56px",
                borderRadius: "8px",
                border: "2px solid #ddd",
                backgroundColor: cliente ? "#2196F3" : "#888",
                cursor: "pointer",
                textAlign: "left",
                color: "white"
              }}
            >
              {!ruta ? "Selecciona ruta" : loadingClientes ? "Cargando..." : cliente || "Cliente"}
            </button>
            {clientesError && <p className="status" style={{ color: "red", fontSize: "0.875rem", marginTop: "0.25rem" }}>{clientesError}</p>}
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setActiveModal("producto")}
            disabled={loadingProductos}
            style={{
              width: "100%",
              padding: "1rem",
              fontSize: "1.1rem",
              minHeight: "56px",
              borderRadius: "8px",
              border: "2px solid #ddd",
              backgroundColor: description ? "#2196F3" : "#888",
              cursor: "pointer",
              textAlign: "left",
              color: "white"
            }}
          >
            {loadingProductos ? "Cargando..." : description || "Producto"}
          </button>
          {productosError && <p className="status" style={{ color: "red", fontSize: "0.875rem", marginTop: "0.25rem" }}>{productosError}</p>}
        </div>

        <div className="two-col-grid">
          <button
            type="button"
            onClick={() => setActiveModal("presentacion")}
            disabled={!description || loadingProductos}
            style={{
              width: "100%",
              padding: "1rem",
              fontSize: "1.1rem",
              minHeight: "56px",
              borderRadius: "8px",
              border: "2px solid #ddd",
              backgroundColor: selectedPresentacion ? "#2196F3" : "#888",
              cursor: "pointer",
              textAlign: "left",
              color: "white"
            }}
          >
            {!description ? "Selecciona producto" : selectedPresentacion?.presentacion || "Presentación"}
          </button>

          <button
            type="button"
            onClick={() => setActiveModal("tamano")}
            disabled={!description || loadingProductos}
            style={{
              width: "100%",
              padding: "1rem",
              fontSize: "1.1rem",
              minHeight: "56px",
              borderRadius: "8px",
              border: "2px solid #ddd",
              backgroundColor: selectedTamano ? "#2196F3" : "#888",
              cursor: "pointer",
              textAlign: "left",
              color: "white"
            }}
          >
            {!description ? "Selecciona producto" : selectedTamano?.tamano || "Tamaño"}
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setActiveModal("cantidad")}
            style={{
              width: "100%",
              padding: "1rem",
              fontSize: "1.1rem",
              minHeight: "56px",
              borderRadius: "8px",
              border: "2px solid #ddd",
              backgroundColor: amount ? "#2196F3" : "#888",
              cursor: "pointer",
              textAlign: "left",
              color: "white"
            }}
          >
            {amount || "Cantidad"}
          </button>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
          {editingRow && (
            <button
              type="button"
              onClick={handleCancel}
              style={{
                flex: 1,
                padding: "1.25rem",
                fontSize: "1.25rem",
                fontWeight: "700",
                minHeight: "64px",
                borderRadius: "8px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                cursor: "pointer"
              }}
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={saving || !date || !ruta || !cliente || !description || !productoCodigo || !tamanoCodigo || !amount}
            style={{
              flex: 1,
              padding: "1.25rem",
              fontSize: "1.25rem",
              fontWeight: "700",
              minHeight: "64px",
              borderRadius: "8px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              cursor: "pointer"
            }}
          >
            {saving ? (editingRow ? "Actualizando…" : "Guardando…") : (editingRow ? "Actualizar" : "Guardar")}
          </button>
        </div>

        {status && <p className="status" role="status" style={{ fontSize: "1rem", marginTop: "1rem" }}>{status}</p>}
      </form>

      {/* Selection Modals */}
      {activeModal && createPortal(
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
            overflow: "auto"
          }}
          onClick={() => setActiveModal(null)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: "1.5rem",
              borderBottom: "1px solid #e0e0e0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <h3 style={{ margin: 0, fontSize: "1.3rem" }}>
                {activeModal === "ruta" && "Selecciona Ruta"}
                {activeModal === "cliente" && "Selecciona Cliente"}
                {activeModal === "producto" && "Selecciona Producto"}
                {activeModal === "presentacion" && "Selecciona Presentación"}
                {activeModal === "tamano" && "Selecciona Tamaño"}
                {activeModal === "cantidad" && "Ingresa Cantidad"}
                {activeModal === "fecha" && "Selecciona Fecha"}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                style={{
                  border: "none",
                  background: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  padding: "0.5rem",
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>
            <div style={{
              padding: "1rem",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem"
            }}>
              {activeModal === "ruta" && [...rutas].sort((a, b) => a.ruta.localeCompare(b.ruta)).map((r) => (
                <button
                  key={r.codigo}
                  onClick={() => {
                    setRuta(r.ruta);
                    setActiveModal(null);
                  }}
                  style={{
                    padding: "1.25rem",
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    border: "2px solid #ddd",
                    backgroundColor: ruta === r.ruta ? "#e3f2fd" : "white",
                    borderColor: ruta === r.ruta ? "#2196F3" : "#ddd",
                    borderRadius: "8px",
                    cursor: "pointer",
                    minHeight: "70px",
                    transition: "all 0.2s",
                    color: "#000"
                  }}
                >
                  {r.ruta}
                </button>
              ))}
              {activeModal === "cliente" && [...filteredClientes].sort((a, b) => a.cliente.localeCompare(b.cliente)).map((c) => (
                <button
                  key={c.cliente}
                  onClick={() => {
                    setCliente(c.cliente);
                    setActiveModal(null);
                  }}
                  style={{
                    padding: "1.25rem",
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    border: "2px solid #ddd",
                    backgroundColor: cliente === c.cliente ? "#e3f2fd" : "white",
                    borderColor: cliente === c.cliente ? "#2196F3" : "#ddd",
                    borderRadius: "8px",
                    cursor: "pointer",
                    minHeight: "70px",
                    transition: "all 0.2s",
                    color: "#000"
                  }}
                >
                  {c.cliente}
                </button>
              ))}
              {activeModal === "producto" && uniqueDescripciones.map((desc) => (
                <button
                  key={desc}
                  onClick={() => {
                    setDescription(desc);
                    setProductoCodigo("");
                    setActiveModal(null);
                  }}
                  style={{
                    padding: "1.25rem",
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    border: "2px solid #ddd",
                    backgroundColor: description === desc ? "#e3f2fd" : "white",
                    borderColor: description === desc ? "#2196F3" : "#ddd",
                    borderRadius: "8px",
                    cursor: "pointer",
                    minHeight: "70px",
                    transition: "all 0.2s",
                    color: "#000"
                  }}
                >
                  {desc}
                </button>
              ))}
              {activeModal === "presentacion" && availablePresentaciones.map((p) => (
                <button
                  key={p.codigo}
                  onClick={() => {
                    setProductoCodigo(p.codigo);
                    setActiveModal(null);
                  }}
                  style={{
                    padding: "1.25rem",
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    border: "2px solid #ddd",
                    backgroundColor: productoCodigo === p.codigo ? "#e3f2fd" : "white",
                    borderColor: productoCodigo === p.codigo ? "#2196F3" : "#ddd",
                    borderRadius: "8px",
                    cursor: "pointer",
                    minHeight: "70px",
                    transition: "all 0.2s",
                    color: "#000"
                  }}
                >
                  {p.presentacion}
                </button>
              ))}
              {activeModal === "tamano" && availableTamanos.map((t) => (
                <button
                  key={t.codigo}
                  onClick={() => {
                    setTamanoCodigo(t.codigo);
                    setActiveModal(null);
                  }}
                  style={{
                    padding: "1.25rem",
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    border: "2px solid #ddd",
                    backgroundColor: tamanoCodigo === t.codigo ? "#e3f2fd" : "white",
                    borderColor: tamanoCodigo === t.codigo ? "#2196F3" : "#ddd",
                    borderRadius: "8px",
                    cursor: "pointer",
                    minHeight: "70px",
                    transition: "all 0.2s",
                    color: "#000"
                  }}
                >
                  {t.tamano}
                </button>
              ))}
              {activeModal === "cantidad" && (
                <>
                  <div
                    style={{
                      padding: "2rem",
                      fontSize: "3rem",
                      minHeight: "100px",
                      textAlign: "center",
                      borderRadius: "8px",
                      border: "2px solid #ddd",
                      fontWeight: "700",
                      backgroundColor: "#f9f9f9",
                      marginBottom: "1.5rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {amount || "0"}
                  </div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "0.75rem",
                    maxWidth: "400px",
                    margin: "0 auto",
                    width: "100%"
                  }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setAmount(prev => prev + String(num))}
                        style={{
                          padding: "1.5rem",
                          fontSize: "1.5rem",
                          fontWeight: "600",
                          border: "2px solid #ddd",
                          backgroundColor: "white",
                          borderRadius: "8px",
                          cursor: "pointer",
                          minHeight: "70px",
                          transition: "all 0.2s",
                          color: "#000"
                        }}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAmount("")}
                      style={{
                        padding: "1.5rem",
                        fontSize: "1.2rem",
                        fontWeight: "600",
                        border: "2px solid #dc3545",
                        backgroundColor: "#ffe5e5",
                        borderRadius: "8px",
                        cursor: "pointer",
                        minHeight: "70px",
                        transition: "all 0.2s",
                        color: "#000"
                      }}
                    >
                      Limpiar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmount(prev => prev + "0")}
                      style={{
                        padding: "1.5rem",
                        fontSize: "1.5rem",
                        fontWeight: "600",
                        border: "2px solid #ddd",
                        backgroundColor: "white",
                        borderRadius: "8px",
                        cursor: "pointer",
                        minHeight: "70px",
                        transition: "all 0.2s",
                        color: "#000"
                      }}
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmount(prev => prev.slice(0, -1))}
                      style={{
                        padding: "1.5rem",
                        fontSize: "1.2rem",
                        fontWeight: "600",
                        border: "2px solid #ffc107",
                        backgroundColor: "#fff9e6",
                        borderRadius: "8px",
                        cursor: "pointer",
                        minHeight: "70px",
                        transition: "all 0.2s",
                        color: "#000"
                      }}
                    >
                      ⌫
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    style={{
                      marginTop: "1.5rem",
                      padding: "1.25rem",
                      fontSize: "1.25rem",
                      fontWeight: "700",
                      border: "none",
                      backgroundColor: "#2196F3",
                      color: "white",
                      borderRadius: "8px",
                      cursor: "pointer",
                      minHeight: "60px"
                    }}
                  >
                    Listo
                  </button>
                </>
              )}
              {activeModal === "fecha" && (() => {
                const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
                const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
                const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

                const days = [];
                for (let i = 0; i < firstDayOfMonth; i++) {
                  days.push(null);
                }
                for (let day = 1; day <= daysInMonth; day++) {
                  days.push(day);
                }

                const handleDateSelect = (day: number) => {
                  const selectedDate = new Date(viewYear, viewMonth, day);
                  setDate(selectedDate.toISOString().slice(0, 10));
                  setActiveModal(null);
                };

                const goToPreviousMonth = () => {
                  if (viewMonth === 0) {
                    setViewMonth(11);
                    setViewYear(viewYear - 1);
                  } else {
                    setViewMonth(viewMonth - 1);
                  }
                };

                const goToNextMonth = () => {
                  if (viewMonth === 11) {
                    setViewMonth(0);
                    setViewYear(viewYear + 1);
                  } else {
                    setViewMonth(viewMonth + 1);
                  }
                };

                const isToday = (day: number) => {
                  const today = new Date();
                  return day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                };

                const isSelected = (day: number) => {
                  return date === `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                };

                return (
                  <div style={{ width: "100%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", gap: "1rem" }}>
                      <button
                        type="button"
                        onClick={goToPreviousMonth}
                        style={{
                          padding: "0.75rem 1.25rem",
                          fontSize: "1.5rem",
                          border: "2px solid #ddd",
                          backgroundColor: "white",
                          borderRadius: "8px",
                          cursor: "pointer",
                          color: "#000",
                          minWidth: "60px"
                        }}
                      >
                        ←
                      </button>
                      <div style={{ fontSize: "1.3rem", fontWeight: "600", textAlign: "center", flex: 1 }}>
                        {monthNames[viewMonth]} {viewYear}
                      </div>
                      <button
                        type="button"
                        onClick={goToNextMonth}
                        style={{
                          padding: "0.75rem 1.25rem",
                          fontSize: "1.5rem",
                          border: "2px solid #ddd",
                          backgroundColor: "white",
                          borderRadius: "8px",
                          cursor: "pointer",
                          color: "#000",
                          minWidth: "60px"
                        }}
                      >
                        →
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      {dayNames.map(name => (
                        <div key={name} style={{ textAlign: "center", fontWeight: "600", fontSize: "1rem", padding: "0.5rem", color: "#666" }}>
                          {name}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.75rem" }}>
                      {days.map((day, index) => day === null ? (
                        <div key={`empty-${index}`} />
                      ) : (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleDateSelect(day)}
                          style={{
                            padding: "0.75rem",
                            fontSize: "1.1rem",
                            fontWeight: "600",
                            border: isSelected(day) ? "3px solid #2196F3" : isToday(day) ? "2px solid #2196F3" : "2px solid #ddd",
                            backgroundColor: isSelected(day) ? "#e3f2fd" : "white",
                            borderRadius: "8px",
                            cursor: "pointer",
                            minHeight: "60px",
                            transition: "all 0.2s",
                            color: "#000",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
