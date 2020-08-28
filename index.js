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
const DEFAULT_BLOG_SLUG = "blog";

const log = (...args) => console.log(...args);

const exceptDraft = (post) => !post.data.draft;

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
function getAllKeyValues(collectionArray, key, defaultValue) {
  log(blue("Collecting distinct frontmatter values for"), yellow(key));
  // get all values from collection
  const hash = collectionArray.reduce((previous, page) => {
    const valueList = typeof key === "function" ? key(page) : page.data[key];
    let values;

    if (typeof valueList === "string") {
      values = [valueList];
    } else if (isIterable(valueList)) {
      values = [...valueList];
    } else if (defaultValue !== undefined) {
      values = [defaultValue];
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

function paginate({
  pages,
  slug,
  prefix,
  title,
  meta = {},
  itemsPerPage,
  children,
}) {
  const chunkedPages = lodash.chunk(
    pages,
    itemsPerPage || DEFAULT_ITEMS_PER_PAGE
  );
  const paged = [];
  const pagesSlugs = [];

  for (let i = 0; i < chunkedPages.length; i++) {
    const suffix = i > 0 ? `/page-${i + 1}` : "/";
    const pageSlug = `${prefix}/${slug}${suffix}`;
    pagesSlugs.push(pageSlug);
  }

  chunkedPages.forEach((items, index) =>
    paged.push({
      title,
      slug: pagesSlugs[index],
      pagenumber: index,
      count: pages.length,
      url: pagesSlugs[index],
      total: pagesSlugs.length,
      slugs: {
        all: pagesSlugs,
        next: pagesSlugs[index + 1] || null,
        previous: pagesSlugs[index - 1] || null,
        first: pagesSlugs[0] || null,
        last: pagesSlugs[pagesSlugs.length - 1] || null,
      },
      children: index === 0 ? children : [],
      items,
      ...meta,
    })
  );
  return paged;
}

function paginateTaxonomy(list, prefix, itemsPerPage) {
  const paged = [];
  list.forEach(({ slug, title, pages, children, meta }) =>
    paged.push(
      ...paginate({
        pages,
        title,
        slug,
        prefix,
        itemsPerPage,
        children,
        meta
      })
    )
  );
  log(blue("Pages created for taxonomy"), yellow(paged.length));
  return paged;
}

function testGlobs(globs) {
  if (!Array.isArray(globs) || globs.length === 0) {
    throw new Error(`Invalid globs: ${globs} {type ${typeof globs}}`);
  }
}

function generateTaxonomy(eleventyConfig, field, taxonomy, OPTIONS) {
  const { blog, itemsPerPage, defaultValue } =
    OPTIONS || module.exports.OPTIONS;
  testGlobs(blog);
  log(blue("Generatin taxonomy"), yellow(taxonomy));
  eleventyConfig.addCollection(taxonomy, function (collection) {
    const paginated = paginateTaxonomy(
      getAllKeyValues(
        collection.getFilteredByGlob(blog).reverse().filter(exceptDraft),
        field,
        defaultValue
      ),
      `/${OPTIONS.blogSlug}/${taxonomy}`,
      itemsPerPage
    );
    return paginated;
  });
  eleventyConfig.addCollection(`${taxonomy}_list`, function (collection) {
    const paginated = paginate({
      pages: getAllKeyValues(
        collection.getFilteredByGlob(blog).reverse().filter(exceptDraft),
        field
      ),
      title: taxonomy,
      slug: taxonomy,
      prefix: `/${OPTIONS.blogSlug}`,
      itemsPerPage,
    });
    return paginated;
  });
}

function generatePaginatedBlog(eleventyConfig, OPTIONS) {
  const { blog, itemsPerPage, blogPostTemplate } =
    OPTIONS || module.exports.OPTIONS;
  testGlobs(blog);
  eleventyConfig.addCollection("blog", (collection) =>
    paginate({
      itemsPerPage,
      title: "Blog",
      slug: OPTIONS.blogSlug,
      prefix: "",
      pages: collection
        .getFilteredByGlob(blog)
        .reverse()
        .filter(exceptDraft)
        .map((post, index, array) => {
          if (blogPostTemplate) {
            post.data.layout = blogPostTemplate;
          }
          post.data.categories = post.data.categories || [OPTIONS.defaultCategory || 'blog'];
          post.data.blog = {
            parent: getDateFromPage(post).replace("-", "/").substr(0, 7),
          };
          post.data.siblings = {
            previous: array[index - 1],
            next: array[index + 1],
          };
          return post;
        }),
    })
  );
}

function getDateFromPage(page) {
  const {
    data: { created },
  } = page;
  if (created) {
    return dateOrString(created);
  }
  return dateOrString(page.date);
}

function generateCalendar(eleventyConfig, OPTIONS) {
  const { blog, itemsPerPage } = OPTIONS || module.exports.OPTIONS;
  testGlobs(blog);
  eleventyConfig.addCollection("calendar", function (collection) {
    const calendar = getAllKeyValues(
      collection.getFilteredByGlob(blog).reverse().filter(exceptDraft),
      getDateFromPage
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
        });
        monthSlot.pages.push(...pages);
        monthSlot.children = monthSlot.pages;
      } catch (error) {
        console.log(error);
        console.log("SLUG", slug);
      }
      return previous;
    }, {});

    return paginateTaxonomy(Object.values(calendar), `/${OPTIONS.blogSlug}`, itemsPerPage);
  });
}

function generateBooleanCollection(
  eleventyConfig,
  collectionName,
  field,
  OPTIONS
) {
  const { all, layout } = OPTIONS || module.exports.OPTIONS;
  testGlobs(all);
  eleventyConfig.addCollection(collectionName, (collection) =>
    collection
      .getFilteredByGlob(all)
      .reverse()
      .filter(exceptDraft)
      .filter(({ data: { [field]: value } }) => value)
      .map(post => {
        if (layout) {
          post.data.layout = layout;
        }
        return post;
      })

  );
}

const top = (data, limit) =>
  data && data.items && data.items.slice(0, limit);

const dateformat = (date, format) => moment(date).format(format);

const first = (data) => data.filter(({ pagenumber }) => +pagenumber === 0);

const byField = (field) => ({ [field]: A }, { [field]: B }) => {
  if (A === B) return 0;
  return A < B ? -1 : 1;
};

const byUrl = byField("url");

const uniqueURL = (data) => {
  try {
    const urls = [];
    return data
      .reduce((previous, current) => {
        current.forEach((item) => {
          if (!urls.includes(item.url)) {
            urls.push(item.url);
            previous.push(item);
          }
        });
        return previous;
      }, [])
      .sort(byUrl);
  } catch (error) {
    log(red(error));
    return null;
  }
};

const collectionsFlat = (data) => uniqueURL(Object.values(data));

const breadcrumbs = (nodes, page) => {
  const normalized = Object.values(nodes).map((node) =>
    Array.isArray(node) ? node : [node]
  );
  const pages = uniqueURL(normalized);
  const crumbs = [];
  let searchFor = page;
  while (true) {
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (page.url === searchFor) {
        crumbs.push(page.url);
        console.log(`FOUND ${page.url}`);
        searchFor =
          (page.data && page.data.blog && page.data.blog.parent) ||
          (page.url !== "/" ? "/" : "");
        if (searchFor !== "") {
          i = -1;
          continue;
        }
      }
    }
    break;
  }
  return crumbs;
};

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
  defaultConfig: {
    content: DEFAULT_CONTENT,
    extensions: ELEVENTY_TEMPLATES,
    blog: ELEVENTY_TEMPLATES.map((extension) => `${DEFAULT_CONTENT}/**/*.${extension}`),
    all: ELEVENTY_TEMPLATES.map((extension) => `${DEFAULT_CONTENT}/**/*.${extension}`),    
    itemsPerPage: DEFAULT_ITEMS_PER_PAGE,
    blogSlug: DEFAULT_BLOG_SLUG
  },
  configFunction: function (
    eleventyConfig,
    {
      input,
      itemsPerPage,
      extensions,
      blogPaths,
      blogPostTemplate,
      allPaths,
      defaultCategory,
      blogSlug
    } = {}
  ) {
    const OPTIONS = {
      content: input || DEFAULT_CONTENT,
      extensions: extensions || ELEVENTY_TEMPLATES,
      itemsPerPage: itemsPerPage || DEFAULT_ITEMS_PER_PAGE,
      blogPostTemplate,
      defaultCategory,
      blogSlug: blogSlug || DEFAULT_BLOG_SLUG
    };

    OPTIONS.blog = blogPaths || [
      ...OPTIONS.extensions.map(
        (extension) => `${OPTIONS.content}/blog/**/*.${extension}`
      ),
    ];

    OPTIONS.all = allPaths || [
      ...OPTIONS.extensions.map(
        (extension) => `${OPTIONS.content}/**/*.${extension}`
      ),
    ];

    module.exports.OPTIONS = OPTIONS;

    eleventyConfig.addCollection("blog_flat", (collection) =>
      collection.getFilteredByGlob(OPTIONS.blog).reverse().filter(exceptDraft)
    );
    generateBooleanCollection(eleventyConfig, "pages", "staticPage", OPTIONS);
    generatePaginatedBlog(eleventyConfig, OPTIONS);
    generateTaxonomy(eleventyConfig, "tags", "tag", OPTIONS);
    generateTaxonomy(eleventyConfig, "categories", "category", {
      ...OPTIONS,
      defaultValue: "blog",
    });
    generateCalendar(eleventyConfig, OPTIONS);
    eleventyConfig.addFilter("collections_flat", collectionsFlat);
    eleventyConfig.addFilter("blog_top", top);
    eleventyConfig.addFilter("blog_slug", strToSlug);
    eleventyConfig.addFilter("blog_dateformat", dateformat);
    eleventyConfig.addFilter("blog_first", first);
    eleventyConfig.addFilter("blog_breadcrumbs", breadcrumbs);
    eleventyConfig.addFilter("keys", (input) => input && Object.keys(input));
    eleventyConfig.addFilter("field", (data, field) => data && data[field]);
  },
};
