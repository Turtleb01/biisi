const axios = require("axios");

let token;

const config = require("../config.json");

const getToken = async () => {
  token = await axios({
    url: 'https://accounts.spotify.com/api/token',
    method: 'post',
    params: {
      grant_type: 'client_credentials',
      client_id: config.spotifySearch.clientID,
      client_secret: config.spotifySearch.clientSecret
    },
    headers: {
      'Accept':'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }).then(res=>{
    console.log("Got new Spotify search token!");
    return(res.data.access_token);
  }).catch(err=>{
    console.log("Could not get Spotify search token! Trying again in 10s...");
    setTimeout(getToken,10*1000);
  });
}

module.exports.search = async (query) => {
  if(!query) {
    return([]);
  }
  return(await axios({
    url: `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&market=FI`,
    method: "get",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  }).then(res=>{
//    return(res.data);
    return(res.data.tracks.items.map(e=>{return({
      trackId: e.id,
      image: e.album.images[0].url,
      name: e.name,
      artists: e.artists.map(e=>e.name).join(", "),
      releaseDate: e.album.release_date,
      duration: String(Math.floor(e.duration_ms/60000))+":"+String(Math.floor((e.duration_ms%60000)/1000)).padStart(2, "0")
    })}));
  }).catch(e=>{
    console.log(`Error fetching Spotify search for "${query}"`);
    console.log(e);
    return([]);
  }));
}

setInterval(getToken,30*60*1000);
getToken();
