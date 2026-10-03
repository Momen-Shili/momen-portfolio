/**
 * The plain page: the portfolio as a normal, fast, accessible web page. It is rendered from
 * portfolio.ts at build time and injected into index.html by the Vite plugin, so crawlers and
 * visitors with JavaScript off get the full content. src/plain/enhance.ts adds the optional
 * motion and theme switch on top.
 */
import { FUN_FACTS, LINKS, PROFILE } from "../content/portfolio.ts";
import {
  contactLinksHtml,
  esc,
  experienceHtml,
  languagesHtml,
  projectsHtml,
  skillsHtml,
} from "./html.ts";

/** The last sentence of the short description, typed out in the hero. All from the content file. */
export function heroTagline(): string {
  const sentences = PROFILE.short.split(/(?<=\.)\s+/);
  return (sentences[sentences.length - 1] ?? PROFILE.short).trim();
}

export const NAV_LINKS: ReadonlyArray<readonly [string, string]> = [
  ["about", "About"],
  ["experience", "Experience"],
  ["projects", "Projects"],
  ["skills", "Skills"],
  ["contact", "Contact"],
];

function navHtml(): string {
  return `<header class="site-header" id="top">
  <div class="site-header-inner">
    <a class="brand" href="#top" aria-label="${esc(PROFILE.name)}, back to the top">
      <img src="/art/portrait-avatar.png" width="32" height="32" alt="" class="brand-face">
      <span class="brand-name">${esc(PROFILE.name)}</span>
    </a>
    <nav aria-label="Sections">
      <ul class="site-nav">${NAV_LINKS.map(([id, label]) => `<li><a href="#${id}">${esc(label)}</a></li>`).join("")}</ul>
    </nav>
    <div class="site-actions">
      <button type="button" class="theme-toggle js-only" aria-pressed="false">Dark mode</button>
      <a class="btn btn-play btn-small" href="/" data-play>Play the game</a>
    </div>
  </div>
</header>`;
}

function heroHtml(): string {
  const tagline = esc(heroTagline());
  return `<section class="hero" aria-labelledby="hero-title">
  <div class="hero-sky" aria-hidden="true">
    <i class="cloud c1"></i><i class="cloud c2"></i><i class="cloud c3"></i>
    <i class="hill h1"></i><i class="hill h2"></i>
  </div>
  <div class="hero-inner">
    <div class="hero-portrait">
      <img class="portrait" src="/art/portrait-avatar.png" width="64" height="64" alt="Pixel-art portrait of ${esc(PROFILE.name)}" fetchpriority="high">
      <span class="blink" aria-hidden="true"></span>
    </div>
    <div class="hero-text">
      <p class="eyebrow">Portfolio</p>
      <h1 id="hero-title">${esc(PROFILE.name)}</h1>
      <p class="role">${esc(PROFILE.title)} &middot; ${esc(PROFILE.location)}</p>
      <p class="tagline"><span class="tw-full">${tagline}</span><span class="tw-live" aria-hidden="true"></span></p>
      <div class="hero-actions">
        <a class="btn btn-play" href="/" data-play>Play the game</a>
        <a class="btn btn-outline" href="#contact">Contact</a>
      </div>
    </div>
  </div>
</section>`;
}

function aboutSectionHtml(): string {
  const facts =
    FUN_FACTS.length > 0
      ? `<h3>Fun facts</h3><ul class="plain-list">${FUN_FACTS.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`
      : "";
  return `<section id="about" class="section reveal" aria-labelledby="about-h">
  <h2 id="about-h">About</h2>
  <p class="lead">${esc(PROFILE.bio)}</p>
  ${languagesHtml()}
  ${facts}
</section>`;
}

export function renderFallback(): string {
  return `${navHtml()}
<main id="content">
${heroHtml()}
${aboutSectionHtml()}
<section id="experience" class="section reveal" aria-labelledby="experience-h">
  <h2 id="experience-h">Experience</h2>
  ${experienceHtml()}
</section>
<section id="projects" class="section reveal" aria-labelledby="projects-h">
  <h2 id="projects-h">Projects</h2>
  ${projectsHtml()}
</section>
<section id="skills" class="section reveal" aria-labelledby="skills-h">
  <h2 id="skills-h">Skills</h2>
  ${skillsHtml()}
</section>
<section id="contact" class="section reveal" aria-labelledby="contact-h">
  <h2 id="contact-h">Contact</h2>
  <p class="lead">Email is the best way to start a conversation.</p>
  ${contactLinksHtml()}
  <div id="plain-contact-form" class="js-only"></div>
  <noscript><p>Write to <a href="mailto:${esc(LINKS.email)}">${esc(LINKS.email)}</a>.</p></noscript>
</section>
</main>
<footer class="site-footer">
  <div class="walker-lane" aria-hidden="true"><span class="walker"></span></div>
  <div class="footer-row">
    <p>${esc(PROFILE.name)} &middot; ${esc(PROFILE.title)}</p>
    <p><a href="/" data-play>Play the game</a> &middot; <a href="#top">Back to top</a></p>
  </div>
  <a class="to-top js-only" href="#top" aria-label="Back to top">&uarr;</a>
</footer>`;
}
