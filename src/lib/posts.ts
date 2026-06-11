export interface Post {
  slug: string;
  kicker: string;
  section: "Micro-Memoir" | "Narratives";
  headline: string;
  subheadline: string;
  byline: string;
  date: string;
  body: string[];
  size: "large" | "medium" | "small";
}

export const posts: Post[] = [
  {
    slug: "on-mayfly-wings",
    section: "Micro-Memoir",
    kicker: "Micro-Memoir",
    headline: "The Mayfly Lives One Day and Dies Having Never Known Winter",
    subheadline: "A meditation on brevity, and what it means to live completely in a single afternoon",
    byline: "Staff Writer",
    date: "June 11, 2026",
    size: "large",
    body: [
      "The mayfly emerges at dusk. It has spent years as a nymph in cold river sediment, breathing through feathery gills, waiting for a trigger it cannot name. Then, on one particular evening in early June, something shifts — water temperature, barometric pressure, some alchemical signal — and it splits its skin and flies.",
      "By morning, it is dead. In those hours it has mated, danced in columns above the river, and fulfilled the only purpose it was given. It has never seen frost. It does not know what November smells like. And yet it seems to us — watching from the bank — that it lacks nothing.",
      "We are not mayflies. We carry the weight of seasons, the slow accumulation of decembers. But there is something the mayfly understands that we forget by Tuesday: that a moment completely inhabited needs no sequel.",
      "I have been thinking about this since I watched a hatch last summer on the Delaware River. Thousands of them, all at once, rising in columns that caught the last light. The fishermen were ecstatic — a good hatch means good fishing — but I couldn't cast. I just stood there.",
      "What struck me was how unhurried they seemed. They had one evening and they spent it dancing. No apparent urgency, no scramble. Just the slow column rising, turning, falling back. The whole thing looked less like a desperate last act and more like a ceremony.",
      "I think we misread the mayfly. We project onto it our own dread of endings. We call its life tragic because it is short, but shortness is only tragic if you believe length is the measure of a life. The mayfly, if it could speak, might look at our long winters and our long regrets and feel something close to pity.",
      "There is a word in Japanese — mono no aware — that translates roughly as the pathos of things, a bittersweet awareness of impermanence. It is why cherry blossoms matter more than roses: because they fall. The mayfly is mono no aware made insect.",
      "The river kept moving after the hatch ended. The mayflies were gone. The fishermen packed up. I stood there a little longer than I needed to, which is, I think, the only appropriate response to something beautiful and brief.",
    ],
  },
  {
    slug: "grandmother-recipe",
    section: "Micro-Memoir",
    kicker: "Micro-Memoir",
    headline: "The Recipe She Never Wrote Down",
    subheadline: "On inheritance, sofrito, and the things we learn too late to ask about",
    byline: "Contributing Editor",
    date: "June 10, 2026",
    size: "medium",
    body: [
      "My grandmother made sofrito the way most people breathe — without thinking about it, the motions so encoded they bypassed intention entirely. She never measured anything. The cilantro was a handful. The garlic was enough. When I asked her to teach me, she laughed.",
      "\"You watch,\" she said. \"You don't write.\"",
      "She died before I understood what she meant. Now I make sofrito by feel, and sometimes — rarely, briefly — it tastes like hers. In those moments I understand that the recipe was never in the proportions. It was in the watching.",
      "There is a category of knowledge that cannot survive transcription. It lives in muscle memory, in the angle of a wrist, in the particular rhythm of a knife against a board. My grandmother had it. Her mother had it before her. It moved through bodies, not pages.",
      "I have been trying to reconstruct it anyway. I call my mother, who calls her cousins. We compare notes across three countries. The cilantro was a lot or a little depending on who you ask. The ají dulce either matters enormously or not at all. We are archaeologists of a kitchen that no longer exists.",
      "What I am learning is that the recipe was always secondary. What she was teaching, when she said watch, was a way of being in a kitchen: unhurried, confident, responsive to what is in front of you rather than what is written down. The sofrito was the lesson, not the subject.",
      "My daughter is eight. She stands on a step stool next to me now when I cook. She doesn't write anything down. I'm starting to think my grandmother knew exactly what she was doing.",
    ],
  },
  {
    slug: "last-film-roll",
    section: "Narratives",
    kicker: "Narratives",
    headline: "The Last Roll of Film From a Camera Found at a Flea Market",
    subheadline: "Seven exposures from a stranger's life, and two frames left deliberately blank",
    byline: "Photography Desk",
    date: "June 9, 2026",
    size: "medium",
    body: [
      "The Pentax K1000 cost four dollars. The seller didn't know if it worked. Inside was a partial roll of Kodak Gold 200, seven exposures already taken by someone unknown.",
      "I had it developed. Five shots of a birthday party — maybe 1994, maybe 1997 — children with frosting on their faces, a backyard in full summer. The light in every frame is the particular gold of late afternoon in July. Someone, probably a parent, is laughing just outside the frame in two of the shots. You can feel them there.",
      "The last two frames were blank: the previous owner had stopped. I don't know why. Maybe the party ended. Maybe the camera was set down and forgotten, or handed to a child who pointed it at the sun. Maybe something happened that made photographs seem beside the point.",
      "I've been thinking about those blank frames ever since. They feel less like absence and more like a held breath. The roll ends not with a final image but with two rectangles of pure light, which is technically what all unexposed film is — potential, waiting.",
      "The birthday children are adults now, somewhere. They don't know I have these pictures. I don't know their names. And yet I feel a strange custodial responsibility for these five frames of their summer afternoon — this evidence that the light was good, the cake was eaten, someone was happy enough to photograph it.",
      "I keep the prints in a folder in my desk. I've thought about trying to find them — the photos have enough background detail that it might be possible. But I haven't. Some things are better held lightly. The not-knowing is part of what they are now.",
      "The camera works, by the way. I've shot three rolls through it since. It makes pictures the way a good pen writes: without getting in the way.",
    ],
  },
  {
    slug: "corner-table",
    section: "Narratives",
    kicker: "Narratives",
    headline: "The Corner Table at the Café That Closed",
    subheadline: "Eleven years of a single seat, and what it means when a place that held your life disappears",
    byline: "Urban Correspondent",
    date: "June 8, 2026",
    size: "medium",
    body: [
      "For eleven years I wrote at the same corner table at a café on West 4th Street. I finished a novel there. I fell in love with someone who sat across from me and has since moved to another city. I learned my father was sick at that table, phone pressed hard against my ear while the espresso machine steamed behind me.",
      "The café closed in March. A smoothie franchise opened. I walked past it once, looked through the plate glass at the blenders and the branded cups and the track lighting, and kept walking.",
      "What surprises me is the specificity of what I miss. Not the coffee, which was good but not exceptional. Not the neighborhood, which I still walk through. What I miss is the particular quality of light through those windows at ten in the morning, and the way the corner seat faced the room so you could watch people without seeming to, and the fact that the owner knew my order and sometimes, if he was in the right mood, would bring it without being asked.",
      "These are not things you can replace. They are not even things you can properly explain to someone who wasn't there. They belong to a category of small, specific goods that accumulate quietly over years until they become, without your noticing, part of the structure of your life.",
      "I have been trying to find a new place to write. I've tried six cafés in the neighborhood. Each one has something wrong with it — too loud, too cold, chairs that don't suit long sitting, baristas who seem aggressively indifferent. This is, I know, partly the problem of comparison. The corner table was nothing special either, the first time I sat there.",
      "What I am mourning, I think, is not the café itself but the version of myself who sat in it — the one who didn't know yet that it would end, who ordered the coffee and opened the notebook and assumed, without examining the assumption, that this particular piece of the world would go on being there.",
    ],
  },
  {
    slug: "transit-strangers",
    section: "Narratives",
    kicker: "Narratives",
    headline: "A Census of the People I See Every Morning and Will Never Know",
    subheadline: "On the intimacy of strangers, and the particular grief of a broken routine",
    byline: "Commuter's Column",
    date: "June 7, 2026",
    size: "small",
    body: [
      "There is the man who always reads physical newspapers, folded into quarters, and who gets off at Canal. There is the woman with the enormous tote bag who smells like good soap. There is the teenager who falls asleep against the window every single morning, mouth slightly open, without fail.",
      "I know their faces better than some of my relatives. We have never spoken. When the man with the newspapers didn't appear for two weeks last winter, I worried about him the way you worry about a friend.",
      "He came back. I felt relief I had no right to feel.",
      "This is one of the stranger features of urban life: the development of deep, entirely one-sided familiarity with people whose names you will never know. You watch them over months and years. You notice when something changes — a new haircut, a cast on a wrist, a shift in their usual expression. You build, without meaning to, a partial picture of a life.",
      "I have been riding this line for six years. In that time, the sleeping teenager has aged visibly. The newspaper man has developed a slight limp. The woman with the tote bag once caught me looking and smiled, and I smiled back, and that was the entirety of our relationship but somehow it felt like a lot.",
      "What I find myself thinking about is what they make of me, if anything. Whether I appear in anyone else's private census. Whether someone has noticed that I always stand in the same spot, or always look out the window rather than at my phone, or once cried quietly on the downtown platform on a Wednesday in November and tried to hide it.",
      "We are each other's evidence. We are proof, for strangers, that we showed up, day after day, and rode the train.",
    ],
  },
  {
    slug: "holding-pattern",
    section: "Micro-Memoir",
    kicker: "Micro-Memoir",
    headline: "Forty Minutes in a Holding Pattern Over the City Where I Was Born",
    subheadline: "Suspended above your own history, circling what you can't quite land in",
    byline: "Travel Desk",
    date: "June 6, 2026",
    size: "small",
    body: [
      "The pilot announced we'd be circling due to weather. Below, through a thin break in cloud, I could see the grid of streets I grew up on. I pressed my forehead against the oval window and looked for the roof of my parents' house, which I could not find.",
      "For forty minutes I was suspended above my own history, unable to land in it. This is, I think, what nostalgia actually is: orbiting something you cannot touch.",
      "From altitude, a city looks like a diagram of itself — the logic of its streets visible in a way it never is from inside them. I could see the curve of the river I used to ride my bike along. I could see, or thought I could see, the park where I broke my arm at ten, the street where my first apartment was, the hospital where both my parents eventually died.",
      "All of it reduced to geometry. All of it at a distance that made it look, briefly, like it belonged to someone else's story.",
      "There is something clarifying about this, and also something unbearable. The distance gives you perspective and takes away warmth in the same gesture. You see the whole but lose the texture — the way the river smelled in August, the specific quality of the light on that street in October, the sound of the park at dusk.",
      "We landed eventually. The city closed around me immediately, became specific and present and mine again in the way that only happens when you're inside something. But I keep thinking about those forty minutes. The view from the holding pattern. The way the whole of a life can look, briefly, like a map — legible and small and complete.",
      "I never did find the roof of the house. I'm not sure I would have known what to do if I had.",
    ],
  },
];
