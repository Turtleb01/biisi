const { Sequelize, Op, DataTypes, QueryTypes } = require('sequelize');

const config = require("./../config.json");

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'db.sqlite',
  logging: false
});

const Track = sequelize.define('Track', {
  trackId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      is: /^[0-9a-z]{22}$/i
    }
  },
  image: {
    type: DataTypes.STRING,
    allowNull: false
  },
  preview: {
    type: DataTypes.STRING,
    allowNull: true
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  artists: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  duration: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  user: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      is: /^[0-9]+$/i
    }
  }
}, {});

const Vote = sequelize.define('Vote', {
  trackId: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      is: /^[0-9a-z]{22}$/i
    }
  },
  user: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      is: /^[0-9]+$/i
    }
  },
  value: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: -1,
      max: 1
    }
  }
}, {});

const User = sequelize.define('User', {
  user: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      is: /^[0-9]+$/i
    }
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contact: {
    type: DataTypes.STRING,
    allowNull: true
  },
  spotifyId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  admin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {});

sequelize.sync();

module.exports.addUser = async (user) => {
  //id
  //displayName
  //emails[0]?.value
  console.log("Adding new user "+user.id+"...");
  await User.create({
    user: user.id,
    username: user.displayName,
    contact: user.emails[0]?.value,
    admin: config.adminList.includes(user.id)
  }).then(()=>{
    console.log("Successfully added user");
  }).catch(err=>{
    console.log("User already exists");
  });
}

module.exports.addTrack = async (track, user) => {
  console.log("Adding new track "+track.trackId+"...");
//  if(!(await module.exports.checkUser(user)) {
//    console.log("User doesn't exist!");
//    return(false);
//  }
  let votes = await Vote.count({
    where: {
      user: user,
      value: {
        [Op.or]: [-1,1]
      }
    }
  }).catch(()=>1000);

  let submitted = await Track.count({
    where: {
      user: user
    }
  }).catch(()=>0);
  if((submitted>=Math.floor(votes/5)+2)&&!(await module.exports.isAdmin(user))) {
    console.log(`User ${user} has submitted ${submitted} tracks while they have voted ${votes} times!`);
    return 3;
  }

  return(await Track.create({
    trackId: track.trackId,
    image: track.image,
    name: track.name,
    artists: track.artists,
    duration: track.duration,
    user: user
  }).then(()=>{
    console.log("Successfully added track");
    module.exports.vote(track.trackId, user, 1);
    return 1;
  }).catch(err=>{
    console.log("Track already submitted or other error");
    console.log(err);
    return 2;
  }));
}

module.exports.getTracks = async (user) => {
  // SQL gore
  let tracks = await sequelize.query("SELECT t.*, SUM(v.value) AS votes, m.value AS vote, u.username AS username FROM Tracks AS t LEFT JOIN Users AS u ON u.user=t.user LEFT JOIN Votes AS v ON v.trackId=t.trackId LEFT JOIN Votes AS m ON m.trackId=t.trackId AND m.user=? GROUP BY t.trackId ORDER BY t.createdAt;",{
    replacements: [user],
    type: QueryTypes.SELECT,
    raw: true
  });
  return(tracks.map(e=>({
    ...e,
    votes: Number(e.votes),
    vote: Number(e.vote),
    username: e.username||"unknown user"
  })).reverse());
}

module.exports.getVotes = (trackId) => {
  return(Vote.sum('value', {
    where: {trackId: trackId}
  }).then(e=>Number(e)));
}

module.exports.removeTrack = (trackId) => {
  return(Track.destroy({
    where: {trackId: trackId}
  }).then(e=>"Success"));
}

module.exports.getVote = async (trackId, user) => {
  return(Vote.sum('value', {
    where: {trackId: trackId, user: user}
  }).then(e=>Number(e)));
}

module.exports.isAdmin = async (user) => {
  return(User.findOne({
    where: {user: user}
  }).then(e=>Boolean(e.admin))
  .catch(()=>false));
}

module.exports.getUser = async (user) => {
  return(User.findOne({
    where: {user: user}
  }).then(e=>[e.username, e.contact])
  .catch(()=>["Not found","Not found"]));
}

module.exports.vote = async (trackId, user, valueStr) => {
  let value = Number(valueStr);
  if(!([-1,0,1].includes(value))) {
    console.log("Invalid vote!");
    return(false);
  }
  if(!(await Track.findOne({
    where: {
      trackId: trackId
    }
  }))) {
    console.log("Invalid track")
    return(false);
  }
  let status = await Vote.findOne({
    where: {
      trackId: trackId,
      user: user
    }
  }).then(e=>{
    if(e) {
      return(e.update({
        value: value
      }).catch(()=>"Unknown vote update error"));
    } else {
      return(Vote.create({
        trackId: trackId,
        user: user,
        value: value
      }).catch(()=>"Unknown vote update error"));
    }
  }).catch(e=>{
    console.log("Unknown vote error!");
    return(false);
  });
  return(await module.exports.getVotes(trackId));
}

module.exports.trackIp = (user,ip) => {
  return(User.update({
    ip: ip
  },{
    where: {
      user: user
    }
  }));
}

module.exports.json = async () => {
  let users = await User.findAll({raw: true});
  let tracks = await Track.findAll({raw: true});
  let votes = await Vote.findAll({raw: true});
  return({
    tracks: tracks.map(e=>({
      ...e,
      userinfo: users.find(u=>u.user==e.user),
      votes: votes.filter(u=>u.trackId==e.trackId).map(e=>({
        ...e,
        username: users.find(u=>u.user==e.user)?.username
      }))
    })),
    users: users.map(e=>({
      ...e,
      tracks: tracks.filter(u=>u.user==e.user),
      votes: votes.filter(u=>u.user==e.user).map(e=>({
        ...e,
        trackname: tracks.find(u=>u.trackId==e.trackId)?.name
      }))
    }))
  });
}
