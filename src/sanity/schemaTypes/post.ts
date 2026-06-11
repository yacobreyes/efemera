import { defineField, defineType } from "sanity";

export const postType = defineType({
  name: "post",
  title: "Post",
  type: "document",
  fields: [
    defineField({
      name: "headline",
      title: "Headline",
      type: "string",
      validation: r => r.required(),
    }),
    defineField({
      name: "subheadline",
      title: "Subheadline",
      type: "string",
      validation: r => r.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "headline" },
      validation: r => r.required(),
    }),
    defineField({
      name: "section",
      title: "Section",
      type: "string",
      options: { list: ["Micro-Memoir", "Narratives"] },
      validation: r => r.required(),
    }),
    defineField({
      name: "byline",
      title: "Byline",
      type: "string",
      initialValue: "Yacob Reyes",
    }),
    defineField({
      name: "date",
      title: "Date",
      type: "date",
      validation: r => r.required(),
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [{ type: "block" }],
      validation: r => r.required(),
    }),
    defineField({
      name: "image",
      title: "Hero Image",
      type: "image",
      description: "Only shown on Narratives story pages",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "caption",
          title: "Caption",
          type: "string",
        }),
      ],
    }),
  ],
  preview: {
    select: { title: "headline", subtitle: "section" },
  },
});
