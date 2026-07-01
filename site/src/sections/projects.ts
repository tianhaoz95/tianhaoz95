import type { Profile } from '../data/profile';

export function renderProjects(profile: Profile): HTMLElement {
  const section = document.createElement('section');
  section.id = 'projects';

  // Live, data-driven strip instead of a pre-rendered image: it reflects
  // profile.projects directly, so it never goes stale and never needs a
  // light/dark variant baked in separately.
  const chipsHtml = profile.projects
    .map((project) => `<span class="marquee-chip">${project.emoji} ${project.title}</span>`)
    .join('\n');

  const cardsHtml = profile.projects
    .map((project) => {
      const mediaClass = project.media.kind === 'icon' ? 'card-media icon-only' : 'card-media';
      return `
        <a class="card" href="${project.repoUrl}" target="_blank" rel="noopener">
          <div class="${mediaClass}">
            <img src="${project.media.src}" alt="${project.media.alt}" loading="lazy" />
          </div>
          <div class="card-body">
            <p class="card-title">${project.emoji} ${project.title}</p>
            <p class="card-desc">${project.description}</p>
            <div class="tags">
              ${project.tags.map((tag) => `<span class="tag">${tag}</span>`).join('\n')}
            </div>
            <span class="card-link">View on GitHub <span class="card-link-arrow">→</span></span>
          </div>
        </a>
      `;
    })
    .join('\n');

  section.innerHTML = `
    <p class="section-label">Projects</p>
    <h2>A few things I'm building</h2>

    <div class="project-marquee" aria-hidden="true">
      <div class="marquee-track">
        ${chipsHtml}
        ${chipsHtml}
      </div>
    </div>

    <div class="grid">
      ${cardsHtml}
    </div>
  `;
  return section;
}
