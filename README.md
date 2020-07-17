# eleventy-plugin-blog

Zero config blog features for 11ty

This plugin still requires a bit of love in terms of documentation. See my personal
[blog code](https://github.com/Sielay/sielay.com) to see all examples of use.

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
 - `blog_flat` all posts, flat
 - `all` all pages (using native 11ty)
 - `pages` all pages with frontmatter `page: true`
 - `tag` posts grouped by tags, paginated
 - `category` posts grouped by categories, paginated
 - `category_list` list of all categories
 - `tag_list` list of all tags
 - `calendar` posts grouped by year or year and month, paginated

See [example zero config](./examples/zero-config) for all templates.

## Complex

 * See my blog repository: [https://github.com/sielay/sielay.com](https://github.com/sielay/sielay.com)

## API

## Example template for rendering Page[]

See [life example](https://github.com/sielay/sielay.com/blob/master/_content/_includes/postslist.njk)
```njk
<ul>
{%- for post in postslist.items -%}
  <li>
    {%- include 'tile.njk' -%}
  </li>
{%- endfor -%}
</ul>
```

## paginate(options): IndexPage[]

Create paginated index of pages

### Options
Field        | Type                | Description
------------ | ------------------- | -----------
pages        | Iterable            | Collection of 11ty pages
slug         | String              | Slug to be applied (see notes below)
prefix       | String              | Slug prefix
title        | String              | Given title
meta         | Object \| Undefiend | Additional data to bound to each index page (see [generateCalendar](#generateCalendar)
itemsPerPage | Number              | Number of 11ty pages on each index page

Slugs will be generated as follows:
 
 * First page `${slug}`
 * Every next page `${slug}/page-${pageNumber}`

### IndexPage

Field        | Type                | Description
------------ | ------------------- | -----------
title        | String              | Given title
slug         | String              | Generated slug (as described above)
pagenumber   | Number              | Number of given page (starting from 0)
url          | String              | Concatenated value from prefix and slug
total        | Number              | Number of pages
slugs        | Slugs
items        | Page[]              | 11typ pages on given page
...meta      |                     | Anything that came from meta input

### Slugs

Field        | Type                | Description
------------ | ------------------- | -----------
all          | String[]            | List of all pages slugs
next         | String \| Null      | Slug of the next page
previous     | String \| Null      | Slug of the previous page
first        | String \| Null      | Slug of the first page
last         | String \| Null      | Slug of the last page

### Example template

See [live example](https://github.com/sielay/sielay.com/blob/master/_content/blog.njk)
```njk
---
title: Blog
pagination:
  data: collections.blog
  size: 1
  alias: postslist
permalink: /blog/{%- if postslist.pagenumber > 0 -%}{{ postslist.pagenumber }}{%- endif -%}/index.html
topNav: postslist.pagenumber == 0
---
{%- include 'postslist.njk' -%}
```

## generatePaginatedBlog(eleventyConfig, Options)

Generates simple paginated blog. Uses `paginage` over given blog globs and can apply template

### Options

Field             | Type                | Description
----------------- | ------------------- | -----------
blogPostTemplate  | String \| Undefined | Path to blog post template
blog              | String[]            | Globs for blog posts
itemsPerPage      | Number              | Custom number of items per page

See [live example](https://github.com/sielay/sielay.com/blob/master/.eleventy.js#L23) - indirect use

For a template example see [paginate](#paginate).

## generateCalendar(eleventyConfig, Options)

Generates calendar grouping by years and months.

### Options

Field             | Type                | Description
----------------- | ------------------- | -----------
blog              | String[]            | Globs for blog posts
itemsPerPage      | Number              | Custom number of items per page

IndexPage objects generated here will be extended using `meta` field with

Field             | Type                | Description
----------------- | ------------------- | -----------
year              | String              | Year for annual group
month             | String \| Undefined | Month for monthly group
type              | 'year' \| 'month'   | Type of group
shortTitle        | String \| Undefined | Formatted title for month groups

### Template examples

 * [Paginated calendar page](https://github.com/sielay/sielay.com/blob/master/_content/calendar.njk)
 * [Years index widget](https://github.com/sielay/sielay.com/blob/master/_content/_includes/years.njk)
 * [Months by years index widget collection](https://github.com/sielay/sielay.com/blob/master/_content/_includes/months.njk)


## generateTaxonomy(eleventyConfig, Options)

TBD

## generateBooleanCollection(eleventyConfig, Options)

TBD

## Filtes

### blog_top

TBD

### blog_slug

TBD

### blog_dateformat

TBD

## blog_first

TBD

## Kudos

Inspired by [Jérôme Coupé](https://www.webstoemp.com/blog/basic-custom-taxonomies-with-eleventy)
