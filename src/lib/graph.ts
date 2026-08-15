import { appConfig } from "../config";

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export function formatCurrency(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === "") return "—";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "—";
  return `Q${num.toFixed(2)}`;
}

async function sheetsRequest<T>(
  accessToken: string,
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Sheets API returned ${response.status}: ${body || response.statusText}`);
  }

  return (await response.json()) as T;
}

// "YYYY-MM-DD HH:MM:SS" UTC, matching the format ventas stores in its own fecha column.
function currentTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// Soft-deletes a row in one of the rutas/clientes/vendedores tabs by marking its
// estado "deleted" and stamping editado, in a single batched write.
async function softDeleteRow(
  accessToken: string,
  sheetName: string,
  rowIndex: number
): Promise<void> {
  const { spreadsheetId } = appConfig.sheets;

  const getUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!1:1`;
  const headerResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, getUrl);
  const headers = headerResponse.values?.[0] ?? [];

  const estadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "estado"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  if (estadoIndex === -1) {
    throw new Error("Column 'estado' not found in the sheet");
  }

  const estadoColumn = String.fromCharCode(65 + estadoIndex); // A=65, B=66, etc.

  const data: { range: string; values: string[][] }[] = [
    { range: `${sheetName}!${estadoColumn}${rowIndex}`, values: [["deleted"]] }
  ];
  if (editadoIndex !== -1) {
    const editadoColumn = String.fromCharCode(65 + editadoIndex);
    data.push({ range: `${sheetName}!${editadoColumn}${rowIndex}`, values: [[currentTimestamp()]] });
  }

  const batchUpdateUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values:batchUpdate`;
  await sheetsRequest(accessToken, batchUpdateUrl, {
    method: "POST",
    body: JSON.stringify({
      valueInputOption: "USER_ENTERED",
      data
    })
  });
}

export interface EntryRow {
  fecha: string;
  codigo: string;
  pago: string;
  ruta: string;
  cliente: string;
  producto: string;
  presentacion: string;
  sabor: string;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
  estado?: string;
}

export async function addEntryRow(
  accessToken: string,
  entry: EntryRow
): Promise<void> {
  const { spreadsheetId, sheetName } = appConfig.sheets;

  // First, get all rows to find the next correlativo
  const allRowsUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
  const allRowsResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, allRowsUrl);
  const allRows = allRowsResponse.values ?? [];

  // Get headers
  const headers = allRows[0] ?? [];

  const correlativoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "correlativo"
  );
  const fechaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "fecha"
  );
  const codigoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "codigo"
  );
  const pagoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "pago"
  );
  const rutaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "ruta"
  );
  const clienteIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "cliente"
  );
  const productoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "producto"
  );
  const presentacionIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "presentacion"
  );
  const saborIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "sabor"
  );
  const cantidadIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "cantidad"
  );
  const precioUnitarioIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "precio_unitario"
  );
  const precioTotalIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "precio_total"
  );
  const agregadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "agregado"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );
  const estadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "estado"
  );

  // Find the highest correlativo value
  let nextCorrelativo = 1;
  if (correlativoIndex !== -1 && allRows.length > 1) {
    const dataRows = allRows.slice(1);
    const correlativos = dataRows
      .map(row => {
        const val = row[correlativoIndex];
        return val ? parseInt(String(val)) : 0;
      })
      .filter(num => !isNaN(num));

    if (correlativos.length > 0) {
      nextCorrelativo = Math.max(...correlativos) + 1;
    }
  }

  const timestamp = currentTimestamp();

  // Build row array matching the actual column order
  const row = new Array(headers.length).fill("");
  if (correlativoIndex !== -1) row[correlativoIndex] = nextCorrelativo;
  if (fechaIndex !== -1) row[fechaIndex] = entry.fecha;
  if (codigoIndex !== -1) row[codigoIndex] = entry.codigo;
  if (pagoIndex !== -1) row[pagoIndex] = entry.pago;
  if (rutaIndex !== -1) row[rutaIndex] = entry.ruta;
  if (clienteIndex !== -1) row[clienteIndex] = entry.cliente;
  if (productoIndex !== -1) row[productoIndex] = entry.producto;
  if (presentacionIndex !== -1) row[presentacionIndex] = entry.presentacion;
  if (saborIndex !== -1) row[saborIndex] = entry.sabor;
  if (cantidadIndex !== -1) row[cantidadIndex] = entry.cantidad;
  if (precioUnitarioIndex !== -1) row[precioUnitarioIndex] = entry.precio_unitario;
  if (precioTotalIndex !== -1) row[precioTotalIndex] = entry.precio_total;
  if (agregadoIndex !== -1) row[agregadoIndex] = timestamp;
  if (editadoIndex !== -1) row[editadoIndex] = timestamp;
  if (estadoIndex !== -1) row[estadoIndex] = entry.estado || ""; // Set estado if provided, otherwise empty

  const appendUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, appendUrl, {
    method: "POST",
    body: JSON.stringify({
      values: [row]
    })
  });
}

interface SheetsValuesResponse {
  values?: unknown[][];
}

export interface RecentRow {
  fecha: string;
  codigo: string;
  pago: string;
  ruta: string;
  cliente: string;
  producto: string;
  presentacion: string;
  sabor: string;
  cantidad: string;
  precio_unitario: string;
  precio_total: string;
  estado: string;
  rowIndex: number; // 1-based row index in the sheet
}

export async function getRecentRows(
  accessToken: string
): Promise<RecentRow[]> {
  const { spreadsheetId, sheetName } = appConfig.sheets;
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
  const response = await sheetsRequest<SheetsValuesResponse>(accessToken, url);

  const allRows = response.values ?? [];
  if (allRows.length === 0) return [];

  // Fetch clientes to look up ruta for each cliente
  const clientes = await getClientes(accessToken);

  const headers = allRows[0];
  const fechaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "fecha"
  );
  const codigoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "codigo"
  );
  const pagoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "pago"
  );
  const clienteIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "cliente"
  );
  const productoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "producto"
  );
  const presentacionIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "presentacion"
  );
  const saborIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "sabor"
  );
  const cantidadIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "cantidad"
  );
  const precioUnitarioIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "precio_unitario"
  );
  const precioTotalIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "precio_total"
  );
  const estadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "estado"
  );

  const dataRows = allRows.slice(1);
  const mappedRows = dataRows
    .map((row, index) => {
      const clienteCorrelativo = clienteIndex !== -1 ? String(row[clienteIndex] ?? "").trim() : "";
      const clienteData = clientes.find(c => c.correlativo === clienteCorrelativo);

      return {
        fecha: fechaIndex !== -1 ? String(row[fechaIndex] ?? "") : "",
        codigo: codigoIndex !== -1 ? String(row[codigoIndex] ?? "") : "",
        pago: pagoIndex !== -1 ? String(row[pagoIndex] ?? "") : "",
        ruta: clienteData?.ruta || "",
        cliente: clienteData?.cliente || clienteCorrelativo, // Display cliente name, fallback to correlativo
        producto: productoIndex !== -1 ? String(row[productoIndex] ?? "") : "",
        presentacion: presentacionIndex !== -1 ? String(row[presentacionIndex] ?? "") : "",
        sabor: saborIndex !== -1 ? String(row[saborIndex] ?? "") : "",
        cantidad: cantidadIndex !== -1 ? String(row[cantidadIndex] ?? "") : "",
        precio_unitario: precioUnitarioIndex !== -1 ? String(row[precioUnitarioIndex] ?? "") : "",
        precio_total: precioTotalIndex !== -1 ? String(row[precioTotalIndex] ?? "") : "",
        estado: estadoIndex !== -1 ? String(row[estadoIndex] ?? "") : "",
        rowIndex: index + 2, // +2 because: +1 for slice(1), +1 for 1-based indexing
      };
    })
    .filter(row => row.estado.toLowerCase() !== "deleted"); // Filter out deleted rows

  // Sort by fecha (desc), then ruta
  return mappedRows.sort((a, b) => {
    if (b.fecha !== a.fecha) return b.fecha.localeCompare(a.fecha);
    return a.ruta.localeCompare(b.ruta);
  });
}

export interface Producto {
  correlativo: string;
  producto: string;
  categoria: string; // categoria correlativo
  presentaciones: string; // Comma-separated list of presentacion correlativos
  sabores: string; // Comma-separated list of sabor correlativos
  tamano: string; // Comma-separated list of tamano correlativos
  estado: string;
  agregado: string;
  editado: string;
  rowIndex: number;
  // Keep descripcion for backwards compatibility with ventas
  descripcion: string;
}

export interface Presentacion {
  correlativo: string;
  presentacion: string;
  estado: string;
  agregado: string;
  editado: string;
  rowIndex: number;
}

export interface Sabor {
  correlativo: string;
  sabor: string;
  estado: string;
  agregado: string;
  editado: string;
  rowIndex: number;
}

export interface Tamano {
  correlativo: string;
  tamano: string;
}

export interface Ruta {
  correlativo: string;
  ruta: string;
  estado: string;
  agregado: string;
  editado: string;
  rowIndex: number;
}

export interface Cliente {
  correlativo: string;
  auxiliar: string;
  codigo: string;
  ruta: string;
  cliente: string;
  estado: string;
  agregado: string;
  editado: string;
  rowIndex: number;
}

export interface Vendedor {
  correlativo: string;
  vendedor: string;
  estado: string;
  agregado: string;
  editado: string;
  rowIndex: number;
}

export interface Categoria {
  correlativo: string;
  categoria: string;
  estado: string;
  agregado: string;
  editado: string;
  rowIndex: number;
}

export interface Pago {
  correlativo: string;
  pago: string;
  estado: string;
  agregado: string;
  editado: string;
  rowIndex: number;
}

export async function getProductos(
  accessToken: string
): Promise<Producto[]> {
  const { spreadsheetId } = appConfig.sheets;
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent("productos")}`;
  const response = await sheetsRequest<SheetsValuesResponse>(accessToken, url);

  const allRows = response.values ?? [];
  if (allRows.length === 0) return [];

  const headers = allRows[0];
  const correlativoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "correlativo"
  );
  const productoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "producto"
  );
  const categoriaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "categoria"
  );
  const presentacionIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "presentaciones"
  );
  const saborIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "sabores"
  );
  const tamanoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "tamano"
  );
  const estadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "estado"
  );
  const agregadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "agregado"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  if (productoIndex === -1) {
    return [];
  }

  return allRows
    .slice(1)
    .map((row, index) => {
      const productoValue = String(row[productoIndex] ?? "").trim();
      return {
        correlativo: String(row[correlativoIndex] ?? "").trim(),
        producto: productoValue,
        descripcion: productoValue, // For backwards compatibility with ventas
        categoria: categoriaIndex !== -1 ? String(row[categoriaIndex] ?? "").trim() : "",
        presentaciones: presentacionIndex !== -1 ? String(row[presentacionIndex] ?? "").trim() : "",
        sabores: saborIndex !== -1 ? String(row[saborIndex] ?? "").trim() : "",
        tamano: tamanoIndex !== -1 ? String(row[tamanoIndex] ?? "").trim() : "",
        estado: estadoIndex !== -1 ? String(row[estadoIndex] ?? "").trim() : "",
        agregado: agregadoIndex !== -1 ? String(row[agregadoIndex] ?? "").trim() : "",
        editado: editadoIndex !== -1 ? String(row[editadoIndex] ?? "").trim() : "",
        rowIndex: index + 2,
      };
    })
    .filter(p => {
      // Must have producto
      if (!p.producto) return false;
      // If estado column exists and is "deleted", exclude it
      if (p.estado && p.estado.toLowerCase() === "deleted") return false;
      return true;
    });
}

export async function getPresentaciones(
  accessToken: string
): Promise<Presentacion[]> {
  const { spreadsheetId } = appConfig.sheets;
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent("presentaciones")}`;
  const response = await sheetsRequest<SheetsValuesResponse>(accessToken, url);

  const allRows = response.values ?? [];
  if (allRows.length === 0) return [];

  const headers = allRows[0];
  const correlativoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "correlativo"
  );
  const presentacionIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "presentacion"
  );
  const estadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "estado"
  );
  const agregadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "agregado"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  if (correlativoIndex === -1 || presentacionIndex === -1) {
    return [];
  }

  return allRows
    .slice(1)
    .map((row, index) => ({
      correlativo: String(row[correlativoIndex] ?? "").trim(),
      presentacion: String(row[presentacionIndex] ?? "").trim(),
      estado: estadoIndex !== -1 ? String(row[estadoIndex] ?? "").trim() : "",
      agregado: agregadoIndex !== -1 ? String(row[agregadoIndex] ?? "").trim() : "",
      editado: editadoIndex !== -1 ? String(row[editadoIndex] ?? "").trim() : "",
      rowIndex: index + 2,
    }))
    .filter(p => p.correlativo && p.presentacion && p.estado.toLowerCase() !== "deleted");
}

export async function getTamanos(
  accessToken: string
): Promise<Tamano[]> {
  const { spreadsheetId } = appConfig.sheets;
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent("tamanos")}`;
  const response = await sheetsRequest<SheetsValuesResponse>(accessToken, url);

  const allRows = response.values ?? [];
  if (allRows.length === 0) return [];

  const headers = allRows[0];
  const correlativoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "correlativo"
  );
  const tamanoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "tamano"
  );

  return allRows
    .slice(1)
    .map(row => ({
      correlativo: correlativoIndex !== -1 ? String(row[correlativoIndex] ?? "").trim() : "",
      tamano: tamanoIndex !== -1 ? String(row[tamanoIndex] ?? "").trim() : ""
    }))
    .filter(t => t.correlativo && t.tamano);
}

export async function getRutas(
  accessToken: string
): Promise<Ruta[]> {
  const { spreadsheetId } = appConfig.sheets;
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent("rutas")}`;
  const response = await sheetsRequest<SheetsValuesResponse>(accessToken, url);

  const allRows = response.values ?? [];
  if (allRows.length === 0) return [];

  const headers = allRows[0];
  const correlativoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "correlativo"
  );
  const rutaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "ruta"
  );
  const estadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "estado"
  );
  const agregadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "agregado"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  if (correlativoIndex === -1 || rutaIndex === -1) {
    return [];
  }

  return allRows
    .slice(1)
    .map((row, index) => ({
      correlativo: String(row[correlativoIndex] ?? "").trim(),
      ruta: String(row[rutaIndex] ?? "").trim(),
      estado: estadoIndex !== -1 ? String(row[estadoIndex] ?? "").trim() : "",
      agregado: agregadoIndex !== -1 ? String(row[agregadoIndex] ?? "").trim() : "",
      editado: editadoIndex !== -1 ? String(row[editadoIndex] ?? "").trim() : "",
      rowIndex: index + 2, // +2 because: +1 for slice(1), +1 for 1-based indexing
    }))
    .filter(r => r.correlativo && r.ruta && r.estado.toLowerCase() !== "deleted");
}

export interface NewRuta {
  ruta: string;
}

export async function addRuta(
  accessToken: string,
  entry: NewRuta
): Promise<void> {
  const { spreadsheetId } = appConfig.sheets;
  const sheetName = "rutas";

  // First, get all rows to find the next correlativo
  const allRowsUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
  const allRowsResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, allRowsUrl);
  const allRows = allRowsResponse.values ?? [];

  const headers = allRows[0] ?? [];
  const correlativoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "correlativo"
  );
  const rutaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "ruta"
  );
  const agregadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "agregado"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  // Find the highest correlativo value
  let nextCorrelativo = 1;
  if (correlativoIndex !== -1 && allRows.length > 1) {
    const dataRows = allRows.slice(1);
    const correlativos = dataRows
      .map(row => {
        const val = row[correlativoIndex];
        return val ? parseInt(String(val)) : 0;
      })
      .filter(num => !isNaN(num));

    if (correlativos.length > 0) {
      nextCorrelativo = Math.max(...correlativos) + 1;
    }
  }

  const timestamp = currentTimestamp();
  const row = new Array(headers.length).fill("");
  if (correlativoIndex !== -1) row[correlativoIndex] = nextCorrelativo;
  if (rutaIndex !== -1) row[rutaIndex] = entry.ruta;
  if (agregadoIndex !== -1) row[agregadoIndex] = timestamp;
  if (editadoIndex !== -1) row[editadoIndex] = timestamp;

  const appendUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, appendUrl, {
    method: "POST",
    body: JSON.stringify({
      values: [row]
    })
  });
}

export async function updateRuta(
  accessToken: string,
  rowIndex: number,
  entry: NewRuta
): Promise<void> {
  const { spreadsheetId } = appConfig.sheets;
  const sheetName = "rutas";

  // Get headers to determine column order
  const headersUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!1:1`;
  const headerResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, headersUrl);
  const headers = headerResponse.values?.[0] ?? [];

  // Get existing row to preserve fields we're not updating (like correlativo)
  const existingRowUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}:${rowIndex}`;
  const existingRowResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, existingRowUrl);
  const existingRow = existingRowResponse.values?.[0] ?? [];

  const rutaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "ruta"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  // Start with existing row to preserve all fields (like correlativo)
  const row = [...existingRow];
  while (row.length < headers.length) {
    row.push("");
  }

  if (rutaIndex !== -1) row[rutaIndex] = entry.ruta;
  if (editadoIndex !== -1) row[editadoIndex] = currentTimestamp();

  const updateUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, updateUrl, {
    method: "PUT",
    body: JSON.stringify({
      values: [row]
    })
  });
}

export async function deleteRuta(
  accessToken: string,
  rowIndex: number
): Promise<void> {
  await softDeleteRow(accessToken, "rutas", rowIndex);
}

export async function getClientes(
  accessToken: string
): Promise<Cliente[]> {
  const { spreadsheetId } = appConfig.sheets;
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent("clientes")}`;
  const response = await sheetsRequest<SheetsValuesResponse>(accessToken, url);

  const allRows = response.values ?? [];
  if (allRows.length === 0) return [];

  const headers = allRows[0];
  const correlativoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "correlativo"
  );
  const auxiliarIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "auxiliar"
  );
  const codigoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "codigo"
  );
  const rutaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "ruta"
  );
  const clienteIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "cliente"
  );
  const estadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "estado"
  );
  const agregadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "agregado"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  if (clienteIndex === -1) {
    return [];
  }

  return allRows
    .slice(1)
    .map((row, index) => ({
      correlativo: correlativoIndex !== -1 ? String(row[correlativoIndex] ?? "").trim() : "",
      auxiliar: auxiliarIndex !== -1 ? String(row[auxiliarIndex] ?? "").trim() : "",
      codigo: codigoIndex !== -1 ? String(row[codigoIndex] ?? "").trim() : "",
      ruta: rutaIndex !== -1 ? String(row[rutaIndex] ?? "").trim() : "",
      cliente: String(row[clienteIndex] ?? "").trim(),
      estado: estadoIndex !== -1 ? String(row[estadoIndex] ?? "").trim() : "",
      agregado: agregadoIndex !== -1 ? String(row[agregadoIndex] ?? "").trim() : "",
      editado: editadoIndex !== -1 ? String(row[editadoIndex] ?? "").trim() : "",
      rowIndex: index + 2, // +2 because: +1 for slice(1), +1 for 1-based indexing
    }))
    .filter(c => c.cliente && c.estado.toLowerCase() !== "deleted");
}

export interface NewCliente {
  auxiliar: string;
  codigo: string;
  ruta: string; // Store ruta correlativo
  cliente: string;
}

export async function addCliente(
  accessToken: string,
  entry: NewCliente
): Promise<void> {
  const { spreadsheetId } = appConfig.sheets;
  const sheetName = "clientes";

  // First, get all rows to find the next correlativo
  const allRowsUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
  const allRowsResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, allRowsUrl);
  const allRows = allRowsResponse.values ?? [];

  const headers = allRows[0] ?? [];
  const correlativoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "correlativo"
  );
  const auxiliarIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "auxiliar"
  );
  const codigoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "codigo"
  );
  const rutaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "ruta"
  );
  const clienteIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "cliente"
  );
  const agregadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "agregado"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  // Find the highest correlativo value
  let nextCorrelativo = 1;
  if (correlativoIndex !== -1 && allRows.length > 1) {
    const dataRows = allRows.slice(1);
    const correlativos = dataRows
      .map(row => {
        const val = row[correlativoIndex];
        return val ? parseInt(String(val)) : 0;
      })
      .filter(num => !isNaN(num));

    if (correlativos.length > 0) {
      nextCorrelativo = Math.max(...correlativos) + 1;
    }
  }

  const timestamp = currentTimestamp();
  const row = new Array(headers.length).fill("");
  if (correlativoIndex !== -1) row[correlativoIndex] = nextCorrelativo;
  if (auxiliarIndex !== -1) row[auxiliarIndex] = entry.auxiliar;
  if (codigoIndex !== -1) row[codigoIndex] = entry.codigo;
  if (rutaIndex !== -1) row[rutaIndex] = entry.ruta;
  if (clienteIndex !== -1) row[clienteIndex] = entry.cliente;
  if (agregadoIndex !== -1) row[agregadoIndex] = timestamp;
  if (editadoIndex !== -1) row[editadoIndex] = timestamp;

  const appendUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, appendUrl, {
    method: "POST",
    body: JSON.stringify({
      values: [row]
    })
  });
}

export async function updateCliente(
  accessToken: string,
  rowIndex: number,
  entry: NewCliente
): Promise<void> {
  const { spreadsheetId } = appConfig.sheets;
  const sheetName = "clientes";

  // Get headers to determine column order
  const headersUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!1:1`;
  const headerResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, headersUrl);
  const headers = headerResponse.values?.[0] ?? [];

  // Get existing row to preserve fields we're not updating (like correlativo)
  const existingRowUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}:${rowIndex}`;
  const existingRowResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, existingRowUrl);
  const existingRow = existingRowResponse.values?.[0] ?? [];

  const auxiliarIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "auxiliar"
  );
  const codigoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "codigo"
  );
  const rutaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "ruta"
  );
  const clienteIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "cliente"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  // Start with existing row to preserve all fields (like correlativo)
  const row = [...existingRow];
  while (row.length < headers.length) {
    row.push("");
  }

  if (auxiliarIndex !== -1) row[auxiliarIndex] = entry.auxiliar;
  if (codigoIndex !== -1) row[codigoIndex] = entry.codigo;
  if (rutaIndex !== -1) row[rutaIndex] = entry.ruta;
  if (clienteIndex !== -1) row[clienteIndex] = entry.cliente;
  if (editadoIndex !== -1) row[editadoIndex] = currentTimestamp();

  const updateUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, updateUrl, {
    method: "PUT",
    body: JSON.stringify({
      values: [row]
    })
  });
}

export async function deleteCliente(
  accessToken: string,
  rowIndex: number
): Promise<void> {
  await softDeleteRow(accessToken, "clientes", rowIndex);
}

export async function getVendedores(
  accessToken: string
): Promise<Vendedor[]> {
  const { spreadsheetId } = appConfig.sheets;
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent("vendedores")}`;
  const response = await sheetsRequest<SheetsValuesResponse>(accessToken, url);

  const allRows = response.values ?? [];
  if (allRows.length === 0) return [];

  const headers = allRows[0];
  const correlativoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "correlativo"
  );
  const vendedorIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "vendedor"
  );
  const estadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "estado"
  );
  const agregadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "agregado"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  if (correlativoIndex === -1 || vendedorIndex === -1) {
    return [];
  }

  return allRows
    .slice(1)
    .map((row, index) => ({
      correlativo: String(row[correlativoIndex] ?? "").trim(),
      vendedor: String(row[vendedorIndex] ?? "").trim(),
      estado: estadoIndex !== -1 ? String(row[estadoIndex] ?? "").trim() : "",
      agregado: agregadoIndex !== -1 ? String(row[agregadoIndex] ?? "").trim() : "",
      editado: editadoIndex !== -1 ? String(row[editadoIndex] ?? "").trim() : "",
      rowIndex: index + 2, // +2 because: +1 for slice(1), +1 for 1-based indexing
    }))
    .filter(v => v.correlativo && v.vendedor && v.estado.toLowerCase() !== "deleted");
}

export interface NewVendedor {
  vendedor: string;
}

export async function addVendedor(
  accessToken: string,
  entry: NewVendedor
): Promise<void> {
  const { spreadsheetId } = appConfig.sheets;
  const sheetName = "vendedores";

  // First, get all rows to find the next correlativo
  const allRowsUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
  const allRowsResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, allRowsUrl);
  const allRows = allRowsResponse.values ?? [];

  const headers = allRows[0] ?? [];
  const correlativoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "correlativo"
  );
  const vendedorIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "vendedor"
  );
  const agregadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "agregado"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  // Find the highest correlativo value
  let nextCorrelativo = 1;
  if (correlativoIndex !== -1 && allRows.length > 1) {
    const dataRows = allRows.slice(1);
    const correlativos = dataRows
      .map(row => {
        const val = row[correlativoIndex];
        return val ? parseInt(String(val)) : 0;
      })
      .filter(num => !isNaN(num));

    if (correlativos.length > 0) {
      nextCorrelativo = Math.max(...correlativos) + 1;
    }
  }

  const timestamp = currentTimestamp();
  const row = new Array(headers.length).fill("");
  if (correlativoIndex !== -1) row[correlativoIndex] = nextCorrelativo;
  if (vendedorIndex !== -1) row[vendedorIndex] = entry.vendedor;
  if (agregadoIndex !== -1) row[agregadoIndex] = timestamp;
  if (editadoIndex !== -1) row[editadoIndex] = timestamp;

  const appendUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, appendUrl, {
    method: "POST",
    body: JSON.stringify({
      values: [row]
    })
  });
}

export async function updateVendedor(
  accessToken: string,
  rowIndex: number,
  entry: NewVendedor
): Promise<void> {
  const { spreadsheetId } = appConfig.sheets;
  const sheetName = "vendedores";

  // Get headers to determine column order
  const headersUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!1:1`;
  const headerResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, headersUrl);
  const headers = headerResponse.values?.[0] ?? [];

  // Get existing row to preserve fields we're not updating (like correlativo)
  const existingRowUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}:${rowIndex}`;
  const existingRowResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, existingRowUrl);
  const existingRow = existingRowResponse.values?.[0] ?? [];

  const vendedorIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "vendedor"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  // Start with existing row to preserve all fields (like correlativo)
  const row = [...existingRow];
  while (row.length < headers.length) {
    row.push("");
  }

  if (vendedorIndex !== -1) row[vendedorIndex] = entry.vendedor;
  if (editadoIndex !== -1) row[editadoIndex] = currentTimestamp();

  const updateUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, updateUrl, {
    method: "PUT",
    body: JSON.stringify({
      values: [row]
    })
  });
}

export async function deleteVendedor(
  accessToken: string,
  rowIndex: number
): Promise<void> {
  await softDeleteRow(accessToken, "vendedores", rowIndex);
}

export interface NewPresentacion {
  presentacion: string;
}

export async function addPresentacion(
  accessToken: string,
  entry: NewPresentacion
): Promise<void> {
  const { spreadsheetId } = appConfig.sheets;
  const sheetName = "presentaciones";

  const allRowsUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
  const allRowsResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, allRowsUrl);
  const allRows = allRowsResponse.values ?? [];

  const headers = allRows[0] ?? [];
  const correlativoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "correlativo"
  );
  const presentacionIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "presentacion"
  );
  const agregadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "agregado"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  let nextCorrelativo = 1;
  if (correlativoIndex !== -1 && allRows.length > 1) {
    const dataRows = allRows.slice(1);
    const correlativos = dataRows
      .map(row => {
        const val = row[correlativoIndex];
        return val ? parseInt(String(val)) : 0;
      })
      .filter(num => !isNaN(num));

    if (correlativos.length > 0) {
      nextCorrelativo = Math.max(...correlativos) + 1;
    }
  }

  const timestamp = currentTimestamp();
  const row = new Array(headers.length).fill("");
  if (correlativoIndex !== -1) row[correlativoIndex] = nextCorrelativo;
  if (presentacionIndex !== -1) row[presentacionIndex] = entry.presentacion;
  if (agregadoIndex !== -1) row[agregadoIndex] = timestamp;
  if (editadoIndex !== -1) row[editadoIndex] = timestamp;

  const appendUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, appendUrl, {
    method: "POST",
    body: JSON.stringify({
      values: [row]
    })
  });
}

export async function updatePresentacion(
  accessToken: string,
  rowIndex: number,
  entry: NewPresentacion
): Promise<void> {
  const { spreadsheetId } = appConfig.sheets;
  const sheetName = "presentaciones";

  const headersUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!1:1`;
  const headerResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, headersUrl);
  const headers = headerResponse.values?.[0] ?? [];

  const existingRowUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}:${rowIndex}`;
  const existingRowResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, existingRowUrl);
  const existingRow = existingRowResponse.values?.[0] ?? [];

  const presentacionIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "presentacion"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  const row = [...existingRow];
  while (row.length < headers.length) {
    row.push("");
  }

  if (presentacionIndex !== -1) row[presentacionIndex] = entry.presentacion;
  if (editadoIndex !== -1) row[editadoIndex] = currentTimestamp();

  const updateUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, updateUrl, {
    method: "PUT",
    body: JSON.stringify({
      values: [row]
    })
  });
}

export async function deletePresentacion(
  accessToken: string,
  rowIndex: number
): Promise<void> {
  await softDeleteRow(accessToken, "presentaciones", rowIndex);
}

export interface NewSabor {
  sabor: string;
}

export async function getSabores(
  accessToken: string
): Promise<Sabor[]> {
  const { spreadsheetId } = appConfig.sheets;
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent("sabores")}`;
  const response = await sheetsRequest<SheetsValuesResponse>(accessToken, url);

  const allRows = response.values ?? [];
  if (allRows.length === 0) return [];

  const headers = allRows[0];
  const correlativoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "correlativo"
  );
  const saborIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "sabor"
  );
  const estadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "estado"
  );
  const agregadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "agregado"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  if (correlativoIndex === -1 || saborIndex === -1) {
    return [];
  }

  return allRows
    .slice(1)
    .map((row, index) => ({
      correlativo: String(row[correlativoIndex] ?? "").trim(),
      sabor: String(row[saborIndex] ?? "").trim(),
      estado: estadoIndex !== -1 ? String(row[estadoIndex] ?? "").trim() : "",
      agregado: agregadoIndex !== -1 ? String(row[agregadoIndex] ?? "").trim() : "",
      editado: editadoIndex !== -1 ? String(row[editadoIndex] ?? "").trim() : "",
      rowIndex: index + 2,
    }))
    .filter(s => s.correlativo && s.sabor && s.estado.toLowerCase() !== "deleted");
}

export async function addSabor(
  accessToken: string,
  entry: NewSabor
): Promise<void> {
  const { spreadsheetId } = appConfig.sheets;
  const sheetName = "sabores";

  const allRowsUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
  const allRowsResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, allRowsUrl);
  const allRows = allRowsResponse.values ?? [];

  const headers = allRows[0] ?? [];
  const correlativoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "correlativo"
  );
  const saborIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "sabor"
  );
  const agregadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "agregado"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  let nextCorrelativo = 1;
  if (correlativoIndex !== -1 && allRows.length > 1) {
    const dataRows = allRows.slice(1);
    const correlativos = dataRows
      .map(row => {
        const val = row[correlativoIndex];
        return val ? parseInt(String(val)) : 0;
      })
      .filter(num => !isNaN(num));

    if (correlativos.length > 0) {
      nextCorrelativo = Math.max(...correlativos) + 1;
    }
  }

  const timestamp = currentTimestamp();
  const row = new Array(headers.length).fill("");
  if (correlativoIndex !== -1) row[correlativoIndex] = nextCorrelativo;
  if (saborIndex !== -1) row[saborIndex] = entry.sabor;
  if (agregadoIndex !== -1) row[agregadoIndex] = timestamp;
  if (editadoIndex !== -1) row[editadoIndex] = timestamp;

  const appendUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, appendUrl, {
    method: "POST",
    body: JSON.stringify({
      values: [row]
    })
  });
}

export async function updateSabor(
  accessToken: string,
  rowIndex: number,
  entry: NewSabor
): Promise<void> {
  const { spreadsheetId } = appConfig.sheets;
  const sheetName = "sabores";

  const headersUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!1:1`;
  const headerResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, headersUrl);
  const headers = headerResponse.values?.[0] ?? [];

  const existingRowUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}:${rowIndex}`;
  const existingRowResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, existingRowUrl);
  const existingRow = existingRowResponse.values?.[0] ?? [];

  const saborIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "sabor"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  const row = [...existingRow];
  while (row.length < headers.length) {
    row.push("");
  }

  if (saborIndex !== -1) row[saborIndex] = entry.sabor;
  if (editadoIndex !== -1) row[editadoIndex] = currentTimestamp();

  const updateUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, updateUrl, {
    method: "PUT",
    body: JSON.stringify({
      values: [row]
    })
  });
}

export async function deleteSabor(
  accessToken: string,
  rowIndex: number
): Promise<void> {
  await softDeleteRow(accessToken, "sabores", rowIndex);
}

export interface NewProducto {
  producto: string;
  categoria: string; // categoria correlativo
  presentaciones: string[]; // Array of presentacion correlativos
  sabores: string[]; // Array of sabor correlativos
}

export async function addProducto(
  accessToken: string,
  entry: NewProducto
): Promise<void> {
  const { spreadsheetId } = appConfig.sheets;
  const sheetName = "productos";

  const allRowsUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
  const allRowsResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, allRowsUrl);
  const allRows = allRowsResponse.values ?? [];

  const headers = allRows[0] ?? [];
  const correlativoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "correlativo"
  );
  const productoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "producto"
  );
  const categoriaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "categoria"
  );
  const presentacionIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "presentaciones"
  );
  const saborIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "sabores"
  );
  const agregadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "agregado"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  let nextCorrelativo = 1;
  if (correlativoIndex !== -1 && allRows.length > 1) {
    const dataRows = allRows.slice(1);
    const correlativos = dataRows
      .map(row => {
        const val = row[correlativoIndex];
        return val ? parseInt(String(val)) : 0;
      })
      .filter(num => !isNaN(num));

    if (correlativos.length > 0) {
      nextCorrelativo = Math.max(...correlativos) + 1;
    }
  }

  const timestamp = currentTimestamp();
  const row = new Array(headers.length).fill("");
  if (correlativoIndex !== -1) row[correlativoIndex] = nextCorrelativo;
  if (productoIndex !== -1) row[productoIndex] = entry.producto;
  if (categoriaIndex !== -1) row[categoriaIndex] = entry.categoria;
  if (presentacionIndex !== -1) row[presentacionIndex] = entry.presentaciones.join(",");
  if (saborIndex !== -1) row[saborIndex] = entry.sabores.join(",");
  if (agregadoIndex !== -1) row[agregadoIndex] = timestamp;
  if (editadoIndex !== -1) row[editadoIndex] = timestamp;

  const appendUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, appendUrl, {
    method: "POST",
    body: JSON.stringify({
      values: [row]
    })
  });
}

export async function updateProducto(
  accessToken: string,
  rowIndex: number,
  entry: NewProducto
): Promise<void> {
  const { spreadsheetId } = appConfig.sheets;
  const sheetName = "productos";

  const headersUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!1:1`;
  const headerResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, headersUrl);
  const headers = headerResponse.values?.[0] ?? [];

  const existingRowUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}:${rowIndex}`;
  const existingRowResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, existingRowUrl);
  const existingRow = existingRowResponse.values?.[0] ?? [];

  const productoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "producto"
  );
  const categoriaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "categoria"
  );
  const presentacionIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "presentaciones"
  );
  const saborIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "sabores"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  const row = [...existingRow];
  while (row.length < headers.length) {
    row.push("");
  }

  if (productoIndex !== -1) row[productoIndex] = entry.producto;
  if (categoriaIndex !== -1) row[categoriaIndex] = entry.categoria;
  if (presentacionIndex !== -1) row[presentacionIndex] = entry.presentaciones.join(",");
  if (saborIndex !== -1) row[saborIndex] = entry.sabores.join(",");
  if (editadoIndex !== -1) row[editadoIndex] = currentTimestamp();

  const updateUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, updateUrl, {
    method: "PUT",
    body: JSON.stringify({
      values: [row]
    })
  });
}

export async function deleteProducto(
  accessToken: string,
  rowIndex: number
): Promise<void> {
  await softDeleteRow(accessToken, "productos", rowIndex);
}

export async function getCategorias(
  accessToken: string
): Promise<Categoria[]> {
  const { spreadsheetId } = appConfig.sheets;
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent("categorias")}`;
  const response = await sheetsRequest<SheetsValuesResponse>(accessToken, url);

  const allRows = response.values ?? [];
  if (allRows.length === 0) return [];

  const headers = allRows[0];
  const correlativoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "correlativo"
  );
  const categoriaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "categoria"
  );
  const estadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "estado"
  );
  const agregadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "agregado"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  if (correlativoIndex === -1 || categoriaIndex === -1) {
    return [];
  }

  return allRows
    .slice(1)
    .map((row, index) => ({
      correlativo: String(row[correlativoIndex] ?? "").trim(),
      categoria: String(row[categoriaIndex] ?? "").trim(),
      estado: estadoIndex !== -1 ? String(row[estadoIndex] ?? "").trim() : "",
      agregado: agregadoIndex !== -1 ? String(row[agregadoIndex] ?? "").trim() : "",
      editado: editadoIndex !== -1 ? String(row[editadoIndex] ?? "").trim() : "",
      rowIndex: index + 2, // +2 because: +1 for slice(1), +1 for 1-based indexing
    }))
    .filter(c => c.correlativo && c.categoria && c.estado.toLowerCase() !== "deleted");
}

export async function getPagos(
  accessToken: string
): Promise<Pago[]> {
  const { spreadsheetId } = appConfig.sheets;
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent("pagos")}`;
  const response = await sheetsRequest<SheetsValuesResponse>(accessToken, url);

  const allRows = response.values ?? [];
  if (allRows.length === 0) return [];

  const headers = allRows[0];
  const correlativoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "correlativo"
  );
  const pagoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "pago"
  );
  const estadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "estado"
  );
  const agregadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "agregado"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  if (correlativoIndex === -1 || pagoIndex === -1) {
    return [];
  }

  return allRows
    .slice(1)
    .map((row, index) => ({
      correlativo: String(row[correlativoIndex] ?? "").trim(),
      pago: String(row[pagoIndex] ?? "").trim(),
      estado: estadoIndex !== -1 ? String(row[estadoIndex] ?? "").trim() : "",
      agregado: agregadoIndex !== -1 ? String(row[agregadoIndex] ?? "").trim() : "",
      editado: editadoIndex !== -1 ? String(row[editadoIndex] ?? "").trim() : "",
      rowIndex: index + 2, // +2 because: +1 for slice(1), +1 for 1-based indexing
    }))
    .filter(p => p.correlativo && p.pago && p.estado.toLowerCase() !== "deleted");
}

export interface NewPago {
  pago: string;
}

export async function addPago(
  accessToken: string,
  entry: NewPago
): Promise<void> {
  const { spreadsheetId } = appConfig.sheets;
  const sheetName = "pagos";

  // First, get all rows to find the next correlativo
  const allRowsUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
  const allRowsResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, allRowsUrl);
  const allRows = allRowsResponse.values ?? [];

  const headers = allRows[0] ?? [];
  const correlativoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "correlativo"
  );
  const pagoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "pago"
  );
  const agregadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "agregado"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  // Find the highest correlativo value
  let nextCorrelativo = 1;
  if (correlativoIndex !== -1 && allRows.length > 1) {
    const dataRows = allRows.slice(1);
    const correlativos = dataRows
      .map(row => {
        const val = row[correlativoIndex];
        return val ? parseInt(String(val)) : 0;
      })
      .filter(num => !isNaN(num));

    if (correlativos.length > 0) {
      nextCorrelativo = Math.max(...correlativos) + 1;
    }
  }

  const timestamp = currentTimestamp();
  const row = new Array(headers.length).fill("");
  if (correlativoIndex !== -1) row[correlativoIndex] = nextCorrelativo;
  if (pagoIndex !== -1) row[pagoIndex] = entry.pago;
  if (agregadoIndex !== -1) row[agregadoIndex] = timestamp;
  if (editadoIndex !== -1) row[editadoIndex] = timestamp;

  const appendUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, appendUrl, {
    method: "POST",
    body: JSON.stringify({
      values: [row]
    })
  });
}

export async function updatePago(
  accessToken: string,
  rowIndex: number,
  entry: NewPago
): Promise<void> {
  const { spreadsheetId } = appConfig.sheets;
  const sheetName = "pagos";

  // Get headers to determine column order
  const headersUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!1:1`;
  const headerResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, headersUrl);
  const headers = headerResponse.values?.[0] ?? [];

  // Get existing row to preserve fields we're not updating (like correlativo)
  const existingRowUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}:${rowIndex}`;
  const existingRowResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, existingRowUrl);
  const existingRow = existingRowResponse.values?.[0] ?? [];

  const pagoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "pago"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  // Start with existing row to preserve all fields (like correlativo)
  const row = [...existingRow];
  while (row.length < headers.length) {
    row.push("");
  }

  if (pagoIndex !== -1) row[pagoIndex] = entry.pago;
  if (editadoIndex !== -1) row[editadoIndex] = currentTimestamp();

  const updateUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, updateUrl, {
    method: "PUT",
    body: JSON.stringify({
      values: [row]
    })
  });
}

export async function deletePago(
  accessToken: string,
  rowIndex: number
): Promise<void> {
  await softDeleteRow(accessToken, "pagos", rowIndex);
}

export interface NewCategoria {
  categoria: string;
}

export async function addCategoria(
  accessToken: string,
  entry: NewCategoria
): Promise<void> {
  const { spreadsheetId } = appConfig.sheets;
  const sheetName = "categorias";

  // First, get all rows to find the next correlativo
  const allRowsUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
  const allRowsResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, allRowsUrl);
  const allRows = allRowsResponse.values ?? [];

  const headers = allRows[0] ?? [];
  const correlativoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "correlativo"
  );
  const categoriaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "categoria"
  );
  const agregadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "agregado"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  // Find the highest correlativo value
  let nextCorrelativo = 1;
  if (correlativoIndex !== -1 && allRows.length > 1) {
    const dataRows = allRows.slice(1);
    const correlativos = dataRows
      .map(row => {
        const val = row[correlativoIndex];
        return val ? parseInt(String(val)) : 0;
      })
      .filter(num => !isNaN(num));

    if (correlativos.length > 0) {
      nextCorrelativo = Math.max(...correlativos) + 1;
    }
  }

  const timestamp = currentTimestamp();
  const row = new Array(headers.length).fill("");
  if (correlativoIndex !== -1) row[correlativoIndex] = nextCorrelativo;
  if (categoriaIndex !== -1) row[categoriaIndex] = entry.categoria;
  if (agregadoIndex !== -1) row[agregadoIndex] = timestamp;
  if (editadoIndex !== -1) row[editadoIndex] = timestamp;

  const appendUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, appendUrl, {
    method: "POST",
    body: JSON.stringify({
      values: [row]
    })
  });
}

export async function updateCategoria(
  accessToken: string,
  rowIndex: number,
  entry: NewCategoria
): Promise<void> {
  const { spreadsheetId } = appConfig.sheets;
  const sheetName = "categorias";

  // Get headers to determine column order
  const headersUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!1:1`;
  const headerResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, headersUrl);
  const headers = headerResponse.values?.[0] ?? [];

  // Get existing row to preserve fields we're not updating (like correlativo)
  const existingRowUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}:${rowIndex}`;
  const existingRowResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, existingRowUrl);
  const existingRow = existingRowResponse.values?.[0] ?? [];

  const categoriaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "categoria"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );

  // Start with existing row to preserve all fields (like correlativo)
  const row = [...existingRow];
  while (row.length < headers.length) {
    row.push("");
  }

  if (categoriaIndex !== -1) row[categoriaIndex] = entry.categoria;
  if (editadoIndex !== -1) row[editadoIndex] = currentTimestamp();

  const updateUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, updateUrl, {
    method: "PUT",
    body: JSON.stringify({
      values: [row]
    })
  });
}

export async function deleteCategoria(
  accessToken: string,
  rowIndex: number
): Promise<void> {
  await softDeleteRow(accessToken, "categorias", rowIndex);
}

export async function deleteRow(
  accessToken: string,
  rowIndex: number
): Promise<void> {
  const { spreadsheetId, sheetName } = appConfig.sheets;

  // Get headers to find estado column
  const getUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!1:1`;
  const headerResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, getUrl);
  const headers = headerResponse.values?.[0] ?? [];

  const estadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "estado"
  );

  if (estadoIndex === -1) {
    throw new Error("Column 'estado' not found in the sheet");
  }

  // Get the column letter for estado
  const columnLetter = String.fromCharCode(65 + estadoIndex); // A=65, B=66, etc.

  // Update the estado cell to "deleted"
  const updateUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!${columnLetter}${rowIndex}?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, updateUrl, {
    method: "PUT",
    body: JSON.stringify({
      values: [["deleted"]]
    })
  });
}

export async function updateRow(
  accessToken: string,
  rowIndex: number,
  entry: EntryRow
): Promise<void> {
  const { spreadsheetId, sheetName } = appConfig.sheets;

  // Get headers to determine column order
  const headersUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!1:1`;
  const headerResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, headersUrl);
  const headers = headerResponse.values?.[0] ?? [];

  // Get existing row to preserve fields we're not updating (like correlativo)
  const existingRowUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}:${rowIndex}`;
  const existingRowResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, existingRowUrl);
  const existingRow = existingRowResponse.values?.[0] ?? [];

  const fechaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "fecha"
  );
  const codigoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "codigo"
  );
  const pagoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "pago"
  );
  const rutaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "ruta"
  );
  const clienteIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "cliente"
  );
  const productoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "producto"
  );
  const presentacionIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "presentacion"
  );
  const saborIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "sabor"
  );
  const cantidadIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "cantidad"
  );
  const precioUnitarioIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "precio_unitario"
  );
  const precioTotalIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "precio_total"
  );
  const agregadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "agregado"
  );
  const editadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "editado"
  );
  const estadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "estado"
  );

  const timestamp = currentTimestamp();

  // Start with existing row to preserve all fields (like correlativo)
  const row = [...existingRow];
  // Ensure row has enough elements for all headers
  while (row.length < headers.length) {
    row.push("");
  }

  // Update only the fields we're changing
  if (fechaIndex !== -1) row[fechaIndex] = entry.fecha;
  if (codigoIndex !== -1) row[codigoIndex] = entry.codigo;
  if (pagoIndex !== -1) row[pagoIndex] = entry.pago;
  if (rutaIndex !== -1) row[rutaIndex] = entry.ruta;
  if (clienteIndex !== -1) row[clienteIndex] = entry.cliente;
  if (productoIndex !== -1) row[productoIndex] = entry.producto;
  if (presentacionIndex !== -1) row[presentacionIndex] = entry.presentacion;
  if (saborIndex !== -1) row[saborIndex] = entry.sabor;
  if (cantidadIndex !== -1) row[cantidadIndex] = entry.cantidad;
  if (precioUnitarioIndex !== -1) row[precioUnitarioIndex] = entry.precio_unitario;
  if (precioTotalIndex !== -1) row[precioTotalIndex] = entry.precio_total;
  if (editadoIndex !== -1) row[editadoIndex] = timestamp;
  if (estadoIndex !== -1 && entry.estado !== undefined) row[estadoIndex] = entry.estado;

  const updateUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, updateUrl, {
    method: "PUT",
    body: JSON.stringify({
      values: [row]
    })
  });
}
