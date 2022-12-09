// http://www.websiteasteroids.com
function Asteroids() {
  if (!window.ASTEROIDS) window.ASTEROIDS = {
    enemiesKilled: 0
  };
  class Vector {
    constructor(x, y) {
      if (typeof x === "Object") {
        this.x = x.x;
        this.y = x.y;
      } else {
        this.x = x;
        this.y = y;
      }
    }
    cp() {
      return new Vector(this.x, this.y);
    }
    mul(factor) {
      this.x *= factor;
      this.y *= factor;
      return this;
    }
    mulNew(factor) {
      return new Vector(this.x * factor, this.y * factor);
    }
    add(vec) {
      this.x += vec.x;
      this.y += vec.y;
      return this;
    }
    addNew(vec) {
      return new Vector(this.x + vec.x, this.y + vec.y);
    }
    sub(vec) {
      this.x -= vec.x;
      this.y -= vec.y;
      return this;
    }
    subNew(vec) {
      return new Vector(this.x - vec.x, this.y - vec.y);
    }
    rotate(angle) {
      const x = this.x, y = this.y;
      this.x = x * Math.cos(angle) - Math.sin(angle) * y;
      this.y = x * Math.sin(angle) + Math.cos(angle) * y;
      return this;
    }
    rotateNew(angle) {
      return this.cp().rotate(angle);
    }
    setAngle(angle) {
      const l = this.len();
      this.x = Math.cos(angle) * l;
      this.y = Math.sin(angle) * l;
      return this;
    }
    setAngleNew(angle) {
      return this.cp().setAngle(angle);
    }
    setLength(length) {
      const l = this.len();
      if (l) this.mul(length / l);
      else this.x = this.y = length;
      return this;
    }
    setLengthNew(length) {
      return this.cp().setLength(length);
    }
    normalize() {
      const l = this.len();
      this.x /= l;
      this.y /= l;
      return this;
    }
    normalizeNew() {
      return this.cp().normalize();
    }
    angle() {
      return Math.atan2(this.y, this.x);
    }
    collidesWith(rect) {
      return this.x > rect.x && this.y > rect.y && this.x < rect.x + rect.width && this.y < rect.y + rect.height;
    }
    len() {
      const l = Math.sqrt(this.x * this.x + this.y * this.y);
      if (l < 0.005 && l > -0.005) return 0;
      return l;
    }
    is(test) {
      return typeof test === "object" && this.x === test.x && this.y === test.y;
    }
    toString() {
      return "[Vector(" + this.x + ", " + this.y + ") angle: " + this.angle() + ", length: " + this.len() + "]";
    }
  }

  class Line {
    constructor(p1, p2) {
      this.p1 = p1;
      this.p2 = p2;
    }
    shift(pos) {
      this.p1.add(pos);
      this.p2.add(pos);
    }
    intersectsWithRect(rect) {
      const LL = new Vector(rect.x, rect.y + rect.height);
      const UL = new Vector(rect.x, rect.y);
      const LR = new Vector(rect.x + rect.width, rect.y + rect.height);
      const UR = new Vector(rect.x + rect.width, rect.y);
      if (this.p1.x > LL.x && this.p1.x < UR.x && this.p1.y < LL.y && this.p1.y > UR.y && this.p2.x > LL.x && this.p2.x < UR.x && this.p2.y < LL.y && this.p2.y > UR.y) return true;
      if (this.intersectsLine(new Line(UL, LL))) return true;
      if (this.intersectsLine(new Line(LL, LR))) return true;
      if (this.intersectsLine(new Line(UL, UR))) return true;
      if (this.intersectsLine(new Line(UR, LR))) return true;
      return false;
    }
    intersectsLine(line2) {
      const v1 = this.p1, v2 = this.p2;
      const v3 = line2.p1, v4 = line2.p2;
      const denom = ((v4.y - v3.y) * (v2.x - v1.x)) - ((v4.x - v3.x) * (v2.y - v1.y));
      const numerator = ((v4.x - v3.x) * (v1.y - v3.y)) - ((v4.y - v3.y) * (v1.x - v3.x));
      const numerator2 = ((v2.x - v1.x) * (v1.y - v3.y)) - ((v2.y - v1.y) * (v1.x - v3.x));
      if (denom === 0.0) {
        return false;
      }
      const ua = numerator / denom;
      const ub = numerator2 / denom;
      return (ua >= 0.0 && ua <= 1.0 && ub >= 0.0 && ub <= 1.0);
    }
  }
  const that = this;
  const isIE = !! window.ActiveXObject;
  let w = document.documentElement.clientWidth, h = document.documentElement.clientHeight;
  const playerWidth = 20, playerHeight = 30;
  const playerVerts = [
    [-1 * playerHeight / 2, -1 * playerWidth / 2],
    [-1 * playerHeight / 2, playerWidth / 2],
    [playerHeight / 2, 0]
  ];
  const ignoredTypes = ["HTML", "HEAD", "BODY", "SCRIPT", "TITLE", "META", "STYLE", "LINK", "SHAPE", "LINE", "GROUP", "IMAGE", "STROKE", "FILL", "SKEW", "PATH", "TEXTPATH"];
  const hiddenTypes = ["BR", "HR"];
  const FPS = 50;
  const acc = 300;
  const maxSpeed = 600;
  const rotSpeed = 360;
  const bulletSpeed = 700;
  const particleSpeed = 400;
  const timeBetweenFire = 150;
  const timeBetweenBlink = 250;
  const bulletRadius = 2;
  const maxParticles = isIE ? 20 : 40;
  const maxBullets = isIE ? 10 : 20;
  this.flame = {
    r: [],
    y: []
  };
  this.toggleBlinkStyle = function() {
    if (this.updated.blink.isActive) {
      document.body.classList.remove("ASTEROIDSBLINK");
    } else {
      document.body.classList.add("ASTEROIDSBLINK");
    }
    this.updated.blink.isActive = !this.updated.blink.isActive;
  };
  addStylesheet(".ASTEROIDSBLINK .ASTEROIDSYEAHENEMY", "outline: 2px dotted red;");
  this.pos = new Vector(100, 100);
  this.lastPos = false;
  this.vel = new Vector(0, 0);
  this.dir = new Vector(0, 1);
  this.keysPressed = {};
  this.firedAt = false;
  this.updated = {
    enemies: false,
    flame: new Date().getTime(),
    blink: {
      time: 0,
      isActive: false
    }
  };
  this.scrollPos = new Vector(0, 0);
  this.bullets = [];
  this.enemies = [];
  this.dying = [];
  this.totalEnemies = 0;
  this.particles = [];

  function updateEnemyIndex() {
    for (let enemy of that.enemies) {
      enemy.classList.remove("ASTEROIDSYEAHENEMY");
    }
    const all = document.body.getElementsByTagName("*");
    that.enemies = [];
    for (let i = 0, el; el = all[i]; i++) {
      if (!(ignoredTypes.includes(el.tagName.toUpperCase())) && el.prefix !== "g_vml_" && hasOnlyTextualChildren(el) && el.className !== "ASTEROIDSYEAH" && el.offsetHeight > 0) {
        el.aSize = size(el);
        that.enemies.push(el);
        el.classList.add("ASTEROIDSYEAHENEMY");
        if (!el.aAdded) {
          el.aAdded = true;
          that.totalEnemies++;
        }
      }
    }
  };
  updateEnemyIndex();
  let createFlames;
  (function() {
    const rWidth = playerWidth, rIncrease = playerWidth * 0.1, yWidth = playerWidth * 0.6, yIncrease = yWidth * 0.2, halfR = rWidth / 2, halfY = yWidth / 2, halfPlayerHeight = playerHeight / 2;
    createFlames = function() {
      that.flame.r = [
        [-1 * halfPlayerHeight, -1 * halfR]
      ];
      that.flame.y = [
        [-1 * halfPlayerHeight, -1 * halfY]
      ];
      for (let x = 0; x < rWidth; x += rIncrease) {
        that.flame.r.push([-random(2, 7) - halfPlayerHeight, x - halfR]);
      }
      that.flame.r.push([-1 * halfPlayerHeight, halfR]);
      for (let x = 0; x < yWidth; x += yIncrease) {
        that.flame.y.push([-random(2, 7) - halfPlayerHeight, x - halfY]);
      }
      that.flame.y.push([-1 * halfPlayerHeight, halfY]);
    };
  })();
  createFlames();

  function radians(deg) {
    return deg * Math.PI / 180;
  };

  function random(from, to) {
    return Math.floor(Math.random() * (to + 1) + from);
  };

  function boundsCheck(vec) {
    if (vec.x > w) vec.x = 0;
    else if (vec.x < 0) vec.x = w;
    if (vec.y > h) vec.y = 0;
    else if (vec.y < 0) vec.y = h;
  };

  function size(element) {
    let el = element, left = 0, top = 0;
    do {
      left += el.offsetLeft || 0;
      top += el.offsetTop || 0;
      el = el.offsetParent;
    } while (el);
    return {
      x: left,
      y: top,
      width: element.offsetWidth || 10,
      height: element.offsetHeight || 10
    };
  };

  function applyVisibility(vis) {
    for (let p of window.ASTEROIDSPLAYERS) {
      p.gameContainer.style.visibility = vis;
    }
  }

  function getElementFromPoint(x, y) {
    applyVisibility("hidden");
    let element = document.elementFromPoint(x, y);
    if (!element) {
      applyVisibility("visible");
      return false;
    }
    if (element.nodeType === 3) element = element.parentNode;
    applyVisibility("visible");
    return element;
  };

  function addParticles(startPos) {
    const time = new Date().getTime();
    const amount = maxParticles;
    for (let i = 0; i < amount; i++) {
      that.particles.push({
        dir: (new Vector(Math.random() * 20 - 10, Math.random() * 20 - 10)).normalize(),
        pos: startPos.cp(),
        cameAlive: time
      });
    }
  };

  function setScore() {
    that.points.innerHTML = window.ASTEROIDS.enemiesKilled * 10;
  };

  function hasOnlyTextualChildren(element) {
    if (element.offsetLeft < -100 && element.offsetWidth > 0 && element.offsetHeight > 0) return false;
    if (hiddenTypes.includes(element.tagName)) return true;
    if (element.offsetWidth === 0 && element.offsetHeight === 0) return false;
    for (let i = 0; i < element.childNodes.length; i++) {
      if (!(hiddenTypes.includes(element.childNodes[i].tagName)) && element.childNodes[i].childNodes.length !== 0) return false;
    }
    return true;
  };

  function addStylesheet(selector, rules) {
    const stylesheet = document.createElement("style");
    stylesheet.rel = "stylesheet";
    stylesheet.id = "ASTEROIDSYEAHSTYLES";
    try {
      stylesheet.innerHTML = selector + "{" + rules + "}";
    } catch (e) {
      stylesheet.styleSheet.addRule(selector, rules);
    }
    document.getElementsByTagName("head")[0].appendChild(stylesheet);
  };

  function removeStylesheet(name) {
    const stylesheet = document.getElementById(name);
    if (stylesheet) {
      stylesheet.parentNode.removeChild(stylesheet);
    }
  };
  this.gameContainer = document.createElement("div");
  this.gameContainer.className = "ASTEROIDSYEAH";
  document.body.appendChild(this.gameContainer);
  this.canvas = document.createElement("canvas");
  this.canvas.setAttribute("width", w);
  this.canvas.setAttribute("height", h);
  this.canvas.className = "ASTEROIDSYEAH";
  Object.assign(this.canvas.style, {
    width: w + "px",
    height: h + "px",
    position: "fixed",
    top: "0px",
    left: "0px",
    bottom: "0px",
    right: "0px",
    zIndex: "10000"
  });
  this.canvas.addEventListener("mousedown", function(e) {
    const message = document.createElement("span");
    message.style.position = "absolute";
    message.style.color = "red";
    message.innerHTML = "Press Esc to Quit";
    document.body.appendChild(message);
    const x = e.pageX || (e.clientX + document.documentElement.scrollLeft);
    const y = e.pageY || (e.clientY + document.documentElement.scrollTop);
    message.style.left = x - message.offsetWidth / 2 + "px";
    message.style.top = y - message.offsetHeight / 2 + "px";
    setTimeout(function() {
      try {
        message.parentNode.removeChild(message);
      } catch (e) {}
    }, 1000);
  }, false);
  const eventResize = function() {
    that.canvas.style.display = "none";
    w = document.documentElement.clientWidth;
    h = document.documentElement.clientHeight;
    that.canvas.setAttribute("width", w);
    that.canvas.setAttribute("height", h);
    Object.assign(that.canvas.style, {
      display: "block",
      width: w + "px",
      height: h + "px"
    });
  };
  window.addEventListener("resize", eventResize, false);
  this.gameContainer.appendChild(this.canvas);
  this.ctx = this.canvas.getContext("2d");
  this.ctx.fillStyle = "black";
  this.ctx.strokeStyle = "black";
  if (!document.getElementById("ASTEROIDS-NAVIGATION")) {
    this.navigation = document.createElement("div");
    this.navigation.id = "ASTEROIDS-NAVIGATION";
    this.navigation.className = "ASTEROIDSYEAH";
    Object.assign(this.navigation.style, {
      fontFamily: "Arial,sans-serif",
      position: "fixed",
      zIndex: "10001",
      bottom: "20px",
      right: "10px",
      textAlign: "right"
    });
    this.navigation.innerHTML = "(Press Esc to Quit) ";
    this.gameContainer.appendChild(this.navigation);
    this.points = document.createElement("span");
    this.points.id = "ASTEROIDS-POINTS";
    this.points.style.font = "28pt Arial, sans-serif";
    this.points.style.fontWeight = "bold";
    this.points.className = "ASTEROIDSYEAH";
    this.navigation.appendChild(this.points);
  } else {
    this.navigation = document.getElementById("ASTEROIDS-NAVIGATION");
    this.points = document.getElementById("ASTEROIDS-POINTS");
  }
  setScore();
  const eventKeydown = function(event) {
    that.keysPressed[event.key] = true;
    switch (event.key) {
      case " ":
        that.firedAt = 1;
        break;
    }
    if (["ArrowUp", "ArrowDown", "ArrowRight", "ArrowLeft", " ", "b", "w", "a", "s", "d"].includes(event.key)) {
      if (event.preventDefault) event.preventDefault();
      if (event.stopPropagation) event.stopPropagation();
      event.returnValue = false;
      event.cancelBubble = true;
      return false;
    }
  };
  document.addEventListener("keydown", eventKeydown, false);
  const eventKeypress = function(event) {
    if (["ArrowUp", "ArrowDown", "ArrowRight", "ArrowLeft", " ", "w", "a", "s", "d"].includes(event.key)) {
      if (event.preventDefault) event.preventDefault();
      if (event.stopPropagation) event.stopPropagation();
      event.returnValue = false;
      event.cancelBubble = true;
      return false;
    }
  };
  document.addEventListener("keypress", eventKeypress, false);
  const eventKeyup = function(event) {
    that.keysPressed[event.key] = false;
    if (["ArrowUp", "ArrowDown", "ArrowRight", "ArrowLeft", " ", "b", "w", "a", "s", "d"].includes(event.key)) {
      if (event.preventDefault) event.preventDefault();
      if (event.stopPropagation) event.stopPropagation();
      event.returnValue = false;
      event.cancelBubble = true;
      return false;
    }
  };
  document.addEventListener("keyup", eventKeyup, false);
  this.ctx.clear = function() {
    this.clearRect(0, 0, w, h);
  };
  this.ctx.clear();
  this.ctx.drawLine = function(xFrom, yFrom, xTo, yTo) {
    this.beginPath();
    this.moveTo(xFrom, yFrom);
    this.lineTo(xTo, yTo);
    this.lineTo(xTo + 1, yTo + 1);
    this.closePath();
    this.fill();
  };
  this.ctx.tracePoly = function(verts) {
    this.beginPath();
    this.moveTo(verts[0][0], verts[0][1]);
    for (let i = 1; i < verts.length; i++)
      this.lineTo(verts[i][0], verts[i][1]);
    this.closePath();
  };
  this.ctx.drawPlayer = function() {
    this.save();
    this.translate(that.pos.x, that.pos.y);
    this.rotate(that.dir.angle());
    this.tracePoly(playerVerts);
    this.fillStyle = "white";
    this.fill();
    this.tracePoly(playerVerts);
    this.stroke();
    this.restore();
  };
  this.ctx.drawBullets = function(bullets) {
    for (let i = 0; i < bullets.length; i++) {
      this.beginPath();
      this.arc(bullets[i].pos.x, bullets[i].pos.y, bulletRadius, 0, Math.PI * 2, true);
      this.closePath();
      this.fill();
    }
  };
  const randomParticleColor = function() {
    return (["red", "yellow"])[random(0, 1)];
  };
  this.ctx.drawParticles = function(particles) {
    const oldColor = this.fillStyle;
    for (let i = 0; i < particles.length; i++) {
      this.fillStyle = randomParticleColor();
      this.drawLine(particles[i].pos.x, particles[i].pos.y, particles[i].pos.x - particles[i].dir.x * 10, particles[i].pos.y - particles[i].dir.y * 10);
    }
    this.fillStyle = oldColor;
  };
  this.ctx.drawFlames = function(flame) {
    this.save();
    this.translate(that.pos.x, that.pos.y);
    this.rotate(that.dir.angle());
    const oldColor = this.strokeStyle;
    this.strokeStyle = "red";
    this.tracePoly(flame.r);
    this.stroke();
    this.strokeStyle = "yellow";
    this.tracePoly(flame.y);
    this.stroke();
    this.strokeStyle = oldColor;
    this.restore();
  }
  addParticles(this.pos);
  document.body.classList.add("ASTEROIDSYEAH");
  let lastUpdate = new Date().getTime();
  function updateFunc() {
    that.update.call(that);
  };
  setTimeout(updateFunc, 1000 / FPS);
  this.update = function() {
    let forceChange = false;
    const nowTime = new Date().getTime();
    const tDelta = (nowTime - lastUpdate) / 1000;
    lastUpdate = nowTime;
    let drawFlame = false;
    if (nowTime - this.updated.flame > 50) {
      createFlames();
      this.updated.flame = nowTime;
    }
    this.scrollPos.x = window.pageXOffset || document.documentElement.scrollLeft;
    this.scrollPos.y = window.pageYOffset || document.documentElement.scrollTop;
    if ((this.keysPressed["ArrowUp"]) || (this.keysPressed["w"])) {
      this.vel.add(this.dir.mulNew(acc * tDelta));
      drawFlame = true;
    } else {
      this.vel.mul(0.96);
    }
    if ((this.keysPressed["ArrowLeft"]) || (this.keysPressed["a"])) {
      forceChange = true;
      this.dir.rotate(radians(rotSpeed * tDelta * -1));
    }
    if ((this.keysPressed["ArrowRight"]) || (this.keysPressed["d"])) {
      forceChange = true;
      this.dir.rotate(radians(rotSpeed * tDelta));
    }
    if (this.keysPressed[" "] && nowTime - this.firedAt > timeBetweenFire) {
      this.bullets.unshift({
        dir: this.dir.cp(),
        pos: this.pos.cp(),
        startVel: this.vel.cp(),
        cameAlive: nowTime
      });
      this.firedAt = nowTime;
      if (this.bullets.length > maxBullets) {
        this.bullets.pop();
      }
    }
    if (this.keysPressed["b"]) {
      if (!this.updated.enemies) {
        updateEnemyIndex();
        this.updated.enemies = true;
      }
      forceChange = true;
      this.updated.blink.time += tDelta * 1000;
      if (this.updated.blink.time > timeBetweenBlink) {
        this.toggleBlinkStyle();
        this.updated.blink.time = 0;
      }
    } else {
      this.updated.enemies = false;
    }
    if (this.keysPressed["Escape"]) {
      destroy.apply(this);
      return;
    }
    if (this.vel.len() > maxSpeed) {
      this.vel.setLength(maxSpeed);
    }
    this.pos.add(this.vel.mulNew(tDelta));
    if (this.pos.x > w) {
      window.scrollTo(this.scrollPos.x + 50, this.scrollPos.y);
      this.pos.x = 0;
    } else if (this.pos.x < 0) {
      window.scrollTo(this.scrollPos.x - 50, this.scrollPos.y);
      this.pos.x = w;
    }
    if (this.pos.y > h) {
      window.scrollTo(this.scrollPos.x, this.scrollPos.y + h * 0.75);
      this.pos.y = 0;
    } else if (this.pos.y < 0) {
      window.scrollTo(this.scrollPos.x, this.scrollPos.y - h * 0.75);
      this.pos.y = h;
    }
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      if (nowTime - this.bullets[i].cameAlive > 2000) {
        this.bullets.splice(i, 1);
        forceChange = true;
        continue;
      }
      const bulletVel = this.bullets[i].dir.setLengthNew(bulletSpeed * tDelta).add(this.bullets[i].startVel.mulNew(tDelta));
      this.bullets[i].pos.add(bulletVel);
      boundsCheck(this.bullets[i].pos);
      const murdered = getElementFromPoint(this.bullets[i].pos.x, this.bullets[i].pos.y);
      if (murdered && murdered.tagName && !(ignoredTypes.includes(murdered.tagName.toUpperCase())) && hasOnlyTextualChildren(murdered) && murdered.className !== "ASTEROIDSYEAH") {
        addParticles(this.bullets[i].pos);
        this.dying.push(murdered);
        this.bullets.splice(i, 1);
        continue;
      }
    }
    if (this.dying.length) {
      for (let i = this.dying.length - 1; i >= 0; i--) {
        try {
          if (this.dying[i].parentNode) window.ASTEROIDS.enemiesKilled++;
          this.dying[i].parentNode.removeChild(this.dying[i]);
        } catch (e) {}
      }
      setScore();
      this.dying = [];
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].pos.add(this.particles[i].dir.mulNew(particleSpeed * tDelta * Math.random()));
      if (nowTime - this.particles[i].cameAlive > 1000) {
        this.particles.splice(i, 1);
        forceChange = true;
        continue;
      }
    }
    if (forceChange || this.bullets.length !== 0 || this.particles.length !== 0 || !this.pos.is(this.lastPos) || this.vel.len() > 0) {
      this.ctx.clear();
      this.ctx.drawPlayer();
      if (drawFlame) this.ctx.drawFlames(that.flame);
      if (this.bullets.length) {
        this.ctx.drawBullets(this.bullets);
      }
      if (this.particles.length) {
        this.ctx.drawParticles(this.particles);
      }
    }
    this.lastPos = this.pos;
    setTimeout(updateFunc, 1000 / FPS);
  }

  function destroy() {
    document.removeEventListener("keydown", eventKeydown, false);
    document.removeEventListener("keypress", eventKeypress, false);
    document.removeEventListener("keyup", eventKeyup, false);
    window.removeEventListener("resize", eventResize, false);
    removeStylesheet("ASTEROIDSYEAHSTYLES");
    document.body.classList.remove("ASTEROIDSYEAH");
    this.gameContainer.parentNode.removeChild(this.gameContainer);
  };
}

if (!window.ASTEROIDSPLAYERS) window.ASTEROIDSPLAYERS = [];
window.ASTEROIDSPLAYERS.push(new Asteroids());
