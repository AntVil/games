const FPS = 60;
const RENDER_OFFSET = 0.3;
const TOWER_WIDTH = 0.15;
const PADDLE_LENGTH = 0.2;
const PADDLE_DISTORTION = 0.3;
const PADDLE_HEIGHT = 0.02;
const PADDLE_OFFSET = 0.25;
const PADDLE_ROTATION_SPEED = 0.01;
const BALL_PADDLE_OFFSET = 0.04;
const BALL_RADIUS = 0.02;
const BALL_GRAVITY = 0.00065;
const BALL_BOUCE_SPEED = 0.015;
const BALL_MAX_SPEED = 0.02;
const COMBO_BOOST_COUNT = 3;

const PADDLE_TYPE_AIR = 0;
const PADDLE_TYPE_GROUND = 1;
const PADDLE_TYPE_OBSTACLE = 2;

let canvas;
let ctxt;

let audioHandler;
let inputHandler;

let gameOver;

let gameWidth;
let gameHeight;

let game;

function setViewportSize(){
    canvas = document.getElementById("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctxt = canvas.getContext("2d");

    document.documentElement.style.setProperty("--screen-width", `${window.innerWidth}px`);
    document.documentElement.style.setProperty("--screen-height", `${window.innerHeight}px`);

    gameWidth = Math.min(canvas.width, canvas.height / 3) * 3;
    gameHeight = Math.min(canvas.width, canvas.height / 3) * 3;
}

window.onresize = () => setViewportSize();

window.onorientationchange = () => setViewportSize();

window.onload = () => {
    if("serviceWorker" in navigator){
        navigator.serviceWorker.register("./serviceWorker.js");
    }

    gameOver = document.getElementById("gameOver");

    audioHandler = new AudioHandler();
    inputHandler = new InputHandler();

    setViewportSize();

    game = new Game();

    canvas.addEventListener("mousedown", (e) => {
        e.preventDefault();

        audioHandler.context.resume();

        inputHandler.start(e.clientX / canvas.width);
    });

    canvas.addEventListener("mouseleave", (e) => {
        inputHandler.stop();
    })

    canvas.addEventListener("mouseup", (e) => {
        inputHandler.stop();
    });

    canvas.addEventListener("mousemove", (e) => {
        e.preventDefault();
        
        audioHandler.context.resume();

        inputHandler.move(e.clientX / canvas.width);
    });

    canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();

        audioHandler.context.resume();

        inputHandler.start(e.touches[0].clientX / canvas.width);
    });

    canvas.addEventListener("touchmove", (e) => {
        e.preventDefault();

        audioHandler.context.resume();

        inputHandler.move(e.touches[0].clientX / canvas.width);
    });

    canvas.addEventListener("touchend", (e) => {
        e.preventDefault();

        inputHandler.stop();
    });

    setInterval(updateLoop, 1000 / FPS);
    renderLoop();
}

function renderLoop(){
    ctxt.clearRect(0, 0, canvas.width, canvas.height);

    game.render(ctxt);
    
    requestAnimationFrame(renderLoop);
}

function updateLoop(){
    game.update();
}

class AudioHandler{
    constructor(){
        this.context = new AudioContext();
    }

    playCombo(combo){
        let endTime = this.context.currentTime + 0.15;

        let volume = this.context.createGain();
        volume.connect(this.context.destination);
        volume.gain.setValueAtTime(1, this.context.currentTime);
        volume.gain.linearRampToValueAtTime(0, endTime);

        let oscillator = this.context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(440 * Math.pow(2, combo / 12), this.context.currentTime);
        oscillator.connect(volume);

        oscillator.start();
        oscillator.stop(endTime);
    }

    playGeneric(){
        let endTime = this.context.currentTime + 0.1;

        let volume = this.context.createGain();
        volume.connect(this.context.destination);
        volume.gain.setValueAtTime(1, this.context.currentTime);
        volume.gain.linearRampToValueAtTime(0, endTime);

        let oscillator = this.context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(440, this.context.currentTime);
        oscillator.connect(volume);

        oscillator.start();
        oscillator.stop(endTime);
    }

    playLost(){
        let endTime = this.context.currentTime + 0.3;

        let volume = this.context.createGain();
        volume.connect(this.context.destination);
        volume.gain.setValueAtTime(1, this.context.currentTime);
        volume.gain.linearRampToValueAtTime(0, endTime);

        let oscillator = this.context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(659.26, this.context.currentTime);
        oscillator.frequency.setValueAtTime(587.33, this.context.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(523.25, this.context.currentTime + 0.2);
        oscillator.connect(volume);

        oscillator.start();
        oscillator.stop(endTime);
    }
}

class InputHandler{
    constructor(){
        this.x = undefined;
    }

    start(x){
        this.x = x;
    }

    move(x){
        if(this.x !== undefined){
            let dx = this.x - x;
            this.x = x;
            game.handleInput(dx);
        }
    }

    stop(){
        this.x = undefined;
    }
}

class Game{
    constructor(){
        this.started = false;
        this.reset();
    }

    render(ctxt){
        ctxt.save();
        ctxt.translate((canvas.width - gameWidth) / 2, (canvas.height - gameHeight) / 2 - this.renderOffsetY * gameHeight);

        this.tower.render(ctxt);
        if(this.started){
            this.ball.render(ctxt);
        }

        ctxt.restore();

        if(this.started){
            ctxt.fillStyle = "#FFF";
            ctxt.textAlign = "center";
            ctxt.textBaseline = "middle";
            ctxt.font = `${gameWidth / 10}px arial`;
            ctxt.fillText(
                this.tower.score,
                canvas.width / 2,
                canvas.height / 15
            );
        }
    }

    update(){
        if(!gameOver.checked && this.started){
            this.ball.update();
            this.tower.update();
            this.tower.handleBall(this.ball);
            this.renderOffsetY = Math.max(this.ball.y - RENDER_OFFSET, this.renderOffsetY);
        }
    }

    start(){
        this.started = true;
    }

    reset(){
        this.ball = new Ball();
        this.tower = new Tower();

        this.renderOffsetY = -RENDER_OFFSET;
    }

    handleInput(dx){
        this.tower.rotateBy(dx * 10);
    }
}

class Ball{
    constructor(){
        this.y = 0;
        this.dy = 0;
        this.combo = 0;
        this.history = [];
        for(let i=0;i<10;i++){
            this.history.push(this.y);
        }
    }

    render(ctxt){
        let historyColor;
        let color;
        if(this.combo < COMBO_BOOST_COUNT){
            historyColor = "#09F9";
            color = "#09F";
        }else{
            historyColor = "#0DF9";
            color = "#0DF";
        }

        ctxt.fillStyle = historyColor;
        for(let i=0;i<this.history.length;i++){
            ctxt.beginPath();
            ctxt.arc(gameWidth / 2, gameHeight * this.history[i], gameWidth * BALL_RADIUS * i / this.history.length, 0, 2 * Math.PI);
            ctxt.fill();
        }

        ctxt.fillStyle = color;
        ctxt.beginPath();
        ctxt.arc(gameWidth / 2, gameHeight * this.y, gameWidth * BALL_RADIUS, 0, 2 * Math.PI);
        ctxt.fill();
    }

    update(){
        this.dy = Math.min(this.dy + BALL_GRAVITY, BALL_MAX_SPEED);
        this.y += this.dy;
        this.history.shift();
        this.history.push(this.y);
    }

    bounceBack(y, dy){
        this.y = y;
        this.dy = dy;
        this.combo = 0;
    }

    increaseCombo(){
        this.combo = Math.min(this.combo + 1, 8);
    }

    getCombo(){
        return this.combo;
    }
}

class Tower{
    constructor(){
        this.paddels = [];

        for(let i=0;i<5;i++){
            this.paddels.push(new Paddle(PADDLE_OFFSET * i + PADDLE_OFFSET));
        }
        this.paddels[0].convertToStart();

        this.angle = 0;

        this.score = 0;
    }

    render(ctxt){
        for(let i=this.paddels.length-1;i>=0;i--){
            this.paddels[i].render(ctxt, this.angle);
        }
    }

    update(){
        for(let paddel of this.paddels){
            paddel.update();
        }
    }

    rotateBy(angle){
        this.angle = (this.angle + angle + 2 * Math.PI) % (2 * Math.PI);
    }

    handleBall(ball){
        let paddle = this.paddels[0];
        if(ball.y + BALL_RADIUS > paddle.y + BALL_PADDLE_OFFSET){
            let top = this.paddels[0].getTop(this.angle)

            if(top === PADDLE_TYPE_GROUND){
                audioHandler.playGeneric();
                if(ball.getCombo() >= COMBO_BOOST_COUNT){
                    this.nextPaddle();
                }
                ball.bounceBack(paddle.y + BALL_PADDLE_OFFSET - BALL_RADIUS, -BALL_BOUCE_SPEED);
            }else if(top === PADDLE_TYPE_OBSTACLE){
                if(ball.getCombo() >= COMBO_BOOST_COUNT){
                    audioHandler.playGeneric();
                    ball.bounceBack(paddle.y + BALL_PADDLE_OFFSET - BALL_RADIUS, -BALL_BOUCE_SPEED);
                    this.nextPaddle();
                }else{
                    audioHandler.playLost();
                    gameOver.checked = true;
                    inputHandler.stop();
                }
            }else if(top === PADDLE_TYPE_AIR){
                audioHandler.playCombo(ball.getCombo());
                ball.increaseCombo();
                this.nextPaddle();
            }
        }
    }

    nextPaddle(){
        this.paddels.shift();
        this.paddels.push(new Paddle(this.paddels[this.paddels.length-1].y + PADDLE_OFFSET));
        this.score++;
    }
}

class Paddle{
    constructor(y){
        this.y = y;

        this.parts = [];
        for(let i=0;i<8;i++){
            let chance = Math.random();
            if(chance < 0.6){
                this.parts.push(PADDLE_TYPE_GROUND);
            }else if(chance < 0.85){
                this.parts.push(PADDLE_TYPE_AIR);
            }else{
                this.parts.push(PADDLE_TYPE_OBSTACLE);
            }
        }
        this.partSize = 2 * Math.PI / this.parts.length;

        this.parts[0] = 0;
        this.parts[this.parts.length-1] = 0;

        this.angle = 2 * Math.PI * Math.random();
        this.rotationSpeed = 0;
        if(Math.random() < 0.2){
            if(Math.random() < 0.5){
                this.rotationSpeed = -PADDLE_ROTATION_SPEED;
            }else{
                this.rotationSpeed = PADDLE_ROTATION_SPEED;
            }
        }
    }

    render(ctxt, angleOffset){
        let angle;

        for(let i=0;i<this.parts.length;i++){
            angle = normailzedAngle(2 * Math.PI * (i / this.parts.length) + angleOffset + this.angle);

            if(angle < Math.PI * 3 / 2 && angle > Math.PI / 2 - this.partSize) continue;

            this.renderSide(i, angle);
        }

        for(let i=this.parts.length-1;i>=0;i--){
            angle = normailzedAngle(2 * Math.PI * (i / this.parts.length) + angleOffset + this.angle);

            if(!(angle < Math.PI * 3 / 2 && angle > Math.PI / 2 - this.partSize)) continue;

            this.renderSide(i, angle);
        }

        this.renderFaces(ctxt, angleOffset);

        ctxt.fillStyle = "#AAA";
        ctxt.beginPath();
        ctxt.ellipse(gameWidth / 2, gameHeight * this.y, gameWidth * TOWER_WIDTH / 2, gameWidth * PADDLE_DISTORTION * TOWER_WIDTH / 2, 0, 0, 2 * Math.PI)
        ctxt.fillRect(gameWidth * (0.5 - TOWER_WIDTH / 2), gameHeight * this.y, gameWidth * TOWER_WIDTH, -gameHeight)
        ctxt.fill();
    }

    renderSide(index, angle){
        if(this.parts[index] === PADDLE_TYPE_AIR){
            ctxt.fillStyle = "#AAA";
            ctxt.beginPath();
            ctxt.ellipse(gameWidth / 2, gameHeight * this.y + gameHeight * PADDLE_HEIGHT, gameWidth * TOWER_WIDTH / 2, PADDLE_DISTORTION * gameWidth * TOWER_WIDTH / 2, 0, angle + this.partSize, angle, true);
            ctxt.ellipse(gameWidth / 2, gameHeight * this.y, gameWidth * TOWER_WIDTH / 2, PADDLE_DISTORTION * gameWidth * TOWER_WIDTH / 2, 0, angle, angle + this.partSize);
            ctxt.fill();

            return;
        }else if(this.parts[index] === PADDLE_TYPE_GROUND){
            ctxt.fillStyle = "#333";
        }else if(this.parts[index] === PADDLE_TYPE_OBSTACLE){
            ctxt.fillStyle = "#C00";
        }

        // inner wall
        ctxt.beginPath();
        ctxt.moveTo(gameWidth * (0.5 + Math.cos(angle) * TOWER_WIDTH / 2), gameHeight * this.y + gameHeight * PADDLE_HEIGHT + Math.sin(angle) * PADDLE_DISTORTION * gameWidth * TOWER_WIDTH / 2);
        ctxt.lineTo(gameWidth * (0.5 + Math.cos(angle) * PADDLE_LENGTH), gameHeight * this.y + gameHeight * PADDLE_HEIGHT + Math.sin(angle) * PADDLE_DISTORTION * gameWidth * PADDLE_LENGTH);
        ctxt.lineTo(gameWidth * (0.5 + Math.cos(angle) * PADDLE_LENGTH), gameHeight * this.y + Math.sin(angle) * PADDLE_DISTORTION * gameWidth * PADDLE_LENGTH);
        ctxt.lineTo(gameWidth * (0.5 + Math.cos(angle) * TOWER_WIDTH / 2), gameHeight * this.y + Math.sin(angle) * PADDLE_DISTORTION * gameWidth * TOWER_WIDTH / 2);
        ctxt.fill();

        // inner wall
        ctxt.beginPath();
        ctxt.moveTo(gameWidth * (0.5 + Math.cos(angle + this.partSize) * TOWER_WIDTH / 2), gameHeight * this.y + gameHeight * PADDLE_HEIGHT + Math.sin(angle + this.partSize) * PADDLE_DISTORTION * gameWidth * TOWER_WIDTH / 2);
        ctxt.lineTo(gameWidth * (0.5 + Math.cos(angle + this.partSize) * PADDLE_LENGTH), gameHeight * this.y + gameHeight * PADDLE_HEIGHT + Math.sin(angle + this.partSize) * PADDLE_DISTORTION * gameWidth * PADDLE_LENGTH);
        ctxt.lineTo(gameWidth * (0.5 + Math.cos(angle + this.partSize) * PADDLE_LENGTH), gameHeight * this.y + Math.sin(angle + this.partSize) * PADDLE_DISTORTION * gameWidth * PADDLE_LENGTH);
        ctxt.lineTo(gameWidth * (0.5 + Math.cos(angle + this.partSize) * TOWER_WIDTH / 2), gameHeight * this.y + Math.sin(angle + this.partSize) * PADDLE_DISTORTION * gameWidth * TOWER_WIDTH / 2);
        ctxt.fill();
        
        // outer wall
        ctxt.beginPath();
        ctxt.ellipse(gameWidth / 2, gameHeight * this.y + gameHeight * PADDLE_HEIGHT, gameWidth * PADDLE_LENGTH, PADDLE_DISTORTION * gameWidth * PADDLE_LENGTH, 0, angle + this.partSize, angle, true);
        ctxt.ellipse(gameWidth / 2, gameHeight * this.y, gameWidth * PADDLE_LENGTH, PADDLE_DISTORTION * gameWidth * PADDLE_LENGTH, 0, angle, angle + this.partSize);
        ctxt.fill();
    }

    renderFaces(ctxt, angleOffset){
        let angle;
        let seamColor;
        let faceColor;
        for(let i=0;i<this.parts.length;i++){
            angle = normailzedAngle(2 * Math.PI * (i / this.parts.length) + angleOffset + this.angle);

            if(this.parts[i] === PADDLE_TYPE_AIR){
                continue;
            }else if(this.parts[i] === PADDLE_TYPE_GROUND){
                seamColor = "#444";
                faceColor = "#444";
            }else if(this.parts[i] === PADDLE_TYPE_OBSTACLE){
                seamColor = "#E00";
                faceColor = "#E00";
            }

            if(this.index === i){
                seamColor = "#0E0";
                faceColor = "#0E0";
            }

            ctxt.strokeStyle = seamColor;
            ctxt.fillStyle = faceColor;
            ctxt.beginPath();
            ctxt.ellipse(gameWidth / 2, gameHeight * this.y, gameWidth * TOWER_WIDTH / 2, PADDLE_DISTORTION * gameWidth * TOWER_WIDTH / 2, 0, angle, angle + this.partSize);
            ctxt.ellipse(gameWidth / 2, gameHeight * this.y, gameWidth * PADDLE_LENGTH, PADDLE_DISTORTION * gameWidth * PADDLE_LENGTH, 0, angle + this.partSize, angle, true);
            ctxt.fill();
            ctxt.stroke();
        }
    }

    update(){
        this.angle += this.rotationSpeed;
    }

    getTop(angleOffset){
        return this.parts[(this.parts.length - Math.ceil(this.parts.length * normailzedAngle(angleOffset + this.angle) / (2 * Math.PI) - this.parts.length / 4)) % this.parts.length];
    }

    convertToStart(){
        this.angle = 0;
        for(let i=1;i<this.parts.length-1;i++){
            this.parts[i] = PADDLE_TYPE_GROUND
        }
        this.parts[0] = PADDLE_TYPE_AIR;
        this.parts[this.parts.length-1] = PADDLE_TYPE_AIR;
        this.rotationSpeed = 0;
    }
}

function normailzedAngle(angle){
    return (angle + 2 * Math.PI) % (2 * Math.PI);
}
