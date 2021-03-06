import /* webpackChunkName: "styles" */'./styles/main.styl'

import p5 from /* webpackChunkName: "p5" */ 'p5';
import Player from './classes/player.js';
import { Wall, Column } from /* webpackChunkName: "primatives" */ './classes/primatives';

const mapScale = 0.35;
const appScale = 0.75;

let sceneH = 0;
let sceneW = 0;
let squareSceneSize = 0;
let minimapSize = squareSceneSize * mapScale;

function calculateAppSizes () {
  sceneH = Math.min(800, window.innerHeight);
  sceneW = Math.min(sceneH * 16 / 9, window.innerWidth);

  if (sceneW < sceneH) sceneH = sceneW * 9 / 16;

  squareSceneSize = sceneW;

  minimapSize = squareSceneSize * mapScale;
}
calculateAppSizes()

const wallColors = {
  gray: [255, 238, 207],
  accent: [144, 191, 105],
  blue: [6, 133, 199],
  door: [72, 61, 63]
}

let walls = [
  new Wall(0, 0, squareSceneSize, squareSceneSize, ...wallColors.blue),

  new Column(400, 400, 100, 30, ...wallColors.accent),
  new Wall(80, 80, 200, 20, ...wallColors.gray),
  new Wall(80, 120, 20, 200, ...wallColors.gray),
  new Wall(280, 120, 20, 200, ...wallColors.gray),
  new Wall(280, 80, 200, 20, ...wallColors.gray),

  new Column(550, 200, 60, 30, ...wallColors.accent),

  new Wall(750, 0, 20, 400, ...wallColors.gray),
  new Wall(750, 500, 20, 400, ...wallColors.gray),
  new Wall(950, 300, 20, 400, ...wallColors.accent),
  new Wall(850, 100, 300, 20, ...wallColors.gray),

  // new Wall(755, 400, 10, 100, ...wallColors.door) // pretend door, will add a door class soon:tm:
];
let player;

window.p5 = new p5(sketch => {

  window.onresize = () => {
    calculateAppSizes();
    sketch.resizeCanvas(sceneW, sceneH);
  }

  sketch.setup = () => {
    calculateAppSizes();
    const canvas = sketch.createCanvas(sceneW, sceneH);
    canvas.parent('sketch-holder');
    player = new Player();
    canvas.id('engine');
  }

  sketch.mouseClicked = () => {
    sketch.requestPointerLock();
  }

  sketch.draw = () => {
    sketch.scale(appScale)
    const bgColor = [45, 38, 37];
    sketch.background(...bgColor); // Copied from the example code, but wouldn't it make more sense to have this in the setup?

    // Handle player movement
    const playerMovementState = handlePlayerMovement(sketch, player, walls);

    const scene = player.view(walls.flatMap(wall => wall.boundaries)); // Cast rays at walls, don't like having to pass in walls every time...

    // Draw scene
    const distortionProjectPlane = sceneW / 3.0 / Math.tan(player.fov / 2.0);
    const w = sceneW / appScale / scene.length;
    sketch.push();
    scene.forEach((tile, i) => {
      const { distance, color } = tile
      sketch.noStroke();
      const sq = distance * distance;
      const wSq = (sceneW / appScale) * (sceneW / appScale);

      const b = sketch.map(sq, 0, wSq, 255, 0) / 5;
      const h = (sceneW / distance) * distortionProjectPlane / 2;
      // const h = sketch.map(tile, 0, sketch.width, sketch.height / 2, 0);

      const colorWithBrightness = sketch.color(color[0] - b, color[1] - b, color[2] - b);

      const viewBobConf = {
        walk: {
          speed: 15,
          distance: 5
        },
        sprint: {
          speed: 10,
          distance: 10
        }
      }

      let viewBob = 0;
      if (playerMovementState !== "idle") {
        const { speed, distance } = viewBobConf[playerMovementState];
        viewBob = Math.sin(sketch.frameCount / speed) * distance
      }

      sketch.fill(colorWithBrightness);
      sketch.rectMode(sketch.CENTER);
      sketch.rect(i * w + w / 2, (sceneH / 2) + viewBob, w + 1, h);
    })
    sketch.pop();


    sketch.push();
    sketch.translate(sceneW / appScale - minimapSize, sceneH / appScale - minimapSize);
    sketch.scale(mapScale, mapScale);
    sketch.fill(0, 25);
    sketch.rect(0, 0, squareSceneSize, squareSceneSize);
    sketch.noFill();
    sketch.stroke(0);
    sketch.strokeWeight(10);
    sketch.rect(0, 0, squareSceneSize, squareSceneSize);

    // Draw overlay
    walls.forEach(wall => {
      wall.show();
    })
    player.show();

    sketch.pop();
  }
});

function handlePlayerMovement(sketch, player, walls) {
  const keyToDirection = {
    65: "left",
    68: "right",
    87: "forward",
    83: "backward"
  }
  let moving = false;
  const shouldSprint = sketch.keyIsDown(16) && sketch.keyIsDown(87);

  const willCollide = checkPlayerCollision(player, walls);
  
  Object.keys(keyToDirection).forEach(key => {
    if (!willCollide && sketch.keyIsDown(key)) {
      moving = true;
      player.move(keyToDirection[key], shouldSprint);
    }
  })

  // Handle rotation
  const rotation = Math.max(-1, Math.min(1, sketch.movedX))
  player.rotate(rotation);

  if (moving && shouldSprint) return "sprint";
  if (moving) return "walk";
  return "idle";
}

function checkPlayerCollision(player, walls) {
  const boundaries = player.view(walls.flatMap(wall => wall.boundaries));
  // console.log(player.radius, player.movementSpeed, player.radius + player.movementSpeed);
  // console.log(boundaries.flatMap(boundary => boundary.distance));
  return boundaries.some(boundary => boundary.distance <= player.radius + player.movementSpeed);
}