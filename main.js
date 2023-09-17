const path = require("path");
const express = require("express");
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;


const spotify = {
  getTrack: require("./backend/spotify.js").getTrack,
  teuvo: require("./backend/spotify.js").teuvo,
  search: require("./backend/spotifySearch.js").search
};
const buildIndex = require("./frontend/buildIndex.js");
const buildSearch = require("./frontend/buildSearch.js");
const config = require("./config.json");
const easteregg = require("./backend/easteregg.js");
const db = require("./backend/db.js");
const { linkToId } = require("./backend/util.js");

const app = express();
const port = process.env.PORT || 22282;

passport.use(new GoogleStrategy({
    clientID: config.google.clientID,
    clientSecret: config.google.clientSecret,
    callbackURL: "https://biisi.clasu.fi/auth/callback"
  },
  function(accessToken, refreshToken, profile, done) {
      console.log(profile);
      db.addUser(profile);
      return done(null, profile);
  }
));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: config.google.clientSecret,
  cookie: {expires: new Date(253402300000000)}
}));
app.use(passport.initialize());
app.use(passport.session());
app.enable('trust proxy');

app.use((req, res, next) => {
  req.user = req.session.passport?.user?.id;

  if(!req.user&&req.path!="/login.html"&&!req.path.startsWith("/auth/")) {
    res.redirect("/login.html");
  } else {
    next();
  }

});

app.post('/auth/google',
  (req, res, next) => {
    if(req.body?.password===config.password) {
      req.session.lovesPasi=true;
      next();
    } else {
      res.redirect("/login.html?wrongpass");
    }
  },
  passport.authenticate('google', { scope : ['profile', 'email', 'openid'] }));

app.get('/auth/callback',
  (req, res, next) => {
    if(req.session.lovesPasi) {
      next();
    } else {
      res.redirect("/login.html?wrongpass");
    }
  },
  passport.authenticate('google', { failureRedirect: '/error.html' }),
  function(req, res) {
    db.trackIp(req.session.passport.user.id,req.ip).catch(e=>console.error(e));
    // Successful authentication, redirect success.
    res.redirect('/index.html');
  });

app.get('/error.html', (req, res) => res.send("error logging in"));

app.get('/login.html', (req, res) => {
  if(config.password) {
    res.sendFile(path.resolve(__dirname, "frontend/login.html"));
  } else {
    res.sendFile(path.resolve(__dirname, "frontend/login-nopass.html"));
  }
});

app.get('/logout.html', (req, res) => res.sendFile(path.resolve(__dirname, "frontend/logout.html")));

app.post('/logout', (req, res) => {
  //This is somewhat hidden as a weak measure against using multiple accounts
  res.setHeader('Set-Cookie', 'connect.sid=');
  res.redirect("/login.html");
});

// For debug purposes only
app.get('/profile.json', async (req, res) => {
  if(!(await db.isAdmin(req.user))) {
    res.send("Not admin!");
    return;
  }
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.send(JSON.stringify(req.session.passport))
});

app.post("/submit", async (req, res) => {
  let trackId = linkToId(req.body.link);
  if(!trackId) {
    res.send("Invalid link");
    return;
  }
  if(easteregg(trackId, res)) {
    return;
  }

  let track = await spotify.getTrack(trackId).catch(err=>{
    console.log(err);
    return(false);
  });
  if(!track) {
    res.send("Invalid track");
    return;
  }

  let status = await db.addTrack(track, req.user).catch(err=>{
    console.log(err);
    return(false);
  });
  if(!status) {
    res.send("Database error");
    return;
  }
  switch(status) {
    case 1:
      res.redirect("/index.html#"+trackId);
      break;
    case 2:
      res.redirect("/index.html?as=1#"+trackId);
      break;
    case 3:
      res.redirect("/index.html?as=2#submit");
      break;
    default:
      res.redirect("/index.html");
  }
});

app.post("/vote", async (req, res) => {
  let trackId = req.body.trackId;
  let value = req.body.value;
  if(!trackId) {
    res.send("ERROR");
    return;
  }
  let status = await db.vote(trackId, req.user, value).catch(err=>{
    console.log(err);
    return("ERROR");
  });
  res.send(String(status));
});

app.post("/remove", async (req, res) => {
  let trackId = req.body.trackId;
  if(!trackId) {
    res.send("ERROR");
    return;
  }
  if(!(await db.isAdmin(req.user))) {
    res.send("Not admin!");
    return;
  }
  let status = await db.removeTrack(trackId).catch(err=>{
    console.log(err);
    return("ERROR");
  });
  res.send(String(status));
});

// DB dump endpoints
app.get("/dump/json", async (req, res) => {
  if(!(await db.isAdmin(req.user))) {
    res.send("Not admin!");
    return;
  }
  res.setHeader('content-type', 'application/json');
  res.send(JSON.stringify(await db.json()));
});

app.get("/dump/txt", async (req, res) => {
  if(!(await db.isAdmin(req.user))) {
    res.send("Not admin!");
    return;
  }
  res.setHeader('content-type', 'text/plain');
  res.send(
    (await db.json())
    .tracks
    .map(e=>"https://open.spotify.com/track/"+e.trackId)
    .join("\n")
  );
});

app.get(["/", "/index.html"], async (req, res) => {
  let d = new Date();
  res.send(buildIndex(
    await db.getTracks(req.user),
    req.query,
    await db.isAdmin(req.user)
  ));
  console.log(`Built index.html in ${new Date()-d} ms`);
});

app.get("/search.html", async (req, res) => {
  let d = new Date();
  res.send(buildSearch(
    await spotify.search(req.query.q)
  ));
  console.log(`Built search.html in ${new Date()-d} ms`);
});

app.listen(port, () => {
  console.log(`biisi.clasu.fi on port ${port}`)
});
