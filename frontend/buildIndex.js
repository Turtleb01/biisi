const path = require("path");
const fs = require("fs");
const config = require("../config.json");
const base = fs.readFileSync(path.resolve(__dirname, "index.html"), {encoding: "utf8"});
const li = fs.readFileSync(path.resolve(__dirname, "li.html"), {encoding: "utf8"});

//Debug versions, read the file every time from the disk
const dbase = () => fs.readFileSync(path.resolve(__dirname, "index.html"), {encoding: "utf8"});
const dli = () => fs.readFileSync(path.resolve(__dirname, "li.html"), {encoding: "utf8"});

const dadmin = () => fs.readFileSync(path.resolve(__dirname, "admin.js"), {encoding: "utf8"});

const { escapeHTML } = require("../backend/util.js");

const buildLi = (track,admin) => {
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
    .replace(/%voteclass%/g, voteclass)
    .replace(/%votes%/g, track.votes)
    .replace(/%image%/g, track.image)
    .replace(/%name%/g, escapeHTML(track.name))
    .replace(/%username%/g, admin?` (${escapeHTML(track.username)})`:"")
    .replace(/%artists%/g, escapeHTML(track.artists))
    .replace(/%duration%/g, track.duration)
    .replace(/%createdAt%/g, new Date(track.createdAt).toJSON())
  );
}

module.exports = (tracks,query,admin) => {
  let as;
  switch(Number(query.as)) {
    case 1:
      as="Kappale on jo lisätty";
      break;
    case 2:
      as="Olet lisännyt liian monta kappaletta! Voit lisätä enemmän äänestämällä";
      break;
    default:
      as="Lisää kappale";
  }
  return(base
  .replace("<BIISI_LIST>", tracks.map(e=>buildLi(e,admin)).join("\n"))
  .replace("<BIISI_FOOTER>", config.footer)
  .replace("<BIISI_HEADER>", config.header)
  .replace("<SUBMIT>", as)
  .replace("<COLOR>", (query.as>0)?"red":"green")
  .replace("<ADMIN>", admin?dadmin():"")
  );
}
