import type { Profile } from '../data/profile';

export function renderSkills(profile: Profile): HTMLElement {
  const section = document.createElement('section');
  section.id = 'skills';
  section.innerHTML = `
    <p class="section-label">Skills</p>
    <h2>Tech I work with</h2>
    <p class="subtitle">Pulled from the stacks behind the projects below, grouped by area.</p>
    <div class="skill-groups">
      ${profile.skillGroups
        .map(
          (group) => `
        <div class="skill-group">
          <span class="skill-icon">${group.icon}</span>
          <h3>${group.title}</h3>
          <div class="tags">
            ${group.tags.map((tag) => `<span class="tag">${tag}</span>`).join('\n')}
          </div>
        </div>
      `,
        )
        .join('\n')}
    </div>
  `;
  return section;
}
