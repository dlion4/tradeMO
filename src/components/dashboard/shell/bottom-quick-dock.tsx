"use client";

import Link from "next/link";
import { useState } from "react";

import { useOperatorUI } from "@/components/dashboard/shell/operator-context";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { OperatorKpiSummaryDTO } from "@/lib/dashboard/types";
import { formatCurrency } from "@/lib/format";

/**
 * Persistent Bottom Onscreen Desk Action Bar:
 * Combines live session readout with 6 direct triggers to modals, multi-step
 * wizards, the right-side inspector drawer, and key routes (collapsible).
 */
export function BottomQuickDock({
  kpis,
  countdownLabel,
}: {
  kpis: OperatorKpiSummaryDTO;
  countdownLabel: string;
}) {
  const { openOverlay, openDrawerTab } = useOperatorUI();
  const [minimized, setMinimized] = useState(false);

  return (
    <div className={cn("op-bottom-dock", minimized && "is-minimized")} role="region" aria-label="Quick desk actions">
      <div className="op-bottom-dock__inner">
        <div className="op-bottom-dock__telemetry">
          <span className="live-dot" />
          <span className="mono small">
            Session{" "}
            <strong className={kpis.sessionPnL >= 0 ? "text-win" : "text-loss"}>
              {kpis.sessionPnL >= 0 ? "+" : ""}
              {formatCurrency(kpis.sessionPnL)}
            </strong>
          </span>
          <span className="op-bottom-dock__sep" aria-hidden="true">·</span>
          <span className="mono small text-secondary d-none d-md-inline">
            Next run <strong>{countdownLabel}</strong>
          </span>
        </div>

        {!minimized ? (
          <div className="op-bottom-dock__actions">
            <button
              type="button"
              className="btn-brand op-dock-btn"
              onClick={() => openOverlay({ type: "quick-trade" })}
            >
              <Icon name="bolt" size={14} /> Execute Trade
            </button>

            <button
              type="button"
              className="btn-ghost op-dock-btn"
              onClick={() => openOverlay({ type: "new-package-wizard" })}
            >
              <Icon name="package" size={14} /> New Pool Wizard
            </button>

            <button
              type="button"
              className="btn-ghost op-dock-btn"
              onClick={() => openOverlay({ type: "schedule-wizard" })}
            >
              <Icon name="calendar" size={14} /> Schedule Wizard
            </button>

            <button
              type="button"
              className="btn-ghost op-dock-btn"
              onClick={() => openOverlay({ type: "distribute-wizard" })}
            >
              <Icon name="split" size={14} /> Distribute ({formatCurrency(kpis.pendingDistribution, "USD", 0)})
            </button>

            <button
              type="button"
              className="btn-ghost op-dock-btn"
              onClick={() => openOverlay({ type: "payout-batch-wizard" })}
            >
              <Icon name="wallet" size={14} /> Payouts ({kpis.pendingPayouts.count})
            </button>

            <button
              type="button"
              className="btn-ghost op-dock-btn"
              onClick={() => openDrawerTab("queue")}
            >
              <Icon name="panelRight" size={14} /> Right Drawer
            </button>

            <Link href="/dashboard/schedules" className="btn-ghost op-dock-btn d-none d-xl-inline-flex">
              Schedules →
            </Link>
          </div>
        ) : null}

        <button
          type="button"
          className="desk-icon-btn ms-auto"
          onClick={() => setMinimized((v) => !v)}
          aria-label={minimized ? "Expand quick action bar" : "Minimize quick action bar"}
          title={minimized ? "Expand quick action bar" : "Minimize quick action bar"}
        >
          <Icon name={minimized ? "plus" : "minus"} size={15} />
        </button>
      </div>
    </div>
  );
}
