// Eleventy settings for the AQA English Revision site.
// Pages live in src/ as plain HTML with a short header ("front matter") on top.
// `npm start` previews the site at http://localhost:8080 ; `npm run build` writes it to _site/.

module.exports = function (eleventyConfig) {
  // Images, styles and scripts are copied across untouched.
  // Only our own files are published. The old pictures in src/assets/images/ (other people's, from
  // the Google Sites version) are no longer used or published; only the mouse logo in images/site/ is.
  eleventyConfig.addPassthroughCopy({ "src/assets/css": "assets/css" });
  eleventyConfig.addPassthroughCopy({ "src/assets/js": "assets/js" });
  // The new pictures (web-sized copies, made from the originals kept outside this folder)
  eleventyConfig.addPassthroughCopy({ "src/assets/pictures": "assets/pictures" });
  eleventyConfig.addPassthroughCopy({ "src/assets/images/site/mouse.svg": "assets/images/site/mouse.svg" });
  eleventyConfig.addPassthroughCopy({ "src/assets/images/site/mouse-white.svg": "assets/images/site/mouse-white.svg" });
  eleventyConfig.ignores.add("src/assets/**");

  // Page addresses have no ".html" or trailing slash (as on Google Sites): /macbeth/plot is macbeth/plot.html.
  eleventyConfig.addFilter("clean", (url) =>
    (url || "").replace(/index\.html$/, "").replace(/\.html$/, "") || "/");

  // Every page starts with its title banner (<section class="banner" ...>). The template lifts it out
  // and shows it as the page's coloured title plate, above the contents column and the page itself.
  eleventyConfig.addFilter("splitBanner", (html) => {
    const m = /<section class="banner([^"]*)"(?: style="([^"]*)")?>([\s\S]*?)<\/section>/.exec(html || "");
    if (!m) return { found: false, extra: "", style: "", inner: "", rest: html || "" };
    return {
      found: true,
      extra: m[1].trim(),
      style: m[2] || "",
      inner: m[3],
      rest: html.slice(0, m.index) + html.slice(m.index + m[0].length),
    };
  });

  // Finds the menu entry (from src/_data/nav.json) with a given address.
  // Reading time for the title plate: words in the page (tags stripped) at 200 a minute.
  eleventyConfig.addFilter("readingTime", (html) => {
    const words = (html || "").replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ")
      .replace(/&[a-z#0-9]+;/gi, " ").split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
    return { words, wordsText: (Math.round(words / 10) * 10).toLocaleString("en-GB"), minutes: Math.max(1, Math.round(words / 200)) };
  });
  eleventyConfig.addFilter("findUrl", (list, url) => (list || []).find((i) => i.url === url) || null);

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
