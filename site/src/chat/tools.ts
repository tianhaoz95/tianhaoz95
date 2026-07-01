import { profile } from '../data/profile';

export const profileTools = [
  {
    type: 'function',
    function: {
      name: 'get_profile_section',
      description:
        "Get structured, ground-truth data about this developer's profile site. " +
        'Always use this instead of guessing when asked about skills, tech stack, projects, bio, or contact info.',
      parameters: {
        type: 'object',
        properties: {
          section: {
            type: 'string',
            enum: ['about', 'skills', 'projects', 'contact', 'all'],
            description: 'Which part of the profile to fetch.',
          },
        },
        required: ['section'],
      },
    },
  },
] as const;

export function callProfileTool(name: string, args: { section?: string }): unknown {
  if (name !== 'get_profile_section') {
    return { error: `unknown tool: ${name}` };
  }
  switch (args.section) {
    case 'about':
      return { name: profile.name, handle: profile.handle, bio: profile.bio, pills: profile.pills };
    case 'skills':
      return profile.skillGroups;
    case 'projects':
      return profile.projects.map(({ id, title, description, repoUrl, tags }) => ({
        id,
        title,
        description,
        repoUrl,
        tags,
      }));
    case 'contact':
      return profile.contactLinks;
    case 'all':
      return profile;
    default:
      return { error: `unknown section: ${args.section}` };
  }
}
