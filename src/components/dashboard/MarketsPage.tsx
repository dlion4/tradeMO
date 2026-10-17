/* D-2 · Markets Browser (/dashboard/markets). Inside the shared AppShell. */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "../shell/AppShell";
import { MARKET_SYMBOLS, fmtPrice, usd, type MarketKind, type Symbol as Sym } from "../../data/market";
import { ECON_EVENTS, MARKET_SCHEDULES, TRADERS, WATCHLISTS, type StrategyPreset, type Trader } from "../../data/trading";
import { useLiveSeries, useTicks } from "../../lib/live";
import {
  Dialog, Drawer, Tabs, MiniTabs, Toggle, SearchInput, FilterChips, Pagination, EmptyState, Chip, Meter, Sparkline, Reveal, useToast,
} from "../ui/primitives";
import { TradeTicketDialog } from "./TradeDialogs";
import { BacktestDialog, DeployBotWizard } from "../marketing/modals/CommerceDialogs";
import { LeaderboardDialog, CopySetupWizard, TraderDrawer } from "../marketing/modals/SocialModals";
import { Bell, Star } from "lucide-react";
import "../../styles/markets.scss";

type Vol = "all" | "low" | "medium" | "high";
type View = "grid" | "heatmap" | "movers";

interface PriceAlert { id: number; code: string; cond: "above" | "below"; price: number }

function volBand(s: Sym): Exclude<Vol, "all"> {
  if (s.code.startsWith("1HZ")) return "high";
  const m = Math.abs(s.changePct);
  return m < 1 ? "low" : m < 3 ? "medium" : "high";
}

const CATEGORY_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "forex", label: "Forex" },
  { id: "synthetics", label: "Synthetics" },
  { id: "commodities", label: "Commodities" },
  { id: "crypto", label: "Crypto" },
  { id: "indices", label: "Indices" },
];

function MarketCard({
  s, quote, highlighted, isFav, onToggleFav, onOpen, onTrade, onAlert, delay,
}: {
  s: Sym;
  quote?: number;
  highlighted: boolean;
  isFav: boolean;
  onToggleFav: () => void;
  onOpen: () => void;
  onTrade: () => void;
  onAlert: () => void;
  delay: number;
}) {
  const series = useLiveSeries(s.code, 24, 2400);
  return (
    <Reveal delay={delay}>
      <article className={`dx-card h-100 dx-mk-card ${highlighted ? "dx-mk-highlight" : ""}`}>
        <div className="dx-card-head">
          <button type="button" className="dx-btn dx-btn-ghost dx-btn-sm px-0" onClick={onOpen} aria-label={`Open ${s.code} detail`}>
            <span className="font-display">{s.code}</span>
          </button>
          <span className="d-flex align-items-center gap-1">
            {s.open ? <Chip tone="up" pulse>open</Chip> : <Chip tone="muted">closed</Chip>}
            <button type="button" className="dx-icon-btn" aria-pressed={isFav} aria-label={`${isFav ? "Remove" : "Add"} ${s.code} ${isFav ? "from" : "to"} favourites`} onClick={onToggleFav}>
              <Star size={15} className={isFav ? "dx-mk-star-on" : undefined} />
            </button>
          </span>
        </div>
        <button type="button" className="dx-mk-card-main" onClick={onOpen}>
          <span className="d-block text-muted small text-start">{s.name}</span>
          <span className="d-flex align-items-end justify-content-between">
            <span className="dx-stat-value font-display">{quote !== undefined ? fmtPrice(quote, s.pipSize) : "—"}</span>
            <span className={`font-display ${s.changePct >= 0 ? "dx-up" : "dx-down"}`}>{s.changePct >= 0 ? "▲" : "▼"} {Math.abs(s.changePct).toFixed(2)}%</span>
          </span>
          <Sparkline data={series} tone={s.changePct >= 0 ? "up" : "down"} ariaLabel={`${s.code} price trend`} />
          <span className="d-flex justify-content-between text-muted small">
            <span>Payout <strong className="font-display text-body">{s.payoutPct}%</strong></span>
            <span>Stake <span className="font-display text-body">{usd(s.minStake)}–{usd(s.maxStake)}</span></span>
            <span className="text-capitalize">{volBand(s)} vol</span>
          </span>
        </button>
        <div className="dx-card-foot d-flex gap-2">
          <button type="button" className="dx-btn dx-btn-primary flex-grow-1" onClick={onTrade}>Trade</button>
          <button type="button" className="dx-btn" onClick={onAlert} aria-label={`Set a price alert for ${s.code}`}><Bell size={14} /> Alert</button>
        </div>
      </article>
    </Reveal>
  );
}

export default function MarketsPage({ q }: { q?: string }) {
  const navigate = useNavigate();
  const toast = useToast();
  const allCodes = useMemo(() => MARKET_SYMBOLS.map((s) => s.code), []);
  const ticks = useTicks(allCodes, 2000);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<MarketKind | "all">("all");
  const [vol, setVol] = useState<Vol>("all");
  const [favOnly, setFavOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(["R_100", "1HZ100V"]));
  const [view, setView] = useState<View>("grid");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Sym | null>(null);
  const [symTab, setSymTab] = useState("overview");
  const [ticket, setTicket] = useState<{ open: boolean; symbol: string }>({ open: false, symbol: "R_10" });
  const [closedSym, setClosedSym] = useState<Sym | null>(null);
  const [lists, setLists] = useState(WATCHLISTS.map((w) => ({ ...w, symbols: [...w.symbols] })));
  const [listFilter, setListFilter] = useState<Set<string> | null>(null);
  const [listsOpen, setListsOpen] = useState(false);
  const [econOpen, setEconOpen] = useState(false);
  const [highlight, setHighlight] = useState<{ codes: string[]; label: string } | null>(null);
  const [alerts, setAlerts] = useState<PriceAlert[]>([{ id: 1, code: "R_100", cond: "above", price: 1280 }]);
  const [alertFor, setAlertFor] = useState<Sym | null>(null);
  const [alertCond, setAlertCond] = useState<"above" | "below">("above");
  const [alertPrice, setAlertPrice] = useState(0);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [traderDrawer, setTraderDrawer] = useState<Trader | null>(null);
  const [copyTrader, setCopyTrader] = useState<Trader | null>(null);
  const [copyList, setCopyList] = useState<string[]>(["Ade F."]);
  const [copyDone, setCopyDone] = useState<{ name: string; ratio: number; cap: number } | null>(null);
  const [backtestId, setBacktestId] = useState<string | null>(null);
  const [deployPreset, setDeployPreset] = useState<StrategyPreset | null>(null);

  const detailSeries = useLiveSeries(detail?.code ?? "R_10", 36, 2000);

  // deep link: ?q=CODE opens the symbol, otherwise it becomes the search term
  useEffect(() => {
    if (!q) return;
    const needle = q.trim().toUpperCase();
    const exact = MARKET_SYMBOLS.find((s) => s.code.toUpperCase() === needle);
    if (exact) {
      setDetail(exact);
      setSymTab("overview");
    } else setSearch(q);
  }, [q]);

  useEffect(() => setPage(1), [search, category, vol, favOnly, listFilter]);

  const filtered = useMemo(() => MARKET_SYMBOLS.filter((s) => {
    if (category !== "all" && s.market !== category) return false;
    if (vol !== "all" && volBand(s) !== vol) return false;
    if (favOnly && !favorites.has(s.code)) return false;
    if (listFilter && !listFilter.has(s.code)) return false;
    if (search) {
      const needle = search.toLowerCase();
      if (!`${s.code} ${s.name}`.toLowerCase().includes(needle)) return false;
    }
    return true;
  }), [category, vol, favOnly, favorites, listFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / 9));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * 9, safePage * 9);
  const movers = useMemo(() => [...MARKET_SYMBOLS].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 10), []);

  const toggleFav = (code: string) =>
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const openDetail = (s: Sym) => {
    setDetail(s);
    setSymTab("overview");
  };

  const openTrade = (s: Sym) => {
    if (!s.open) setClosedSym(s);
    else setTicket({ open: true, symbol: s.code });
  };

  const clearFilters = () => {
    setSearch(""); setCategory("all"); setVol("all"); setFavOnly(false); setListFilter(null);
  };

  const openAlert = (s: Sym) => {
    setAlertFor(s);
    setAlertPrice(ticks[s.code]?.quote ?? s.basePrice);
    setAlertCond("above");
  };

  const detailTick = detail ? ticks[detail.code] : undefined;
  const bullish = detail ? 45 + (detail.popularity % 35) : 50;

  return (
    <AppShell title="Markets">
      <div className="page-markets">
        <Reveal>
          <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-3">
            <div>
              <p className="dx-eyebrow mb-1">D-2 · Markets browser</p>
              <h1 className="dx-h-section mb-1">Every market, one grid.</h1>
              <p className="dx-lead mb-0">{filtered.length} of {MARKET_SYMBOLS.length} instruments · live ticks streaming</p>
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="dx-btn" onClick={() => setEconOpen(true)}>Economic calendar</button>
              <button type="button" className="dx-btn dx-btn-primary" onClick={() => setListsOpen(true)}>Watchlists ({lists.length + 1})</button>
            </div>
          </div>
        </Reveal>

        {/* trading-hours strip */}
        <Reveal delay={40}>
          <section id="dx-mk-hours" className="dx-card mb-3" aria-label="Trading hours">
            <div className="dx-card-head"><span>Trading hours</span><span className="text-muted small">Server time (GMT)</span></div>
            <div className="dx-card-body">
              <div className="dx-mk-hours">
                {MARKET_SCHEDULES.map((s) => (
                  <div key={s.market} className="dx-mk-hour">
                    <strong>{s.market}</strong>
                    <span className="font-display">{s.open}</span>
                    <span className={s.deltaMin >= 0 ? "dx-up small" : "dx-down small"}>
                      <span className="font-display">{s.deltaMin >= 0 ? "+" : ""}{s.deltaMin}m</span> vs yesterday
                    </span>
                    <span className="text-muted small">{s.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* filter bar */}
        <Reveal delay={60}>
          <section className="dx-card mb-3">
            <div className="dx-card-body dx-mk-filters">
              <SearchInput placeholder="Search R_100, gold, EUR/USD…" value={search} onChange={setSearch} />
              <FilterChips
                options={CATEGORY_OPTIONS}
                value={category}
                onChange={(v) => setCategory(v as MarketKind | "all")}
                allLabel="All markets"
              />
              <div className="d-flex flex-wrap align-items-center gap-3">
                <FilterChips
                  options={[{ id: "low", label: "Low vol" }, { id: "medium", label: "Medium vol" }, { id: "high", label: "High vol" }]}
                  value={vol}
                  onChange={(v) => setVol(v as Vol)}
                  allLabel="Any volatility"
                />
                <Toggle checked={favOnly} onChange={setFavOnly} label="Favourites only" />
                <MiniTabs ariaLabel="Market view" options={[{ id: "grid", label: "Grid" }, { id: "heatmap", label: "Heatmap" }, { id: "movers", label: "Movers" }]} value={view} onChange={(v) => setView(v as View)} />
              </div>
              {listFilter && (
                <p className="mb-0">
                  <Chip tone="accent">Watchlist filter active · {listFilter.size} symbols</Chip>{" "}
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setListFilter(null)}>Clear list filter</button>
                </p>
              )}
              {highlight && (
                <p className="mb-0">
                  <Chip tone="warn">Event impact · {highlight.label}</Chip>{" "}
                  <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setHighlight(null)}>Clear highlight</button>
                </p>
              )}
            </div>
          </section>
        </Reveal>

        {/* views */}
        {filtered.length === 0 ? (
          <EmptyState
            title="No markets match those filters"
            message="Try a different search term, or clear the filters to see the full board."
            action={<button type="button" className="dx-btn dx-btn-primary" onClick={clearFilters}>Clear all filters</button>}
          />
        ) : view === "grid" ? (
          <>
            <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
              {pageItems.map((s, i) => (
                <div className="col" key={s.code}>
                  <MarketCard
                    s={s}
                    quote={ticks[s.code]?.quote}
                    highlighted={Boolean(highlight?.codes.includes(s.code))}
                    isFav={favorites.has(s.code)}
                    onToggleFav={() => toggleFav(s.code)}
                    onOpen={() => openDetail(s)}
                    onTrade={() => openTrade(s)}
                    onAlert={() => openAlert(s)}
                    delay={i * 40}
                  />
                </div>
              ))}
            </div>
            <Pagination page={safePage} pageCount={pageCount} onPageChange={setPage} total={filtered.length} pageSize={9} label="markets" />
          </>
        ) : view === "heatmap" ? (
          <div className="dx-mk-heat" role="list" aria-label="Market heatmap">
            {filtered.map((s) => (
              <button
                key={s.code}
                type="button"
                role="listitem"
                className={`dx-mk-tile ${s.changePct >= 2 ? "is-up-strong" : s.changePct >= 0 ? "is-up" : s.changePct <= -2 ? "is-down-strong" : "is-down"}`}
                onClick={() => openDetail(s)}
              >
                <span className="font-display">{s.code}</span>
                <span className="font-display">{s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%</span>
                <span className="small">{s.open ? "open" : "closed"}</span>
              </button>
            ))}
          </div>
        ) : (
          <section className="dx-card">
            <div className="dx-card-head"><span>Top movers · 24h</span><span className="text-muted small">Ranked by absolute change</span></div>
            <div className="dx-card-body">
              {movers.map((s, i) => (
                <button key={s.code} type="button" className="dx-list-row w-100 text-start" onClick={() => openDetail(s)}>
                  <span className="d-flex align-items-center gap-2 text-start">
                    <span className="font-display text-muted">#{i + 1}</span>
                    <span><strong className="font-display">{s.code}</strong><span className="d-block text-muted small">{s.name}</span></span>
                  </span>
                  <span className="d-flex align-items-center gap-2">
                    <span className="font-display">{ticks[s.code] ? fmtPrice(ticks[s.code].quote, s.pipSize) : "—"}</span>
                    <Chip tone={s.changePct >= 0 ? "up" : "down"}>{s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%</Chip>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ---------- overlays ---------- */}
        <TradeTicketDialog
          open={ticket.open}
          initialSymbol={ticket.symbol}
          onClose={() => setTicket((t) => ({ ...t, open: false }))}
          onBought={(r) => {
            setTicket((t) => ({ ...t, open: false }));
            setDetail(null);
            toast.push({ tone: "success", title: `Contract bought · ${r.symbol}`, body: `${r.contractId} — payout ${usd(r.payout)}.` });
          }}
        />

        <Dialog open={closedSym !== null} onClose={() => setClosedSym(null)} title="Market closed" labelledBy="closed-title">
          {closedSym && (
            <>
              <p>
                <strong className="font-display">{closedSym.code}</strong> ({closedSym.name}) is closed right now, so no contract can be placed.{" "}
                {MARKET_SCHEDULES.find((s) => s.market.toLowerCase() === closedSym.market)?.note ?? "Check the trading-hours strip for the next session."}
              </p>
              <div className="d-flex flex-wrap gap-2 justify-content-end mt-3">
                <button type="button" className="dx-btn" onClick={() => { setClosedSym(null); document.getElementById("dx-mk-hours")?.scrollIntoView({ behavior: "smooth" }); }}>
                  See trading hours
                </button>
                <button type="button" className="dx-btn dx-btn-primary" onClick={() => { setClosedSym(null); clearFilters(); }}>
                  Browse open markets
                </button>
              </div>
            </>
          )}
        </Dialog>

        <Dialog open={alertFor !== null} onClose={() => setAlertFor(null)} title={`Price alert · ${alertFor?.code ?? ""}`} labelledBy="alert-title">
          {alertFor && (
            <>
              <p className="text-muted">Current price <strong className="font-display">{fmtPrice(ticks[alertFor.code]?.quote ?? alertFor.basePrice, alertFor.pipSize)}</strong>. An in-app notification fires when the level trades.</p>
              <div className="dx-field">
                <label className="dx-field-label" htmlFor="al-cond">Condition</label>
                <select id="al-cond" className="dx-select" value={alertCond} onChange={(e) => setAlertCond(e.target.value as "above" | "below")}>
                  <option value="above">Trades above</option>
                  <option value="below">Trades below</option>
                </select>
              </div>
              <div className="dx-field">
                <label className="dx-field-label" htmlFor="al-price">Alert price</label>
                <input id="al-price" className="dx-input font-display" type="number" step="any" value={alertPrice} onChange={(e) => setAlertPrice(Number(e.target.value))} />
              </div>
              <div className="d-flex gap-2 justify-content-end mt-3">
                <button type="button" className="dx-btn" onClick={() => setAlertFor(null)}>Cancel</button>
                <button
                  type="button" className="dx-btn dx-btn-primary"
                  disabled={!(alertPrice > 0)}
                  onClick={() => {
                    setAlerts((prev) => [...prev, { id: Date.now(), code: alertFor.code, cond: alertCond, price: alertPrice }]);
                    setAlertFor(null);
                    toast.push({ tone: "success", title: "Price alert saved", body: `${alertFor.code} ${alertCond} ${fmtPrice(alertPrice, alertFor.pipSize)}.` });
                  }}
                >
                  Save alert
                </button>
              </div>
            </>
          )}
        </Dialog>

        <Dialog open={econOpen} onClose={() => setEconOpen(false)} title="Economic calendar — today" size="lg" labelledBy="econ-title">
          <p className="text-muted">Select an event to highlight the instruments it usually moves.</p>
          {ECON_EVENTS.map((e) => (
            <button
              key={`${e.event}-${e.inMin}`}
              type="button"
              className="dx-list-row w-100 text-start"
              onClick={() => {
                setHighlight({ codes: e.symbols, label: `${e.currency} ${e.event}` });
                setEconOpen(false);
              }}
            >
              <span className="text-start">
                <strong>{e.event}</strong>
                <span className="d-block text-muted small">
                  in <span className="font-display">{e.inMin}m</span> · forecast <span className="font-display">{e.forecast}</span> · previous <span className="font-display">{e.previous}</span>
                </span>
              </span>
              <span className="d-flex align-items-center gap-2">
                <span className="font-display">{e.currency}</span>
                <Chip tone={e.impact === "high" ? "down" : e.impact === "medium" ? "warn" : "muted"}>{e.impact}</Chip>
              </span>
            </button>
          ))}
        </Dialog>

        <Drawer open={listsOpen} onClose={() => setListsOpen(false)} title="Watchlists & alerts">
          <p className="dx-eyebrow">Favourites ({favorites.size})</p>
          <div className="d-flex flex-wrap gap-2 mb-3">
            {[...favorites].map((code) => (
              <button key={code} type="button" className="dx-filter-chip is-active" onClick={() => { setListsOpen(false); const s = MARKET_SYMBOLS.find((x) => x.code === code); if (s) openDetail(s); }}>
                <span className="font-display">{code}</span>
              </button>
            ))}
            {favorites.size === 0 && <span className="text-muted small">Star any market card to pin it here.</span>}
          </div>

          {lists.map((w, wi) => (
            <div key={w.name} className="mb-3">
              <div className="d-flex align-items-center justify-content-between">
                <p className="dx-eyebrow mb-1">{w.name}</p>
                <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => { setListFilter(new Set(w.symbols)); setListsOpen(false); }}>Apply filter</button>
              </div>
              <p className="text-muted small">{w.note}</p>
              <div className="d-flex flex-wrap gap-2">
                {w.symbols.map((code) => (
                  <span key={code} className="dx-filter-chip">
                    <button type="button" className="dx-filter-chip-main" onClick={() => { setListsOpen(false); const s = MARKET_SYMBOLS.find((x) => x.code === code); if (s) openDetail(s); }}>
                      <span className="font-display">{code}</span>
                    </button>
                    <button
                      type="button" aria-label={`Remove ${code} from ${w.name}`}
                      onClick={() => setLists((prev) => prev.map((x, xi) => (xi === wi ? { ...x, symbols: x.symbols.filter((c) => c !== code) } : x)))}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {w.symbols.length === 0 && <span className="text-muted small">List is empty — apply another list or star symbols from the grid.</span>}
              </div>
            </div>
          ))}

          <p className="dx-eyebrow mt-4">Price alerts ({alerts.length})</p>
          {alerts.map((a) => (
            <div key={a.id} className="dx-list-row">
              <span><strong className="font-display">{a.code}</strong> <span className="text-muted">{a.cond}</span> <span className="font-display">{fmtPrice(a.price, MARKET_SYMBOLS.find((s) => s.code === a.code)?.pipSize ?? 2)}</span></span>
              <button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => setAlerts((prev) => prev.filter((x) => x.id !== a.id))}>Remove</button>
            </div>
          ))}
          {alerts.length === 0 && <p className="text-muted small">No alerts set. Use the bell on any market card.</p>}
        </Drawer>

        <Drawer open={detail !== null} onClose={() => setDetail(null)} title={detail ? `${detail.code} · ${detail.name}` : "Symbol"} wide>
          {detail && (
            <>
              <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                {detail.open ? <Chip tone="up" pulse>market open</Chip> : <Chip tone="muted">market closed</Chip>}
                <Chip>{detail.market}</Chip>
                <Chip tone={volBand(detail) === "high" ? "warn" : "muted"}>{volBand(detail)} volatility</Chip>
                <span className="ms-auto d-flex gap-2">
                  <button type="button" className="dx-btn dx-btn-sm" aria-pressed={favorites.has(detail.code)} onClick={() => toggleFav(detail.code)}>
                    <Star size={13} /> {favorites.has(detail.code) ? "Favourited" : "Favourite"}
                  </button>
                  <button type="button" className="dx-btn dx-btn-sm" onClick={() => openAlert(detail)}><Bell size={13} /> Price alert</button>
                </span>
              </div>
              <div className="d-flex align-items-end gap-3 mb-3">
                <span className="dx-stat-value font-display">{detailTick ? fmtPrice(detailTick.quote, detail.pipSize) : "—"}</span>
                <span className={`font-display ${detail.changePct >= 0 ? "dx-up" : "dx-down"}`}>{detail.changePct >= 0 ? "▲ +" : "▼ "}{detail.changePct.toFixed(2)}% today</span>
              </div>
              <Tabs
                tabs={[
                  { id: "overview", label: "Overview" },
                  { id: "sentiment", label: "Sentiment" },
                  { id: "contracts", label: "Contracts" },
                ]}
                active={symTab}
                onChange={setSymTab}
              />
              <div className="mt-3">
                {symTab === "overview" && (
                  <>
                    <Sparkline data={detailSeries} tone={detail.changePct >= 0 ? "up" : "down"} height={64} ariaLabel={`${detail.code} live price trail`} />
                    <div className="row g-3 mt-1">
                      <div className="col-6"><span className="text-muted small d-block">Spread</span><strong className="font-display">{fmtPrice(detail.spread, detail.pipSize)}</strong></div>
                      <div className="col-6"><span className="text-muted small d-block">Payout</span><strong className="font-display">{detail.payoutPct}%</strong></div>
                      <div className="col-6"><span className="text-muted small d-block">Stake range</span><strong className="font-display">{usd(detail.minStake)}–{usd(detail.maxStake)}</strong></div>
                      <div className="col-6"><span className="text-muted small d-block">Trader popularity</span><strong className="font-display">{detail.popularity}/100</strong></div>
                    </div>
                    <p className="dx-eyebrow mt-3 mb-1">Latest ticks</p>
                    <div className="dx-terminal" aria-label="Latest ticks">
                      {detailSeries.slice(-6).map((v, i, arr) => (
                        <span key={i} className="dx-terminal-line">
                          <span className="font-display">{fmtPrice(v, detail.pipSize)}</span>{" "}
                          <span className={i > 0 ? (v >= arr[i - 1] ? "dx-up" : "dx-down") : ""}>{i > 0 ? (v >= arr[i - 1] ? "▲" : "▼") : "·"}</span>
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {symTab === "sentiment" && (
                  <>
                    <p className="mb-1">Traders long <strong className="font-display">{bullish}%</strong> · short <strong className="font-display">{100 - bullish}%</strong></p>
                    <Meter value={bullish} label="Long sentiment" />
                    <p className="text-muted small mt-2">
                      {detail.popularity} of 100 active DerivX traders watched this symbol in the last hour. Sentiment is a crowd signal, not advice.
                    </p>
                    <button type="button" className="dx-btn" onClick={() => setLeaderboardOpen(true)}>See trader leaderboard</button>
                  </>
                )}
                {symTab === "contracts" && (
                  <>
                    {detail.contractTypes.map((ct) => (
                      <div key={ct} className="dx-list-row">
                        <span><strong>{ct}</strong><span className="d-block text-muted small">Payout {detail.payoutPct}% · stake {usd(detail.minStake)}–{usd(detail.maxStake)}</span></span>
                        <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" onClick={() => openTrade(detail)}>Trade</button>
                      </div>
                    ))}
                  </>
                )}
              </div>
              <div className="d-flex gap-2 mt-3">
                <button type="button" className="dx-btn dx-btn-primary flex-grow-1" onClick={() => openTrade(detail)}>Trade {detail.code}</button>
                <button type="button" className="dx-btn" onClick={() => void navigate({ to: "/dashboard" })}>Back to overview</button>
              </div>
            </>
          )}
        </Drawer>

        <LeaderboardDialog
          open={leaderboardOpen}
          onClose={() => setLeaderboardOpen(false)}
          onOpenTrader={(id) => { setLeaderboardOpen(false); setTraderDrawer(TRADERS.find((t) => t.id === id) ?? null); }}
          onCopy={(t) => { setLeaderboardOpen(false); setCopyTrader(t); }}
          onOpenCommunity={() => { setLeaderboardOpen(false); setDetail(null); void navigate({ to: "/dashboard" }); }}
          onOpenBacktests={() => { setLeaderboardOpen(false); setBacktestId("pre_mart_vol10"); }}
        />
        <TraderDrawer
          trader={traderDrawer}
          onClose={() => setTraderDrawer(null)}
          onCopy={(t) => { setTraderDrawer(null); setCopyTrader(t); }}
          onOpenLeaderboard={() => { setTraderDrawer(null); setLeaderboardOpen(true); }}
          onOpenCommunity={() => { setTraderDrawer(null); void navigate({ to: "/dashboard" }); }}
          copied={traderDrawer ? copyList.includes(traderDrawer.displayName) : false}
        />
        <CopySetupWizard
          open={copyTrader !== null}
          trader={copyTrader}
          onClose={() => setCopyTrader(null)}
          onCopied={(_traderId, ratio, cap) => {
            if (copyTrader) {
              setCopyDone({ name: copyTrader.displayName, ratio, cap });
              setCopyList((prev) => (prev.includes(copyTrader.displayName) ? prev : [...prev, copyTrader.displayName]));
            }
            setCopyTrader(null);
          }}
        />
        <Dialog open={copyDone !== null} onClose={() => setCopyDone(null)} title="Copying started" labelledBy="mk-copy-done">
          {copyDone && (
            <>
              <p>You are now copying <strong>{copyDone.name}</strong> — ratio <span className="font-display">{copyDone.ratio}×</span>, daily cap <span className="font-display">{usd(copyDone.cap)}</span>.</p>
              <div className="d-flex justify-content-end"><button type="button" className="dx-btn dx-btn-primary" onClick={() => setCopyDone(null)}>Done</button></div>
            </>
          )}
        </Dialog>

        <BacktestDialog
          open={backtestId !== null}
          onClose={() => setBacktestId(null)}
          initialPresetId={backtestId ?? undefined}
          onDeploy={(preset) => { setBacktestId(null); setDeployPreset(preset); }}
        />
        <DeployBotWizard
          open={deployPreset !== null}
          preset={deployPreset}
          onClose={() => setDeployPreset(null)}
          onDeployed={(name) => {
            setDeployPreset(null);
            toast.push({ tone: "success", title: "Bot deployed", body: `${name} is live — track it from the overview.` });
          }}
        />
      </div>
    </AppShell>
  );
}
