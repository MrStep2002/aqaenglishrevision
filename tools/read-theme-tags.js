const themes = new Set(['change', 'christmas', 'compassion', 'family', 'greed', 'social-injustice']);

module.exports = function readThemeTags(value, location) {
  const tags = (value ?? '').split(';').map(tag => tag.trim().toLowerCase().replace(/\s+/g, '-'));
  if (tags.some(tag => !themes.has(tag)) || new Set(tags).size !== tags.length) {
    throw new Error(`${location} needs distinct themes separated by semicolons: Change, Christmas, Compassion, Family, Greed or Social Injustice.`);
  }
  return tags;
};
