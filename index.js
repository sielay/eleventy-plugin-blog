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
        pages: [],
      };
      previous[slug].pages.push(page);
    });
    return previous;
  }, {});

  const values = Object.values(hash);

  log(blue("Distinct values found"), green(values.length));
  return values.sort(({ slug: a }, { slug: b }) =>
    a.localeCompare(b, "en", { sensitivity: "base" })
  );
}

function paginate({ pages, slug, prefix, title, meta = {}, itemsPerPage }) {
  const chunkedPages = lodash.chunk(
    pages,
    itemsPerPage || DEFAULT_ITEMS_PER_PAGE
  );
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
      count: pages.length,
      url: `${prefix}/${pagesSlugs[index]}`,
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

function paginateTaxonomy(list, prefix, itemsPerPage) {
  const paged = [];
  list.forEach(({ slug, title, pages, meta }) =>
    paged.push(...paginate({ pages, title, slug, prefix, meta, itemsPerPage }))
  );
  log(blue("Pages created for taxonomy"), yellow(paged.length));
  return paged;
}

function generateTaxonomy(
  eleventyConfig,
  field,
  taxonomy,
  { blog, itemsPerPage } = {}
) {
  log(blue("Generatin taxonomy"), yellow(taxonomy));
  eleventyConfig.addCollection(taxonomy, function (collection) {
    const paginated = paginateTaxonomy(
      getAllKeyValues(collection.getFilteredByGlob(blog), field),
      `blog/${taxonomy}`,
      itemsPerPage
    );
    return paginated;
  });
}

function generatePaginatedBlog(
  eleventyConfig,
  { blogPostTemplate, blog, itemsPerPage } = {}
) {
  eleventyConfig.addCollection("blog", (collection) =>
    paginate({
      itemsPerPage,
      title: "Blog",
      slug: "blog",
      prefix: "blog",
      pages: collection
        .getFilteredByGlob(blog)
        .reverse()
        .map((post, index, array) => {
          if (blogPostTemplate) {
            post.data.layout = blogPostTemplate;
          }
          post.data.siblings = {
            previous: array[index - 1],
            next: array[index + 1],
          };
          return post;
        }),
    })
  );
}

function generateCalendar(eleventyConfig, { blog, itemsPerPage } = {}) {
  eleventyConfig.addCollection("calendar", function (collection) {
    const calendar = getAllKeyValues(
      collection.getFilteredByGlob(blog),
      (page) => {
        const {
          data: { created },
        } = page;
        if (created) {
          return dateOrString(created);
        }
        return dateOrString(page.date);
      }
    ).reduce((previous, { slug, pages }) => {
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
        });
        yearSlot.pages.push(...pages);

        const monthId = `${year}-${month}`;

        previous[monthId] = previous[monthId] || {
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
        };
      } catch (error) {
        console.log(error);
        console.log("SLUG", slug);
      }
      return previous;
    }, {});

    return paginateTaxonomy(Object.values(calendar), `blog`, itemsPerPage);
  });
}

function generateBooleanCollection(
  eleventyConfig,
  collectionName,
  field,
  OPTIONS
) {
  const { blog } = OPTIONS;
  eleventyConfig.addCollection(collectionName, (collection) =>
    collection
      .getFilteredByGlob(blog)
      .filter(({ data: { [field]: value } }) => value)
  );
}

const top = (data, limit) =>
  data[0] && data[0].items && data[0].items.slice(0, limit);

const dateformat = (date, format) => moment(date).format(format);

const first = (data) => data.filter(({ pagenumber }) => pagenumber === 0);

module.exports = {
  generatePaginatedBlog,
  generateTaxonomy,
  generateCalendar,
  generateBooleanCollection,
  paginate,
  strToSlug,
  top,
  dateformat,
  initArguments: {},
  configFunction: function (
    eleventyConfig,
    { input, itemsPerPage, extensions, blogPaths, blogPostTemplate } = {}
  ) {
    const OPTIONS = {
      content: input || DEFAULT_CONTENT,
      extensions: extensions || ELEVENTY_TEMPLATES,
      itemsPerPage: itemsPerPage || DEFAULT_ITEMS_PER_PAGE,
      blogPostTemplate,
    };

    OPTIONS.blog =
      blogPaths ||
      OPTIONS.extensions.map(
        (extension) => `${OPTIONS.content}/*.${extension}`
      );

    eleventyConfig.addCollection("blog_flat", (collection) =>
      collection.getFilteredByGlob(blog).reverse()
    );
    eleventyConfig.addCollection("all", (collection) =>
      collection.getFilteredByGlob(content).reverse()
    );
    generateBooleanCollection(eleventyConfig, "pages", "page", OPTIONS);
    generatePaginatedBlog(eleventyConfig, OPTIONS);
    generateTaxonomy(eleventyConfig, "tags", "tag", OPTIONS);
    generateTaxonomy(eleventyConfig, "categories", "category", OPTIONS);
    generateCalendar(eleventyConfig, OPTIONS);
    eleventyConfig.addFilter("blog_top", top);
    eleventyConfig.addFilter("blog_slug", strToSlug);
    eleventyConfig.addFilter("blog_dateformat", dateformat);
    eleventyConfig.addFilter("blog_first", first);
  },
};
