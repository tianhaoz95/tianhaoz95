import type { Profile } from '../data/profile';

export function renderContact(profile: Profile): HTMLElement {
  const section = document.createElement('section');
  section.id = 'contact';
  section.innerHTML = `
    <p class="section-label">Contact</p>
    <h2>Get in touch</h2>
    <p class="subtitle">Always happy to talk shop — pick whichever channel is easiest.</p>
    <div class="contact-links">
      ${profile.contactLinks
        .map((link) => {
          const external = link.href.startsWith('http');
          const attrs = external ? ' target="_blank" rel="noopener"' : '';
          return `<a class="contact-link" href="${link.href}"${attrs}><span class="contact-icon">${link.icon}</span>${link.label}</a>`;
        })
        .join('\n')}
    </div>
  `;
  return section;
}
