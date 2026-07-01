export interface SkillGroup {
  title: string;
  tags: string[];
}

export interface Project {
  id: string;
  emoji: string;
  title: string;
  description: string;
  repoUrl: string;
  media: { kind: 'screenshot' | 'icon'; src: string; alt: string };
  tags: string[];
}

export interface ContactLink {
  label: string;
  href: string;
}

export interface Profile {
  name: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  pills: string[];
  skillGroups: SkillGroup[];
  projects: Project[];
  contactLinks: ContactLink[];
  hero: {
    banner: { light: string; dark: string; alt: string };
    cardCycle: { light: string; dark: string; alt: string; width: number; height: number };
  };
}

export const profile: Profile = {
  name: 'Tianhao Zhou',
  handle: '@tianhaoz95',
  avatarUrl: 'https://github.com/tianhaoz95.png',
  bio: "Building tools across terminal & dev tooling, browser AI, and AI/ML research — see the projects below.",
  pills: [
    '🚀 Ask me about: inference engines',
    '🤖 Ask me about: RLVR',
    '⚡ A boba a day keeps bugs away',
  ],
  skillGroups: [
    {
      title: 'Systems & backend',
      tags: ['Node.js', 'Express', 'WebSockets', 'PTY / terminals'],
    },
    {
      title: 'Browser AI & ML',
      tags: ['Transformers.js', 'MediaPipe', 'Tesseract.js (OCR)', 'on-device inference'],
    },
    {
      title: 'Frontend',
      tags: ['TypeScript', 'Astro', 'Vite'],
    },
    {
      title: 'Infra & hosting',
      tags: ['Firebase', 'GitHub Actions', 'GitHub Pages'],
    },
  ],
  projects: [
    {
      id: 'meowtrix',
      emoji: '🐾',
      title: 'Meowtrix',
      description:
        "Remote vibe engineering tool — a browser-based workspace with tiling split panes, each pane holding a PTY-backed terminal or an embedded browser. Shells live on the server, so refreshes and device switches don't kill your work.",
      repoUrl: 'https://github.com/tianhaoz95/meowtrix',
      media: {
        kind: 'screenshot',
        src: 'https://tianhaoz95.github.io/meowtrix/assets/screenshot-dark.png',
        alt: 'Meowtrix screenshot',
      },
      tags: ['terminal', 'remote dev', 'Node.js'],
    },
    {
      id: 'zerog-tools',
      emoji: '⚡',
      title: 'ZeroG Toolbox',
      description:
        '35+ free, privacy-first utilities that run 100% in your browser — AI passport photos, audio transcription, OCR, file encryption, and more. No uploads, no servers, fully private.',
      repoUrl: 'https://github.com/tianhaoz95/zerog-tools',
      media: {
        kind: 'icon',
        src: 'https://zerog-toolbox.web.app/favicon.svg',
        alt: 'ZeroG Toolbox icon',
      },
      tags: ['browser AI', 'privacy-first', 'Vite'],
    },
    {
      id: 'study',
      emoji: '📚',
      title: 'Catpuccino.ai',
      description:
        'A personal AI/ML tech blog — deep dives into frontier research papers and open-source projects, with interactive visualizations and companion apps.',
      repoUrl: 'https://github.com/tianhaoz95/study',
      media: {
        kind: 'icon',
        src: 'https://heji-study.web.app/favicon.svg',
        alt: 'Catpuccino.ai icon',
      },
      tags: ['AI/ML research', 'blog', 'Astro'],
    },
  ],
  contactLinks: [
    { label: 'GitHub', href: 'https://github.com/tianhaoz95' },
    { label: 'Email', href: 'mailto:jacksonzhou666@gmail.com' },
    { label: 'Twitter', href: 'https://twitter.com/TheSWE2' },
    { label: 'Medium', href: 'https://medium.com/@tianhaozhou' },
    { label: 'YouTube', href: 'https://www.youtube.com/channel/UCY13XGU7-3mYz2n1NzV4oGw' },
    { label: 'Reddit', href: 'https://www.reddit.com/user/jacksonz666/' },
    { label: 'Twitch', href: 'https://www.twitch.tv/jacksonzhou666' },
  ],
  hero: {
    banner: {
      light: 'banner.svg',
      dark: 'banner-dark.svg',
      alt: 'Static preview of all project cards: Meowtrix, ZeroG Toolbox, and Catpuccino.ai',
    },
    cardCycle: {
      light: 'card-cycle.gif',
      dark: 'card-cycle-dark.gif',
      alt: 'Project cards for Meowtrix, ZeroG Toolbox, and Catpuccino.ai shuffling side by side',
      width: 880,
      height: 240,
    },
  },
};
