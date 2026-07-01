import type { Profile } from '../data/profile';

export function renderAbout(profile: Profile): HTMLElement {
  const section = document.createElement('section');
  section.id = 'about';
  section.innerHTML = `
    <p class="section-label">About</p>
    <div class="about">
      <img class="avatar" src="${profile.avatarUrl}" alt="${profile.name}'s avatar" loading="lazy" />
      <div class="about-body">
        <h1>${profile.name}</h1>
        <p class="handle">${profile.handle}</p>
        <p>${profile.bio}</p>
        <div class="pills">
          ${profile.pills.map((pill) => `<span class="pill">${pill}</span>`).join('\n')}
        </div>
      </div>
    </div>
  `;
  return section;
}
