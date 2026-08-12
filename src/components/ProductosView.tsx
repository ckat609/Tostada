import type { Producto, Categoria, Sabor, Presentacion } from "../lib/graph";
import { ProductoForm } from "./ProductoForm";
import { ProductoList } from "./ProductoList";

interface ProductosViewProps {
  accessToken: string;
  productos: Producto[];
  categorias: Categoria[];
  sabores: Sabor[];
  presentaciones: Presentacion[];
  loading: boolean;
  error: string;
  onRefresh: () => void | Promise<void>;
  editingProducto: Producto | null;
  onEdit: (producto: Producto) => void;
  onCancelEdit: () => void;
}

export function ProductosView({ accessToken, productos, categorias, sabores, presentaciones, loading, error, onRefresh, editingProducto, onEdit, onCancelEdit }: ProductosViewProps) {
  return (
    <div className="grid">
      <ProductoForm
        accessToken={accessToken}
        categorias={categorias}
        sabores={sabores}
        presentaciones={presentaciones}
        onSaved={onRefresh}
        editingProducto={editingProducto}
        onCancelEdit={onCancelEdit}
      />
      <ProductoList
        productos={productos}
        categorias={categorias}
        sabores={sabores}
        presentaciones={presentaciones}
        loading={loading}
        error={error}
        accessToken={accessToken}
        onRefresh={onRefresh}
        onEdit={onEdit}
        editingProducto={editingProducto}
      />
    </div>
  );
}
