// =============================================================================
// LandingPage.tsx — H-1 orchestrator. Owns every overlay's state, exposes the
// LandingController to sections/modals, and renders the marketing shell.
// Route files (routes/index.tsx and routes/home.tsx) only mount this component.
// =============================================================================
import { useCallback, useMemo, useState } from "react";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingMobileMenu, MarketingNav } from "./MarketingNav";
import { HeroSection } from "./sections/HeroSection";
import { TrustBar } from "./sections/TrustBar";
import { FeatureCards } from "./sections/FeatureCards";
import { LivePreviewSection } from "./sections/LivePreviewSection";
import { MarketsSection } from "./sections/MarketsSection";
import { HOW_STEPS, HowItWorksSection } from "./sections/HowItWorksSection";
import { SocialProofSection } from "./sections/SocialProofSection";
import { CtaSection } from "./sections/CtaSection";
import { useToast } from "../ui/primitives";
import { useNavigate } from "@tanstack/react-router";
import {
  OAuthWizard,
  SignupWizard,
  AccountSwitcherDialog,
} from "./modals/AccountModals";
import { DemoConsoleDialog, TourDialog } from "./modals/DemoModals";
import {
  AboutDialog,
  ApiDocsDialog,
  ChangelogDialog,
  CommunityDialog,
  ContactDialog,
  FaqDialog,
  FeatureDetailDialog,
  LegalDialog,
  SitemapDialog,
  StepDetailDialog,
  TestimonialDrawer,
} from "./modals/ContentDialogs";
import { BacktestDialog, DeployBotWizard, PresetsDialog, PricingDialog } from "./modals/CommerceDialogs";
import { InstrumentDrawer, LeaderboardDialog, StatusDrawer, TraderDrawer } from "./modals/SocialModals";
import { DERIV_ACCOUNTS, LEGAL_DOCS, TESTIMONIALS, TRADERS, type StrategyPreset, type Trader } from "../../data/trading";
import { usd } from "../../data/market";
import type { DemoTab, FeatureId, LandingController, LeaderboardTab, QueuedBot } from "./types";

export function LandingPage() {
  const toast = useToast();
  const navigate = useNavigate();

  // ---- overlay state (single owner) ---------------------------------------
  const [oauthOpen, setOauthOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourSlide, setTourSlide] = useState<string | undefined>(undefined);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoTab, setDemoTab] = useState<DemoTab>("trade");
  const [feature, setFeature] = useState<FeatureId | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepOpen, setStepOpen] = useState(false);
  const [testimonialId, setTestimonialId] = useState<string | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<LeaderboardTab>("month");
  const [traderId, setTraderId] = useState<string | null>(null);
  const [instrumentCode, setInstrumentCode] = useState<string | null>(null);
  const [legalDocId, setLegalDocId] = useState<string | null>(null);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [communityChannel, setCommunityChannel] = useState<string | undefined>(undefined);
  const [statusOpen, setStatusOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [pricingPlanId, setPricingPlanId] = useState<string | undefined>(undefined);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [presetId, setPresetId] = useState<string | undefined>(undefined);
  const [backtestOpen, setBacktestOpen] = useState(false);
  const [backtestPreset, setBacktestPreset] = useState<string | undefined>(undefined);
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqCategory, setFaqCategory] = useState<string | undefined>(undefined);
  const [docsOpen, setDocsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [sitemapOpen, setSitemapOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactTopic, setContactTopic] = useState<string | undefined>(undefined);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [deployPreset, setDeployPreset] = useState<StrategyPreset | null>(null);

  // ---- page-visible state (proves every control does something) -----------
  const [activeLoginId, setActiveLoginId] = useState(DERIV_ACCOUNTS[1].loginId);
  const [connections, setConnections] = useState<string[]>(
    DERIV_ACCOUNTS.filter((a) => a.connected).map((a) => a.loginId),
  );
  const [onboarded, setOnboarded] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [copiedTrader, setCopiedTrader] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [queuedBots, setQueuedBots] = useState<QueuedBot[]>([]);

  const legalDoc = useMemo(() => LEGAL_DOCS.find((d) => d.id === legalDocId) ?? null, [legalDocId]);
  const trader: Trader | null = useMemo(() => TRADERS.find((t) => t.id === traderId) ?? null, [traderId]);

  // ---- controller --------------------------------------------------------
  const c: LandingController = useMemo(
    () => ({
      openOAuth: () => setOauthOpen(true),
      openSignUp: () => {
        void navigate({ to: "/auth/signup" });
      },
      openTour: (slideId) => {
        setTourSlide(slideId);
        setTourOpen(true);
      },
      openDemo: (tab) => {
        setDemoTab(tab ?? "trade");
        setDemoOpen(true);
      },
      openFeature: (id) => {
        setFeature(id);
      },
      openStep: (index) => {
        setStepIndex(index);
        setStepOpen(true);
      },
      openTestimonial: (id) => setTestimonialId(id),
      openLeaderboard: (tab) => {
        setLeaderboardTab(tab ?? "month");
        setLeaderboardOpen(true);
      },
      openTrader: (id) => setTraderId(id),
      openInstrument: (code) => setInstrumentCode(code),
      openLegal: (docId) => setLegalDocId(docId),
      openCommunity: (channelId) => {
        setCommunityChannel(channelId);
        setCommunityOpen(true);
      },
      openStatus: () => setStatusOpen(true),
      openPricing: (planId) => {
        setPricingPlanId(planId);
        setPricingOpen(true);
      },
      openPresets: (preset) => {
        setPresetId(preset);
        setPresetsOpen(true);
      },
      openBacktests: (preset) => {
        setBacktestPreset(preset);
        setBacktestOpen(true);
      },
      openFaq: (category) => {
        setFaqCategory(category);
        setFaqOpen(true);
      },
      openApiDocs: () => setDocsOpen(true),
      openAbout: () => setAboutOpen(true),
      openChangelog: () => setChangelogOpen(true),
      openSitemap: () => setSitemapOpen(true),
      openContact: (topic) => {
        setContactTopic(topic);
        setContactOpen(true);
      },
      openAccountSwitcher: () => setAccountsOpen(true),
      subscribe: (email) => {
        setSubscribed(true);
        toast.push({
          tone: "success",
          title: "Digest subscription confirmed",
          body: `${email} will receive the monthly platform digest. One email a month, unsubscribe any link.`,
        });
      },
      scrollTo: (anchor) => {
        document.querySelector(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
    }),
    [toast, navigate],
  );

  const runStepAction = useCallback(
    (index: number) => {
      const action = HOW_STEPS[index]?.cta.action;
      setStepOpen(false);
      if (action === "oauth") c.openOAuth();
      else if (action === "presets") c.openPresets();
      else if (action === "signup") c.openSignUp();
      else c.openDemo("trade");
    },
    [c],
  );

  return (
    <div className="page-home">
      <a className="dx-skip-link" href="#live-preview">
        Skip to the live console
      </a>

      <MarketingNav
        onGetStarted={() => setOauthOpen(true)}
        onOpenCommunity={() => setCommunityOpen(true)}
        onOpenPricing={() => setPricingOpen(true)}
        onOpenMobile={() => setMobileNav((v) => !v)}
      />
      <MarketingMobileMenu
        open={mobileNav}
        onClose={() => setMobileNav(false)}
        onGetStarted={() => setOauthOpen(true)}
        onOpenCommunity={() => setCommunityOpen(true)}
        onOpenPricing={() => setPricingOpen(true)}
      />

      <div className="dx-section-band dx-section-tight">
        <div className="container d-flex flex-wrap align-items-center gap-2">
          <span className="dx-chip dx-chip-accent">
            <span className="dx-pulse" /> {connections.length} connections
          </span>
          <span className="dx-chip dx-chip-muted font-display">active {activeLoginId}</span>
          {onboarded ? <span className="dx-chip dx-chip-up font-display">onboarded {onboarded}</span> : null}
          {lastOrder ? <span className="dx-chip dx-chip-up font-display">last order {lastOrder}</span> : null}
          {copiedTrader ? (
            <span className="dx-chip dx-chip-accent">
              copying {TRADERS.find((t) => t.id === copiedTrader)?.displayName ?? copiedTrader}
            </span>
          ) : null}
          {activePlan ? <span className="dx-chip dx-chip-accent">{activePlan} tier</span> : null}
          {queuedBots.length ? (
            <button type="button" className="dx-chip dx-chip-up" onClick={() => c.openDemo("bots")}>
              {queuedBots.length} bot{queuedBots.length > 1 ? "s" : ""} queued — open fleet
            </button>
          ) : null}
          {subscribed ? <span className="dx-chip dx-chip-info">digest on</span> : null}
          <button type="button" className="dx-btn-link ms-auto" onClick={() => setAccountsOpen(true)}>
            manage connections →
          </button>
        </div>
      </div>

      <main id="main">
        <HeroSection c={c} />
        <TrustBar c={c} />
        <FeatureCards c={c} />
        <LivePreviewSection c={c} />
        <MarketsSection c={c} />
        <HowItWorksSection c={c} />
        <SocialProofSection c={c} />
        <CtaSection c={c} />
      </main>

      <MarketingFooter
        onOpenLegal={(docId) => setLegalDocId(docId)}
        onOpenCommunity={(channelId) => {
          setCommunityChannel(channelId);
          setCommunityOpen(true);
        }}
        onOpenStatus={() => setStatusOpen(true)}
        onOpenPricing={() => setPricingOpen(true)}
        onOpenFaq={() => setFaqOpen(true)}
        onOpenApiDocs={() => setDocsOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
        onOpenChangelog={() => setChangelogOpen(true)}
        onOpenSitemap={() => setSitemapOpen(true)}
        onOpenContact={(topic) => {
          setContactTopic(topic);
          setContactOpen(true);
        }}
        onSubscribe={c.subscribe}
        onOpenPresets={() => setPresetsOpen(true)}
        onOpenBacktests={() => setBacktestOpen(true)}
      />

      {/* ---------------- overlays ---------------- */}
      <OAuthWizard
        open={oauthOpen}
        onClose={() => setOauthOpen(false)}
        onConnected={(loginId) => {
          setConnections((list) => (list.includes(loginId) ? list : [...list, loginId]));
          setActiveLoginId(loginId);
          toast.push({
            tone: "success",
            title: `Deriv connection established — ${loginId}`,
            body: "Token stored encrypted, tick and portfolio subscriptions live on the eu-west relay.",
          });
        }}
        onOpenStatus={() => {
          setOauthOpen(false);
          setStatusOpen(true);
        }}
        onOpenSignUp={() => {
          setOauthOpen(false);
          setSignUpOpen(true);
        }}
        onOpenDemo={() => {
          setOauthOpen(false);
          c.openDemo("trade");
        }}
      />

      <SignupWizard
        open={signUpOpen}
        onClose={() => setSignUpOpen(false)}
        onOpenOAuth={() => {
          setSignUpOpen(false);
          setOauthOpen(true);
        }}
        onOpenDemo={() => {
          setSignUpOpen(false);
          c.openDemo("trade");
        }}
        onOpenPresets={() => {
          setSignUpOpen(false);
          setPresetsOpen(true);
        }}
        onCompleted={(loginId) => {
          setOnboarded(loginId);
          setConnections((list) => (list.includes(loginId) ? list : [...list, loginId]));
          setActiveLoginId(loginId);
          setSignUpOpen(false);
          setDemoOpen(true);
          setDemoTab("trade");
          toast.push({
            tone: "success",
            title: `Account ready — ${loginId}`,
            body: "Risk caps saved. Place your first contract in the console whenever you are ready.",
          });
        }}
      />

      <TourDialog
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        initialSlideId={tourSlide}
        onOpenDemo={(tab) => {
          setTourOpen(false);
          c.openDemo(tab);
        }}
        onOpenSignUp={() => {
          setTourOpen(false);
          setSignUpOpen(true);
        }}
      />

      <DemoConsoleDialog
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        initialTab={demoTab}
        queuedBots={queuedBots}
        onContractBought={(receipt) => {
          setLastOrder(`#${receipt.contractId} ${receipt.symbol} ${usd(receipt.stake)}`);
          toast.push({
            tone: "success",
            title: `Contract ${receipt.contractId} bought`,
            body: `${receipt.symbol} · stake ${usd(receipt.stake)} → payout ${usd(receipt.payout)}. Track it in the portfolio tab.`,
          });
        }}
        onOpenPresets={() => setPresetsOpen(true)}
        onOpenBacktests={(preset) => {
          setBacktestPreset(preset);
          setBacktestOpen(true);
        }}
        onOpenLeaderboard={() => setLeaderboardOpen(true)}
        onOpenStatus={() => setStatusOpen(true)}
        onOpenCommunity={(channelId) => {
          setCommunityChannel(channelId);
          setCommunityOpen(true);
        }}
      />

      <FeatureDetailDialog
        feature={feature}
        onClose={() => setFeature(null)}
        onPresets={() => {
          setFeature(null);
          setPresetsOpen(true);
        }}
        onDocs={() => {
          setFeature(null);
          setDocsOpen(true);
        }}
        onLeaderboard={() => {
          setFeature(null);
          setLeaderboardOpen(true);
        }}
        onDemo={() => {
          setFeature(null);
          c.openDemo("bots");
        }}
        onOpenStep={(index) => {
          setFeature(null);
          setStepIndex(index);
          setStepOpen(true);
        }}
      />

      <StepDetailDialog
        open={stepOpen}
        index={stepIndex}
        steps={HOW_STEPS}
        onClose={() => setStepOpen(false)}
        onPrev={() => setStepIndex((i) => Math.max(0, i - 1))}
        onNext={() => setStepIndex((i) => Math.min(HOW_STEPS.length - 1, i + 1))}
        onRunAction={runStepAction}
      />

      <TestimonialDrawer
        testimonialId={testimonialId}
        onClose={() => setTestimonialId(null)}
        onOpenTrader={(id) => {
          setTestimonialId(null);
          setTraderId(id);
        }}
        onOpenCommunity={(channelId) => {
          setCommunityChannel(channelId);
          setCommunityOpen(true);
        }}
        onOpenPricing={() => {
          setTestimonialId(null);
          setPricingOpen(true);
        }}
      />

      <LeaderboardDialog
        open={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        initialTab={leaderboardTab}
        onOpenTrader={(id) => setTraderId(id)}
        onCopy={(t) => {
          setTraderId(t.id);
        }}
        onOpenCommunity={() => {
          setCommunityChannel("com_general");
          setCommunityOpen(true);
        }}
        onOpenBacktests={() => {
          setLeaderboardOpen(false);
          setBacktestOpen(true);
        }}
      />

      <TraderDrawer
        trader={trader}
        onClose={() => setTraderId(null)}
        onCopy={() => {
          if (!trader) return;
          setCopiedTrader(trader.id);
          setTraderId(null);
        }}
        onOpenLeaderboard={() => {
          setTraderId(null);
          setLeaderboardOpen(true);
        }}
        onOpenCommunity={() => {
          setCommunityChannel("com_general");
          setCommunityOpen(true);
        }}
        copied={Boolean(trader && copiedTrader === trader.id)}
      />

      <InstrumentDrawer
        code={instrumentCode}
        onClose={() => setInstrumentCode(null)}
        onTrade={(code) => {
          setInstrumentCode(null);
          setDemoTab("trade");
          setDemoOpen(true);
          setLastOrder(`ticket ${code}`);
        }}
        onBacktest={() => {
          setInstrumentCode(null);
          setBacktestOpen(true);
        }}
        onOpenMarkets={() => {
          setInstrumentCode(null);
          c.scrollTo("#markets");
        }}
      />

      <StatusDrawer
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        onOpenDocs={() => {
          setStatusOpen(false);
          setDocsOpen(true);
        }}
        onOpenConnections={() => {
          setStatusOpen(false);
          setAccountsOpen(true);
        }}
      />

      <PricingDialog
        open={pricingOpen}
        onClose={() => setPricingOpen(false)}
        initialPlanId={pricingPlanId}
        onOpenFaq={() => {
          setPricingOpen(false);
          setFaqCategory("billing");
          setFaqOpen(true);
        }}
        onDeployed={(planName) => {
          // No toast: the activated tier shows up as a chip in the status band
          // above the fold and inside the pricing dialog on the next open.
          setActivePlan(planName);
          setPricingOpen(false);
        }}
      />

      <PresetsDialog
        open={presetsOpen}
        onClose={() => setPresetsOpen(false)}
        initialPresetId={presetId}
        onDeploy={(p) => {
          setPresetsOpen(false);
          setDeployPreset(p);
        }}
        onBacktest={(id) => {
          setPresetsOpen(false);
          setBacktestPreset(id);
          setBacktestOpen(true);
        }}
        onOpenFeature={() => {
          setPresetsOpen(false);
          setFeature("bot-builder");
        }}
      />

      <DeployBotWizard
        open={Boolean(deployPreset)}
        onClose={() => setDeployPreset(null)}
        preset={deployPreset}
        onDeployed={(name, stake, cap) => {
          // No toast: the deployed worker is listed in the demo console's bot
          // fleet (queuedBots) and counted in the status band chip.
          const preset = deployPreset;
          setLastOrder(`${name} @ ${usd(stake)} (cap ${usd(cap)})`);
          if (preset) {
            setQueuedBots((list) => [
              ...list,
              {
                id: `bot_session_${list.length + 1}`,
                name,
                symbol: preset.symbol,
                stake,
                cap,
                strategy: preset.kind,
                contractType: preset.contractType,
                duration: preset.duration,
                durationUnit: preset.durationUnit,
                risk: preset.risk,
                winRate: preset.winRate,
              },
            ]);
          }
          setDeployPreset(null);
        }}
      />

      <BacktestDialog
        open={backtestOpen}
        onClose={() => setBacktestOpen(false)}
        initialPresetId={backtestPreset}
        onDeploy={(p) => {
          setBacktestOpen(false);
          setDeployPreset(p);
        }}
      />

      <LegalDialog
        doc={legalDoc}
        onClose={() => setLegalDocId(null)}
        onContact={(topic) => {
          setLegalDocId(null);
          setContactTopic(topic);
          setContactOpen(true);
        }}
      />

      <FaqDialog
        open={faqOpen}
        onClose={() => setFaqOpen(false)}
        initialCategory={faqCategory}
        onContact={(topic) => {
          setFaqOpen(false);
          setContactTopic(topic);
          setContactOpen(true);
        }}
        onOpenDocs={() => {
          setFaqOpen(false);
          setDocsOpen(true);
        }}
        onOpenPricing={(planId) => {
          setFaqOpen(false);
          setPricingPlanId(planId);
          setPricingOpen(true);
        }}
      />

      <ApiDocsDialog
        open={docsOpen}
        onClose={() => setDocsOpen(false)}
        onOpenStatus={() => {
          setDocsOpen(false);
          setStatusOpen(true);
        }}
        onOpenDemo={() => {
          setDocsOpen(false);
          c.openDemo("trade");
        }}
      />

      <AboutDialog
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        onContact={(topic) => {
          setAboutOpen(false);
          setContactTopic(topic);
          setContactOpen(true);
        }}
      />

      <ChangelogDialog
        open={changelogOpen}
        onClose={() => setChangelogOpen(false)}
        onOpenCommunity={() => {
          setChangelogOpen(false);
          setCommunityChannel("com_help");
          setCommunityOpen(true);
        }}
      />

      <SitemapDialog open={sitemapOpen} onClose={() => setSitemapOpen(false)} />

      <CommunityDialog
        open={communityOpen}
        onClose={() => setCommunityOpen(false)}
        initialChannel={communityChannel}
        onContact={(topic) => {
          setCommunityOpen(false);
          setContactTopic(topic);
          setContactOpen(true);
        }}
        onLeaderboard={() => {
          setCommunityOpen(false);
          setLeaderboardOpen(true);
        }}
      />

      <ContactDialog
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        topic={contactTopic}
        onOpenCommunity={() => {
          setContactOpen(false);
          setCommunityChannel("com_help");
          setCommunityOpen(true);
        }}
      />

      <AccountSwitcherDialog
        open={accountsOpen}
        onClose={() => setAccountsOpen(false)}
        activeLoginId={activeLoginId}
        onSetActive={(loginId) => setActiveLoginId(loginId)}
        onOpenOAuth={() => {
          setAccountsOpen(false);
          setOauthOpen(true);
        }}
        onDisconnected={(loginId) => {
          setConnections((list) => list.filter((id) => id !== loginId));
          if (activeLoginId === loginId) {
            const next = connections.find((id) => id !== loginId);
            if (next) setActiveLoginId(next);
          }
        }}
        onOpenStatus={() => {
          setAccountsOpen(false);
          setStatusOpen(true);
        }}
      />

      <span className="d-none">{TESTIMONIALS.length} reviews indexed</span>
    </div>
  );
}
