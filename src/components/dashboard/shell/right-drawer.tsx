"use client";

import Link from "next/link";

import { useOperatorUI } from "@/components/dashboard/shell/operator-context";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";
import type {
  FundsFlowDTO,
  InvestorWatchDTO,
  LastTradesFeedDTO,
  OperatorWorkspaceDTO,
  RightDrawerState,
  UpcomingSchedulesDTO,
} from "@/lib/dashboard/types";
import { formatCurrency } from "@/lib/format";
import {
  useMarkNotificationsRead,
  useReviewDeposit,
  useReviewKyc,
  useUpdateBot,
  useUpdateSchedule,
} from "@/lib/queries/use-dashboard";

export function OperatorRightDrawer({
  drawer,
  tradesFeed,
  schedules,
  funds,
  investorWatch,
  workspace,
}: {
  drawer: RightDrawerState;
  tradesFeed: LastTradesFeedDTO;
  schedules: UpcomingSchedulesDTO;
  funds: FundsFlowDTO;
  investorWatch: InvestorWatchDTO;
  workspace: OperatorWorkspaceDTO;
}) {
  const { closeDrawer, openDrawerTab, openOverlay, pushToast } = useOperatorUI();
  const updateBot = useUpdateBot();
  const updateSchedule = useUpdateSchedule();
  const reviewDeposit = useReviewDeposit();
  const reviewKyc = useReviewKyc();
  const markRead = useMarkNotificationsRead();

  if (!drawer.open) return null;

  const pendingDeposits = funds.pendingDeposits.filter((d) => d.status === "pending");
  const pendingPayouts = workspace.payoutQueue.filter((p) => p.status === "pending");
  const pendingKyc = investorWatch.investors.filter((i) => i.kycStatus === "pending");
  const queueTotal = pendingDeposits.length + pendingPayouts.length + pendingKyc.length;
  const unreadCount = workspace.notifications.filter((n) => n.unread).length;

  const entity = drawer.entity;
  const inspectedTrade =
    entity?.kind === "trade" ? tradesFeed.trades.find((t) => t.id === entity.id) : null;
  const inspectedSchedule =
    entity?.kind === "schedule" ? schedules.schedules.find((s) => s.id === entity.id) : null;
  const inspectedPkg =
    entity?.kind === "package" ? funds.packages.find((p) => p.code === entity.code) : null;
  const inspectedInv =
    entity?.kind === "investor" ? investorWatch.investors.find((i) => i.id === entity.id) : null;

  return (
    <div
      className="op-drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Operator Desk Drawer"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeDrawer();
      }}
    >
      <aside className="op-drawer">
        <div className="op-drawer__head">
          <div>
            <span className="eyebrow-label">Operator Inspector &amp; Live Queue</span>
            <h3 className="op-drawer__title">
              {entity ? `Inspecting ${entity.kind.toUpperCase()}` : "Desk Control Drawer"}
            </h3>
          </div>
          <div className="d-flex align-items-center gap-2">
            {entity ? (
              <button
                type="button"
                className="btn-ghost btn-ghost--sm"
                onClick={() => openDrawerTab("feed")}
              >
                All Tabs
              </button>
            ) : null}
            <button
              type="button"
              className="desk-icon-btn"
              onClick={closeDrawer}
              aria-label="Close drawer"
            >
              <Icon name="close" size={17} />
            </button>
          </div>
        </div>

        {/* ── Contextual Entity Inspector Card (if triggered from a row/card) ── */}
        {inspectedTrade ? (
          <div className="op-drawer__inspect">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="desk-code-tag mono">TRADE #{inspectedTrade.tradeNumber}</span>
              <span className={inspectedTrade.isWin ? "pill pill-live" : "pill pill-amber"}>
                {inspectedTrade.isWin ? `WON +$${inspectedTrade.profit}` : `LOST $${inspectedTrade.profit}`}
              </span>
            </div>
            <dl className="auth-kv mb-3">
              <dt>Deriv Contract ID</dt>
              <dd className="mono">{inspectedTrade.derivContractId}</dd>
              <dt>Instrument &amp; Type</dt>
              <dd className="mono">
                {inspectedTrade.symbol} · {inspectedTrade.contractLabel}
              </dd>
              <dt>Entry → Exit Spot</dt>
              <dd className="mono">
                {inspectedTrade.entrySpot} → {inspectedTrade.exitSpot}
              </dd>
              <dt>Pool Attribution</dt>
              <dd className="mono">{inspectedTrade.packageCode} ({inspectedTrade.botName})</dd>
            </dl>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn-brand flex-grow-1"
                onClick={() => {
                  closeDrawer();
                  openOverlay({
                    type: "quick-trade",
                    defaultSymbol: inspectedTrade.symbol,
                    defaultPackage: inspectedTrade.packageCode,
                    defaultStake: inspectedTrade.stake,
                  });
                }}
              >
                Trade {inspectedTrade.symbol} Again
              </button>
              <button
                type="button"
                className="btn-ghost btn-ghost--sm"
                onClick={() => {
                  closeDrawer();
                  openOverlay({ type: "trade-detail", tradeId: inspectedTrade.id });
                }}
              >
                Receipt
              </button>
            </div>
          </div>
        ) : null}

        {inspectedSchedule ? (
          <div className="op-drawer__inspect">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="desk-code-tag mono">{inspectedSchedule.executeAt} UTC</span>
              <span className="pill">{inspectedSchedule.status.toUpperCase()}</span>
            </div>
            <strong className="d-block mb-2">{inspectedSchedule.name}</strong>
            <dl className="auth-kv mb-3">
              <dt>Instrument &amp; Strategy</dt>
              <dd className="mono">
                {inspectedSchedule.symbol} · {inspectedSchedule.strategy}
              </dd>
              <dt>Base Stake / Max Trades</dt>
              <dd className="mono">
                ${inspectedSchedule.stake} × max {inspectedSchedule.maxTrades}
              </dd>
              <dt>TP / SL Guardrails</dt>
              <dd className="mono">
                +${inspectedSchedule.takeProfit} / −${inspectedSchedule.stopLoss}
              </dd>
              <dt>Pool Split</dt>
              <dd className="mono">{inspectedSchedule.packageCodes.join(" · ")}</dd>
            </dl>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn-brand flex-grow-1"
                disabled={updateSchedule.isPending}
                onClick={async () => {
                  await updateSchedule.mutateAsync({ id: inspectedSchedule.id, action: "run_now" });
                  pushToast({
                    tone: "success",
                    title: `Triggered ${inspectedSchedule.name} immediately`,
                  });
                }}
              >
                Execute Sequence Now
              </button>
              <button
                type="button"
                className="btn-ghost btn-ghost--sm"
                onClick={() => updateSchedule.mutate({ id: inspectedSchedule.id, action: "toggle" })}
              >
                {inspectedSchedule.status === "paused" ? "Resume" : "Pause"}
              </button>
            </div>
          </div>
        ) : null}

        {inspectedPkg ? (
          <div className="op-drawer__inspect">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="desk-code-tag mono">{inspectedPkg.code}</span>
              <span className="pill pill-live">{inspectedPkg.status.toUpperCase()}</span>
            </div>
            <strong className="d-block mb-2">{inspectedPkg.name}</strong>
            <dl className="auth-kv mb-3">
              <dt>Pooled Capital</dt>
              <dd className="mono">
                {formatCurrency(inspectedPkg.totalCapital, "USD", 0)} ({inspectedPkg.filledSlots}/
                {inspectedPkg.totalSlots} slots)
              </dd>
              <dt>Realized Pool P&amp;L</dt>
              <dd className="mono text-win">+{formatCurrency(inspectedPkg.currentPnL)}</dd>
              <dt>Drawdown Peak / Cap</dt>
              <dd className="mono">
                {inspectedPkg.maxDrawdownHit}% / {inspectedPkg.maxDrawdown}%
              </dd>
              <dt>Pending Investor Credit</dt>
              <dd className="mono text-win">+{formatCurrency(inspectedPkg.pendingPnL)}</dd>
            </dl>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn-brand flex-grow-1"
                onClick={() => {
                  closeDrawer();
                  openOverlay({ type: "distribute-wizard" });
                }}
              >
                Distribute Pool Profits
              </button>
              <button
                type="button"
                className="btn-ghost btn-ghost--sm"
                onClick={() => {
                  closeDrawer();
                  openOverlay({ type: "quick-trade", defaultPackage: inspectedPkg.code });
                }}
              >
                Trade Pool
              </button>
            </div>
          </div>
        ) : null}

        {inspectedInv ? (
          <div className="op-drawer__inspect">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="desk-code-tag mono">{inspectedInv.handle}</span>
              <span className="pill">{inspectedInv.kycStatus.toUpperCase()}</span>
            </div>
            <strong className="d-block mb-2">{inspectedInv.fullName}</strong>
            <dl className="auth-kv mb-3">
              <dt>Capital Committed</dt>
              <dd className="mono">
                {formatCurrency(inspectedInv.totalInvested, "USD", 0)} ({inspectedInv.totalSlots} slots)
              </dd>
              <dt>Net Earnings</dt>
              <dd className="mono text-win">+{formatCurrency(inspectedInv.netEarnings)}</dd>
              <dt>Wallet Balance</dt>
              <dd className="mono">{formatCurrency(inspectedInv.walletBalance)}</dd>
            </dl>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn-brand flex-grow-1"
                onClick={() => {
                  closeDrawer();
                  openOverlay({ type: "investor-ledger", investorId: inspectedInv.id });
                }}
              >
                Open Full Dossier
              </button>
              {inspectedInv.kycStatus !== "approved" ? (
                <button
                  type="button"
                  className="btn-ghost btn-ghost--sm"
                  onClick={() =>
                    reviewKyc.mutate({ investorId: inspectedInv.id, decision: "approved" })
                  }
                >
                  Approve KYC
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ── 4 Live Drawer Tabs ── */}
        <div className="op-drawer__tabs" role="tablist">
          {(
            [
              ["feed", "Live Stream"],
              ["bots", `Bots (${workspace.bots.filter((b) => b.status === "running").length})`],
              ["queue", `Queue (${queueTotal})`],
              ["alerts", `Alerts (${unreadCount})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={drawer.tab === key}
              className={cn("op-drawer__tab", drawer.tab === key && "is-active")}
              onClick={() => openDrawerTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="op-drawer__body">
          {drawer.tab === "feed" ? (
            <div className="d-flex flex-column gap-2">
              {workspace.auditLogs.map((ev) => (
                <div key={ev.id} className="op-drawer__item">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="desk-code-tag mono">{ev.category}</span>
                    <span className="mono small text-muted">{ev.timestamp}</span>
                  </div>
                  <strong className="small mt-1">{ev.action}</strong>
                  <span className="small text-secondary">{ev.detail}</span>
                </div>
              ))}
            </div>
          ) : null}

          {drawer.tab === "bots" ? (
            <div className="d-flex flex-column gap-2">
              {workspace.bots.map((bot) => (
                <div key={bot.id} className="op-drawer__item">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong className="mono">{bot.code}</strong> · <span>{bot.name}</span>
                    </div>
                    <span
                      className={cn(
                        "pill",
                        bot.status === "running" ? "pill-live" : "pill-amber",
                      )}
                    >
                      {bot.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center small text-secondary mt-1">
                    <span className="mono">
                      {bot.symbol} · {bot.strategy} · ${bot.stake} ({bot.packageCode})
                    </span>
                    <button
                      type="button"
                      className="btn-ghost btn-ghost--sm py-1 px-2"
                      onClick={() => updateBot.mutate({ action: "toggle", botId: bot.id })}
                    >
                      {bot.status === "running" ? "Pause" : "Start"}
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="btn-brand w-100 mt-2"
                onClick={() => {
                  closeDrawer();
                  openOverlay({ type: "bot-deploy-wizard" });
                }}
              >
                + Deploy New Bot Wizard
              </button>
            </div>
          ) : null}

          {drawer.tab === "queue" ? (
            <div className="d-flex flex-column gap-2">
              {pendingDeposits.map((dep) => (
                <div key={dep.id} className="op-drawer__item">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="mono fw-semibold">
                      {dep.reference} · {formatCurrency(dep.amount, "USD", 0)}
                    </span>
                    <button
                      type="button"
                      className="btn-brand py-1 px-2 small"
                      onClick={async () => {
                        await reviewDeposit.mutateAsync({ id: dep.id, action: "verify" });
                        pushToast({
                          tone: "success",
                          title: `Verified ${dep.reference} (+$${dep.amount})`,
                        });
                      }}
                    >
                      Verify
                    </button>
                  </div>
                  <span className="small text-secondary">
                    {dep.investorName} · {dep.method} → {dep.packageCode}
                  </span>
                </div>
              ))}
              {pendingPayouts.length > 0 ? (
                <button
                  type="button"
                  className="btn-ghost w-100"
                  onClick={() => {
                    closeDrawer();
                    openOverlay({ type: "payout-batch-wizard" });
                  }}
                >
                  Open Payout Batch Wizard ({pendingPayouts.length} pending)
                </button>
              ) : null}
            </div>
          ) : null}

          {drawer.tab === "alerts" ? (
            <div className="d-flex flex-column gap-2">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-secondary">{unreadCount} unread notices</span>
                <button
                  type="button"
                  className="auth-link-btn small"
                  onClick={() => markRead.mutate()}
                >
                  Mark all read
                </button>
              </div>
              {workspace.notifications.map((n) => (
                <div key={n.id} className={cn("op-drawer__item", n.unread && "is-unread")}>
                  <div className="d-flex justify-content-between">
                    <strong className="small">{n.title}</strong>
                    <span className="mono small text-muted">{n.time}</span>
                  </div>
                  <span className="small text-secondary">{n.detail}</span>
                  {n.targetRoute ? (
                    <Link
                      href={n.targetRoute}
                      className="small fw-semibold mt-1"
                      onClick={closeDrawer}
                    >
                      Open module →
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
