class DrawLib {
    constructor(selector, options={}) {
        this.canvas = document.querySelector(selector);
        this.ctx = this.canvas.getContext('2d');
        this.vw = this.canvas.width;
        this.vh = this.canvas.height;
        this.tw = options.tileWidth || 8;
        this.th = options.tileHeight || 8;
        this.sprites = {};
        this.cx = 0;
        this.cy = 0;
        this.cax = 0;
        this.cay = 0;
        this.lt = Date.now();
    }

    loadSprite(spr, path) {
        const img = document.createElement('img');
        img.src = path;
        this.sprites[spr] = img;
    }

    camera(x, y) {
        this.cax = x;
        this.cay = y;
    }

    background(spr) {
        this.ctx.drawImage(this.sprites[spr], 0 - this.cx, 0 - this.cy);
    }

    blit(spr, x, y) {
        this.ctx.drawImage(this.sprites[spr], x - this.cx, y - this.cy);
    }

    blitc(spr, x, y, col) {
      this.ctx.drawImage(this.sprites[spr], x - this.cx, y - this.cy);
      this.ctx.globalCompositeOperation = "source-atop";
      this.ctx.fillStyle = col;
      this.ctx.fillRect(x - this.cx, y - this.cy, this.sprites[spr].width, this.sprites[spr].height);
      this.ctx.globalCompositeOperation = "source-over";
    }

    clear() {
        const deltaTime = (Date.now() - this.lt) / 100;
        this.ctx.clearRect(0, 0, this.vw, this.vh);
        this.cx = this._lerp(this.cx, this.cax, deltaTime * 1);
        this.cy = this._lerp(this.cy, this.cay, deltaTime * 1);

        this.lt = Date.now();
    }

    _lerp(a, b, k) {
        return (1 - k) * a + b * k;
    }
}