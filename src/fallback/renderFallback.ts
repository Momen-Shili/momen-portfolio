/**
 * Plain-page version of the portfolio. Rendered from portfolio.ts at build time (injected into
 * index.html by the Vite plugin) so crawlers and no-JS visitors get the full content.
 */
import { LINKS, PROFILE } from "../content/portfolio.ts";
import { aboutHtml, contactLinksHtml, esc, projectsHtml, skillsHtml } from "./html.ts";

export function renderFallback(): string {
  return `<header class="plain-header">
  <p class="plain-kicker">Portfolio</p>
  <h1>${esc(PROFILE.name)}</h1>
  <p class="plain-title">${esc(PROFILE.title)} &middot; ${esc(PROFILE.location)}</p>
  <p class="plain-short">${esc(PROFILE.short)}</p>
  <nav aria-label="Sections">
    <ul class="plain-nav">
      <li><a href="#about">About</a></li>
      <li><a href="#projects">Projects</a></li>
      <li><a href="#skills">Skills</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
  </nav>
</header>
<section id="about" aria-labelledby="about-h"><h2 id="about-h">About</h2>${aboutHtml()}</section>
<section id="projects" aria-labelledby="projects-h"><h2 id="projects-h">Projects</h2>${projectsHtml()}</section>
<section id="skills" aria-labelledby="skills-h"><h2 id="skills-h">Skills</h2>${skillsHtml()}</section>
<section id="contact" aria-labelledby="contact-h">
  <h2 id="contact-h">Contact</h2>
  ${contactLinksHtml()}
  <div id="plain-contact-form" class="js-only"></div>
  <noscript><p>Write to <a href="mailto:${esc(LINKS.email)}">${esc(LINKS.email)}</a>.</p></noscript>
</section>`;
}
