// Eleventy settings for the AQA English Revision site.
// Pages live in src/ as plain HTML with a short header ("front matter") on top.
// `npm start` previews the site at http://localhost:8080 ; `npm run build` writes it to _site/.

module.exports = function (eleventyConfig) {
  // Images, styles, scripts and the quiz/game pages are copied across untouched.
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.ignores.add("src/assets/**");

  // Page addresses have no ".html" or trailing slash (as on Google Sites): /macbeth/plot is macbeth/plot.html.
  eleventyConfig.addFilter("clean", (url) =>
    (url || "").replace(/index\.html$/, "").replace(/\.html$/, "") || "/");

  // Pages marked `draft: true` show up when previewing locally, but are left out of the live site.
  eleventyConfig.addPreprocessor("drafts", "html", (data) => {
    if (data.draft && process.env.ELEVENTY_RUN_MODE === "build") {
      return false;
    }
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    templateFormats: ["html", "njk", "md"],
    // Page content is plain HTML: don't run it through a template language,
    // so characters like {{ or {% in essays can never break the build.
    htmlTemplateEngine: false,
    markdownTemplateEngine: false,
  };
};
