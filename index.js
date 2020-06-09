const lodash = require("lodash");
const moment = require("moment");
const slugify = require("slugify");
const { blue, yellow, green } = require("chalk");

/**
 * Templates supported by 11ty
 * @todo maybe import them from eleventy itself?
 */
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

const DEFAULT_ITEMS_PER_PAGE = 10;
const DEFAULT_CONTENT = ".";
const DEFAULT_BLOG = ELEVENTY_TEMPLATES.map(
  (extension) => `${DEFAULT_CONTENT}/*.${extension}`
);

const log = (...args) => console.log(...args);

/**
 * Frontmatter can return date like values as Date objects. For our use we need original string input
 * @param {Mixed} value expted to be string or Date
 */
const dateOrString = (value) => {
  return value instanceof Date || typeof value.toISOString === "function"
    ? value.toISOString().substr(0, 10)
    : String(value);
};

/**
 * Some collections returned by frontmatter won't be arrays so will fail Array.isArray
 * @param {Mixed} obj
 */
const isIterable = (obj) => {
  if (obj === null || obj === undefined) {
    return false;
  }
  return typeof obj[Symbol.iterator] === "function";
};

/**
 * Transform a string into a slug
 * Uses slugify package
 * @param {String} str string to slugify
 */
const strToSlug = (str) =>
  slugify(str, {
    replacement: "-",
    remove: /[&,+()$~%.'":*?<>{}]/g,
    lower: true,
  });

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
    const valueList = typeof key === "function" ? key(page) : page.data[key];
    let values;

    if (typeof valueList === "string") {
      values = [valueList];
    } else if (isIterable(valueList)) {
      values = [...valueList];
    } else {
      return previous; // ignore entry
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

  const values = Object.values(hash);

  log(blue("Distinct values found"), green(values.length));
  return values.sort(({ slug: a }, { slug: b }) =>
    a.localeCompare(b, "en", { sensitivity: "base" })
  );
}

function paginate({ pages, slug, prefix, title, count, meta = {} }) {
  const chunkedPages = lodash.chunk(pages, DEFAULT_ITEMS_PER_PAGE);
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
      getAllKeyValues(collection.getFilteredByGlob(DEFAULT_BLOG), field),
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
        .getFilteredByGlob(DEFAULT_BLOG)
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
      collection.getFilteredByGlob(DEFAULT_BLOG),
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
