module.exports.linkToId = (link) => {
  return(link?.match(/https:\/\/open.spotify.com\/track\/([a-zA-Z0-9]{22}).*/)?.[1]);
}

module.exports.escapeHTML = (str) => str.replace(/[&<>'"]/g,
  tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag]));
