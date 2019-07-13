const props = {
  step: 1 / 60,
};

const coreConfig = {
  width: 500,
  height: 500,
};

/*------------------------------------------------------------------------------
Physics
 -----------------------------------------------------------------------------*/

class Body {
  static create(props) {
    let body = new Body();
    Object.assign(body, props);
    return body;
  }

  constructor(parent, width, height, x, y) {
    this.parent = null;
    this.width = 1;
    this.height = 1;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.bounceX = false;
    this.bounceY = false;
    this.keepWithinBounds = {
      left: false,
      top: false,
      right: false,
      bottom: false,
    };
    this.static = false;
    this.immovable = true;
  }
}

class Collider {
  constructor(physics, type1Arr, type2Arr, callback) {
    this.physics = physics;
    this.type1Arr = type1Arr;
    this.type2Arr = type2Arr;
    this.callback = callback || (() => {
    });
  }

  update() {
    let t1Arr = this.type1Arr;
    let t2Arr = this.type2Arr;

    for (let i = 0; i < t1Arr.length; i++) {
      for (let j = 0; j < t2Arr.length; j++) {

        let t1Obj = t1Arr[i];
        let t2Obj = t2Arr[j];

        if (t1Obj === t2Obj) {
          continue;
        }

        if (Physics.intersect(t1Obj.body, t2Obj.body)) {
          this.physics.handleCollision(t1Obj.body, t2Obj.body);
          this.callback(t1Obj, t2Obj);
        }
      }
    }
  }
}

class Physics {
  constructor(engine, width, height) {
    this.engine = engine;
    this.bodies = [];
    this.colliders = [];
    this.bounds = {width, height};
  }

  static overlap(b1, b2) {

    let x = Math.max(b1.x, b2.x);
    let width = Math.min(b1.x + b1.width, b2.x + b2.width) - x;
    let y = Math.max(b1.y, b2.y);
    let height = Math.min(b1.y + b1.height, b2.y + b2.height) - y;

    return {x, width, y, height};
  }

  static intersect(b1, b2) {
    return b1.x < b2.x + b2.width
        && b1.x + b1.width > b2.x
        && b1.y < b2.y + b2.height
        && b1.y + b1.height > b2.y;
  }

  _keepBodyWithinBounds(body) {
    let keepWithinBounds = body.keepWithinBounds;
    let hitHoriz = false;
    let hitVert = false;
    if (keepWithinBounds.left && body.x < 0) {
      body.x = 0;
      hitHoriz = true;

    } else if (keepWithinBounds.right && body.x + body.width >
        this.bounds.width) {
      body.x = this.bounds.width - body.width;
      hitHoriz = true;
    }

    if (keepWithinBounds.top && body.y < 0) {
      body.y = 0;
      hitVert = true;
    } else if (keepWithinBounds.bottom && body.y + body.height >
        this.bounds.height) {
      hitVert = true;
      body.y = this.bounds.height - body.height;
    }

    if (hitVert && body.bounceY) {
      body.vy = -body.vy;
    }

    if (hitHoriz && body.bounceX) {
      body.vx = -body.vx;
    }
  }

  update(dt) {

    let bodies = this.bodies;

    bodies.removeDead();
    for (let i = 0; i < bodies.length; i++) {

      let body = this.bodies[i];
      if (body.static) {
        continue;
      }

      body.touching = body.touching || {};
      body.touching.left = false;
      body.touching.right = false;
      body.touching.top = false;
      body.touching.bottom = false;

      body.x += body.vx * dt;
      body.y += body.vy * dt;

      if (body.keepWithinBounds) {
        this._keepBodyWithinBounds(body);
      }
    }

    //Update colliders

    let colliders = this.colliders;
    colliders.removeDead();
    for (let i = 0; i < colliders.length; i++) {
      let c = colliders[i];
      c.update(dt);
    }
  }

  handleCollision(body1, body2) {
    //Handle only collisions between a static body and a moving body
    if (body1.immovable !== body2.immovable) {
      this._handleCollisionWithStaticBody(body1.static ? body2 : body1,
          body1.static ? body1 : body2);
    } else {
      throw new Error('This type of collision has not been implemented');
    }
  }

  _handleCollisionWithStaticBody(body, staticBody) {

    let overlap = Physics.overlap(body, staticBody);
    if (overlap.width === overlap.height) {
      body.x -= body.x < overlap.x ? overlap.width : -overlap.width;
      body.y -= body.y > overlap.y ?
          overlap.height :
          -overlap.height;

      body.touching.left = body.x > overlap.x;
      body.touching.right = body.x < overlap.x;
      body.touching.top = body.y > overlap.y;
      body.touching.bottom = body.y < overlap.y;

    } else if (overlap.width < overlap.height) {
      body.x -= body.x < overlap.x ? overlap.width : -overlap.width;
      body.touching.left = body.x > overlap.x;
      body.touching.right = body.x < overlap.x;
    } else {
      body.y -= body.y < overlap.y ?
          overlap.height :
          -overlap.height;
      body.touching.top = body.y > overlap.y;
      body.touching.bottom = body.y < overlap.y;
    }

    //Collision response
    //Todo: separate collision response from collision resolution

    if (body.touching.bottom || body.touching.top) {
      body.vy = -body.vy;
    }

    if (body.touching.left || body.touching.right) {
      body.vx = -body.vx;
    }
  }

  addBody(body) {
    this.bodies.push(body);
  }

  createCollider(type1, type2, callback) {

    let types = this.engine.objectsByType;
    this.colliders.push(
        new Collider(this, types[type1], types[type2], callback));
  }

  setBounds(bounds) {
    this.bounds = bounds;
  }

  getBounds() {
    return this.bounds;
  }
}

/*------------------------------------------------------------------------------
Game Entities
 -----------------------------------------------------------------------------*/

class GameObject {
  constructor(engine, textureKey, width, height, x, y, type) {
    this.engine = engine;
    this.textureKey = textureKey;
    this.type = type;
    this.body = Body.create({
      parent: this,
      height,
      width,
      x,
      y,
    });
  }

  setTextureKey(imageKey){
    this.textureKey = imageKey;
  }

  setPosition(x, y) {
    this.body.x = x;
    this.body.y = y;
  }

  setStatic(bool) {
    this.body.static = bool;
  }

  setImmovable(bool) {
    this.body.immovable = bool;
  }

  setBounce(x, y) {
    this.body.bounceX = x;
    this.body.bounceY = y;
  }

  render(r) {
    this.texture = this.engine.getAsset(this.textureKey);
    r.drawImage(this.texture, this.body.width, this.body.height, this.body.x,
        this.body.y);
  }

  update(dt){

  }

  keepWithinBounds(left, top, right, bottom) {
    this.body.keepWithinBounds.left = left;
    this.body.keepWithinBounds.top = top;
    this.body.keepWithinBounds.right = right;
    this.body.keepWithinBounds.bottom = bottom;
  }
}

/*------------------------------------------------------------------------------
Engine
 -----------------------------------------------------------------------------*/

class Engine {
  constructor(config) {
    this.physics = new Physics(this);
    this.renderer = new Renderer(config.width, config.height);
    this.input = new Input();
    this.emitter = new EventEmitter();
    let loader = this.loader = new Loader();
    loader.addListener(this._propagateEvent.bind(this));

    this.bounds = config.bounds;

    this.load = {
      image: loader.image.bind(loader),
    };

    this.physics.setBounds(this.bounds);

    //Game loop variables

    this._step = config.step || Engine.Defaults.STEP;
    this._accumulator = 0;
    this._previous = Date.now();
    this._gameLoop = this._gameLoop.bind(this);

    //Lists

    this.updateList = [];
    this.objectsByType = {};
    this.bodies = this.physics.bodies;
    this.renderList = this.renderer.renderList;
  }

  on(eventType, callback) {
    this.emitter.on(eventType, callback);
  }

  _propagateEvent(e) {
    this.emitter.emmit(e);
  }

  _gameLoop() {

    let now = Date.now();
    let dt = (now - this._previous) / 1000;

    this._accumulator += dt;
    if (this._accumulator >= this._step) {
      this._update(this._step);
      this._accumulator -= this._step;
    }

    this._render();

    this._previous = now;
    this._animFrameRequest = window.requestAnimationFrame(this._gameLoop);
  }

  _update(dt) {
    this.updateList.removeDead();
    for (let i = 0; i < this.updateList.length; i++)
      this.updateList[i].update(dt);

    this.physics.update(dt);
  }

  _render() {
    this.renderer.render();
  }

  getAsset(key) {
    return this.loader.get(key);
  }

  createGameObject(imageKey, x, y, width, height, type) {
    let obj = new GameObject(this, imageKey, width, height, x, y, type);
    this.add(obj);
    return obj;
  }

  add(object) {
    if (object.type) {
      this.objectsByType[object.type] = this.objectsByType[object.type] || [];
      this.objectsByType[object.type].push(object);
    }

    if (object.update) {
      this.updateList.push(object);
    }
    if (object.render) {
      this.renderList.push(object);
    }
    if (object.body) {
      this.bodies.push(object.body);
    }
  }

  addMany(objects) {
    for (let i = 0; i < objects.length; i++) {
      this.add(objects[i]);
    }
  }

  addCollider(type1, type2, callback) {
    this.physics.createCollider(type1, type2, callback);
  }

  remove(object) {
    object.kill = true;

    if (object.body)
      object.body.kill = true;

    if (object.type)
      this.objectsByType[object.type].remove(object);
  }

  start() {
    this.input.listen();
    this._gameLoop(Date.now());
  }

  stop() {//Collaborate and listen
    this.input.stopListenning();
    window.cancelAnimationFrame(this._animFrameRequest);
  }
}

Engine.Defaults = {
  STEP: 1 / 60,
};
Engine.Loader = {};
Engine.Loader.Events = {
  LOADING: 0,
  LOADED_ONE: 1,
  LOADED_ALL: 2,
  ERROR: 3,
};

class EventEmitter {
  constructor() {
    this.listeners = {};
    this.globalListeners = [];
  }

  addListener(listener) {
    this.globalListeners.push(listener);
  }

  removeListener(listener) {
    this.globalListeners.remove(listener);
  }

  on(eventType, callback) {
    this.listeners[eventType] = this.listeners[eventType] || [];
    this.listeners[eventType].push(callback);
  }

  emmit(e) {
    let listeners = this.listeners[e.type];
    if (listeners) {
      for (let i = 0; i < listeners.length; i++) {
        listeners[i].call(listeners[i], e);
      }
    }

    listeners = this.globalListeners;
    for (let i = 0; i < listeners.length; i++) {
      listeners[i].call(listeners[i], e);
    }
  }
}

class Loader extends EventEmitter {
  constructor() {
    super();
    this.loadingCount = 0;
    this.loading = {};
    this.loaded = {};
  }

  image(key, url) {

    this.loading[key] = true;
    this.loadingCount++;
    let image = new Image();
    let loader = this;
    image.onload = () => {
      loader.emmit({
        type: Engine.Loader.Events.LOADED_ONE,
        image,
      });
      loader.loadingCount--;
      loader.loaded[key] = image;
      delete loader.loading[key];

      if (loader.loadingCount === 0) {
        loader.emmit({
          type: Engine.Loader.Events.LOADED_ALL,
          loaded: loader.loaded,
        });
      }
    };

    image.onerror = (e) => {
      delete loader.loading[key];
      loader.loadingCount--;
      loader.emmit({
        type: Engine.Loader.Events.ERROR,
        message: `Couldn't load asset: ${key} from url: ${url}`,
      });

      if (loader.loadingCount === 0) {
        loader.emmit({
          type: Engine.Loader.Events.LOADED_ALL,
        });
      }
    };
    image.src = url;
  }

  on(eventType, callback) {
    this.listeners[eventType] = this.listeners[eventType] || [];
    this.listeners[eventType].push(callback);
  }

  get(key) {
    let asset = this.loaded[key];
    if (!asset && this.loading[key])
      throw new Error(`This asset has not finished loading`);
    if (!asset && !this.loading[key])
      throw new Error(`Could not find asset: ${key}`);

    return asset;
  }
}

class Renderer {
  constructor(width, height) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = width;
    this.canvas.height = height;
    this.renderList = [];
    this.scale = {x: 1, y: 1};
    this.offset = {x: 0, y: 0};
  }

  render() {
    this.renderList.removeDead();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (let i = 0; i < this.renderList.length; i++) {
      this.renderList[i].render(this);
    }
  }

  drawImage(texture, width, height, x, y) {

    let off = this.offset;
    let scl = this.scale;

    x = (x + off.x) * scl.x;
    y = (y + off.y) * scl.y;
    width = Math.abs(width * scl.x);
    height = Math.abs(height * scl.y);

    this.ctx.drawImage(texture, x, y, width, height);
  }

  setBackground(imageUrl) {
    this.canvas.style.backgroundImage = `url("${imageUrl}")`;
  }

  setScale(x, y) {
    this.scale.x = x;
    this.scale.y = y;
  }

  setOffset(x, y) {
    this.offset.x = x;
    this.offset.y = y;
  }
}

class Input {
  constructor() {
    this.keys = {};
  }

  addKeys(keyMappings) {
    let out = {};
    let keys = this.keys;
    for (let keyName in keyMappings) {

      if (!keyMappings.hasOwnProperty(keyName))
        continue;

      let keyCode = keyMappings[keyName];
      let keyState = {
        isDown: false,
      };
      out[keyName] = keyState;

      keys[keyCode] = keys[keyCode] || [];
      keys[keyCode].push({
        keyName,
        keyState,
      });
    }

    return out;
  }

  handleEvent(e) {
    let keyCode = e.keyIdentifier || e.keyCode;
    if (e.type !== 'keydown' && e.type !== 'keyup')
      return;

    let keysArr = this.keys[keyCode];
    if (keysArr) {
      let isDown = e.type === 'keydown';
      for (let i = 0; i < keysArr.length; i++) {
        keysArr[i].keyState.isDown = isDown;
      }
    }
  }

  _keyUpEvent(e) {
    if (this.keys[e.keyCode]) {
      this.keys[e.keyCode].isDown = false;
    }
  }

  listen() {
    document.addEventListener('keydown', this);
    document.addEventListener('keyup', this);
  }

  stopListenning() {
    document.removeEventListener('keyup', this);
    document.removeEventListener('keydown', this);
  }
}