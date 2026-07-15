// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    author: z.string().default('Hubert Roche'),
    image: z.string().optional(),
    persona: z.array(z.enum(['particulier', 'notaire', 'assureur', 'banque', 'collectivite', 'entreprise'])).optional(),
    solution: z.enum(['ageprevention', 'ageadapt', 'agecarbone', 'ageplace']).optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const actualites = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    pubDate: z.date(),
    author: z.string().default('Hubert Roche'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, actualites };