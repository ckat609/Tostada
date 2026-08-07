import { appConfig } from "../config";

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

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

export interface EntryRow {
  fecha: string;
  cliente: string;
  descripcion: string;
  presentacion: string;
  tamano: string;
  cantidad: number;
  estado?: string;
}

export async function addEntryRow(
  accessToken: string,
  entry: EntryRow
): Promise<void> {
  const { spreadsheetId, sheetName } = appConfig.sheets;

  // First, get all rows to find the next codigo
  const allRowsUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
  const allRowsResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, allRowsUrl);
  const allRows = allRowsResponse.values ?? [];

  // Get headers
  const headers = allRows[0] ?? [];

  const codigoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "codigo"
  );
  const fechaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "fecha"
  );
  const clienteIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "cliente"
  );
  const descripcionIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "descripcion"
  );
  const presentacionIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "presentacion"
  );
  const tamanoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "tamano"
  );
  const cantidadIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "cantidad"
  );
  const estadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "estado"
  );

  // Find the highest codigo value
  let nextCodigo = 1;
  if (codigoIndex !== -1 && allRows.length > 1) {
    const dataRows = allRows.slice(1);
    const codigos = dataRows
      .map(row => {
        const val = row[codigoIndex];
        return val ? parseInt(String(val)) : 0;
      })
      .filter(num => !isNaN(num));

    if (codigos.length > 0) {
      nextCodigo = Math.max(...codigos) + 1;
    }
  }

  // Build row array matching the actual column order
  const row = new Array(headers.length).fill("");
  if (codigoIndex !== -1) row[codigoIndex] = nextCodigo;
  if (fechaIndex !== -1) row[fechaIndex] = entry.fecha;
  if (clienteIndex !== -1) row[clienteIndex] = entry.cliente;
  if (descripcionIndex !== -1) row[descripcionIndex] = entry.descripcion;
  if (presentacionIndex !== -1) row[presentacionIndex] = entry.presentacion;
  if (tamanoIndex !== -1) row[tamanoIndex] = entry.tamano;
  if (cantidadIndex !== -1) row[cantidadIndex] = entry.cantidad;
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
  ruta: string;
  cliente: string;
  descripcion: string;
  presentacion: string;
  tamano: string;
  cantidad: string;
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
  const clienteIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "cliente"
  );
  const descripcionIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "descripcion"
  );
  const presentacionIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "presentacion"
  );
  const tamanoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "tamano"
  );
  const cantidadIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "cantidad"
  );
  const estadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "estado"
  );

  const dataRows = allRows.slice(1);
  const mappedRows = dataRows
    .map((row, index) => {
      const clienteCodigo = clienteIndex !== -1 ? String(row[clienteIndex] ?? "").trim() : "";
      const clienteData = clientes.find(c => c.codigo === clienteCodigo);

      return {
        fecha: fechaIndex !== -1 ? String(row[fechaIndex] ?? "") : "",
        ruta: clienteData?.ruta || "",
        cliente: clienteData?.cliente || clienteCodigo, // Display cliente name, fallback to codigo
        descripcion: descripcionIndex !== -1 ? String(row[descripcionIndex] ?? "") : "",
        presentacion: presentacionIndex !== -1 ? String(row[presentacionIndex] ?? "") : "",
        tamano: tamanoIndex !== -1 ? String(row[tamanoIndex] ?? "") : "",
        cantidad: cantidadIndex !== -1 ? String(row[cantidadIndex] ?? "") : "",
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
  codigo: string;
  descripcion: string;
  presentacion: string; // Comma-separated list of presentacion codigos
  tamano: string; // Comma-separated list of tamano codigos
}

export interface Presentacion {
  codigo: string;
  presentacion: string;
}

export interface Tamano {
  codigo: string;
  tamano: string;
}

export interface Ruta {
  codigo: string;
  ruta: string;
}

export interface Cliente {
  codigo: string;
  ruta: string;
  cliente: string;
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
  const codigoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "codigo"
  );
  const descripcionIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "descripcion"
  );
  const presentacionIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "presentacion"
  );
  const tamanoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "tamano"
  );

  return allRows
    .slice(1)
    .map(row => ({
      codigo: codigoIndex !== -1 ? String(row[codigoIndex] ?? "").trim() : "",
      descripcion: descripcionIndex !== -1 ? String(row[descripcionIndex] ?? "").trim() : "",
      presentacion: presentacionIndex !== -1 ? String(row[presentacionIndex] ?? "").trim() : "",
      tamano: tamanoIndex !== -1 ? String(row[tamanoIndex] ?? "").trim() : ""
    }))
    .filter(p => p.descripcion);
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
  const codigoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "codigo"
  );
  const presentacionIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "presentacion"
  );

  return allRows
    .slice(1)
    .map(row => ({
      codigo: codigoIndex !== -1 ? String(row[codigoIndex] ?? "").trim() : "",
      presentacion: presentacionIndex !== -1 ? String(row[presentacionIndex] ?? "").trim() : ""
    }))
    .filter(p => p.codigo && p.presentacion);
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
  const codigoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "codigo"
  );
  const tamanoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "tamano"
  );

  return allRows
    .slice(1)
    .map(row => ({
      codigo: codigoIndex !== -1 ? String(row[codigoIndex] ?? "").trim() : "",
      tamano: tamanoIndex !== -1 ? String(row[tamanoIndex] ?? "").trim() : ""
    }))
    .filter(t => t.codigo && t.tamano);
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
  const codigoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "codigo"
  );
  const rutaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "ruta"
  );

  if (codigoIndex === -1 || rutaIndex === -1) {
    return [];
  }

  return allRows
    .slice(1)
    .map(row => ({
      codigo: String(row[codigoIndex] ?? "").trim(),
      ruta: String(row[rutaIndex] ?? "").trim(),
    }))
    .filter(r => r.codigo && r.ruta);
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
  const codigoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "codigo"
  );
  const rutaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "ruta"
  );
  const clienteIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "cliente"
  );

  if (clienteIndex === -1) {
    return [];
  }

  return allRows
    .slice(1)
    .map(row => ({
      codigo: codigoIndex !== -1 ? String(row[codigoIndex] ?? "").trim() : "",
      ruta: rutaIndex !== -1 ? String(row[rutaIndex] ?? "").trim() : "",
      cliente: String(row[clienteIndex] ?? "").trim(),
    }))
    .filter(c => c.cliente);
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

  // Get existing row to preserve fields we're not updating (like codigo)
  const existingRowUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}:${rowIndex}`;
  const existingRowResponse = await sheetsRequest<SheetsValuesResponse>(accessToken, existingRowUrl);
  const existingRow = existingRowResponse.values?.[0] ?? [];

  const fechaIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "fecha"
  );
  const clienteIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "cliente"
  );
  const descripcionIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "descripcion"
  );
  const presentacionIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "presentacion"
  );
  const tamanoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "tamano"
  );
  const cantidadIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "cantidad"
  );
  const estadoIndex = headers.findIndex(
    (header) => String(header).toLowerCase() === "estado"
  );

  // Start with existing row to preserve all fields (like codigo)
  const row = [...existingRow];
  // Ensure row has enough elements for all headers
  while (row.length < headers.length) {
    row.push("");
  }

  // Update only the fields we're changing
  if (fechaIndex !== -1) row[fechaIndex] = entry.fecha;
  if (clienteIndex !== -1) row[clienteIndex] = entry.cliente;
  if (descripcionIndex !== -1) row[descripcionIndex] = entry.descripcion;
  if (presentacionIndex !== -1) row[presentacionIndex] = entry.presentacion;
  if (tamanoIndex !== -1) row[tamanoIndex] = entry.tamano;
  if (cantidadIndex !== -1) row[cantidadIndex] = entry.cantidad;
  if (estadoIndex !== -1 && entry.estado !== undefined) row[estadoIndex] = entry.estado;

  const updateUrl = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A${rowIndex}?valueInputOption=USER_ENTERED`;
  await sheetsRequest(accessToken, updateUrl, {
    method: "PUT",
    body: JSON.stringify({
      values: [row]
    })
  });
}
