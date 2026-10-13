// H-1 — MARKET COVERAGE (extends the blueprint's ticker + "top 6 pairs" idea
// into a full observational table: sortable, searchable, filterable, paginated)
import { useMemo, useState } from "react";
import { Filter, Layers, RefreshCw, SlidersHorizontal } from "lucide-react";
import { Chip, Dropdown, FilterChips, PriceFlash, Reveal, SearchInput, SectionHead, useInterval } from "../../ui/primitives";
import { Column, DataTable, useDataTable } from "../../ui/data-table";
import { CONTRACT_TYPES, MARKETS, MARKET_SYMBOLS, SYMBOL_MAP, fmtPrice, mulberry32, nextTick, pct, type Symbol } from "../../../data/market";
import type { LandingController } from "../types";

interface Row extends Symbol {
  live: number;
  liveDir: "up" | "down" | "flat";
  liveChangePct: number;
  contractCount: number;
}

export function MarketsSection({ c }: { c: LandingController }) {
  const [liveQuotes, setLiveQuotes] = useState<Record<string, { quote: number; dir: "up" | "down" | "flat" }>>({});
  const [autoTicks, setAutoTicks] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);

  const rows: Row[] = useMemo(
    () =>
      MARKET_SYMBOLS.map((s) => {
        const live = liveQuotes[s.code]?.quote ?? s.basePrice;
        return {
          ...s,
          live,
          liveDir: liveQuotes[s.code]?.dir ?? "flat",
          liveChangePct: ((live - s.basePrice) / s.basePrice) * 100,
          contractCount: s.contractTypes.length,
        };
      }),
    [liveQuotes],
  );

  const rand = useMemo(() => mulberry32(20261013), []);
  const stepAll = () => {
    setLiveQuotes((prev) => {
      const next = { ...prev };
      MARKET_SYMBOLS.forEach((s) => {
        const current = next[s.code]?.quote ?? s.basePrice;
        const tick = nextTick(s, current, rand);
        next[s.code] = { quote: tick.quote, dir: tick.dir };
      });
      return next;
    });
  };

  useInterval(() => stepAll(), autoTicks ? 1400 : null);

  const table = useDataTable<Row>({
    rows,
    searchKeys: (r) => [r.code, r.name, r.short, r.market],
    sorters: {
      code: (r) => r.code,
      market: (r) => r.market,
      live: (r) => r.live,
      payoutPct: (r) => r.payoutPct,
      change: (r) => r.liveChangePct,
      popularity: (r) => r.popularity,
      contracts: (r) => r.contractCount,
      spread: (r) => r.spread,
    },
    filterKey: undefined,
    filterOptions: MARKETS.map((m) => ({ id: m.id, label: m.label })),
    initialPageSize: 10,
    initialSort: "popularity",
    initialDir: "desc",
  });

  // market filter is applied together with the "open only" toggle
  const filteredRows = useMemo(() => {
    let out = table.rows;
    if (table.filter !== "all") out = out.filter((r) => r.market === table.filter);
    if (openOnly) out = out.filter((r) => r.open);
    return out;
  }, [table.rows, table.filter, openOnly]);

  const columns: Column<Row>[] = [
    {
      key: "code",
      header: "Symbol",
      sortValue: (r) => r.code,
      cell: (r) => (
        <span>
          <span className="font-display fw-semibold d-block">{r.code}</span>
          <span className="dx-help">{r.name}</span>
        </span>
      ),
    },
    {
      key: "market",
      header: "Market",
      sortValue: (r) => r.market,
      cell: (r) => (
        <span className="dx-chip dx-chip-muted">{MARKETS.find((m) => m.id === r.market)?.label ?? r.market}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: "live",
      header: "Live quote",
      align: "end",
      sortValue: (r) => r.live,
      cell: (r) => <PriceFlash value={fmtPrice(r.live, r.pipSize)} dir={r.liveDir} />,
    },
    {
      key: "change",
      header: "Change",
      align: "end",
      sortValue: (r) => r.liveChangePct,
      cell: (r) => (
        <span className={`dx-chip ${r.liveChangePct >= 0 ? "dx-chip-up" : "dx-chip-down"}`}>{pct(r.liveChangePct, 2, true)}</span>
      ),
    },
    {
      key: "spread",
      header: "Spread",
      align: "end",
      sortValue: (r) => r.spread,
      cell: (r) => <span className="font-display">{r.spread.toFixed(r.pipSize)}</span>,
      hideOnMobile: true,
    },
    {
      key: "payoutPct",
      header: "Max payout",
      align: "end",
      sortValue: (r) => r.payoutPct,
      cell: (r) => <span className="font-display dx-up">{r.payoutPct.toFixed(1)}%</span>,
    },
    {
      key: "contracts",
      header: "Types",
      align: "end",
      sortValue: (r) => r.contractCount,
      cell: (r) => <span className="font-display">{r.contractCount}</span>,
      hideOnMobile: true,
    },
    {
      key: "popularity",
      header: "Popularity",
      align: "end",
      sortValue: (r) => r.popularity,
      cell: (r) => (
        <span className="d-inline-flex align-items-center gap-2 justify-content-end">
          <span className="font-display">{r.popularity}</span>
          <span className="dx-dot dx-dot-info" />
        </span>
      ),
      hideOnMobile: true,
    },
    {
      header: "Session",
      cell: (r) => (
        <span className={`dx-chip ${r.open ? "dx-chip-up" : "dx-chip-warn"}`}>
          {r.open ? "open" : "closed"} · {r.openTime}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      header: "",
      align: "end",
      className: "dx-td-actions",
      cell: (r) => (
        <button
          type="button"
          className="dx-btn dx-btn-sm dx-btn-ghost"
          onClick={(e) => {
            e.stopPropagation();
            c.openInstrument(r.code);
          }}
        >
          Detail
        </button>
      ),
    },
  ];

  return (
    <section className="dx-section" id="markets">
      <div className="container">
        <SectionHead
          eyebrow="Market coverage"
          title="19 symbols · 11 contract types · one connection"
          lead="Synthetics run 24/7 with 1-second granularity, forex follows the Sunday–Friday session, crypto and metals stream continuously. Filter the book, sort by payout, then drill into any symbol's barriers and duration limits."
          actions={
            <>
              <button type="button" className="dx-btn dx-btn-ghost" onClick={() => setAutoTicks((v) => !v)}>
                <RefreshCw size={14} className={autoTicks ? "dx-spin" : ""} /> {autoTicks ? "Pause ticks" : "Stream ticks"}
              </button>
              <button type="button" className="dx-btn dx-btn-primary" onClick={() => c.openDemo("trade")}>
                Trade a symbol <Layers size={14} />
              </button>
            </>
          }
        />

        <Reveal>
          <div className="dx-card dx-card-flush">
            <div className="dx-card-head flex-wrap">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <SearchInput value={table.query} onChange={table.setQuery} placeholder="Search symbol, market or name…" />
                <Dropdown
                  label="Table actions"
                  trigger={
                    <span className="d-inline-flex align-items-center gap-1">
                      <SlidersHorizontal size={13} /> View
                    </span>
                  }
                  items={[
                    { id: "v1", label: openOnly ? "Show all sessions" : "Open sessions only", active: openOnly, onSelect: () => setOpenOnly((v) => !v), keepOpen: true },
                    { id: "v2", label: "Sort by payout", active: table.sortKey === "payoutPct", onSelect: () => table.toggleSort("payoutPct") },
                    { id: "v3", label: "Sort by popularity", active: table.sortKey === "popularity", onSelect: () => table.toggleSort("popularity") },
                    { type: "divider" },
                    { type: "label", label: "Filters" },
                    { id: "v4", label: "Reset filters", onSelect: () => { table.reset(); setOpenOnly(false); } },
                    { id: "v5", label: "Tick every symbol once", onSelect: stepAll },
                    { type: "divider" },
                    { id: "v6", label: "Contract-type matrix", onSelect: () => c.openFeature("script-engine") },
                    { id: "v7", label: "API health board", onSelect: c.openStatus },
                  ]}
                />
              </div>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span className="dx-help d-none d-md-inline">
                  <Filter size={12} /> market
                </span>
                <FilterChips
                  options={MARKETS.map((m) => ({ id: m.id, label: m.label }))}
                  value={table.filter}
                  onChange={table.setFilter}
                  allLabel={`All ${MARKET_SYMBOLS.length}`}
                />
              </div>
            </div>

            <DataTable
              columns={columns}
              state={{ ...table, rows: filteredRows, total: filteredRows.length, pageCount: Math.max(1, Math.ceil(filteredRows.length / table.pageSize)) }}
              rowKey={(r) => r.code}
              onRowClick={(r) => c.openInstrument(r.code)}
              ariaLabel="Market coverage"
              emptyState={
                <div className="p-5 text-center">
                  <p className="dx-lead mx-auto">No symbol matches that search.</p>
                  <button type="button" className="dx-btn dx-btn-primary" onClick={table.reset}>
                    Clear filters
                  </button>
                </div>
              }
            />
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="row g-3 mt-1">
            {MARKETS.map((m) => {
              const count = rows.filter((r) => r.market === m.id).length;
              return (
                <div className="col-6 col-lg" key={m.id}>
                  <button type="button" className="dx-card-inset dx-card-hover w-100 text-start h-100" onClick={() => table.setFilter(m.id)}>
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="fw-semibold" style={{ fontSize: "0.86rem" }}>
                        {m.label}
                      </span>
                      <span className="font-display dx-up">{count}</span>
                    </div>
                    <span className="dx-help d-block mt-1">{m.note}</span>
                    <span className="dx-help d-block mt-2">filter table →</span>
                  </button>
                </div>
              );
            })}
            <div className="col-6 col-lg">
              <button type="button" className="dx-card-inset dx-card-hover w-100 text-start h-100" onClick={() => c.openPresets()}>
                <div className="d-flex align-items-center justify-content-between">
                  <span className="fw-semibold" style={{ fontSize: "0.86rem" }}>
                    Contract matrix
                  </span>
                  <span className="font-display dx-up">{CONTRACT_TYPES.length}</span>
                </div>
                <span className="dx-help d-block mt-1">Duration limits and barrier styles per type</span>
                <span className="dx-help d-block mt-2">open matrix →</span>
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={180}>
          <div className="d-flex flex-wrap align-items-center gap-2 mt-4">
            <Chip tone="muted">
              <span className="dx-pulse" /> stream {autoTicks ? "active" : "paused"}
            </Chip>
            {["R_10", "R_75", "frxEURUSD", "cryBTCUSD"].map((code) => {
              const s = SYMBOL_MAP[code];
              const live = rows.find((r) => r.code === code)?.live ?? s.basePrice;
              return (
                <Chip key={code} tone="info">
                  {code} <span className="font-display">{fmtPrice(live, s.pipSize)}</span>
                </Chip>
              );
            })}
            <button type="button" className="dx-btn-link ms-auto" onClick={stepAll}>
              Tick all symbols once →
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
