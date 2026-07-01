import type { Profile } from '../data/profile';

export function renderAbout(profile: Profile): HTMLElement {
  const section = document.createElement('section');
  section.id = 'about';
  section.className = 'hero-section';
  section.innerHTML = `
    <div class="about">
      <div class="avatar-wrap">
        <img class="avatar" src="${profile.avatarUrl}" alt="${profile.name}'s avatar" loading="lazy" />
        <span class="avatar-scan" aria-hidden="true"></span>
      </div>
      <div class="about-body">
        <p class="eyebrow"><span class="eyebrow-dot" aria-hidden="true"></span>Developer profile</p>
        <h1>${profile.name}</h1>
        <p class="handle">${profile.handle}</p>
        <p class="bio">${profile.bio}</p>
        <div class="pills">
          ${profile.pills.map((pill) => `<span class="pill">${pill}</span>`).join('\n')}
        </div>
        <div class="cta-row">
          <a class="btn btn-primary" href="#projects">View projects</a>
          <a class="btn btn-ghost" href="#contact">Get in touch</a>
        </div>
      </div>
    </div>
  `;
  return section;
}
