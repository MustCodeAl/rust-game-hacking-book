import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				/** Lesson number such as "1.3"; absent on non-lesson pages. */
				chapter: z.string().regex(/^\d+\.\d+$/).optional(),
				/** Estimated reading time in minutes. */
				minutes: z.number().int().positive().optional(),
				author: z.string().optional(),
				date: z.string().optional(),
				/** Pages that draw their own heading, such as the glossary. */
				hideTitle: z.boolean().optional(),
			}),
		}),
	}),
};
