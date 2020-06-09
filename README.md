# eleventy-plugin-blog

Zero config blog features for 11ty

## Features

- Tags, Categories and API to create new taxonomies (paginated)
- Calendar (paginated)

## Installation

```bash
npm install --save eleventy-plugin-blog
# OR
yarn add eleventy-plugin-blog
```

## Usage

### Runnoing examples

Go to the folder with given example and run:

```bash
../../generate-examples.js -o . -n 500
npx @11ty/eleventy
```

All massive output will be created balazzingly fast to show you how it works.

### Basic

To start using you just need to add the plugin into your `.eleventy.js` file.

```javascript
module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(require("eleventy-plugin-blog"));
};
```

This will produce following collections:

 - `blog` all posts, paginated
 - `tags` posts grouped by tags, paginated
 - `categories` posts grouped by categories, paginated
 - `calendar` posts grouped by year or year and month, paginated

See [example zero config](./examples/zero-config) for all templates.

## Kudos

Inspired by [Jérôme Coupé](https://www.webstoemp.com/blog/basic-custom-taxonomies-with-eleventy)
