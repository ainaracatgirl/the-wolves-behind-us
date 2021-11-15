const dlib = new DrawLib("#canvas");
dlib.loadSprite("kill", "assets/spr_kill.png");
dlib.loadSprite("vote", "assets/spr_vote.png");
dlib.loadSprite("background", "spr_background.png");
dlib.loadSprite("collision", "spr_collision.png");

let collcheck = (x, y) => false;
let collmap = (function() {
	return new Promise((resolve, reject) => {
		const img = document.createElement('img');
		img.src = "spr_collision.png";
		img.onload = () => {
			const cnv = document.createElement('canvas');
			cnv.width = img.width;
			cnv.height = img.height;
			const ctx = cnv.getContext('2d');
			ctx.drawImage(img, 0, 0);
			resolve(ctx);
		};
	});
})();

collmap.then((e) => {
  collmap = e;
	collcheck = (x, y) => {	  
	  return e.getImageData(x, y, 1, 1).data[0] > 0;
	};
});
		
function getuid() {
	const n = Date.now() / Math.random();
	const k = Date.now() / Math.random();
	return parseInt(n).toString(16) + parseInt(k).toString(16);
}

let role = undefined;
let cankill = false;
let endvotetime = 0;
let votetime = 60;
let voting = false;
let voteproc = false;
let nearplayer = null;
let votesplay = {};
let roles = {};
let players = {};
let playersl = {};
let uid = getuid();

const conn = BroadcastWS(uid, [ "wolfwarestudios:twbu/position", "wolfwarestudios:twbu/kill", "wolfwarestudios:twbu/getroles", "wolfwarestudios:twbu/role", "wolfwarestudios:twbu/votetime", "wolfwarestudios:twbu/vote" ]);
conn.addEventListener('message', (ev) => {
	const packet = JSON.parse(ev.data);
   if (packet.event == 'wolfwarestudios:twbu/position') {
		players[packet.uid] = { x: packet.x, y: packet.y, dir: packet.dir, time: Date.now() };
	} else if (packet.event == 'wolfwarestudios:twbu/role') {
		roles[packet.uid] = packet.role;
	} else if (packet.event == 'wolfwarestudios:twbu/getroles') {
		if (role != undefined)
			conn.event('wolfwarestudios:twbu/role', { role: role });
	} else if (packet.event == 'wolfwarestudios:twbu/kill') {
	  console.log(packet.dead, uid);
		if (packet.dead == uid && !voting) {
			conn.close();
			location.href = "/dead.html";
		}
	} else if (packet.event == "wolfwarestudios:twbu/votetime") {
  	  console.log("vote time started (evt)");
	  votetime = 60 + 10 + Math.random() * 5;
	  endvotetime = 10;
	  voting = true;
	  voteproc = true;
	  votesplay = {};
	  cankill = false;
	} else if (packet.event == "wolfwarestudios:twbu/vote") {
	  if (!(packet.uid in votesplay)) votesplay[packet.uid] = 0;
	  votesplay[packet.uid]++;
	}
});
conn.addEventListener('close', (ev) => {
	console.log(`Closed [${ev.code}] ${ev.reason}`);
});
conn.addEventListener('open', (ev) => {
	conn.event('wolfwarestudios:twbu/getroles', {});
});

setTimeout(() => {
	let wolves = 0;
	for (const roler in roles) {
		if (roles[roler] == 'wolf') wolves++;
	}
	if (wolves < 2) {
		role = 'wolf';
	} else { role = 'normal'; }
	roles[uid] = role;
	conn.event('wolfwarestudios:twbu/role', { role });
}, 1000);

const anims = [
	'assets/player/front_0.png',
	'assets/player/front_1.png',
	'assets/player/front_2.png',

	'assets/player/right_0.png',
	'assets/player/right_1.png',
	'assets/player/right_2.png',

	'assets/player/left_0.png',
	'assets/player/left_1.png',
	'assets/player/left_2.png',

	'assets/player/back_0.png',
	'assets/player/back_1.png',
	'assets/player/back_2.png'
].map(x => {dlib.loadSprite(x.replace('.png', ''), x);return x.replace('.png', '')});

let animi = 0;
let animp = false;
let animd = 'left';

let statem = 'play';

const cam = { x: 0, y: 0, _: false };

function sendpos() {
	conn.event("wolfwarestudios:twbu/position", { uid, x: cam.x, y: cam.y, dir: animd });
}

setInterval(() => {
  votetime--;
  endvotetime--;
  if (endvotetime <= 0 && voteproc) {
    console.log("vote time ended");
    voteproc = false;
    voting = false;
    cankill = true;
    let tokill = null;
    let tokillv = 0;
    for (const puid in votesplay) {
      if (votesplay[puid] > tokillv) {
        tokillv = votesplay[puid];
        tokill = puid;
      }
    }
    if (tokill != null)
      conn.event("wolfwarestudios:twbu/kill", { dead: tokill });
  }
  if (votetime <= 0) {
    conn.event("wolfwarestudios:twbu/votetime");
    console.log("vote time started");
    votetime = 60 + 10 + Math.random() * 5;
    endvotetime = 10;
    voting = true;
    cankill = false;
    voteproc = true;
    votesplay = {};
  }
}, 1000);
setInterval(() => sendpos(), 2500);
function animate() {
	dlib.clear();

	dlib.camera(cam.x, cam.y);
	dlib.background("background");
	//dlib.background("collision");

	dlib.blit(`assets/player/${animd}_${parseInt(animi)}`, dlib.cx+128, dlib.cy+72-8);

	const playersToRemove = [];
	nearplayer = null;
	let neardst = 5 * 8;
	for (const puid of Object.keys(players)) {	  
		const player = players[puid];
		if (!(puid in playersl)) playersl[puid] = [0,0];
		playersl[puid][0] += player.x;
		playersl[puid][1] += player.y;
		playersl[puid][0] /= 2;
		playersl[puid][1] /= 2;
		if (Date.now() - player.time > 5000) {
			playersToRemove.push(puid);
			continue;
		}
		dlib.blit(`assets/player/${player.dir}_0`, playersl[puid][0]+128, playersl[puid][1] + 72-8);
		const dst = Math.sqrt((player.x - cam.x) ** 2, (player.y - cam.y) ** 2);
		if (dst < neardst) {
		  nearplayer = puid;
		  neardst = dst;
		}
	}
	for (const p of playersToRemove) {
		delete players[p];
	}
	
	if (voting && role != "wolf") {
	  dlib.blit("vote", 256-16-8 + dlib.cx, 144-16-8 + dlib.cy);
	}
	if (cankill && role == "wolf") {
	  dlib.blit("kill", 256-16-8 + dlib.cx, 144-16-8 + dlib.cy);
	}
	
	if (animp) {
		animi += .25;
		if (animi >= 3) {
			animp = false;
			animi = 0;
		}
	}
	if (cam._) {
		sendpos();
		cam._ = false;
	}
	requestAnimationFrame(animate);
}
animate();

window.addEventListener('keydown', (ev) => {
	if (statem != 'play') return;
	const ox = cam.x;
	const oy = cam.y;
	
	if (ev.key == 'ArrowLeft') {
		cam.x -= 16;
		cam._ = true;
		animp = true;
		animd = 'left';
	}
	if (ev.key == 'ArrowRight') {
		cam.x += 16;
		cam._ = true;
		animp = true;
		animd = 'right';
	}
	if (ev.key == 'ArrowUp') {
		cam.y -= 16;
		cam._ = true;
		animp = true;
		animd = 'back';
	}
	if (ev.key == 'ArrowDown') {
		cam.y += 16;
		cam._ = true;
		animp = true;
		animd = 'front';
	}
	if (ev.key == 'v' 	&& voting && role != "wolf" && nearplayer != null) {
	  voting = false;
	  console.log("vote", nearplayer);
	  conn.event("wolfwarestudios:twbu/vote", { uid: nearplayer });
	}
	if (ev.key == 'k' && cankill && role == "wolf" && nearplayer != null) {
	  cankill = false;
	  console.log("kill", nearplayer);
	  conn.event("wolfwarestudios:twbu/kill", { dead: nearplayer });
	}
	
	if (collcheck(cam.x + 128, cam.y + 72 - 8)) {
		cam.x = ox;
		cam.y = oy;
	}
});