// =============================================================================
// MarketingFooter.tsx — H-group footer. Every link resolves to a REAL route or
// opens real in-page content via the callbacks below (no dead links).
// =============================================================================
import { useState } from "react";
import { Activity, AtSign, BookOpen, Code2, Mail, MessageCircle, PlayCircle, Send, ShieldCheck } from "lucide-react";
import { MARKETING_NAV } from "./MarketingNav";

export interface FooterActions {
  onOpenLegal: (docId: string) => void;
  onOpenCommunity: (channelId?: string) => void;
  onOpenStatus: () => void;
  onOpenPricing: () => void;
  onOpenFaq: () => void;
  onOpenApiDocs: () => void;
  onOpenAbout: () => void;
  onOpenChangelog: () => void;
  onOpenSitemap: () => void;
  onSubscribe: (email: string) => void;
  onOpenPresets: () => void;
  onOpenBacktests: () => void;
}

export function MarketingFooter(actions: FooterActions) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [region, setRegion] = useState("en-GB");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
      setError("Enter a valid email — we send one digest a month, no marketing blasts.");
      return;
    }
    setError("");
    actions.onSubscribe(email);
    setEmail("");
  };

  return (
    <footer className="dx-footer">
      <div className="container">
        <div className="row g-4">
          <div className="col-12 col-lg-4">
            <div className="dx-brand mb-3">
              <span className="dx-brand-mark">DX</span>
              <span>
                Deriv<span className="dx-up">X</span>
              </span>
            </div>
            <p className="dx-help mb-3" style={{ maxWidth: 340 }}>
              Automation, scripting and social trading on top of Deriv's public WebSocket API. Front-end build running on mock
              data — every number on this page is simulated.
            </p>
            <form onSubmit={submit} className="d-grid gap-2" style={{ maxWidth: 360 }} noValidate>
              <label className="dx-label" htmlFor="footer-email">
                Monthly performance digest
              </label>
              <div className="dx-input-group">
                <input
                  id="footer-email"
                  className={`dx-input ${error ? "is-invalid" : ""}`}
                  type="email"
                  placeholder="trader@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(error)}
                />
                <button type="submit" className="dx-btn dx-btn-primary" style={{ borderRadius: "0 8px 8px 0" }}>
                  <Mail size={14} /> Subscribe
                </button>
              </div>
              {error ? <span className="dx-error">{error}</span> : <span className="dx-help">Platform stats, new presets, zero spam.</span>}
            </form>
          </div>

          <div className="col-6 col-lg-2">
            <div className="dx-footer-head">Product</div>
            {MARKETING_NAV.filter((i) => i.ready && i.to).map((i) => (
              <a key={i.id} className="dx-footer-link" href={i.to}>
                {i.label}
              </a>
            ))}
            <button type="button" className="dx-footer-link" onClick={actions.onOpenPricing}>
              Pricing &amp; plans
            </button>
            <button type="button" className="dx-footer-link" onClick={actions.onOpenPresets}>
              Strategy presets
            </button>
            <button type="button" className="dx-footer-link" onClick={actions.onOpenBacktests}>
              Backtest runner
            </button>
          </div>

          <div className="col-6 col-lg-2">
            <div className="dx-footer-head">Platform</div>
            <button type="button" className="dx-footer-link" onClick={actions.onOpenStatus}>
              API status
            </button>
            <button type="button" className="dx-footer-link" onClick={actions.onOpenApiDocs}>
              API reference
            </button>
            <button type="button" className="dx-footer-link" onClick={actions.onOpenFaq}>
              Help &amp; FAQ
            </button>
            <button type="button" className="dx-footer-link" onClick={() => actions.onOpenCommunity()}>
              Community
            </button>
            <button type="button" className="dx-footer-link" onClick={actions.onOpenChangelog}>
              Changelog
            </button>
            <button type="button" className="dx-footer-link" onClick={actions.onOpenSitemap}>
              Sitemap (39 pages)
            </button>
          </div>

          <div className="col-6 col-lg-2">
            <div className="dx-footer-head">Company</div>
            <button type="button" className="dx-footer-link" onClick={actions.onOpenAbout}>
              About DerivX
            </button>
            <button type="button" className="dx-footer-link" onClick={() => actions.onOpenCommunity("com_help")}>
              Support desk
            </button>
            <button type="button" className="dx-footer-link" onClick={() => actions.onOpenCommunity("com_investors")}>
              Investor module
            </button>
            <button type="button" className="dx-footer-link" onClick={actions.onOpenChangelog}>
              Release notes
            </button>
          </div>

          <div className="col-6 col-lg-2">
            <div className="dx-footer-head">Legal</div>
            <button type="button" className="dx-footer-link" onClick={() => actions.onOpenLegal("terms")}>
              Terms of Service
            </button>
            <button type="button" className="dx-footer-link" onClick={() => actions.onOpenLegal("privacy")}>
              Privacy Policy
            </button>
            <button type="button" className="dx-footer-link" onClick={() => actions.onOpenLegal("risk")}>
              Risk Disclosure
            </button>
            <button type="button" className="dx-footer-link" onClick={() => actions.onOpenLegal("cookies")}>
              Cookie &amp; Storage
            </button>
          </div>
        </div>

        <hr className="dx-hr" />

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-2">
            <span className="dx-footer-head mb-0">Follow</span>
            <button type="button" className="dx-footer-social" onClick={() => actions.onOpenCommunity("com_general")} aria-label="X / Twitter channel">
              <AtSign size={15} />
            </button>
            <button type="button" className="dx-footer-social" onClick={() => actions.onOpenCommunity("com_bots")} aria-label="Telegram channel">
              <Send size={15} />
            </button>
            <button type="button" className="dx-footer-social" onClick={() => actions.onOpenCommunity("com_scripts")} aria-label="Discord channel">
              <MessageCircle size={15} />
            </button>
            <button type="button" className="dx-footer-social" onClick={() => actions.onOpenCommunity("com_help")} aria-label="Video walkthroughs">
              <PlayCircle size={15} />
            </button>
            <button type="button" className="dx-footer-social" onClick={actions.onOpenApiDocs} aria-label="Developer docs">
              <Code2 size={15} />
            </button>
          </div>

          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div className="d-inline-flex align-items-center gap-2">
              <BookOpen size={14} className="dx-muted" />
              <select
                className="dx-select dx-input-num"
                style={{ width: 132, minHeight: 34 }}
                value={region}
                aria-label="Region and language"
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="en-GB">EN · United Kingdom</option>
                <option value="en-NG">EN · Nigeria</option>
                <option value="en-KE">EN · Kenya</option>
                <option value="id-ID">ID · Indonesia</option>
                <option value="es-CO">ES · Colombia</option>
              </select>
            </div>
            <span className="dx-chip dx-chip-warn">
              <ShieldCheck size={12} /> Demo data
            </span>
            <span className="dx-chip dx-chip-muted">
              <Activity size={12} /> ws relay 12 ms
            </span>
          </div>
        </div>

        <hr className="dx-hr" />

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <span className="dx-chip dx-chip-muted">
            <ShieldCheck size={12} /> Not affiliated with Deriv
          </span>
          <p className="dx-help mb-0">
            © 2026 DerivX Labs. Not affiliated with, endorsed by or operated by Deriv. Deriv is a trademark of Deriv Group
            Services Ltd. Trading digital options carries risk — do not trade money you cannot afford to lose.
          </p>
          <span className="dx-help font-display">build 2026.10.13 · front-end mock</span>
        </div>
      </div>
    </footer>
  );
}
