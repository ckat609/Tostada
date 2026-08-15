import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { addEntryRow, updateRow, getProductos, getPresentaciones, getSabores, getRutas, getClientes, getCategorias, getPagos, type Producto, type Presentacion, type Sabor, type Ruta, type Cliente, type RecentRow, type Categoria, type Pago } from "../lib/graph";

interface EntryFormProps {
  onSaved: () => void | Promise<void>;
  accessToken: string;
  editingRow: RecentRow | null;
  onCancelEdit: () => void;
  onEditSaved: (rowIndex: number, previousCliente: string, previousCodigo: string) => void;
}

type ModalType = "ruta" | "cliente" | "categoria" | "producto" | "presentacion" | "sabor" | "pago" | null;

export function EntryForm({ onSaved, accessToken, editingRow, onCancelEdit, onEditSaved }: EntryFormProps) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [codigo, setCodigo] = useState("");
  const [pagoCorrelativo, setPagoCorrelativo] = useState("");
  const [ruta, setRuta] = useState("");
  const [cliente, setCliente] = useState("");
  const [description, setDescription] = useState("");
  const [productoCorrelativo, setProductoCorrelativo] = useState(""); // Store the presentacion correlativo
  const [saborCorrelativo, setSaborCorrelativo] = useState(""); // Store the sabor correlativo
  const [amount, setAmount] = useState("");
  const [precio, setPrecio] = useState("");
  const [status, setStatus] = useState<string>("");
  const [flash, setFlash] = useState<{ text: string; key: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [productosError, setProductosError] = useState<string>("");
  const [presentaciones, setPresentaciones] = useState<Presentacion[]>([]);
  const [loadingPresentaciones, setLoadingPresentaciones] = useState(false);
  const [sabores, setSabores] = useState<Sabor[]>([]);
  const [loadingSabores, setLoadingSabores] = useState(false);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loadingRutas, setLoadingRutas] = useState(false);
  const [rutasError, setRutasError] = useState<string>("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clientesError, setClientesError] = useState<string>("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [categoriaFilter, setCategoriaFilter] = useState(""); // Filter only, not saved
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (activeModal) {
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
  }, [activeModal]);

  const selectedRuta = rutas.find((r) => r.ruta === ruta);
  const filteredClientes = selectedRuta ? clientes.filter((c) => c.ruta === selectedRuta.correlativo) : [];
  const selectedCliente = clientes.find((c) => c.cliente === cliente);
  const selectedPago = pagos.find((p) => p.correlativo === pagoCorrelativo);

  // Get unique descripciones filtered by categoria
  const filteredProductos = categoriaFilter ? productos.filter((p) => p.categoria === categoriaFilter) : productos;
  const uniqueDescripciones = [...new Set(filteredProductos.map((p) => p.descripcion))].sort();

  // Get productos that match the selected description
  const productosForDescription = productos.filter((p) => p.descripcion === description);

  // Get available presentaciones for selected producto
  const selectedProductoData = productosForDescription[0]; // All productos with same descripcion share presentaciones
  const availablePresentaciones = selectedProductoData
    ? selectedProductoData.presentaciones
        .split(",")
        .map((correlativo) => correlativo.trim())
        .map((correlativo) => presentaciones.find((p) => p.correlativo === correlativo))
        .filter((p): p is Presentacion => p !== undefined)
    : [];

  // Get selected presentacion by correlativo
  const selectedPresentacion = presentaciones.find((p) => p.correlativo === productoCorrelativo);

  // Get available sabores for selected producto
  const availableSabores = selectedProductoData
    ? selectedProductoData.sabores
        .split(",")
        .map((correlativo) => correlativo.trim())
        .filter((c) => c) // Filter out empty strings
        .map((correlativo) => sabores.find((s) => s.correlativo === correlativo))
        .filter((s): s is Sabor => s !== undefined)
    : [];

  // Get selected sabor by correlativo
  const selectedSabor = sabores.find((s) => s.correlativo === saborCorrelativo);

  // Auto-select fields that only have one available option
  useEffect(() => {
    if (!ruta && rutas.length === 1) {
      setRuta(rutas[0].ruta);
    }
  }, [ruta, rutas]);

  useEffect(() => {
    if (!cliente && filteredClientes.length === 1) {
      setCliente(filteredClientes[0].cliente);
    }
  }, [cliente, filteredClientes]);

  useEffect(() => {
    if (!categoriaFilter && categorias.length === 1) {
      setCategoriaFilter(categorias[0].correlativo);
    }
  }, [categoriaFilter, categorias]);

  useEffect(() => {
    if (!description && uniqueDescripciones.length === 1) {
      setDescription(uniqueDescripciones[0]);
      setProductoCorrelativo("");
      setSaborCorrelativo("");
    }
  }, [description, uniqueDescripciones]);

  useEffect(() => {
    if (!productoCorrelativo && availablePresentaciones.length === 1) {
      setProductoCorrelativo(availablePresentaciones[0].correlativo);
    }
  }, [productoCorrelativo, availablePresentaciones]);

  useEffect(() => {
    if (!saborCorrelativo && availableSabores.length === 1) {
      setSaborCorrelativo(availableSabores[0].correlativo);
    }
  }, [saborCorrelativo, availableSabores]);

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
    async function fetchSabores() {
      if (!accessToken) return;

      setLoadingSabores(true);
      try {
        const sabs = await getSabores(accessToken);
        setSabores(sabs);
      } catch (error) {
        console.error("Could not load sabores:", error);
      } finally {
        setLoadingSabores(false);
      }
    }

    void fetchSabores();
  }, [accessToken]);

  useEffect(() => {
    async function fetchCategorias() {
      if (!accessToken) return;

      setLoadingCategorias(true);
      try {
        const cats = await getCategorias(accessToken);
        setCategorias(cats);
      } catch (error) {
        console.error("Could not load categorias:", error);
      } finally {
        setLoadingCategorias(false);
      }
    }

    void fetchCategorias();
  }, [accessToken]);

  useEffect(() => {
    async function fetchPagos() {
      if (!accessToken) return;

      setLoadingPagos(true);
      try {
        const pagosData = await getPagos(accessToken);
        setPagos(pagosData);
      } catch (error) {
        console.error("Could not load pagos:", error);
      } finally {
        setLoadingPagos(false);
      }
    }

    void fetchPagos();
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

  // Load editing row data
  useEffect(() => {
    if (editingRow && productos.length > 0 && rutas.length > 0 && presentaciones.length > 0 && sabores.length > 0) {
      // Find ruta name from correlativo
      const rutaData = rutas.find((r) => r.correlativo === editingRow.ruta);

      // Find producto name from correlativo
      const productoData = productos.find((p) => p.correlativo === editingRow.producto);

      setDate(editingRow.fecha);
      setCodigo(editingRow.codigo);
      setPagoCorrelativo(editingRow.pago);
      setRuta(rutaData?.ruta || "");
      setCliente(editingRow.cliente);
      setDescription(productoData?.descripcion || "");
      setProductoCorrelativo(editingRow.presentacion);
      setSaborCorrelativo(editingRow.sabor);
      setAmount(editingRow.cantidad);
      setPrecio(editingRow.precio_unitario);
    }
  }, [editingRow, productos, rutas, presentaciones, sabores]);

  function triggerFlash(text: string) {
    setFlash({ text, key: Date.now() });
    setTimeout(() => setFlash(null), 2000);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setStatus("Inicia sesión antes de guardar.");
      return;
    }

    const parsedAmount = Number(amount);
    const rawParsedPrecio = Number(precio);
    if (!date || !ruta || !cliente || !description.trim() || !productoCorrelativo || !amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !precio || !Number.isFinite(rawParsedPrecio) || rawParsedPrecio <= 0) {
      setStatus("Por favor completa todos los campos requeridos.");
      return;
    }

    // Round to cents so precio always saves as QXX.XX
    const parsedPrecio = Math.round(rawParsedPrecio * 100) / 100;
    const precioTotal = Math.round(parsedAmount * parsedPrecio * 100) / 100;

    // Find ruta correlativo from ruta name
    const rutaData = rutas.find((r) => r.ruta === ruta);
    if (!rutaData) {
      setStatus("Ruta no encontrada.");
      return;
    }

    // Find cliente correlativo from cliente name
    const clienteData = clientes.find((c) => c.cliente === cliente);
    if (!clienteData) {
      setStatus("Cliente no encontrado.");
      return;
    }

    // Find producto correlativo from descripcion
    const productoData = productos.find((p) => p.descripcion === description);
    if (!productoData) {
      setStatus("Producto no encontrado.");
      return;
    }

    setSaving(true);
    setStatus("");

    // Generate timestamp in UTC
    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19); // Format: "2026-08-07 14:30:45" in UTC

    try {
      if (editingRow) {
        // Update existing row - keep original timestamp
        await updateRow(accessToken, editingRow.rowIndex, {
          fecha: editingRow.fecha, // Keep original timestamp when editing
          codigo, // Store codigo
          pago: pagoCorrelativo, // Store pago correlativo
          ruta: rutaData.correlativo, // Store ruta correlativo
          cliente: clienteData.correlativo, // Store cliente correlativo
          producto: productoData.correlativo, // Store producto correlativo
          presentacion: productoCorrelativo, // Store presentacion correlativo
          sabor: saborCorrelativo, // Store sabor correlativo
          cantidad: parsedAmount,
          precio_unitario: parsedPrecio,
          precio_total: precioTotal,
        });
        onEditSaved(editingRow.rowIndex, editingRow.cliente, editingRow.codigo);
        triggerFlash("Venta actualizada");
        onCancelEdit();
        // Reset form
        setDate(new Date().toISOString().slice(0, 10));
        setCodigo("");
        setPagoCorrelativo("");
        setRuta("");
        setCliente("");
        setDescription("");
        setProductoCorrelativo("");
        setSaborCorrelativo("");
        setAmount("");
      } else {
        // Add new row - use timestamp for new entries
        await addEntryRow(accessToken, {
          fecha: timestamp, // Store timestamp instead of just date
          codigo, // Store codigo
          pago: pagoCorrelativo, // Store pago correlativo
          ruta: rutaData.correlativo, // Store ruta correlativo
          cliente: clienteData.correlativo, // Store cliente correlativo
          producto: productoData.correlativo, // Store producto correlativo
          presentacion: productoCorrelativo, // Store presentacion correlativo
          sabor: saborCorrelativo, // Store sabor correlativo
          cantidad: parsedAmount,
          precio_unitario: parsedPrecio,
          precio_total: precioTotal,
        });
        setAmount("");
        setPrecio("");
        triggerFlash("Venta registrada");
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
    setCodigo("");
    setPagoCorrelativo("");
    setRuta("");
    setCliente("");
    setDescription("");
    setProductoCorrelativo("");
    setSaborCorrelativo("");
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
              setCodigo("");
              setPagoCorrelativo("");
              setRuta("");
              setCliente("");
              setDescription("");
              setProductoCorrelativo("");
              setSaborCorrelativo("");
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
            }}
          >
            Limpiar
          </button>
        </div>

        <div style={{ position: "relative", width: "100%" }}>
          <div
            style={{
              width: "100%",
              padding: "1rem",
              fontSize: "0.88rem",
              minHeight: "72px",
              borderRadius: "8px",
              border: "2px solid #ddd",
              backgroundColor: date ? "#2196F3" : "#888",
              color: "white",
              textAlign: "left",
              textTransform: "capitalize",
              display: "flex",
              alignItems: "center",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {new Date(date + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              opacity: 0,
              cursor: "pointer",
            }}
          />
        </div>

        <div className="two-col-grid-always">
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Código"
            style={{
              width: "100%",
              padding: "1rem",
              fontSize: "0.88rem",
              minHeight: "72px",
              borderRadius: "8px",
              border: "2px solid #ddd",
              backgroundColor: codigo ? "#2196F3" : "#888",
              color: "white",
              WebkitTextFillColor: "white",
              textAlign: "left",
            }}
          />

          <button
            type="button"
            onClick={() => setActiveModal("pago")}
            disabled={loadingPagos}
            style={{
              width: "100%",
              padding: "1rem",
              fontSize: "0.88rem",
              minHeight: "72px",
              borderRadius: "8px",
              border: "2px solid #ddd",
              backgroundColor: pagoCorrelativo ? "#2196F3" : "#888",
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
            {loadingPagos ? "Cargando..." : selectedPago?.pago || "Forma de pago"}
          </button>
        </div>

        <div className="two-col-grid-always">
          <div>
            <button
              type="button"
              onClick={() => setActiveModal("ruta")}
              disabled={loadingRutas}
              style={{
                width: "100%",
                padding: "1rem",
                fontSize: "0.88rem",
                minHeight: "72px",
                borderRadius: "8px",
                border: "2px solid #ddd",
                backgroundColor: ruta ? "#2196F3" : "#888",
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
              {loadingRutas ? "Cargando..." : ruta || "Ruta"}
            </button>
            {rutasError && (
              <p className="status" style={{ color: "red", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                {rutasError}
              </p>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setActiveModal("cliente")}
              disabled={!ruta || loadingClientes}
              style={{
                width: "100%",
                padding: "1rem",
                fontSize: "0.88rem",
                minHeight: "72px",
                borderRadius: "8px",
                border: "2px solid #ddd",
                backgroundColor: cliente ? "#2196F3" : "#888",
                cursor: "pointer",
                textAlign: "left",
                color: "white",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: "0.15rem",
              }}
            >
              <span style={{ width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {!ruta ? "Selecciona ruta" : loadingClientes ? "Cargando..." : cliente || "Cliente"}
              </span>
              {ruta && cliente && !loadingClientes && selectedCliente?.auxiliar && (
                <span style={{ width: "100%", fontSize: "0.66em", opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  ({selectedCliente.auxiliar})
                </span>
              )}
            </button>
            {clientesError && (
              <p className="status" style={{ color: "red", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                {clientesError}
              </p>
            )}
          </div>
        </div>

        <div className="two-col-grid-always">
          <button
            type="button"
            onClick={() => setActiveModal("categoria")}
            disabled={loadingCategorias}
            style={{
              width: "100%",
              padding: "1rem",
              fontSize: "0.88rem",
              minHeight: "72px",
              borderRadius: "8px",
              border: "2px solid #ddd",
              backgroundColor: categoriaFilter ? "#2196F3" : "#888",
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
            {loadingCategorias ? "Cargando..." : categorias.find((c) => c.correlativo === categoriaFilter)?.categoria || "Categoría"}
          </button>

          <div>
            <button
              type="button"
              onClick={() => setActiveModal("producto")}
              disabled={loadingProductos}
              style={{
                width: "100%",
                padding: "1rem",
                fontSize: "0.88rem",
                minHeight: "72px",
                borderRadius: "8px",
                border: "2px solid #ddd",
                backgroundColor: description ? "#2196F3" : "#888",
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
              {loadingProductos ? "Cargando..." : description || "Producto"}
            </button>
            {productosError && (
              <p className="status" style={{ color: "red", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                {productosError}
              </p>
            )}
          </div>
        </div>

        <div className="two-col-grid-always">
          <button
            type="button"
            onClick={() => setActiveModal("presentacion")}
            disabled={!description || loadingProductos}
            style={{
              width: "100%",
              padding: "1rem",
              fontSize: "0.88rem",
              minHeight: "72px",
              borderRadius: "8px",
              border: "2px solid #ddd",
              backgroundColor: selectedPresentacion ? "#2196F3" : "#888",
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
            {!description ? "Selecciona producto" : selectedPresentacion?.presentacion || "Presentación"}
          </button>

          <button
            type="button"
            onClick={() => setActiveModal("sabor")}
            disabled={!description || loadingProductos || sabores.length === 0 || availableSabores.length === 0}
            style={{
              width: "100%",
              padding: "1rem",
              fontSize: "0.88rem",
              minHeight: "72px",
              borderRadius: "8px",
              border: "2px solid #ddd",
              backgroundColor: selectedSabor ? "#2196F3" : "#888",
              cursor: "pointer",
              textAlign: "left",
              color: "white",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              opacity: sabores.length === 0 || availableSabores.length === 0 ? 0.5 : 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {!description ? "Selecciona producto" : selectedSabor?.sabor || "Sabor"}
          </button>
        </div>

        <div className="two-col-grid-always">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Cantidad"
            min="1"
            step="1"
            style={{
              width: "100%",
              padding: "1rem",
              fontSize: "0.88rem",
              minHeight: "72px",
              borderRadius: "8px",
              border: "2px solid #ddd",
              backgroundColor: amount ? "#2196F3" : "#888",
              color: "white",
              WebkitTextFillColor: "white",
              textAlign: "left",
            }}
          />

          <input
            type="number"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="Precio"
            min="0.01"
            step="0.01"
            style={{
              width: "100%",
              padding: "1rem",
              fontSize: "0.88rem",
              minHeight: "72px",
              borderRadius: "8px",
              border: "2px solid #ddd",
              backgroundColor: precio ? "#2196F3" : "#888",
              color: "white",
              WebkitTextFillColor: "white",
              textAlign: "left",
            }}
          />
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
                minHeight: "64px",
                borderRadius: "8px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={saving || !date || !ruta || !cliente || !description || !productoCorrelativo || !amount}
            style={{
              flex: 1,
              padding: "1.25rem",
              fontSize: "1.25rem",
              minHeight: "64px",
              borderRadius: "8px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            {saving ? (editingRow ? "Actualizando…" : "Guardando…") : editingRow ? "Actualizar" : "Guardar"}
          </button>
        </div>

        {status && (
          <p className="status" role="status" style={{ fontSize: "1rem", marginTop: "1rem" }}>
            {status}
          </p>
        )}
      </form>

      {/* Selection Modals */}
      {activeModal &&
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
            onClick={() => setActiveModal(null)}
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
                <h3 style={{ margin: 0, fontSize: "1.3rem" }}>
                  {activeModal === "ruta" && "Selecciona Ruta"}
                  {activeModal === "cliente" && "Selecciona Cliente"}
                  {activeModal === "categoria" && "Filtrar por Categoría"}
                  {activeModal === "producto" && "Selecciona Producto"}
                  {activeModal === "presentacion" && "Selecciona Presentación"}
                  {activeModal === "sabor" && "Selecciona Sabor"}
                  {activeModal === "pago" && "Selecciona Forma de Pago"}
                </h3>
                <button
                  onClick={() => setActiveModal(null)}
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
                {activeModal === "ruta" &&
                  [...rutas]
                    .sort((a, b) => a.ruta.localeCompare(b.ruta))
                    .map((r) => (
                      <button
                        key={r.correlativo}
                        onClick={() => {
                          setRuta(r.ruta);
                          setCliente(""); // Reset cliente when ruta changes
                          setActiveModal(null);
                        }}
                        style={{
                          padding: "1.25rem",
                          fontSize: "1.1rem",
                          border: "2px solid #ddd",
                          backgroundColor: ruta === r.ruta ? "#e3f2fd" : "white",
                          borderColor: ruta === r.ruta ? "#2196F3" : "#ddd",
                          borderRadius: "8px",
                          cursor: "pointer",
                          minHeight: "70px",
                          transition: "all 0.2s",
                          color: "#000",
                        }}
                      >
                        {r.ruta}
                      </button>
                    ))}
                {activeModal === "cliente" &&
                  [...filteredClientes]
                    .sort((a, b) => a.cliente.localeCompare(b.cliente))
                    .map((c) => (
                      <button
                        key={c.cliente}
                        onClick={() => {
                          setCliente(c.cliente);
                          setActiveModal(null);
                        }}
                        style={{
                          padding: "1.25rem",
                          fontSize: "1.1rem",
                          border: "2px solid #ddd",
                          backgroundColor: cliente === c.cliente ? "#e3f2fd" : "white",
                          borderColor: cliente === c.cliente ? "#2196F3" : "#ddd",
                          borderRadius: "8px",
                          cursor: "pointer",
                          minHeight: "70px",
                          transition: "all 0.2s",
                          color: "#000",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "0.15rem",
                        }}
                      >
                        <span>{c.cliente}</span>
                        {c.auxiliar && <span style={{ fontSize: "0.66em", opacity: 0.75 }}>({c.auxiliar})</span>}
                      </button>
                    ))}
                {activeModal === "categoria" &&
                  [...categorias]
                    .sort((a, b) => a.categoria.localeCompare(b.categoria))
                    .map((c) => (
                      <button
                        key={c.correlativo}
                        onClick={() => {
                          setCategoriaFilter(c.correlativo);
                          setDescription(""); // Reset producto when categoria changes
                          setProductoCorrelativo("");
                          setSaborCorrelativo("");
                          setActiveModal(null);
                        }}
                        style={{
                          padding: "1.25rem",
                          fontSize: "1.1rem",
                          border: "2px solid #ddd",
                          backgroundColor: categoriaFilter === c.correlativo ? "#e3f2fd" : "white",
                          borderColor: categoriaFilter === c.correlativo ? "#2196F3" : "#ddd",
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
                {activeModal === "producto" &&
                  uniqueDescripciones.map((desc) => (
                    <button
                      key={desc}
                      onClick={() => {
                        setDescription(desc);
                        setProductoCorrelativo(""); // Reset presentacion when producto changes
                        setSaborCorrelativo(""); // Reset tamano when producto changes
                        setActiveModal(null);
                      }}
                      style={{
                        padding: "1.25rem",
                        fontSize: "1.1rem",
                        border: "2px solid #ddd",
                        backgroundColor: description === desc ? "#e3f2fd" : "white",
                        borderColor: description === desc ? "#2196F3" : "#ddd",
                        borderRadius: "8px",
                        cursor: "pointer",
                        minHeight: "70px",
                        transition: "all 0.2s",
                        color: "#000",
                      }}
                    >
                      {desc}
                    </button>
                  ))}
                {activeModal === "presentacion" &&
                  availablePresentaciones.map((p) => (
                    <button
                      key={p.correlativo}
                      onClick={() => {
                        setProductoCorrelativo(p.correlativo);
                        setActiveModal(null);
                      }}
                      style={{
                        padding: "1.25rem",
                        fontSize: "1.1rem",
                        border: "2px solid #ddd",
                        backgroundColor: productoCorrelativo === p.correlativo ? "#e3f2fd" : "white",
                        borderColor: productoCorrelativo === p.correlativo ? "#2196F3" : "#ddd",
                        borderRadius: "8px",
                        cursor: "pointer",
                        minHeight: "70px",
                        transition: "all 0.2s",
                        color: "#000",
                      }}
                    >
                      {p.presentacion}
                    </button>
                  ))}
                {activeModal === "sabor" &&
                  availableSabores.map((s) => (
                    <button
                      key={s.correlativo}
                      onClick={() => {
                        setSaborCorrelativo(s.correlativo);
                        setActiveModal(null);
                      }}
                      style={{
                        padding: "1.25rem",
                        fontSize: "1.1rem",
                        border: "2px solid #ddd",
                        backgroundColor: saborCorrelativo === s.correlativo ? "#e3f2fd" : "white",
                        borderColor: saborCorrelativo === s.correlativo ? "#2196F3" : "#ddd",
                        borderRadius: "8px",
                        cursor: "pointer",
                        minHeight: "70px",
                        transition: "all 0.2s",
                        color: "#000",
                      }}
                    >
                      {s.sabor}
                    </button>
                  ))}
                {activeModal === "pago" &&
                  [...pagos]
                    .sort((a, b) => a.pago.localeCompare(b.pago))
                    .map((p) => (
                      <button
                        key={p.correlativo}
                        onClick={() => {
                          setPagoCorrelativo(p.correlativo);
                          setActiveModal(null);
                        }}
                        style={{
                          padding: "1.25rem",
                          fontSize: "1.1rem",
                          border: "2px solid #ddd",
                          backgroundColor: pagoCorrelativo === p.correlativo ? "#e3f2fd" : "white",
                          borderColor: pagoCorrelativo === p.correlativo ? "#2196F3" : "#ddd",
                          borderRadius: "8px",
                          cursor: "pointer",
                          minHeight: "70px",
                          transition: "all 0.2s",
                          color: "#000",
                        }}
                      >
                        {p.pago}
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
