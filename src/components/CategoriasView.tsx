import type { Categoria } from "../lib/graph";
import { CategoriaForm } from "./CategoriaForm";
import { CategoriaList } from "./CategoriaList";

interface CategoriasViewProps {
  accessToken: string;
  categorias: Categoria[];
  loading: boolean;
  error: string;
  onRefresh: () => void | Promise<void>;
  editingCategoria: Categoria | null;
  onEdit: (categoria: Categoria) => void;
  onCancelEdit: () => void;
}

export function CategoriasView({ accessToken, categorias, loading, error, onRefresh, editingCategoria, onEdit, onCancelEdit }: CategoriasViewProps) {
  return (
    <div className="grid">
      <CategoriaForm accessToken={accessToken} onSaved={onRefresh} editingCategoria={editingCategoria} onCancelEdit={onCancelEdit} />
      <CategoriaList
        categorias={categorias}
        loading={loading}
        error={error}
        accessToken={accessToken}
        onRefresh={onRefresh}
        onEdit={onEdit}
        editingCategoria={editingCategoria}
      />
    </div>
  );
}
