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
				/**
				 * What the chat button says on this page. Each part is optional and
				 * replaces the one worded from the page's place in the book.
				 */
				chat: z
					.object({
						/** The input's hint text; short, because the input is narrow (about 30 characters). */
						placeholder: z.string().max(40).optional(),
						/** The first message in the chat, as plain text. */
						welcome: z.string().max(400).optional(),
						/** The button's colour, as #rrggbb; it is deepened if white text on it would be hard to read. */
						color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
					})
					.optional(),
			}),
		}),
	}),
};
