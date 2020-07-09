#!/usr/bin/env node
const fs = require("fs");
const cli = require("cli");
const path = require("path");
const mkdirp = require("mkdirp");

const CATEGORIES = ["latest", "thoughts", "essay", "whatever", undefined];

const TAGS = [
  "Advertising",
  "Advice",
  "Android",
  "Anime",
  "Apple",
  "Architecture",
  "Art",
  "Baking",
  "Beauty",
  "Bible",
  "Blog",
  "Blogging",
  "Book Reviews",
  "Books",
  "Business",
  "Canada",
  "Cars",
  "Cartoons",
  "Celebrities",
  "Celebrity",
  "Children",
  "Christian",
  "Christianity",
  "Comedy",
  "Comics",
  "Cooking",
  "Cosmetics",
  "Crafts",
  "Cuisine",
  "Culinary",
  "Culture",
  "Dating",
  "Design",
  "Diy",
  "Dogs",
  "Drawing",
  "Economy",
  "Education",
  "Entertainment",
  "Environment",
  "Events",
  "Exercise",
  "Faith",
  "Family",
  "Fantasy",
  "Fashion",
  "Fiction",
  "Film",
  "Fitness",
  "Folk",
  "Food",
  "Football",
  "France",
  "Fun",
  "Funny",
  "Gadgets",
  "Games",
  "Gaming",
  "Geek",
  "Google",
  "Gossip",
  "Graphic Design",
  "Green",
  "Health",
  "Hip Hop",
  "History",
  "Home",
  "Home Improvement",
  "Homes",
  "Humor",
  "Humour",
  "Hunting",
  "Illustration",
  "Indie",
  "Inspiration",
  "Interior Design",
  "Internet",
  "Internet Marketing",
  "Iphone",
  "Italy",
  "Kids",
  "Landscape",
  "Law",
  "Leadership",
  "Life",
  "Lifestyle",
  "Literature",
  "London",
  "Love",
  "Management",
  "Marketing",
  "Media",
  "Men",
  "Mobile",
  "Money",
  "Movies",
  "Music",
  "Nature",
  "News",
  "Nutrition",
  "Opinion",
  "Painting",
  "Parenting",
  "Personal",
  "Personal Development",
  "Pets",
  "Philosophy",
  "Photo",
  "Photography",
  "Photos",
  "Pictures",
  "Poetry",
  "Politics",
  "Real Estate",
  "Recipes",
  "Relationships",
  "Religion",
  "Retirement",
  "Reviews",
  "Sales",
  "Satire",
  "Science",
  "Seo",
  "Sex",
  "Shopping",
  "Soccer",
  "Social Media",
  "Software",
  "Spirituality",
  "Sports",
  "Technology",
  "Television",
  "Tips",
  "Travel",
  "Tutorials",
  "Tv",
  "Uk",
  "Vacation",
  "Video",
  "Videos",
  "Web",
  "Web Design",
  "Weight Loss",
  "Wellness",
  "Wildlife",
  "Wine",
  "Women",
  "Wordpress",
  "Writing",
];

const options = cli.parse({
  number: ["n", "Number of posts", "number", 10],
  output: ["o", "Output directory", "string", process.cwd()],
});

const output = path.resolve(options.output);

const random = (list, number = 1) => {
  const out = [];
  while (out.length < number) {
    const next = list[Math.floor(Math.random() * list.length)];
    if (!out.includes(next)) {
      out.push(next);
    }
  }
  return out;
};

const generate = (output, daysBack) => {
  console.log("will generate");
  const date = new Date(Date.now() - 1000 * 60 * 60 * 24 * daysBack)
    .toISOString()
    .substr(0, 10);
  const filename = path.join(output, `blog/${date}-example.md`);
  const category = random(CATEGORIES, 1)[0];
  const content = `---
title: Example blog post for ${date}
tags:
${random(TAGS, 5)
  .map((tag) => `    - ${tag}`)
  .join("\n")}
${
  category
    ? `categories:
  - ${category}
`
    : ""
}
created: ${date}
---
Lorem ipsum`;
  console.log("writing file", filename);
  return new Promise((resolve, reject) =>
    fs.writeFile(filename, content, "utf8", (err) => {
      if (err) return reject(err);
      resolve();
    })
  );
};

(async () => {
  await mkdirp(output);
  for (let i = 0; i < options.number; i++) {
    await generate(output, i);
  }
})();
