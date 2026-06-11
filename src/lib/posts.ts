export interface Post {
  slug: string;
  kicker: string;
  headline: string;
  subheadline?: string;
  byline: string;
  date: string;
  body: string[];
  pullQuote?: string;
  size: "large" | "medium" | "small";
  lead?: boolean;
}

export const posts: Post[] = [
  {
    slug: "on-dragonfly-wings",
    kicker: "Nature",
    headline: "The Mayfly Lives One Day and Dies Having Never Known Winter",
    subheadline: "A meditation on brevity, and what it means to live completely in a single afternoon",
    byline: "Staff Writer",
    date: "June 11, 2026",
    size: "large",
    lead: true,
    pullQuote: "\"To live briefly is not to live less — it is to live without the dilution of repetition.\"",
    body: [
      "The mayfly emerges at dusk. It has spent years as a nymph in cold river sediment, breathing through feathery gills, waiting for a trigger it cannot name. Then, on one particular evening in early June, something shifts — water temperature, barometric pressure, some alchemical signal — and it splits its skin and flies.",
      "By morning, it is dead. In those hours it has mated, danced in columns above the river, and fulfilled the only purpose it was given. It has never seen frost. It does not know what November smells like. And yet it seems to us — watching from the bank — that it lacks nothing.",
      "We are not mayflies. We carry the weight of seasons, the slow accumulation of decembers. But there is something the mayfly understands that we forget by Tuesday: that a moment completely inhabited needs no sequel.",
    ],
  },
  {
    slug: "grandmother-recipe",
    kicker: "Memory",
    headline: "The Recipe She Never Wrote Down",
    byline: "Contributing Editor",
    date: "June 10, 2026",
    size: "medium",
    body: [
      "My grandmother made sofrito the way most people breathe — without thinking about it, the motions so encoded they bypassed intention entirely. She never measured anything. The cilantro was a handful. The garlic was enough. When I asked her to teach me, she laughed.",
      "\"You watch,\" she said. \"You don't write.\"",
      "She died before I understood what she meant. Now I make sofrito by feel, and sometimes — rarely, briefly — it tastes like hers. In those moments I understand that the recipe was never in the proportions. It was in the watching.",
    ],
  },
  {
    slug: "last-film-roll",
    kicker: "Photography",
    headline: "The Last Roll of Film From a Camera Found at a Flea Market",
    byline: "Photography Desk",
    date: "June 9, 2026",
    size: "medium",
    body: [
      "The Pentax K1000 cost four dollars. The seller didn't know if it worked. Inside was a partial roll of Kodak Gold 200, seven exposures already taken by someone unknown.",
      "I had it developed. Five shots of a birthday party — maybe 1994, maybe 1997 — children with frosting on their faces, a backyard in full summer. The last two frames were blank: the previous owner had stopped. I don't know why.",
      "I've been thinking about those blank frames ever since. A life interrupted mid-roll.",
    ],
  },
  {
    slug: "corner-table",
    kicker: "Place",
    headline: "The Corner Table at the Café That Closed",
    byline: "Urban Correspondent",
    date: "June 8, 2026",
    size: "small",
    body: [
      "For eleven years I wrote at the same corner table at a café on West 4th Street. I finished a novel there. I fell in love with someone who sat across from me and has since moved to another city. I learned my father was sick at that table, phone pressed hard against my ear.",
      "The café closed in March. A smoothie franchise opened. I walked past it once and did not stop.",
    ],
  },
  {
    slug: "transit-strangers",
    kicker: "Urban Life",
    headline: "A Census of the People I See Every Morning and Will Never Know",
    byline: "Commuter's Column",
    date: "June 7, 2026",
    size: "small",
    body: [
      "There is the man who always reads physical newspapers, folded into quarters, and who gets off at Canal. There is the woman with the enormous tote bag who smells like good soap. There is the teenager who falls asleep against the window every single morning, mouth slightly open, without fail.",
      "I know their faces better than some of my relatives. We have never spoken. When the man with the newspapers didn't appear for two weeks last winter, I worried about him the way you worry about a friend.",
      "He came back. I felt relief I had no right to feel.",
    ],
  },
  {
    slug: "holding-pattern",
    kicker: "Aviation",
    headline: "Forty Minutes in a Holding Pattern Over the City Where I Was Born",
    byline: "Travel Desk",
    date: "June 6, 2026",
    size: "small",
    body: [
      "The pilot announced we'd be circling due to weather. Below, through a thin break in cloud, I could see the grid of streets I grew up on. I pressed my forehead against the oval window and looked for the roof of my parents' house, which I could not find.",
      "For forty minutes I was suspended above my own history, unable to land in it. This is, I think, what nostalgia actually is: orbiting something you cannot touch.",
    ],
  },
];
