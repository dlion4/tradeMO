// =============================================================================
// features/types.ts — the H-2 controller contract shared by sections & dialogs.
// Every interactive control on /features routes through this interface, which
// guarantees one owner for overlay state (FeaturesPage) and zero dead controls.
// =============================================================================
import type { AutomationKind, AutomationRule, Bot, ComparisonRow, Script, ScriptTemplate, Trader } from "../../../data/trading";
import type { ContractTypeId } from "../../../data/market";

export type FeatureSectionId = "bot" | "scripts" | "social" | "automation" | "markets" | "compare";

export interface FeaturesController {
  // account / conversion (reused H-1 overlays)
  openOAuth: () => void;
  openSignIn: () => void;
  openSignUp: (presetId?: string) => void;
  openTour: () => void;
  openDemo: (tab?: "trade" | "bots" | "portfolio" | "analytics" | "social") => void;
  openPricing: (planId?: string) => void;
  openAccounts: () => void;
  // bot engine
  openBotWizard: (presetId?: string, step?: number) => void;
  openBotDetail: (bot: Bot) => void;
  openPresets: (presetId?: string) => void;
  openBacktests: (presetId?: string) => void;
  // script engine
  openScriptStudio: (script?: Script, template?: ScriptTemplate) => void;
  openTemplate: (template: ScriptTemplate) => void;
  // social
  openLeaderboard: () => void;
  openTrader: (trader: Trader) => void;
  openCopy: (trader: Trader) => void;
  openCommunity: (channelId?: string) => void;
  // automation
  openRuleWizard: (kind?: AutomationKind, rule?: AutomationRule) => void;
  openRuleDetail: (rule: AutomationRule) => void;
  openRiskPolicy: () => void;
  openAlertRules: () => void;
  // markets
  openInstrument: (code: string) => void;
  openContract: (id: ContractTypeId) => void;
  openStatus: () => void;
  // comparison
  openComparison: (row: ComparisonRow) => void;
  // content / support (reused H-1 overlays)
  openFaq: (category?: string) => void;
  openApiDocs: () => void;
  openLegal: (docId: string) => void;
  scrollTo: (anchor: string) => void;
}
