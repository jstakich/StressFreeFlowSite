const html = htm.bind(React.createElement);

const APP_STORE_URL = "https://apps.apple.com/us/app/id6757947997";

const iphoneScreens = [
  { src: "./assets/screens/iphone/01-deep-sea.gif", title: "iPhone Preview 1" },
  { src: "./assets/screens/iphone/02-preview.gif", title: "iPhone Preview 2" },
  { src: "./assets/screens/iphone/03-preview.gif", title: "iPhone Preview 3" },
  { src: "./assets/screens/iphone/04-preview.gif", title: "iPhone Preview 4" },
  { src: "./assets/screens/iphone/05-preview.gif", title: "iPhone Preview 5" },
  { src: "./assets/screens/iphone/06-country.gif", title: "iPhone Country Preview" },
];

const ipadScreens = [
  { src: "./assets/screens/ipad/01-deep-sea.gif", title: "iPad Preview 1" },
  { src: "./assets/screens/ipad/02-preview.gif", title: "iPad Preview 2" },
  { src: "./assets/screens/ipad/03-preview.gif", title: "iPad Preview 3" },
  { src: "./assets/screens/ipad/04-preview.gif", title: "iPad Preview 4" },
  { src: "./assets/screens/ipad/05-preview.gif", title: "iPad Preview 5" },
  { src: "./assets/screens/ipad/06-preview.gif", title: "iPad Preview 6" },
];

const trustItems = [
  { title: "One-time unlock", body: "$4.99 Pro unlock. No subscriptions. No ads." },
  { title: "Built for calm", body: "Designed for relaxation, focus, wind-down, sleep, and sensory-friendly comfort." },
  { title: "Privacy-first", body: "The App Store listing states that no data is collected from the app." },
  { title: "iPhone + iPad", body: "Native iOS app built for responsive, tactile interactions and background audio." },
];

const featureItems = [
  {
    icon: "BR",
    title: "Breath Reset",
    body:
      "Five guided breathing sessions for quick resets, slower calming, and more overwhelming moments when you need structure.",
  },
  {
    icon: "SR",
    title: "Stress Relief Buttons",
    body:
      "Interactive hold-based calming modes including Heartbeat, Deep Wave, and Rain Drops for tactile relaxation.",
  },
  {
    icon: "SM",
    title: "Relaxing Sound Machine",
    body:
      "Background sounds for focus, stress relief, and sleep, with Lock Screen playback and full AirPlay support.",
  },
  {
    icon: "IV",
    title: "Interactive Views",
    body:
      "Immersive visual environments with stress balls, goal-seeking motion, and sensory-friendly visual pacing.",
  },
  {
    icon: "FM",
    title: "Focus and sleep modes",
    body:
      "Experience modes help people quickly shift toward focus, meditation, relaxation, or bedtime without digging through menus.",
  },
  {
    icon: "AD",
    title: "ADHD and sensory-friendly",
    body:
      "Built to feel calm rather than overwhelming, and enjoyed by many users with ADHD, autism, anxiety, and sensory needs.",
  },
];

const seoCards = [
  {
    title: "For people searching stress relief apps",
    body:
      "This page is designed to clearly explain what Stress Free Flow does, who it helps, and why it is different from subscription-heavy wellness apps.",
  },
  {
    title: "For breathing and sleep searches",
    body:
      "Breath Reset, guided calming sessions, sleep sounds, and sensory-friendly interaction give the site strong alignment with breathing, sleep, and calm-focused search intent.",
  },
];

const faqItems = [
  {
    title: "Is Stress Free Flow free?",
    body:
      "The app is free to download. Pro is a one-time $4.99 unlock through Apple. No subscriptions.",
  },
  {
    title: "Does it work for sleep or focus?",
    body:
      "Yes. The app is built for calming, focus, winding down, sleep support, and sensory-friendly relaxation.",
  },
  {
    title: "Does it play in the background?",
    body:
      "Yes. The App Store listing describes relaxing sounds that continue on the Lock Screen and while using other apps.",
  },
  {
    title: "Who is it built for?",
    body:
      "People looking for a cleaner, more tactile calm app, including many users with ADHD, autism, anxiety, and sensory sensitivities.",
  },
];

function Header() {
  return html`
    <header className="topbar">
      <div className="site-shell topbar-inner">
        <a className="brand" href="#top">
          <img src="./assets/appicon.png" alt="Stress Free Flow app icon" />
          <div className="brand-copy">
            <p className="brand-title">Stress Free Flow</p>
            <p className="brand-subtitle">Tap. Breathe. Relax.</p>
          </div>
        </a>
        <nav className="topbar-links" aria-label="Primary">
          <a className="link-pill" href="#features">Features</a>
          <a className="link-pill" href="#why">Why it helps</a>
          <a className="link-pill" href="#faq">FAQ</a>
          <a className="button button-primary" href=${APP_STORE_URL} target="_blank" rel="noreferrer">
            Download on the App Store
          </a>
        </nav>
      </div>
    </header>
  `;
}

function Hero() {
  return html`
    <section className="hero" id="top">
      <div className="site-shell hero-grid">
        <div>
          <div className="eyebrow">Clean, calming, sensory-friendly</div>
          <h1>Find a calmer rhythm with <span>Breath Reset, relaxing sounds, and tactile stress relief.</span></h1>
          <p className="hero-copy">
            Stress Free Flow is a calming iPhone and iPad app for stress relief, guided breathing,
            focus, sensory-friendly interaction, and sleep. It blends Breath Reset, relaxing sound
            machine features, Stress Relief buttons, and immersive interactive views into one clean experience.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href=${APP_STORE_URL} target="_blank" rel="noreferrer">
              Get the App
            </a>
            <a className="button button-secondary" href="#features">See features</a>
          </div>
          <div className="hero-meta">
            <span className="meta-chip">Free download</span>
            <span className="meta-chip">$4.99 one-time Pro unlock</span>
            <span className="meta-chip">No subscriptions</span>
            <span className="meta-chip">No ads</span>
          </div>
        </div>

        <div className="hero-card preview-panel">
          <div className="preview-frame">
            <img
              src="./assets/iphone-preview.gif"
              alt="Stress Free Flow iPhone preview"
            />
          </div>
          <div className="preview-caption">
            <span>Interactive calm for stress, focus, and sleep</span>
            <span>Designed for iPhone and iPad</span>
          </div>
        </div>
      </div>
    </section>
  `;
}

function TrustSection() {
  return html`
    <section className="section" id="why">
      <div className="site-shell">
        <h2>A calmer alternative to subscription-heavy wellness apps</h2>
        <p className="section-lead">
          Stress Free Flow is positioned for people who want a simple calming app that feels tactile,
          responsive, and comfortable to use. The focus is not noise or clutter. The focus is relief.
        </p>
        <div className="trust-grid">
          ${trustItems.map(
            (item) => html`
              <article className="card" key=${item.title}>
                <strong>${item.title}</strong>
                <p>${item.body}</p>
              </article>
            `
          )}
        </div>
      </div>
    </section>
  `;
}

function FeaturesSection() {
  return html`
    <section className="section" id="features">
      <div className="site-shell">
        <h2>What makes Stress Free Flow different</h2>
        <p className="section-lead">
          Instead of offering just one thing, Stress Free Flow gives people several ways to calm down:
          guided breathing, soothing sounds, hold-based sensory interaction, and a responsive visual environment.
        </p>
        <div className="feature-grid">
          ${featureItems.map(
            (item) => html`
              <article className="card" key=${item.title}>
                <div className="feature-icon">${item.icon}</div>
                <h3>${item.title}</h3>
                <p>${item.body}</p>
              </article>
            `
          )}
        </div>
      </div>
    </section>
  `;
}

function SeoSection() {
  return html`
    <section className="section">
      <div className="site-shell">
        <h2>Built to answer what people are already searching for</h2>
        <p className="section-lead">
          This page is intentionally structured around real search intent like stress relief app,
          breathing app for anxiety, relaxing sound machine app, sleep sounds app, and sensory calming app.
        </p>
        <div className="seo-grid">
          ${seoCards.map(
            (item) => html`
              <article className="card" key=${item.title}>
                <h3>${item.title}</h3>
                <p>${item.body}</p>
              </article>
            `
          )}
        </div>
      </div>
    </section>
  `;
}

function ScreensSection() {
  return html`
    <section className="section" id="screens">
      <div className="site-shell">
        <h2>App Store preview screens</h2>
        <p className="section-lead">
          These are the current Apple Connect preview screens for iPhone and iPad, shown directly on the site
          so visitors can see the app experience before they tap through to the App Store.
        </p>

        <div className="screens-wrap">
          <div className="screen-block">
            <div className="screen-block-header">
              <h3>iPhone previews</h3>
              <span>${iphoneScreens.length} screens</span>
            </div>
            <div className="screens-grid">
              ${iphoneScreens.map(
                (screen) => html`
                  <figure className="screen-card" key=${screen.src}>
                    <img src=${screen.src} alt=${screen.title} loading="lazy" />
                  </figure>
                `
              )}
            </div>
          </div>

          <div className="screen-block">
            <div className="screen-block-header">
              <h3>iPad previews</h3>
              <span>${ipadScreens.length} screens</span>
            </div>
            <div className="screens-grid screens-grid-ipad">
              ${ipadScreens.map(
                (screen) => html`
                  <figure className="screen-card screen-card-ipad" key=${screen.src}>
                    <img src=${screen.src} alt=${screen.title} loading="lazy" />
                  </figure>
                `
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function CtaSection() {
  return html`
    <section className="section">
      <div className="site-shell">
        <div className="card cta-panel">
          <div className="cta-grid">
            <div>
              <h2>Download Stress Free Flow and discover your calm</h2>
              <p className="section-lead">
                If you want a calming app for stress relief, guided breathing, sleep support,
                focus, or sensory-friendly interaction, Stress Free Flow is ready on the App Store now.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href=${APP_STORE_URL} target="_blank" rel="noreferrer">
                  Open App Store
                </a>
              </div>
              <span className="price-line">Free download • $4.99 one-time Pro unlock • No subscriptions</span>
            </div>
            <div className="qr-wrap">
              <div className="qr-card">
                <img src="./assets/appstore-qr.png" alt="Scan QR code to open the Stress Free Flow App Store listing" />
                <strong>Scan to download</strong>
                <p>Fast App Store access for phone visitors, print pieces, and social traffic.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function FaqSection() {
  return html`
    <section className="section" id="faq">
      <div className="site-shell">
        <h2>Frequently asked questions</h2>
        <div className="faq-grid">
          ${faqItems.map(
            (item) => html`
              <article className="card" key=${item.title}>
                <h3>${item.title}</h3>
                <p>${item.body}</p>
              </article>
            `
          )}
        </div>
      </div>
    </section>
  `;
}

function Footer() {
  return html`
    <footer className="footer">
      <div className="site-shell footer-box">
        <div>
          <strong>Stress Free Flow</strong>
          <div>Tap. Breathe. Relax.</div>
        </div>
        <div>
          A calming app for stress relief, guided breathing, focus, sleep, and sensory-friendly interaction.
        </div>
      </div>
    </footer>
  `;
}

function App() {
  return html`
    <${React.Fragment}>
      <${Header} />
      <main>
        <${Hero} />
        <${TrustSection} />
        <${FeaturesSection} />
        <${SeoSection} />
        <${ScreensSection} />
        <${CtaSection} />
        <${FaqSection} />
      </main>
      <${Footer} />
    </${React.Fragment}>
  `;
}

const rootEl = document.getElementById("root");

try {
  if (rootEl && ReactDOM.createRoot) {
    ReactDOM.createRoot(rootEl).render(html`<${App} />`);
  } else if (rootEl && ReactDOM.render) {
    ReactDOM.render(html`<${App} />`, rootEl);
  }
} catch (error) {
  console.error("Stress Free Flow site failed to load:", error);
}
