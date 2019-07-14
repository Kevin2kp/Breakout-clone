const screenWidth = 500;
const screenHeight = 500;
const worldWidth = 21;
const worldHeight = 30;

let engine = new Engine({
  width: screenWidth,
  height: screenHeight,
  bounds: {
    width: worldWidth,
    height: worldHeight,
  },
});
let container = document.getElementById('container');
container.appendChild(engine.renderer.canvas);

let keys = engine.input.addKeys({
  left: 37,
  up: 38,
  right: 39,
  down: 40,
  space: 32,
});

/*-------------------------------------------------------------------------------
Create the player
 ------------------------------------------------------------------------------*/

let paddle = engine.createGameObject('paddle', 8, 30 - 2, 5, 2, 'paddle');
paddle.setImmovable(true);
paddle.setStatic(false);
paddle.keepWithinBounds(true, true, true, true);

/*------------------------------------------------------------------------------
Player behavior:
This function checks for user input and gets the player moving if the left or right keys are pressed
 ------------------------------------------------------------------------------*/

paddle.update = function() {
  this.body.vx = 0;

  if (keys.left.isDown) {
    this.body.vx = -10;
  } else if (keys.right.isDown) {
    this.body.vx = 10;
  }
};

/*-------------------------------------------------------------------------------
Create the ball
 ------------------------------------------------------------------------------*/

let ball = engine.createGameObject('ball', 10.15, 30 - 2.7, 0.7, 0.7, 'ball');
ball.setBounce(true, true);
ball.setImmovable(false);
ball.setStatic(false);
ball.keepWithinBounds(true, true, true, false);

/*-------------------------------------------------------------------------------
Create the blocks
 ------------------------------------------------------------------------------*/

let blocks = [];
blocks.size = 0;
let rows = 5;
let cols = 19;
let blockWidth = 1;
let blockHeight = 1;
let spacingX = 0;
let spacingY = 0.5;
let startX = 1;
let startY = 1;
let blockImgs = [
  'block-green',
  'block-blue',
  'block-red',
];
let blockHitImg = [
  'block-green-hit',
  'block-blue-hit',
  'block-red-hit',
];

let y = startY;
for (let j = 0; j < rows; j++) {

  let x = startX;
  for (let i = 0; i < cols; i++) {

    let block = engine.createGameObject(blockImgs[j % blockImgs.length], x, y,
        blockWidth,
        blockHeight, 'block');
    block.setImmovable(true);
    block.hitImg = blockHitImg[j % blockHitImg.length];
    block.health = rows - j;
    block.score = 100 * (rows - j + 1);

    blocks.push(block);
    blocks.size++;
    x += blockWidth + spacingX;
  }

  y += blockHeight + spacingY;
}

/*-------------------------------------------------------------------------------
Text objects:
These show the current score, or tell the player the outcome of the game
 ------------------------------------------------------------------------------*/

let youWinText = {
  render(r) {
    let ctx = r.ctx;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '50px Arial';
    let width = ctx.measureText('You win!').width;
    ctx.fillText('You win!', screenWidth / 2 - width / 2, 300);
  },
};

let youLoseText = {
  render(r) {
    let ctx = r.ctx;
    ctx.fillStyle = '#FF0000';
    ctx.font = '50px Arial';
    let width = ctx.measureText('You lose!').width;
    ctx.fillText('You lose!', screenWidth / 2 - width / 2, 300);
  },
};

let score = {
  points: 0,
  render(r) {
    let ctx = r.ctx;
    ctx.fillStyle = '#FF0000';
    ctx.font = '25px Arial';
    ctx.fillText('Score: ' + this.points, 5, screenHeight - 5);
  },
};

let fpsCounter = {
  fps: 0,
  _frames: 0,
  timer: 0,
  update(dt) {
    if (this.timer >= 1) {
      this.fps = this._frames;
      this.timer = 0;
      this._frames = 0;
    }
    this.timer += dt;
  },

  render(r) {
    let ctx = r.ctx;
    ctx.fillStyle = '#0F0';
    ctx.font = '10px Arial';
    ctx.fillText('FPS: ' + this.fps, 5, 15);
    this._frames++;
  },
};

/*-------------------------------------------------------------------------------
Triggers:
 These are auxiliary objects  wait until some condition is met. When the condition
  is met, they 'trigger' some action
 ------------------------------------------------------------------------------*/

let loseGameTrigger = {
  update(dt) {

    //Ball went beyond the bottom edge
    if (ball.body.y >= engine.bounds.height) {
      ball.body.static = true;
      engine.add(youLoseText);
    }
  },
};

let startGameTrigger = {
  update() {

    //Player
    if (keys.space.isDown) {

      let vel = 20;
      let min = Math.PI * 1 / 6;
      let max = Math.PI * 5 / 6;
      let angle = Math.random() * ((max - min) / 2) + (min + max) / 2;

      ball.body.vx = Math.cos(angle) * vel;
      ball.body.vy = -Math.sin(angle) * vel;
      this.kill = true;
    }
  },
};

/*-------------------------------------------------------------------------------
This function gets called every time the ball hits a brick
 ------------------------------------------------------------------------------*/

function hitBlock(ball, block) {

  //Remove some health from the brick
  block.health--;

  //If brick has received too many hits, remove from game and add score
  if (block.health <= 0) {
    engine.remove(block);
    score.points += block.score;

    /*
    Keep track of how many bricks there are left.
    When there aren't any left, end the game
     */
    blocks.size--;
    if (blocks.size <= 0) {
      ball.body.static = true;
      engine.add(youWinText);
    }
  }

  block.setTextureKey(block.hitImg);
}

/*-------------------------------------------------------------------------------
Add the objects to the engine / world
 ------------------------------------------------------------------------------*/

engine.renderer.setScale(500 / 21, 500 / 30);
engine.addCollider(ball.type, paddle.type);
engine.addCollider(ball.type, blocks[0].type, hitBlock);
engine.add(score);
engine.add(startGameTrigger);
engine.add(loseGameTrigger);
engine.add(fpsCounter);

/*-------------------------------------------------------------------------------
Load the assets(images) that the game objects will be using
 ------------------------------------------------------------------------------*/
engine.renderer.setBackground('assets/bg.jpg');
engine.load.image('ball', 'assets/ball.png');
engine.load.image('paddle', 'assets/paddle.png');
engine.load.image('block-blue', 'assets/block-blue.png');
engine.load.image('block-blue-hit', 'assets/block-blue-hit.png');
engine.load.image('block-red', 'assets/block-red.png');
engine.load.image('block-red-hit', 'assets/block-red-hit.png');
engine.load.image('block-green', 'assets/block-green.png');
engine.load.image('block-green-hit', 'assets/block-green-hit.png');
engine.on(Engine.Loader.Events.LOADED_ALL, engine.start.bind(engine));






