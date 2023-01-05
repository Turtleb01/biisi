const axios = require("axios");

let token;
module.exports.teuvo = "7Is3Em61eq1jvUIEF7mB4r";

const config = require("../config.json");

const getToken = async () => {
  token = await axios({
    url: 'https://accounts.spotify.com/api/token',
    method: 'post',
    params: {
      grant_type: 'client_credentials',
      client_id: config.spotify.clientID,
      client_secret: config.spotify.clientSecret
    },
    headers: {
      'Accept':'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }).then(res=>{
    console.log("Got new Spotify token!");
    return(res.data.access_token);
  }).catch(err=>{
    console.log("Could not get Spotify token! Trying again in 10s...");
    setTimeout(getToken,10*1000);
  });
}

module.exports.getTrack = async (id) => {
  if(!id.match(/^[a-z0-9]{22}$/i)) {
    return(undefined);
  }
  return(await axios({
    url: `https://api.spotify.com/v1/tracks/${id}?market=FI`,
    method: "get",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  }).then(res=>{
    console.log(res.data);
    return({
      trackId: id,
      image: res.data.album.images[0].url,
      name: res.data.name,
      artists: res.data.artists.map(e=>e.name).join(", "),
      duration: String(Math.floor(res.data.duration_ms/60000))+":"+String(Math.floor((res.data.duration_ms%60000)/1000)).padStart(2, "0")
    });
  }).catch(e=>{
    console.log(`Error fetching Spotify track ${id}`);
    console.log(e);
    return(undefined);
  }));
}

setInterval(getToken,30*60*1000);
getToken();
