let cnv;
let art;
let grid;
let preview;

let brushSize = document.getElementById("brushSize");
let brushWidth = document.getElementById("brushWidth");
let brushHeight = document.getElementById("brushHeight");
let brushRot = document.getElementById("brushRot");
let brushMov = document.getElementById("brushMov");
let gridRows = document.getElementById("gridRows");
let gridCols = document.getElementById("gridCols");

let TILES_X, TILES_Y;
let TILE_W, TILE_H;

let mX, mY;
let prevX, prevY;
let rotationSensitivity;
let angleDeg;
let angleMapped;
let angleToggle;

let status = false;
let undoStack = [];

function setup() {
  cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent("sketch-wrapper");

  frameRate(60);
  noStroke();
  noCursor();

  art = createGraphics(windowWidth, windowHeight);
  art.pixelDensity(3);
  art.clear();

  grid = createGraphics(windowWidth, windowHeight);
  grid.rectMode(CENTER);
  grid.noFill();
  grid.stroke("#222222");
  grid.strokeWeight(1);

  preview = createGraphics(windowWidth, windowHeight);

  imageMode(CENTER);
  rectMode(CENTER);

  document.getElementById("resetCanvas").addEventListener("click", switch_status);

  prevX = mouseX;
  prevY = mouseY;
}

function createGradFill(ctx, gradType, colA, colB, hw, hh) {
  let grad;
  const r = Math.max(hw, hh);

  switch (gradType) {
    case 'linear':
      grad = ctx.createLinearGradient(-hw, 0, hw, 0);
      grad.addColorStop(0, colA);
      grad.addColorStop(1, colB);
      break;
    case 'radial':
      grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      grad.addColorStop(0, colA);
      grad.addColorStop(1, colB);
      break;
    case 'reflected':
      grad = ctx.createLinearGradient(-hw, 0, hw, 0);
      grad.addColorStop(0, colA);
      grad.addColorStop(0.5, colB);
      grad.addColorStop(1, colA);
      break;
    case 'angular':
      grad = ctx.createConicGradient(0, 0, 0);
      grad.addColorStop(0, colA);
      grad.addColorStop(0.5, colB);
      grad.addColorStop(1, colA);
      break;
    case 'diamond':
      grad = ctx.createConicGradient(-Math.PI / 4, 0, 0);
      grad.addColorStop(0, colB);
      grad.addColorStop(0.25, colA);
      grad.addColorStop(0.5, colB);
      grad.addColorStop(0.75, colA);
      grad.addColorStop(1, colB);
      break;
    default:
      grad = ctx.createLinearGradient(-hw, 0, hw, 0);
      grad.addColorStop(0, colA);
      grad.addColorStop(1, colB);
  }
  return grad;
}

function drawGradBrush(g, x, y, angleDeg, w, h, colA, colB, gradType) {
  const ctx = g.drawingContext;
  const hw = w / 2;
  const hh = h / 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angleDeg * Math.PI / 180);
  ctx.fillStyle = createGradFill(ctx, gradType, colA, colB, hw, hh);
  ctx.fillRect(-hw, -hh, w, h);
  ctx.restore();
}

function draw() {
  const colA = document.getElementById("colorA").value;
  const colB = document.getElementById("colorB").value;
  const gradType = document.getElementById("gradType").value;
  const w = parseInt(brushWidth.value);
  const h = parseInt(brushHeight.value);
  const size = parseFloat(brushSize.value);

  if (document.getElementById("fixedAngle").checked) {
    angleToggle = parseFloat(brushRot.value);
  } else {
    angleToggle = angleDeg;
  }

  if (status) {
    art.clear();
    status = false;
  }

  // grid
  TILES_X = parseInt(gridRows.value);
  TILES_Y = parseInt(gridCols.value);
  TILE_W = width / TILES_X;
  TILE_H = height / TILES_Y;

  grid.push();
  grid.clear();
  grid.translate(TILE_W / 2, TILE_H / 2);
  for (let x = 0; x < TILES_X; x++) {
    for (let y = 0; y < TILES_Y; y++) {
      grid.rect(x * TILE_W, y * TILE_H, TILE_W, TILE_H);
    }
  }
  grid.pop();

  // cursor preview
  preview.clear();
  drawGradBrush(preview, mouseX, mouseY, angleToggle, w * size, h * size, colA, colB, gradType);

  clear();

  mX = mouseX - prevX;
  mY = mouseY - prevY;
  rotationSensitivity = parseFloat(brushMov.value);
  angleDeg = atan2(mY, mX) * rotationSensitivity;
  angleMapped = map(angleDeg, 0, rotationSensitivity, 0, 1);

  if (mouseIsPressed) {
    drawGradBrush(art, mouseX, mouseY, angleToggle, w * size, h * size, colA, colB, gradType);
  }

  image(grid, width / 2, height / 2);
  image(art, width / 2, height / 2);
  image(preview, width / 2, height / 2);

  // brush preview top right
  const previewScale = map(w, 20, 1000, 1, 0.2);
  const previewW = w * previewScale;
  const previewH = h * previewScale;
  const margin = 15;

  fill("#555555");
  noStroke();
  textSize(12);
  textAlign(RIGHT, CENTER);
  text("Brush preview:", width - margin, 15);

  const ctx = drawingContext;
  const hw = previewW / 2;
  const hh = previewH / 2;
  ctx.save();
  ctx.translate(width - margin - hw, 30 + hh);
  ctx.fillStyle = createGradFill(ctx, gradType, colA, colB, hw, hh);
  ctx.fillRect(-hw, -hh, previewW, previewH);
  ctx.restore();
}

function switch_status() {
  status = !status;
}

function saveImage() {
  art.save();
}

function toggleSidebar() {
  const sidebar = document.getElementById("gui-left");
  const btn = document.getElementById("sidebar-toggle");
  sidebar.classList.toggle("collapsed");
  btn.classList.toggle("collapsed");
  btn.innerHTML = sidebar.classList.contains("collapsed") ? "&#8250;" : "&#8249;";
}

function mousePressed() {
  undoStack.push(art.get());
  if (undoStack.length > 20) undoStack.shift();
}

function keyPressed() {
  if ((key === 'z' || key === 'Z') && undoStack.length > 0) {
    const prev = undoStack.pop();
    art.clear();
    art.imageMode(CENTER);
    art.image(prev, art.width / 2, art.height / 2);
  }

  if (key === 'c' || key === 'C') {
    status = !status;
  }
}
