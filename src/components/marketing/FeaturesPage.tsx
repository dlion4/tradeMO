// =============================================================================
// FeaturesPage.tsx — H-2 orchestrator (/features). Owns every overlay's state,
// exposes the FeaturesController to sections/dialogs, and renders the marketing
// shell. Route file (routes/features.tsx) only mounts this component.
// Overlay inventory (26): BotConfigWizard, ScriptStudio, AutomationRuleWizard,
// RiskPolicy, AlertRules, ContractDetail, ComparisonDetail, BotDetailDrawer,
// AutomationDrawer, ScriptTemplateDrawer + reused H-1 pack (OAuth, SignIn,
// Signup, Tour, DemoConsole, Presets, DeployBot, Backtest, Pricing,
// Leaderboard, TraderDrawer, CopySetup, InstrumentDrawer, StatusDrawer,
// AccountSwitcher, Legal, Faq, ApiDocs, Community, Contact, About, Changelog,
// Sitemap). Toast budget: 4 triggers (OAuth, contract bought, copy started,
// digest subscribe) — everything else lands in visible page state.
// =============================================================================
import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Play, Radio, Rocket } from "lucide-react";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingMobileMenu, MarketingNav } from "./MarketingNav";
import { Chip, MiniTabs, PriceFlash, Reveal, SectionHead, StatCard, Tabs, useToast } from "../ui/primitives";
import { AutomationSection, BotEngineSection, ComparisonSection, FeaturesMarketsSection, ScriptEngineSection, SocialSection } from "./features/FeatureSections";
import {
  AlertRulesDialog,
  AutomationDrawer,
  AutomationRuleWizard,
  BotConfigWizard,
  BotDetailDrawer,
  ComparisonDetailDialog,
  ContractDetailDialog,
  RiskPolicyDialog,
  ScriptStudioDialog,
  ScriptTemplateDrawer,
} from "./features/FeaturesDialogs";
import type { FeaturesController, FeatureSectionId } from "./features/types";
import { OAuthWizard, SignupWizard, AccountSwitcherDialog } from "./modals/AccountModals";
import { DemoConsoleDialog, TourDialog } from "./modals/DemoModals";
import {
  AboutDialog, ApiDocsDialog, ChangelogDialog, CommunityDialog, ContactDialog,
  FaqDialog, LegalDialog, SitemapDialog,
} from "./modals/ContentDialogs";
import { BacktestDialog, DeployBotWizard, PresetsDialog, PricingDialog } from "./modals/CommerceDialogs";
import { CopySetupWizard, InstrumentDrawer, LeaderboardDialog, StatusDrawer, TraderDrawer } from "./modals/SocialModals";
import {
  AUTOMATION_RULES, BOTS, DERIV_ACCOUNTS, LEGAL_DOCS, STATS, TRADERS,
  type AutomationKind, type AutomationRule, type Bot, type ComparisonRow,
  type Script, type ScriptTemplate, type StrategyPreset, type Trader,
} from "../../data/trading";
import { TICKER_SYMBOLS, SYMBOL_MAP, fmtPrice, usd, type ContractTypeId } from "../../data/market";
import { useTicks } from "../../lib/live";
import type { DemoTab, QueuedBot } from "./types";

const SECTION_TABS: { id: FeatureSectionId; label: string; anchor: string }[] = [
  { id: "bot", label: "Bot Engine", anchor: "#features-bot" },
  { id: "scripts", label: "Script Engine", anchor: "#features-scripts" },
  { id: "social", label: "Social Trading", anchor: "#features-social" },
  { id: "automation", label: "Automation", anchor: "#features-automation" },
  { id: "markets", label: "Markets", anchor: "#features-markets" },
  { id: "compare", label: "Compare", anchor: "#features-compare" },
];

export function FeaturesPage() {
  const toast = useToast();
  const navigate = useNavigate();

  // ---- reused H-1 overlay state -------------------------------------------
  const [oauthOpen, setOauthOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoTab, setDemoTab] = useState<DemoTab>("trade");
  const [pricingOpen, setPricingOpen] = useState(false);
  const [pricingPlanId, setPricingPlanId] = useState<string | undefined>(undefined);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [presetId, setPresetId] = useState<string | undefined>(undefined);
  const [backtestOpen, setBacktestOpen] = useState(false);
  const [backtestPreset, setBacktestPreset] = useState<string | undefined>(undefined);
  const [deployPreset, setDeployPreset] = useState<StrategyPreset | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [trader, setTrader] = useState<Trader | null>(null);
  const [copyTrader, setCopyTrader] = useState<Trader | null>(null);
  const [instrumentCode, setInstrumentCode] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [legalDocId, setLegalDocId] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqCategory, setFaqCategory] = useState<string | undefined>(undefined);
  const [docsOpen, setDocsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [sitemapOpen, setSitemapOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactTopic, setContactTopic] = useState<string | undefined>(undefined);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [communityChannel, setCommunityChannel] = useState<string | undefined>(undefined);
  const [mobileNav, setMobileNav] = useState(false);

  // ---- H-2 overlay state ----------------------------------------------------
  const [botWizard, setBotWizard] = useState<{ presetId?: string; step: number } | null>(null);
  const [botDetail, setBotDetail] = useState<Bot | null>(null);
  const [studio, setStudio] = useState<{ script: Script | null; template: ScriptTemplate | null } | null>(null);
  const [templateDetail, setTemplateDetail] = useState<ScriptTemplate | null>(null);
  const [ruleWizard, setRuleWizard] = useState<{ kind: AutomationKind; editing: AutomationRule | null } | null>(null);
  const [ruleDetail, setRuleDetail] = useState<AutomationRule | null>(null);
  const [riskOpen, setRiskOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [contractId, setContractId] = useState<ContractTypeId | null>(null);
  const [comparisonRow, setComparisonRow] = useState<ComparisonRow | null>(null);

  // ---- page-visible state ---------------------------------------------------
  const [bots, setBots] = useState<Bot[]>(BOTS);
  const [rules, setRules] = useState<AutomationRule[]>(AUTOMATION_RULES);
  const [activeSection, setActiveSection] = useState<FeatureSectionId>("bot");
  const [tickerSet, setTickerSet] = useState<"majors" | "synthetics" | "crypto">("majors");
  const [activeLoginId, setActiveLoginId] = useState(DERIV_ACCOUNTS[1].loginId);
  const [connections, setConnections] = useState<string[]>(DERIV_ACCOUNTS.filter((a) => a.connected).map((a) => a.loginId));
  const [onboarded, setOnboarded] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [copied, setCopied] = useState<{ id: string; ratio: number; cap: number } | null>(null);
  const [lastOrder, setLastOrder] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [queuedBots, setQueuedBots] = useState<QueuedBot[]>([]);
  const [lastRule, setLastRule] = useState<string | null>(null);

  const legalDoc = useMemo(() => LEGAL_DOCS.find((d) => d.id === legalDocId) ?? null, [legalDocId]);
  const tickerCodes =
    tickerSet === "majors" ? TICKER_SYMBOLS : tickerSet === "synthetics"
      ? ["R_10", "R_25", "R_50", "R_75", "R_100", "1HZ10V"]
      : ["cryBTCUSD", "cryETHUSD", "frxXAUUSD", "frxXAGUSD"];
  const quotes = useTicks(tickerCodes);

  const scrollTo = (anchor: string) => document.querySelector(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const toggleBot = (bot: Bot, next: Bot["status"]) => {
    setBots((list) => list.map((b) => (b.id === bot.id ? { ...b, status: next } : b)));
    setBotDetail((current) => (current && current.id === bot.id ? { ...current, status: next } : current));
  };
  const toggleRule = (rule: AutomationRule) => {
    setRules((list) => list.map((r) => (r.id === rule.id ? { ...r, status: r.status === "enabled" ? "paused" : "enabled" } : r)));
    setRuleDetail((current) => (current && current.id === rule.id ? { ...current, status: current.status === "enabled" ? "paused" : "enabled" } : current));
  };

  const c: FeaturesController = useMemo(
    () => ({
      openOAuth: () => setOauthOpen(true),
      openSignUp: () => { void navigate({ to: "/auth/signup" }); },
      openTour: () => setTourOpen(true),
      openDemo: (tab) => { setDemoTab(tab ?? "trade"); setDemoOpen(true); },
      openPricing: (planId) => { setPricingPlanId(planId); setPricingOpen(true); },
      openAccounts: () => setAccountsOpen(true),
      openBotWizard: (preset, step) => setBotWizard({ presetId: preset, step: step ?? 0 }),
      openBotDetail: (bot) => setBotDetail(bot),
      openPresets: (preset) => { setPresetId(preset); setPresetsOpen(true); },
      openBacktests: (preset) => { setBacktestPreset(preset); setBacktestOpen(true); },
      openScriptStudio: (script, template) => setStudio({ script: script ?? null, template: template ?? null }),
      openTemplate: (template) => setTemplateDetail(template),
      openLeaderboard: () => setLeaderboardOpen(true),
      openTrader: (t) => setTrader(t),
      openCopy: (t) => { setTrader(null); setCopyTrader(t); },
      openCommunity: (channelId) => { setCommunityChannel(channelId); setCommunityOpen(true); },
      openRuleWizard: (kind, rule) => setRuleWizard({ kind: kind ?? rule?.kind ?? "schedule", editing: rule ?? null }),
      openRuleDetail: (rule) => setRuleDetail(rule),
      openRiskPolicy: () => setRiskOpen(true),
      openAlertRules: () => setAlertsOpen(true),
      openInstrument: (code) => setInstrumentCode(code),
      openContract: (id) => setContractId(id),
      openStatus: () => setStatusOpen(true),
      openComparison: (row) => setComparisonRow(row),
      openFaq: (category) => { setFaqCategory(category); setFaqOpen(true); },
      openApiDocs: () => setDocsOpen(true),
      openLegal: (docId) => setLegalDocId(docId),
      scrollTo,
    }),
    [],
  );

  const copiedTrader = copied ? TRADERS.find((t) => t.id === copied.id) : null;

  return (
    <div className="page-features">
      <a className="dx-skip-link" href="#features-bot">Skip to the bot engine</a>

      <MarketingNav
        activeId="features"
        badgeLabel="H-2 Features"
        anchorOverrides={{ markets: "#features-markets", how: "#features-bot" }}
        onGetStarted={() => setOauthOpen(true)}
        onOpenCommunity={() => c.openCommunity()}
        onOpenPricing={() => c.openPricing()}
        onOpenMobile={() => setMobileNav((v) => !v)}
      />
      <MarketingMobileMenu
        open={mobileNav}
        onClose={() => setMobileNav(false)}
        anchorOverrides={{ markets: "#features-markets", how: "#features-bot" }}
        onGetStarted={() => setOauthOpen(true)}
        onOpenCommunity={() => c.openCommunity()}
        onOpenPricing={() => c.openPricing()}
      />

      {/* session band — every completed action lands here as visible state */}
      <div className="dx-section-band dx-section-tight">
        <div className="container d-flex flex-wrap align-items-center gap-2">
          <span className="dx-chip dx-chip-accent"><span className="dx-pulse" /> {connections.length} Deriv connections</span>
          <span className="dx-chip dx-chip-muted font-display">active {activeLoginId}</span>
          {onboarded ? <span className="dx-chip dx-chip-up font-display">onboarded {onboarded}</span> : null}
          {lastOrder ? <span className="dx-chip dx-chip-up font-display">last order {lastOrder}</span> : null}
          {copiedTrader && copied ? (
            <span className="dx-chip dx-chip-accent">copying {copiedTrader.displayName} at {copied.ratio}x · cap {usd(copied.cap, 0)}</span>
          ) : null}
          {activePlan ? <span className="dx-chip dx-chip-accent">{activePlan} tier</span> : null}
          {lastRule ? <span className="dx-chip dx-chip-info">rule saved: {lastRule}</span> : null}
          {queuedBots.length ? (
            <button type="button" className="dx-chip dx-chip-up" onClick={() => c.openDemo("bots")}>
              {queuedBots.length} bot{queuedBots.length > 1 ? "s" : ""} deployed this session — open fleet
            </button>
          ) : null}
          {subscribed ? <span className="dx-chip dx-chip-info">digest on</span> : null}
          <button type="button" className="dx-btn-link ms-auto" onClick={() => setAccountsOpen(true)}>manage connections →</button>
        </div>
      </div>

      <main id="main">
        {/* ---------------- PAGE HERO (blueprint) ---------------- */}
        <section className="dx-hero dx-grid-bg">
          <div className="dx-hero-glow" aria-hidden="true" />
          <div className="container position-relative">
            <div className="row g-5 align-items-center">
              <div className="col-12 col-lg-7">
                <Reveal>
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                    <Chip tone="accent" pulse>{STATS.botsLive.toLocaleString("en-US")} bots live</Chip>
                    <Chip tone="muted">Bot · Script · Social · Automation · Markets</Chip>
                    <Chip tone="info">Front-end build · mock data</Chip>
                  </div>
                </Reveal>
                <Reveal delay={60}>
                  <h1 className="dx-h-hero">Everything you need to trade on <span className="dx-up">autopilot</span></h1>
                </Reveal>
                <Reveal delay={120}>
                  <p className="dx-lead mt-3">
                    Five systems, one execution layer: pre-built bots, a sandboxed script engine, verified social trading,
                    rule-based automation and the full Deriv market catalogue — all settling on your own Deriv account.
                  </p>
                </Reveal>
                <Reveal delay={180}>
                  <div className="d-flex flex-wrap align-items-center gap-3 mt-4">
                    <button type="button" className="dx-btn dx-btn-lg dx-btn-primary" onClick={() => c.openBotWizard()}>
                      <Rocket size={16} /> Configure your first bot
                    </button>
                    <button type="button" className="dx-btn dx-btn-lg dx-btn-ghost" onClick={() => setTourOpen(true)}>
                      <Play size={15} /> Watch the tour
                    </button>
                    <button type="button" className="dx-btn-link" onClick={() => scrollTo("#features-compare")}>
                      Jump to the comparison table
                    </button>
                  </div>
                </Reveal>
              </div>
              <div className="col-12 col-lg-5">
                <Reveal delay={140}>
                  <div className="row g-3">
                    <div className="col-6">
                      <StatCard label="Bots running now" value={STATS.botsLive} live trend="+212 this week" trendDir="up"
                        action={<button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => c.openDemo("bots")}>View fleet</button>} />
                    </div>
                    <div className="col-6">
                      <StatCard label="Symbols covered" value={STATS.assets} trend="5 markets · 24/7 synthetics" trendDir="up"
                        action={<button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => scrollTo("#features-markets")}>Browse markets</button>} />
                    </div>
                    <div className="col-6">
                      <StatCard label="Contract types" value={STATS.contractTypes} trend="Rise/Fall → Multiplier" trendDir="up"
                        action={<button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={() => scrollTo("#features-markets")}>Barrier guide</button>} />
                    </div>
                    <div className="col-6">
                      <StatCard label="Median tick latency" value={STATS.avgTickLatencyMs} suffix=" ms" trend="eu-west relay" trendDir="up"
                        action={<button type="button" className="dx-btn dx-btn-sm dx-btn-ghost" onClick={c.openStatus}>Stream health</button>} />
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>

            {/* live ticker strip */}
            <div className="dx-card dx-card-pad py-3 mt-5">
              <div className="d-flex flex-wrap align-items-center gap-3 mb-2">
                <span className="dx-eyebrow dx-eyebrow-bare mb-0"><Radio size={12} /> Live ticker</span>
                <MiniTabs
                  options={[{ id: "majors", label: "Majors" }, { id: "synthetics", label: "Synthetics" }, { id: "crypto", label: "Crypto / Metals" }]}
                  value={tickerSet}
                  onChange={(v) => setTickerSet(v as typeof tickerSet)}
                  ariaLabel="Ticker group"
                />
                <button type="button" className="dx-btn-link ms-auto" onClick={c.openStatus}>Stream health</button>
              </div>
              <div className="dx-ticker">
                <div className="dx-ticker-track">
                  {[0, 1].map((pass) => (
                    <div key={pass} className="d-flex gap-4" aria-hidden={pass === 1}>
                      {tickerCodes.map((code) => {
                        const symbol = SYMBOL_MAP[code];
                        const q = quotes[code];
                        if (!symbol || !q) return null;
                        return (
                          <button key={`${pass}-${code}`} type="button" className="dx-ticker-item" onClick={() => c.openInstrument(code)}>
                            <span className="dx-ticker-sym">
                              <span className={`dx-dot ${q.dir === "down" ? "dx-dot-down" : "dx-dot-up"}`} />
                              {symbol.code}
                            </span>
                            <PriceFlash value={fmtPrice(q.quote, symbol.pipSize)} dir={q.dir} />
                            <span className={`dx-chip ${q.changePct >= 0 ? "dx-chip-up" : "dx-chip-down"}`}>
                              {q.changePct >= 0 ? "▲" : "▼"} {Math.abs(q.changePct).toFixed(2)}%
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* in-page section nav */}
        <div className="dx-section-band">
          <div className="container d-flex flex-wrap align-items-center gap-3">
            <span className="dx-eyebrow dx-eyebrow-bare mb-0">On this page</span>
            <Tabs
              tabs={SECTION_TABS.map((t) => ({ id: t.id, label: t.label }))}
              active={activeSection}
              onChange={(id) => {
                setActiveSection(id as FeatureSectionId);
                const target = SECTION_TABS.find((t) => t.id === id);
                if (target) scrollTo(target.anchor);
              }}
            />
            <Link to="/" className="dx-btn-link ms-auto">← Back to the landing page</Link>
          </div>
        </div>

        <BotEngineSection c={c} bots={bots} onToggleBot={toggleBot} />
        <ScriptEngineSection c={c} />
        <SocialSection c={c} />
        <AutomationSection c={c} rules={rules} onToggleRule={toggleRule} />
        <FeaturesMarketsSection c={c} />
        <ComparisonSection c={c} />

        {/* ---------------- CTA (blueprint) ---------------- */}
        <section className="dx-section">
          <div className="container">
            <Reveal>
              <div className="dx-card dx-card-live dx-card-pad">
                <div className="row g-4 align-items-center">
                  <div className="col-12 col-lg-8">
                    <SectionHead
                      eyebrow="Start free"
                      title="Put your first bot on autopilot today"
                      lead="One live bot, one Deriv connection and full market access on the free tier — no card required. Upgrade only when the fleet outgrows it."
                    />
                    <div className="d-flex flex-wrap gap-2">
                      <Chip tone="up">No profit share, ever</Chip>
                      <Chip tone="muted">Cancel any time</Chip>
                      <Chip tone="info">VRTC demo first, CR when ready</Chip>
                    </div>
                  </div>
                  <div className="col-12 col-lg-4 d-grid gap-2">
                    <button type="button" className="dx-btn dx-btn-lg dx-btn-primary" onClick={() => c.openSignUp()}>
                      Get started free <ArrowRight size={16} />
                    </button>
                    <button type="button" className="dx-btn dx-btn-lg" onClick={c.openOAuth}>Connect to Deriv</button>
                    <button type="button" className="dx-btn dx-btn-ghost" onClick={() => c.openPricing()}>Compare plans first</button>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <MarketingFooter
        onOpenLegal={(docId) => setLegalDocId(docId)}
        onOpenCommunity={(channelId) => c.openCommunity(channelId)}
        onOpenStatus={c.openStatus}
        onOpenPricing={() => c.openPricing()}
        onOpenFaq={() => c.openFaq()}
        onOpenApiDocs={c.openApiDocs}
        onOpenAbout={() => setAboutOpen(true)}
        onOpenChangelog={() => setChangelogOpen(true)}
        onOpenSitemap={() => setSitemapOpen(true)}
        onOpenContact={(topic) => { setContactTopic(topic); setContactOpen(true); }}
        onSubscribe={(email) => {
          setSubscribed(true);
          toast.push({ tone: "success", title: "Digest subscription confirmed", body: `${email} will receive the monthly platform digest. One email a month, unsubscribe any link.` });
        }}
        onOpenPresets={() => c.openPresets()}
        onOpenBacktests={() => c.openBacktests()}
      />

      {/* ================= H-2 overlays ================= */}
      <BotConfigWizard
        key={botWizard ? `botwiz-${botWizard.presetId ?? "blank"}-${botWizard.step}` : "botwiz-closed"}
        open={Boolean(botWizard)}
        onClose={() => setBotWizard(null)}
        initialPresetId={botWizard?.presetId}
        initialStep={botWizard?.step ?? 0}
        onOpenPresets={() => { setBotWizard(null); c.openPresets(); }}
        onOpenBacktests={(preset) => { setBotWizard(null); c.openBacktests(preset); }}
        onDeployed={(name, symbol) => {
          setQueuedBots((list) => [
            ...list,
            { id: `bot_feat_${list.length + 1}`, name, symbol, stake: 1, cap: 50, strategy: "martingale", contractType: "rise_fall", duration: 5, durationUnit: "ticks", risk: "medium", winRate: 62.4 },
          ]);
          setBotWizard(null);
          setDemoTab("bots");
          setDemoOpen(true);
        }}
      />

      <BotDetailDrawer
        bot={botDetail}
        onClose={() => setBotDetail(null)}
        onBacktest={(preset) => { setBotDetail(null); c.openBacktests(preset); }}
        onClone={(bot) => { setBotDetail(null); c.openBotWizard(bot.id); }}
        onToggleStatus={toggleBot}
      />

      <ScriptStudioDialog
        key={studio ? `studio-${studio.script?.id ?? studio.template?.id ?? "none"}` : "studio-closed"}
        open={Boolean(studio)}
        onClose={() => setStudio(null)}
        script={studio?.script ?? null}
        template={studio?.template ?? null}
        onOpenBacktests={() => { setStudio(null); c.openBacktests(studio?.script?.id); }}
        onOpenConsole={() => { setStudio(null); c.openDemo("bots"); }}
      />

      <ScriptTemplateDrawer
        template={templateDetail}
        onClose={() => setTemplateDetail(null)}
        onOpenStudio={(t) => { setTemplateDetail(null); c.openScriptStudio(undefined, t); }}
        onBacktestTemplate={() => { setTemplateDetail(null); c.openBacktests(); }}
      />

      <AutomationRuleWizard
        key={ruleWizard ? `rulewiz-${ruleWizard.kind}-${ruleWizard.editing?.id ?? "new"}` : "rulewiz-closed"}
        open={Boolean(ruleWizard)}
        onClose={() => setRuleWizard(null)}
        initialKind={ruleWizard?.kind ?? "schedule"}
        editing={ruleWizard?.editing ?? null}
        onSaved={(rule) => {
          setRules((list) => {
            const exists = list.some((r) => r.id === rule.id);
            return exists ? list.map((r) => (r.id === rule.id ? rule : r)) : [rule, ...list];
          });
          setLastRule(rule.name);
          setRuleWizard(null);
          scrollTo("#features-automation");
        }}
      />

      <AutomationDrawer
        rule={ruleDetail}
        onClose={() => setRuleDetail(null)}
        onEdit={(rule) => { setRuleDetail(null); c.openRuleWizard(rule.kind, rule); }}
        onToggle={toggleRule}
        onDelete={(rule) => setRules((list) => list.filter((r) => r.id !== rule.id))}
      />

      <RiskPolicyDialog open={riskOpen} onClose={() => setRiskOpen(false)} onOpenAlertRules={() => { setRiskOpen(false); setAlertsOpen(true); }} />
      <AlertRulesDialog open={alertsOpen} onClose={() => setAlertsOpen(false)} onNewRule={() => { setAlertsOpen(false); c.openRuleWizard("notification"); }} />

      <ContractDetailDialog
        contractId={contractId}
        onClose={() => setContractId(null)}
        onTrade={() => { setContractId(null); c.openDemo("trade"); }}
        onOpenInstrument={(code) => { setContractId(null); c.openInstrument(code); }}
      />

      <ComparisonDetailDialog
        row={comparisonRow}
        onClose={() => setComparisonRow(null)}
        onOpenPricing={() => { setComparisonRow(null); c.openPricing(); }}
        onOpenOAuth={() => { setComparisonRow(null); c.openOAuth(); }}
      />

      {/* ================= reused H-1 overlays ================= */}
      <OAuthWizard
        open={oauthOpen}
        onClose={() => setOauthOpen(false)}
        onConnected={(loginId) => {
          setConnections((list) => (list.includes(loginId) ? list : [...list, loginId]));
          setActiveLoginId(loginId);
          toast.push({ tone: "success", title: `Deriv connection established — ${loginId}`, body: "Token stored encrypted, tick and portfolio subscriptions live on the eu-west relay." });
        }}
        onOpenStatus={() => { setOauthOpen(false); setStatusOpen(true); }}
        onOpenSignUp={() => { setOauthOpen(false); setSignUpOpen(true); }}
        onOpenDemo={() => { setOauthOpen(false); c.openDemo("trade"); }}
      />

      <SignupWizard
        open={signUpOpen}
        onClose={() => setSignUpOpen(false)}
        onOpenOAuth={() => { setSignUpOpen(false); setOauthOpen(true); }}
        onOpenDemo={() => { setSignUpOpen(false); c.openDemo("trade"); }}
        onOpenPresets={() => { setSignUpOpen(false); c.openPresets(); }}
        onCompleted={(loginId) => {
          setOnboarded(loginId);
          setConnections((list) => (list.includes(loginId) ? list : [...list, loginId]));
          setActiveLoginId(loginId);
          setSignUpOpen(false);
          setDemoTab("trade");
          setDemoOpen(true);
        }}
      />

      <TourDialog
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        onOpenDemo={(tab) => { setTourOpen(false); c.openDemo(tab); }}
        onOpenSignUp={() => { setTourOpen(false); setSignUpOpen(true); }}
      />

      <DemoConsoleDialog
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        initialTab={demoTab}
        queuedBots={queuedBots}
        onContractBought={(receipt) => {
          setLastOrder(`#${receipt.contractId} ${receipt.symbol} ${usd(receipt.stake)}`);
          toast.push({ tone: "success", title: `Contract ${receipt.contractId} bought`, body: `${receipt.symbol} · stake ${usd(receipt.stake)} → payout ${usd(receipt.payout)}. Track it in the portfolio tab.` });
        }}
        onOpenPresets={() => c.openPresets()}
        onOpenBacktests={(preset) => c.openBacktests(preset)}
        onOpenLeaderboard={() => setLeaderboardOpen(true)}
        onOpenStatus={() => setStatusOpen(true)}
        onOpenCommunity={(channelId) => c.openCommunity(channelId)}
      />

      <PricingDialog
        open={pricingOpen}
        onClose={() => setPricingOpen(false)}
        initialPlanId={pricingPlanId}
        onOpenFaq={() => { setPricingOpen(false); c.openFaq("billing"); }}
        onDeployed={(planName) => setActivePlan(planName)}
      />

      <PresetsDialog
        open={presetsOpen}
        onClose={() => setPresetsOpen(false)}
        initialPresetId={presetId}
        onDeploy={(p) => { setPresetsOpen(false); setDeployPreset(p); }}
        onBacktest={(id) => { setPresetsOpen(false); c.openBacktests(id); }}
        onOpenFeature={() => { setPresetsOpen(false); scrollTo("#features-bot"); }}
      />

      <DeployBotWizard
        open={Boolean(deployPreset)}
        onClose={() => setDeployPreset(null)}
        preset={deployPreset}
        onDeployed={(name, stake, cap) => {
          const preset = deployPreset;
          setLastOrder(`${name} @ ${usd(stake)} (cap ${usd(cap)})`);
          if (preset) {
            setQueuedBots((list) => [
              ...list,
              { id: `bot_feat_${list.length + 1}`, name, symbol: preset.symbol, stake, cap, strategy: preset.kind, contractType: preset.contractType, duration: preset.duration, durationUnit: preset.durationUnit, risk: preset.risk, winRate: preset.winRate },
            ]);
          }
          setDeployPreset(null);
          setDemoTab("bots");
          setDemoOpen(true);
        }}
      />

      <BacktestDialog
        open={backtestOpen}
        onClose={() => setBacktestOpen(false)}
        initialPresetId={backtestPreset}
        onDeploy={(p) => { setBacktestOpen(false); setDeployPreset(p); }}
      />

      <LeaderboardDialog
        open={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        onOpenTrader={(id) => setTrader(TRADERS.find((t) => t.id === id) ?? null)}
        onCopy={(t) => setTrader(t)}
        onOpenCommunity={() => { setLeaderboardOpen(false); c.openCommunity("com_general"); }}
        onOpenBacktests={() => { setLeaderboardOpen(false); c.openBacktests(); }}
      />

      <TraderDrawer
        trader={trader}
        onClose={() => setTrader(null)}
        onCopy={(t) => { setTrader(null); setCopyTrader(t); }}
        onOpenLeaderboard={() => { setTrader(null); setLeaderboardOpen(true); }}
        onOpenCommunity={() => c.openCommunity("com_general")}
        copied={Boolean(trader && copied?.id === trader.id)}
      />

      <CopySetupWizard
        open={Boolean(copyTrader)}
        onClose={() => setCopyTrader(null)}
        trader={copyTrader}
        onCopied={(traderId, ratio, cap) => {
          setCopied({ id: traderId, ratio, cap });
          const t = TRADERS.find((x) => x.id === traderId);
          toast.push({ tone: "success", title: `Now copying ${t?.displayName ?? "trader"}`, body: `Stake ratio ${ratio}x · loss cap ${usd(cap, 0)} · kill switch armed. Mirrored legs appear in the console portfolio.` });
        }}
      />

      <InstrumentDrawer
        code={instrumentCode}
        onClose={() => setInstrumentCode(null)}
        onTrade={() => { setInstrumentCode(null); c.openDemo("trade"); }}
        onBacktest={() => { setInstrumentCode(null); c.openBacktests(); }}
        onOpenMarkets={() => { setInstrumentCode(null); scrollTo("#features-markets"); }}
      />

      <StatusDrawer
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        onOpenDocs={() => { setStatusOpen(false); setDocsOpen(true); }}
        onOpenConnections={() => { setStatusOpen(false); setAccountsOpen(true); }}
      />

      <AccountSwitcherDialog
        open={accountsOpen}
        onClose={() => setAccountsOpen(false)}
        activeLoginId={activeLoginId}
        onSetActive={(loginId) => setActiveLoginId(loginId)}
        onOpenOAuth={() => { setAccountsOpen(false); setOauthOpen(true); }}
        onDisconnected={(loginId) => {
          setConnections((list) => list.filter((id) => id !== loginId));
          if (activeLoginId === loginId) {
            const next = connections.find((id) => id !== loginId);
            if (next) setActiveLoginId(next);
          }
        }}
        onOpenStatus={() => { setAccountsOpen(false); setStatusOpen(true); }}
      />

      <LegalDialog doc={legalDoc} onClose={() => setLegalDocId(null)} onContact={(topic) => { setLegalDocId(null); setContactTopic(topic); setContactOpen(true); }} />
      <FaqDialog open={faqOpen} onClose={() => setFaqOpen(false)} initialCategory={faqCategory}
        onContact={(topic) => { setFaqOpen(false); setContactTopic(topic); setContactOpen(true); }}
        onOpenDocs={() => { setFaqOpen(false); setDocsOpen(true); }}
        onOpenPricing={(planId) => { setFaqOpen(false); c.openPricing(planId); }} />
      <ApiDocsDialog open={docsOpen} onClose={() => setDocsOpen(false)}
        onOpenStatus={() => { setDocsOpen(false); setStatusOpen(true); }}
        onOpenDemo={() => { setDocsOpen(false); c.openDemo("trade"); }} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} onContact={(topic) => { setAboutOpen(false); setContactTopic(topic); setContactOpen(true); }} />
      <ChangelogDialog open={changelogOpen} onClose={() => setChangelogOpen(false)} onOpenCommunity={() => { setChangelogOpen(false); c.openCommunity("com_help"); }} />
      <SitemapDialog open={sitemapOpen} onClose={() => setSitemapOpen(false)} />
      <CommunityDialog open={communityOpen} onClose={() => setCommunityOpen(false)} initialChannel={communityChannel}
        onContact={(topic) => { setCommunityOpen(false); setContactTopic(topic); setContactOpen(true); }}
        onLeaderboard={() => { setCommunityOpen(false); setLeaderboardOpen(true); }} />
      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} topic={contactTopic}
        onOpenCommunity={() => { setContactOpen(false); c.openCommunity("com_help"); }} />
    </div>
  );
}
