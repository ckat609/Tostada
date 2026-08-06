interface RecentRowsProps {
  rows: unknown[][];
  loading: boolean;
  error: string;
}

export function RecentRows({ rows, loading, error }: RecentRowsProps) {
  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Workbook</p>
          <h2>Recent rows</h2>
        </div>
      </div>

      {loading && <p className="muted">Loading rows…</p>}
      {error && <p className="status error">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="muted">No rows found yet.</p>
      )}

      {rows.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${String(row[0])}-${index}`}>
                  <td>{String(row[0] ?? "")}</td>
                  <td>{String(row[1] ?? "")}</td>
                  <td>{String(row[2] ?? "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
