// =============================================================================
// types.ts — the H-1 landing controller contract shared by sections & modals.
// Every interactive control on the page routes through this interface, which
// guarantees one owner for overlay state (LandingPage) and zero dead controls.
// =============================================================================

import type { ContractTypeId, DurationUnit } from "../../data/market";

export type FeatureId = "bot-builder" | "script-engine" | "social-trade";
export type LeaderboardTab = "all" | "month" | "week";
export type DemoTab = "trade" | "bots" | "portfolio" | "analytics" | "social";

export interface LandingController {
  /** Deriv OAuth2 simulation (5-step wizard) */
  openOAuth: () => void;
  /** navigates to the real A-1 route (/auth/signup) — every "Get started" CTA */
  openSignUp: (presetId?: string) => void;
  /** product tour dialog (5 slides, stepper) */
  openTour: (slideId?: string) => void;
  /** interactive demo console (trade flow: proposal → confirm → buy → receipt) */
  openDemo: (tab?: DemoTab) => void;
  openFeature: (id: FeatureId) => void;
  openStep: (index: number) => void;
  openTestimonial: (id: string) => void;
  openLeaderboard: (tab?: LeaderboardTab, filter?: string) => void;
  openTrader: (id: string) => void;
  openInstrument: (code: string) => void;
  openLegal: (docId: string) => void;
  openCommunity: (channelId?: string) => void;
  openStatus: () => void;
  openPricing: (planId?: string) => void;
  openPresets: (presetId?: string) => void;
  openBacktests: (presetId?: string) => void;
  openFaq: (category?: string) => void;
  openApiDocs: () => void;
  openAbout: () => void;
  openChangelog: () => void;
  openSitemap: () => void;
  openContact: (topic?: string) => void;
  openAccountSwitcher: () => void;
  /** shared publish/subscribe trigger — the ONLY toast trigger group on H-1 */
  subscribe: (email: string) => void;
  scrollTo: (anchor: string) => void;
}

/**
 * A bot deployed from the landing page (DeployBotWizard → PresetsDialog). The
 * rows are handed to the demo console so a deploy has a visible destination
 * instead of ending in a toast.
 */
export interface QueuedBot {
  id: string;
  name: string;
  symbol: string;
  stake: number;
  cap: number;
  strategy: "martingale" | "dca" | "scalping" | "swing" | "fixed" | "accumulator" | "digit";
  contractType: ContractTypeId;
  duration: number;
  durationUnit: DurationUnit;
  risk: "low" | "medium" | "high";
  winRate: number;
}
