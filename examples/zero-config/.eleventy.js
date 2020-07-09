module.exports = function (eleventyConfig) {
  eleventyConfig.setDisableCollectionsFromTags && eleventyConfig.setDisableCollectionsFromTags(true);
  eleventyConfig.addPlugin(require("../../index"));
  eleventyConfig.addFilter("safejson_each", (data, ...fields) => {
    try {
      return Object.values(data).map((value) =>
        fields
          ? fields.map((field) =>
              typeof value[field] === "object"
                ? JSON.stringify(value[field].inputPath)
                : value[field]
            )
          : []
      );
    } catch (error) {
      return `${data}`;
    }
  });
};
