const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI / 2;

class Blob {
  constructor() {
    console.log('Blob constructed');
    const canvas = document.createElement('canvas');
    canvas.classList.add('waves');
    this.c = canvas.getContext('2d');
    this.canvas = canvas;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    this.wobbleIncrement = 0;
    // use this to change the size of the blob
    this.scale = 1;
    this.radius = 65;
    this.initialRadius = 60;
    this.submittedForm = false;
    // think of this as detail level
    // number of conections in the `bezierSkin`
    this.segments = 6;
    this.step = HALF_PI / this.segments;
    this.anchors = [];
    this.radii = [];
    this.thetaOff = [];

    const bumpRadius = 20;
    const halfBumpRadius = bumpRadius / 2;

    for (let i = 0; i <= this.segments; i++) {
      // this.radii.push(Math.random() * bumpRadius - halfBumpRadius);
      this.radii.push((i % 2 === 0 ? 1 : -1) * halfBumpRadius);
      this.thetaOff.push(Math.random() * 2 * Math.PI);
    }
    console.log(this.radii);

    this.theta = 0;
    this.thetaRamp = 0;
    this.thetaRampDest = 12;
    this.rampDamp = 25;
  }

  update() {
    this.thetaRamp += (this.thetaRampDest - this.thetaRamp) / this.rampDamp;
    this.theta += 0.005;

    this.anchors = [-window.innerWidth * (1 / this.segments), this.radius - this.initialRadius];
    for (let i = 0; i <= this.segments; i += 1) {
      const sine = Math.sin(this.thetaOff[i] + this.theta + this.thetaRamp);
      const rad = this.radius + this.radii[i] * sine;
      const x = (window.innerWidth * i) / this.segments;
      const y = rad;
      this.anchors.push(x, y);
      // console.log(x, y);
    }
    this.anchors.push(((window.innerWidth) * (this.segments + 1)) / this.segments, this.radius - this.initialRadius);
    const { c } = this;
    c.save();
    // c.translate(-10, -10);
    // c.scale(0.5, 0.5);
    // c.fillStyle = '#9caae4';
    c.fillStyle = 'rgba(0,0,0,0.88)';
    // c.fillStyle = '#f19e98';
    c.beginPath();
    c.moveTo(0, 0);
    bezierSkin(this.anchors, c, false);
    c.lineTo(this.anchors[this.anchors.length - 2], 0);
    c.lineTo(0, 0);
    c.fill();
    c.restore();

    if (this.submittedForm) {
      this.theta = 0;
      this.thetaRamp = 0;
      this.thetaRampDest = 12;
      this.rampDamp = 25;
    }
  }

  // update() {
  //   this.thetaRamp += (thetaRampDest - thetaRamp) / rampDamp;
  //   theta += 0.03;
  //   points = [0, 0];
  //   for(let i = 1; i < intervals; i++) {
  //     let sine = Math.sin(xOff[i-1] + theta + thetaRamp);
  //     let radius = height + sine * radii[i-1];
  //     let x = (width * i)/intervals;
  //     let y = radius;
  //     points.push(x, y);
  //   }
  //   points.push(width, 0);
  //   ctx.beginPath();
  //   ctx.fillStyle = 'rgb(200, 0, 0)';
  //   ctx.moveTo(0,0);
  //   // ctx.lineTo(0, height);
  //   bezierSkin(points, false);
  //   ctx.lineTo(0,0);
  //   ctx.fill();
  // }
  // function update2() {
  //   thetaRamp += (thetaRampDest - thetaRamp) / rampDamp;
  //   theta += 0.03;
  //   points = [0, 0];
  //   for(let i = 1; i < intervals; i++) {
  //     let sine = Math.sin(xOff[i-1] + theta + thetaRamp);
  //     let radius = height + sine * radii[i-1];
  //     let x = (width * i)/intervals;
  //     let y = radius;
  //     points.push(x, y);
  //   }
  //   points.push(width, 0);
  //   ctx.beginPath();
  //   ctx.fillStyle = 'rgb(200, 0, 0)';
  //   ctx.moveTo(0,0);
  //   // ctx.lineTo(0, height);
  //   bezierSkin(points, false);
  //   ctx.lineTo(0,0);
  //   ctx.fill();
  // }
}


// array of xy coords, closed boolean
function bezierSkin(bez, c, closed = true) {
  const avg = calcAvgs(bez);
  const leng = bez.length;

  if (closed) {
    c.moveTo(avg[0], avg[1]);
    for (let i = 2; i < leng; i += 2) {
      const n = i + 1;
      c.quadraticCurveTo(bez[i], bez[n], avg[i], avg[n]);
    }
    c.quadraticCurveTo(bez[0], bez[1], avg[0], avg[1]);
  } else {
    c.moveTo(bez[0], bez[1]);
    c.lineTo(avg[0], avg[1]);
    for (let i = 2; i < leng - 2; i += 2) {
      const n = i + 1;
      c.quadraticCurveTo(bez[i], bez[n], avg[i], avg[n]);
    }
    c.lineTo(bez[leng - 2], bez[leng - 1]);
  }
}

// create anchor points by averaging the control points
function calcAvgs(p) {
  const avg = [];
  const leng = p.length;
  let prev;

  for (let i = 2; i < leng; i++) {
    prev = i - 2;
    avg.push((p[prev] + p[i]) / 2);
  }
  // close
  avg.push((p[0] + p[leng - 2]) / 2, (p[1] + p[leng - 1]) / 2);
  return avg;
}

function initializeWaves(onComplete) {
  const blob = new Blob();
  const { c } = blob;
  function loop() {
    c.clearRect(0, 0, blob.canvas.width, blob.canvas.height);
    blob.update();
    if (blob.submittedForm) {
      blob.radius += 5;
      if (blob.radius > window.innerWidth + 100) {
        blob.submittedForm = false;
        document.body.style.backgroundColor = '#121212';
        document.body.removeChild(blob.canvas);
        onComplete();
      }
    }
    // console.log(blob.anchors);
    window.requestAnimationFrame(() => loop());
  }
  console.log(blob.anchors);
  loop();
  return blob;
}

export default initializeWaves;
