const lodash = require("lodash");
const moment = require("moment");
const slugify = require("slugify");
const { blue, yellow, red, green } = require("chalk");

const ELEVENTY_TEMPLATES = [
  "html",
  "md",
  "11ty.js",
  "liquid",
  "njk",
  "hbs",
  "mustache",
  "ejs",
  "haml",
  "pug",
  "jstl",
];

let ITEMS_PER_PAGE = 10;
let CONTENT = ".";
let BLOG = ELEVENTY_TEMPLATES.map((extension) => `${CONTENT}/*.${extension}`);

const log = (...args) => console.log(...args);

const dateOrString = (value) => {
  return value instanceof Date || typeof value.toISOString === "function"
    ? value.toISOString().substr(0, 10)
    : String(value);
};

const isIterable = (obj) => {
  // checks for null and undefined
  if (obj == null) {
    return false;
  }
  return typeof obj[Symbol.iterator] === "function";
};

/**
 * Transform a string into a slug
 * Uses slugify package
 *
 * @param {String} str - string to slugify
 */
function strToSlug(str) {
  return slugify(str, {
    replacement: "-",
    remove: /[&,+()$~%.'":*?<>{}]/g,
    lower: true,
  });
}

/**
 * Get all unique key values from a collection
 *
 * @param {Array} collectionArray - collection to loop through
 * @param {String|Function} key - key to get values from
 */
function getAllKeyValues(collectionArray, key) {
  log(blue("Collecting distinct frontmatter values for"), yellow(key));
  // get all values from collection
  const hash = collectionArray.reduce((previous, page) => {
    let valueList, values;
    if (typeof key === "function") {
      valueList = key(page);
    } else {
      valueList = page.data[key];
    }
    if (typeof valueList === "string") {
      values = [valueList];
    } else if (isIterable(valueList)) {
      values = [...valueList];
    } else {
      return previous;
    }
    values.forEach((value) => {
      const slug = strToSlug(value.toLowerCase());

      previous[slug] = previous[slug] || {
        slug,
        title: value,
        count: 0,
        pages: [],
      };
      previous[slug].pages.push(page);
      previous[slug].count++;
    });
    return previous;
  }, {});
  console.log(hash);
  const values = Object.values(hash);
  log(blue("Distinct values found"), green(values.length));
  return values.sort(function (a, b) {
    return a.slug.localeCompare(b.slug, "en", { sensitivity: "base" });
  });
}

function paginate({ pages, slug, prefix, title, count, meta = {} }) {
  const chunkedPages = lodash.chunk(pages, ITEMS_PER_PAGE);
  const paged = [];
  const pagesSlugs = [];

  for (let i = 0; i < chunkedPages.length; i++) {
    const suffix = i > 0 ? `/page-${i + 1}` : "";
    const pageSlug = `${slug}${suffix}`;
    pagesSlugs.push(pageSlug);
  }

  chunkedPages.forEach((items, index) =>
    paged.push({
      title,
      slug: pagesSlugs[index],
      pagenumber: index,
      count,
      url: `${prefix}/${slug}`,
      total: pagesSlugs.length,
      slugs: {
        all: pagesSlugs,
        next: pagesSlugs[index + 1] || null,
        previous: pagesSlugs[index - 1] || null,
        first: pagesSlugs[0] || null,
        last: pagesSlugs[pagesSlugs.length - 1] || null,
      },
      items,
      ...meta,
    })
  );
  return paged;
}

function paginateTaxonomy(list, prefix) {
  const paged = [];
  list.forEach(({ slug, count, title, pages, meta }) =>
    paged.push(...paginate({ pages, title, count, slug, prefix, meta }))
  );
  log(blue("Pages created for taxonomy"), yellow(paged.length));
  return paged;
}

function generateTaxonomy(eleventyConfig, field, taxonomy) {
  log(blue("Generatin taxonomy"), yellow(taxonomy));
  eleventyConfig.addCollection(taxonomy, function (collection) {
    const paginated = paginateTaxonomy(
      getAllKeyValues(collection.getFilteredByGlob(BLOG), field),
      `blog/${taxonomy}`
    );
    return paginated;
  });
}

function generatePaginatedBlog(eleventyConfig) {
  eleventyConfig.addCollection("blog", (collection) =>
    paginate({
      title: "Blog",
      slug: "blog",
      prefix: "blog",
      count: collection.length,
      pages: collection
        .getFilteredByGlob(BLOG)
        .reverse()
        .map((post, index, array) => {
          // post.data.layout = "../_includes/blogpost.njk";
          post.data.siblings = {
            previous: array[index - 1],
            next: array[index + 1],
          };
          return post;
        }),
    })
  );
}

function generateCalendar(eleventyConfig) {
  eleventyConfig.addCollection("calendar", function (collection) {
    const calendar = getAllKeyValues(
      collection.getFilteredByGlob(BLOG),
      (page) => {
        const {
          data: { created },
        } = page;
        if (created) {
          return dateOrString(created);
        }
        return dateOrString(page.date);
      }
    ).reduce((previous, { slug, pages, count }) => {
      try {
        const [_, year, month] = slug.match(/^(\d+)-(\d+)-(\d+)/);
        const yearSlot = (previous[year] = previous[year] || {
          meta: {
            year,
            type: "year",
          },
          slug: year,
          title: year,
          pages: [],
          count: 0,
        });
        yearSlot.pages.push(...pages);
        yearSlot.count += count;

        const monthId = `${year}-${month}`;

        const monthSlot = (previous[monthId] = previous[monthId] || {
          meta: {
            year,
            type: "month",
            shortTitle: moment(slug).format("MMMM"),
            month,
          },
          slug: `${year}/${month}`,
          title: moment(slug).format("MMMM YYYY"),
          pages: [],
          months: {},
          count: 0,
        });
        monthSlot.pages.push(...pages);
        monthSlot.count += count;
      } catch (error) {
        console.log(error);
        console.log("SLUG", slug);
      }
      return previous;
    }, {});

    return paginateTaxonomy(Object.values(calendar), `blog`);
  });
}

module.exports = {
  generatePaginatedBlog,
  generateTaxonomy,
  generateCalendar,
  strToSlug,
  initArguments: {},
  configFunction: function (eleventyConfig) {
    generatePaginatedBlog(eleventyConfig);
    generateTaxonomy(eleventyConfig, "tags", "tag", "tags");
    generateTaxonomy(eleventyConfig, "categories", "category", "categories");
    generateCalendar(eleventyConfig);
  },
};
