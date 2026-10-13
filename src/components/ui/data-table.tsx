// =============================================================================
// data-table.tsx — shared table behaviour (§6 of docs/MASTER_THEME.md):
// sorting, searching, filtering, pagination + sticky header + row actions.
// =============================================================================
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Pagination } from "./primitives";

export type SortDir = "asc" | "desc";

export interface Column<T> {
  /** key used for sorting; when omitted the column is not sortable */
  key?: string;
  header: string;
  align?: "start" | "end" | "center";
  className?: string;
  cell: (row: T) => ReactNode;
  /** value used for sorting/searching */
  sortValue?: (row: T) => string | number;
  /** hide below md in stacked-card mode (still rendered with data-label) */
  hideOnMobile?: boolean;
}

export interface DataTableState<T> {
  rows: T[];
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  pageCount: number;
  total: number;
  sortKey: string | null;
  sortDir: SortDir;
  toggleSort: (key: string) => void;
  query: string;
  setQuery: (q: string) => void;
  filter: string;
  setFilter: (f: string) => void;
  filterOptions: { id: string; label: string }[];
  reset: () => void;
}

export function useDataTable<T>({
  rows,
  searchKeys,
  sorters,
  filterKey,
  filterOptions,
  initialPageSize = 10,
  initialSort,
  initialDir = "desc",
}: {
  rows: T[];
  searchKeys: (row: T) => string[];
  sorters?: Record<string, (row: T) => string | number>;
  filterKey?: (row: T) => string;
  filterOptions?: { id: string; label: string }[];
  initialPageSize?: number;
  initialSort?: string;
  initialDir?: SortDir;
}): DataTableState<T> {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortKey, setSortKey] = useState<string | null>(initialSort ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows;
    if (filterKey && filter !== "all") out = out.filter((r) => filterKey(r) === filter);
    if (q) out = out.filter((r) => searchKeys(r).some((v) => v.toLowerCase().includes(q)));
    if (sortKey && sorters?.[sortKey]) {
      const get = sorters[sortKey];
      out = [...out].sort((a, b) => {
        const av = get(a);
        const bv = get(b);
        if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
        const cmp = String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, query, filter, filterKey, sortKey, sorters, sortDir, searchKeys]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    rows: pageRows,
    page: safePage,
    setPage: (p) => setPage(Math.max(1, p)),
    pageSize,
    setPageSize: (s) => {
      setPageSize(s);
      setPage(1);
    },
    pageCount,
    total: filtered.length,
    sortKey,
    sortDir,
    toggleSort: (key) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
      setPage(1);
    },
    query,
    setQuery: (q) => {
      setQuery(q);
      setPage(1);
    },
    filter,
    setFilter: (f) => {
      setFilter(f);
      setPage(1);
    },
    filterOptions: filterOptions ?? [],
    reset: () => {
      setQuery("");
      setFilter("all");
      setPage(1);
      setSortKey(initialSort ?? null);
      setSortDir(initialDir);
    },
  };
}

export function SortableTh({
  label,
  columnKey,
  state,
  align = "start",
  className = "",
  scope = "col",
}: {
  label: string;
  columnKey?: string;
  state: DataTableState<unknown>;
  align?: "start" | "end" | "center";
  className?: string;
  scope?: "col" | "colgroup";
}) {
  if (!columnKey) {
    return (
      <th scope={scope} className={className} style={{ textAlign: align === "end" ? "right" : align }}>
        {label}
      </th>
    );
  }
  const active = state.sortKey === columnKey;
  return (
    <th
      scope={scope}
      className={className}
      style={{ textAlign: align === "end" ? "right" : align }}
      aria-sort={active ? (state.sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        className={`dx-th-sort ${active ? (state.sortDir === "asc" ? "is-sorted-asc" : "is-sorted-desc") : ""}`}
        onClick={() => state.toggleSort(columnKey)}
      >
        {label}
        <span className="dx-sort-ico">
          {active ? state.sortDir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} /> : <ArrowUpDown size={11} />}
        </span>
      </button>
    </th>
  );
}

export function DataTable<T>({
  columns,
  state,
  rowKey,
  onRowClick,
  emptyState,
  stacked = true,
  dense = false,
  ariaLabel,
}: {
  columns: Column<T>[];
  state: DataTableState<T>;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  stacked?: boolean;
  dense?: boolean;
  ariaLabel?: string;
}) {
  if (state.total === 0 && emptyState) return <>{emptyState}</>;

  return (
    <div className="dx-table-wrap dx-table-scroll">
      <table className={`dx-table ${dense ? "dx-table-sm" : ""} ${stacked ? "dx-table-stack" : ""}`} aria-label={ariaLabel}>
        <thead className="dx-table-sticky">
          <tr>
            {columns.map((c) => (
              <SortableTh
                key={c.header}
                label={c.header}
                columnKey={c.key}
                state={state as unknown as DataTableState<unknown>}
                align={c.align === "end" ? "end" : c.align === "center" ? "center" : "start"}
                className={c.className}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {state.rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: "pointer" } : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
            >
              {columns.map((c) => (
                <td
                  key={c.header}
                  data-label={c.header}
                  className={`${c.align === "end" ? "dx-td-num" : ""} ${c.hideOnMobile ? "d-none d-md-table-cell" : ""} ${c.className ?? ""}`}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <PaginationSlot state={state} />
    </div>
  );
}

function PaginationSlot<T>({ state }: { state: DataTableState<T> }) {
  return (
    <Pagination
      page={state.page}
      pageCount={state.pageCount}
      onPageChange={state.setPage}
      total={state.total}
      pageSize={state.pageSize}
      onPageSizeChange={state.setPageSize}
    />
  );
}
