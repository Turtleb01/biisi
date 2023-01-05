const path = require("path");
const fs = require("fs");
const config = require("../config.json");
const base = fs.readFileSync(path.resolve(__dirname, "search.html"), {encoding: "utf8"});
const li = fs.readFileSync(path.resolve(__dirname, "searchli.html"), {encoding: "utf8"});

//Debug versions, read the file every time from the disk
const dbase = () => fs.readFileSync(path.resolve(__dirname, "search.html"), {encoding: "utf8"});
const dli = () => fs.readFileSync(path.resolve(__dirname, "searchli.html"), {encoding: "utf8"});

const { escapeHTML } = require("../backend/util.js");

const buildLi = (track) => {
  switch(track.vote) {
    case 1:
      var voteclass = "vote-up"
      break;
    case -1:
      var voteclass = "vote-down"
      break;
    case 0:
      var voteclass = "vote-null"
      break;
  }
  return(li
    .replace(/%trackId%/g, track.trackId)
    .replace(/%image%/g, track.image)
    .replace(/%name%/g, escapeHTML(track.name))
    .replace(/%artists%/g, escapeHTML(track.artists))
    .replace(/%duration%/g, track.duration)
    .replace(/%createdAt%/g, track.releaseDate)
  );
}

module.exports = (tracks) => {
  return(base
  .replace("<BIISI_LIST>", tracks.map(buildLi).join("\n"))
  .replace("<BIISI_FOOTER>", config.footer)
  .replace("<BIISI_HEADER>", config.header)
  );
}
