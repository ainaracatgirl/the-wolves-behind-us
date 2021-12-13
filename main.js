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
		
function gethalfuid() {
	const n = Date.now() / Math.random();
	return parseInt(n).toString(16);
}

const roletable = {
  normal: "Ciudadano",
  jester: "Bufón",
  roleswap: "Cambia-roles",
  mayor: "Alcalde",
  wolf: "Lobo",
  dead: "Muerto",
  disconnected: "Conexión perdida"
};

const name = localStorage.getItem('username') ?? prompt("Nombre de Usuario") ?? gethalfuid();
localStorage.setItem('username', name);

let role = "normal";
let dead = false;
let deadtime = 0;
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
let uid = name;

const ch = document.querySelector('#chat');

const conn = BroadcastWS(uid, [ "wolfwarestudios:twbu/position", "wolfwarestudios:twbu/kill", "wolfwarestudios:twbu/getroles", "wolfwarestudios:twbu/role", "wolfwarestudios:twbu/votetime", "wolfwarestudios:twbu/vote", "wolfwarestudios:twbu/setrole", "wolfwarestudios:twbu/chat" ]);
conn.addEventListener('message', (ev) => {
	const packet = JSON.parse(ev.data);
   if (packet.event == 'wolfwarestudios:twbu/position') {
		players[packet.uid] = { x: packet.x, y: packet.y, dir: packet.dir, time: Date.now(), col: packet.col };
	} else if (packet.event == 'wolfwarestudios:twbu/role') {
	  console.log(packet.uid, packet.role);
		roles[packet.uid] = packet.role;
	} else if (packet.event == 'wolfwarestudios:twbu/getroles') {
		if (role != undefined && !dead)
			conn.event('wolfwarestudios:twbu/role', { role, uid });
	} else if (packet.event == 'wolfwarestudios:twbu/kill') {
	  console.log(packet.dead, uid);
	  // TODO: this be fixed
	  // delete players[packet.dead];
	  // delete playersl[packet.dead];
	  
		if (packet.dead == uid) {
		  if (role == "jester") conn.event("wolfwarestudios:twbu/kill", { dead: packet.$sender });
		  role = "dead";		  
		  dead = true;
		  deadtime = Math.random() * -5;
		}
	} else if (packet.event == "wolfwarestudios:twbu/votetime") {
  	  console.log("vote time started (evt)");
  	  if (nearplayer != null && role == "roleswap") {
  	    role = roles[nearplayer];
  	    conn.event("wolfwarestudios:twbu/setrole", { uid: nearplayer, role: "roleswap" });
  	  }
	  votetime = 60 + 10 + Math.random() * 5;
	  endvotetime = 30;
	  voting = true;
	  voteproc = true;
	  votesplay = {};
	  cankill = false;
	} else if (packet.event == "wolfwarestudios:twbu/vote") {
	  if (!(packet.uid in votesplay)) votesplay[packet.uid] = 0;
	  votesplay[packet.uid]++;
	} else if (packet.event == "wolfwarestudios:twbu/setrole") {
	  roles[packet.uid] = packet.role;
	  if (uid == packet.uid) role = packet.role;
	} else if (packet.event == "wolfwarestudios:twbu/chat") {
	  ch.innerHTML = packet.uid + ": " + packet.msg + "<br>" + ch.innerHTML;
	}
});
conn.addEventListener('close', (ev) => {
	console.log(`Closed [${ev.code}] ${ev.reason}`);
	location.reload();
	role = "disconnected";
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
	} else {
	  role = 'normal';
	  if (Math.random() < .05) role = 'jester';
	  if (Math.random() < .05) role = 'mayor';
	  if (Math.random() < .05) role = 'roleswap';
	}
	roles[uid] = role;
	conn.event('wolfwarestudios:twbu/role', { role, uid });
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
const starters = [[32,240],[128,240],[208,288],[32,336],[128,384],[224,416],[368,416],[528,384],[528,288],[368,256]];
const start = starters[Math.floor(Math.random()*starters.length)];
cam.x = start[0];
cam.y = start[1];

function sendpos() {
  if (dead) return;
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
    endvotetime = 30;
    voting = true;
    cankill = false;
    voteproc = true;
    votesplay = {};
  }
  
  if (dead) {
    deadtime += 1;
    if (deadtime > 30) {
      location.reload();
    }
  }
  if (role != undefined)
  	document.getElementById('l').textContent = `Rol: ${roletable[role]}`;
}, 1000);
setInterval(() => sendpos(), 2500);
function animate() {
	dlib.clear();

	dlib.camera(cam.x, cam.y);
	dlib.background("background");
	//dlib.background("collision");
	
	if (dead) {
	  dlib.ctx.filter = "grayscale(1)";
	} else {
	  if (voteproc) dlib.ctx.filter = "none";
	  else dlib.ctx.filter = "brightness(50%)";
	}
	

	dlib.blit(`assets/player/${animd}_${parseInt(animi)}`, dlib.cx+128, dlib.cy+72-8);

	const playersToRemove = [];
	nearplayer = null;
	let neardst = 5 * 8;
	for (const puid of Object.keys(players)) {	  
		const player = players[puid];
		if (!(puid in playersl)) playersl[puid] = [0,0];
		
		const smooth = 6;
		
		playersl[puid][0] *= smooth-1;
		playersl[puid][1] *= smooth-1;
		playersl[puid][0] += player.x;
		playersl[puid][1] += player.y;
		playersl[puid][0] /= smooth;
		playersl[puid][1] /= smooth;
		if (Date.now() - player.time > 5000) {
			playersToRemove.push(puid);
			continue;
		}

		dlib.blit(`assets/player/${player.dir}_0`, playersl[puid][0]+128, playersl[puid][1] + 72-8);
		dlib.text(puid, playersl[puid][0]+128, playersl[puid][1] + 72+8);

		const dst = Math.sqrt((player.x - cam.x) ** 2, (player.y - cam.y) ** 2);
		if (dst < neardst) {
		  nearplayer = puid;
		  neardst = dst;
		}
	}
	for (const p of playersToRemove) {
		delete players[p];
	}
	
	if (voting && role != "wolf" && !dead) {
	  dlib.blit("vote", 256-16-8 + dlib.cx, 144-16-8 + dlib.cy);
	}
	if (cankill && role == "wolf" && !dead) {
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
	if (ev.repeat) return;
	if (animi > .1 && animi < 2.75) return;
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
	if (ev.key == 'v' && voting && role != "wolf" && nearplayer != null && nearplayer != uid && !dead) {
	  voting = false;
	  console.log("vote", nearplayer);
	  conn.event("wolfwarestudios:twbu/vote", { uid: nearplayer });
	  if (role == "mayor") conn.event("wolfwarestudios:twbu/vote", { uid: nearplayer });
	}
	if (ev.key == 'k' && cankill && role == "wolf" && nearplayer != null && nearplayer != uid && !dead) {
	  cankill = false;
	  console.log("kill", nearplayer);
	  conn.event("wolfwarestudios:twbu/kill", { dead: nearplayer });
	}
	
	if (cam.x+128 < 0 || cam.x > 880) {
	  cam.x = ox;
	}
	if (cam.y+72-8 < 0 || cam.y+72-8 > 496+72-8) {
	  cam.y = oy;
	}
	
	if (collcheck(cam.x + 128, cam.y + 72 - 8)) {
		cam.x = ox;
		cam.y = oy;
	}
	
	if (ev.key == "Enter" && !dead) {
	  let msg = prompt("Chat");
	  if (msg && msg.trim() != "") {
	    msg = msg.slice(0, 64);
	    conn.event("wolfwarestudios:twbu/chat", { uid, msg });
	    ch.innerHTML = uid + ": " + msg + "<br>" + ch.innerHTML;
	  }
	}
});

function killall() {
  for (const puid of Object.keys(players)) {
    if (puid == uid) continue;
    conn.event("wolfwarestudios:twbu/kill", { dead: tokill     });
  }
}