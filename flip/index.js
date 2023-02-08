const FPS = 60;
const RENDER_OFFSET = 0.2;
const MAX_MAP_WIDTH = 2.5;
const MAP_DEVIATION = 2;
const MAP_GAP = 3;
const MAP_BORDER = 1;
const MAP_SIZE = 2 * MAP_BORDER + 4 * MAP_DEVIATION + MAP_GAP;
const BALL_RADIUS = 0.02;
const BALL_GRAVITY = 0.0065;
const BALL_MAX_Y_SPEED = 0.03;
const BALL_INITIAL_X_SPEED = 0.01;
const FLIP_REQUESTED_FRAMES = 10;
const VERTEX_BACKGROUND_OFFSET_X = 0.3;
const VERTEX_BACKGROUND_OFFSET_Y = 0.5;
const VERTEX_TYPE_OFFSET_X = VERTEX_BACKGROUND_OFFSET_X * 0.2;
const VERTEX_TYPE_OFFSET_Y = VERTEX_BACKGROUND_OFFSET_Y * 0.2;
const SHADOW_LENGTH = 0.005;

const VERTEX_FLIP = 0;
const VERTEX_HIT = 1;

let canvas;
let ctxt;

let audioHandler;

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

    gameHeight = Math.min(canvas.width, canvas.height);
    gameWidth = Math.min(canvas.width, gameHeight * MAX_MAP_WIDTH);
    tileSize = gameHeight / MAP_SIZE;
}

window.onresize = () => setViewportSize();

window.onorientationchange = () => setViewportSize();

window.onload = () => {
    if("serviceWorker" in navigator){
        navigator.serviceWorker.register("./serviceWorker.js");
    }

    gameOver = document.getElementById("gameOver");

    audioHandler = new AudioHandler();

    setViewportSize();

    game = new Game();

    canvas.addEventListener("mousedown", (e) => {
        e.preventDefault();

        game.handleInput();
    });

    canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();

        game.handleInput();
    });

    window.addEventListener("keydown", (e) => {
        if (e.repeat) return;

        if(e.key === " "){
            game.handleInput();
        }
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

    playOnGround(){
        let endTime = this.context.currentTime + 0.1;

        let volume = this.context.createGain();
        volume.connect(this.context.destination);
        volume.gain.setValueAtTime(1, this.context.currentTime);
        volume.gain.linearRampToValueAtTime(0, endTime);

        let oscillator = this.context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(220, this.context.currentTime);
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
        oscillator.frequency.setValueAtTime(329.63, this.context.currentTime);
        oscillator.frequency.setValueAtTime(293.67, this.context.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(261.63, this.context.currentTime + 0.2);
        oscillator.connect(volume);

        oscillator.start();
        oscillator.stop(endTime);
    }
}

class Game{
    constructor(){
        this.started = false;
        this.reset();
    }

    render(ctxt){
        ctxt.fillStyle = "#333";
        ctxt.fillRect((canvas.width - gameWidth) / 2, (canvas.height - gameHeight) / 2, gameWidth, gameHeight);

        ctxt.save();
        ctxt.translate((canvas.width - gameWidth) / 2 - this.renderOffsetX * gameHeight, (canvas.height - gameHeight) / 2);

        this.map.render(ctxt);
        this.ball.render(ctxt);

        ctxt.restore();

        ctxt.fillStyle = "#EEE";
        ctxt.fillRect(0, 0, (canvas.width - gameWidth) / 2, canvas.height);
        ctxt.fillRect(canvas.width - (canvas.width - gameWidth) / 2, 0, (canvas.width - gameWidth) / 2, canvas.height);

        if(this.started){
            ctxt.fillStyle = "#333";
            ctxt.textAlign = "right";
            ctxt.textBaseline = "middle";
            ctxt.font = `${gameHeight / (2 * MAP_SIZE)}px arial`;
            ctxt.fillText(
                (this.ball.x * 10).toFixed(1),
                canvas.width - (gameHeight / (2 * MAP_SIZE)),
                (canvas.height - gameHeight) / 2 + gameHeight / (2 * MAP_SIZE)
            );
        }
    }

    update(){
        if(!gameOver.checked && this.started){
            this.map.update(this.ball);
            this.ball.update();
            
            this.renderOffsetX = Math.max(this.ball.x - RENDER_OFFSET, this.renderOffsetX);
        }
    }

    start(){
        this.started = true;
    }

    reset(){
        this.ball = new Ball();
        this.map = new Map();

        this.renderOffsetX = this.ball.x - RENDER_OFFSET;
    }

    handleInput(){
        this.ball.flip();
    }
}

class Ball{
    constructor(){
        this.x = RENDER_OFFSET;
        this.y = 0.5;
        this.dx = BALL_INITIAL_X_SPEED;
        this.dy = 0;
        this.t = 0;
        this.gravity = BALL_GRAVITY;
        this.history = [];
        for(let i=0;i<10;i++){
            this.history.push([this.x, this.y]);
        }
        this.onTop = false;
        this.onBottom = false;
        this.flipRequested = false;
    }

    render(ctxt){
        if(this.onBottom){
            ctxt.fillStyle = "#0006";
            ctxt.beginPath();
            ctxt.ellipse(
                gameHeight * this.x,
                gameHeight * (this.y + BALL_RADIUS),
                gameHeight * BALL_RADIUS,
                gameHeight * BALL_RADIUS * VERTEX_BACKGROUND_OFFSET_Y,
                0,
                0,
                2 * Math.PI
            );
            ctxt.fill();
        }else if(this.onTop){
            ctxt.fillStyle = "#0006";
            ctxt.beginPath();
            ctxt.ellipse(
                gameHeight * this.x,
                gameHeight * (this.y - BALL_RADIUS),
                gameHeight * BALL_RADIUS,
                gameHeight * BALL_RADIUS * VERTEX_BACKGROUND_OFFSET_Y,
                0,
                0,
                2 * Math.PI
            );
            ctxt.fill();
        }

        ctxt.fillStyle = "#0CF9";
        for(let i=0;i<this.history.length;i++){
            ctxt.beginPath();
            ctxt.arc(gameHeight * this.history[i][0], gameHeight * this.history[i][1], gameHeight * BALL_RADIUS * i / this.history.length, 0, 2 * Math.PI);
            ctxt.fill();
        }

        ctxt.fillStyle = "#0CF";
        ctxt.beginPath();
        ctxt.arc(gameHeight * this.x, gameHeight * this.y, gameHeight * BALL_RADIUS, 0, 2 * Math.PI);
        ctxt.fill();

        if(this.dy >= 0 && !this.onTop){
            ctxt.fillStyle = "#0006";
            
            ctxt.beginPath();
            ctxt.arc(
                gameHeight * this.x,
                gameHeight * this.y,
                gameHeight * BALL_RADIUS,
                0,
                Math.PI
            );
            ctxt.arc(
                gameHeight * this.x,
                gameHeight * (this.y - SHADOW_LENGTH),
                gameHeight * BALL_RADIUS,
                Math.PI,
                0,
                true
            );
            ctxt.fill();
        }else{
            ctxt.fillStyle = "#0006"
            ctxt.beginPath();
            ctxt.arc(
                gameHeight * this.x,
                gameHeight * (this.y + SHADOW_LENGTH),
                gameHeight * BALL_RADIUS,
                0,
                Math.PI,
                true
            );
            ctxt.arc(
                gameHeight * this.x,
                gameHeight * this.y,
                gameHeight * BALL_RADIUS,
                Math.PI,
                0
            );
            ctxt.fill();
        }
    }

    update(){
        this.history.shift();
        this.history.push([this.x, this.y]);

        if(!this.onTop && !this.onBottom){
            this.dy = Math.max(Math.min(this.dy + this.gravity, BALL_MAX_Y_SPEED), -BALL_MAX_Y_SPEED);
        }else if(this.flipRequested > 0){
            this.gravity = -this.gravity;
            this.dy = Math.max(Math.min(this.dy + this.gravity, BALL_MAX_Y_SPEED), -BALL_MAX_Y_SPEED);
            this.onTop = false;
            this.onBottom = false;
            this.flipRequested = 0;
        }

        let speed = 1 + Math.log(1 + 0.0005 * this.t);
        this.x += this.dx * speed;
        this.y += this.dy * speed;
        this.t++;
        
        this.flipRequested--;
    }

    flip(){
        this.flipRequested = FLIP_REQUESTED_FRAMES;
    }
}

class Map{
    constructor(){
        this.x = 0;
        this.top = [];
        this.bottom = [];
        for(let i=0;i<MAX_MAP_WIDTH * MAP_SIZE + 2;i++){
            this.top.push(new MapVertex(i, MAP_BORDER + MAP_DEVIATION, undefined));
            this.bottom.push(new MapVertex(i, MAP_SIZE - MAP_BORDER - MAP_DEVIATION, undefined));
        }
        this.patterns = [PatternA, PatternB, PatternC, PatternD, PatternE, PatternF];
        this.pattern = new this.patterns[Math.floor(Math.random() * this.patterns.length)]();
        this.startTime = Date.now();
    }

    update(ball){
        let x = (this.top[0].x + 1) / MAP_SIZE;
        
        if(ball.x - RENDER_OFFSET > x){
            this.top.shift();
            if(this.top[this.top.length-1].y != this.top[this.top.length-2].y){
                this.top.push(
                    new MapVertex(
                        this.top[this.top.length-1].x + 1,
                        this.top[this.top.length-1].y,
                        this.pattern.getTop()
                    )
                );
            }else{
                let y = Math.max(MAP_BORDER, Math.min(MAP_BORDER + 2 * MAP_DEVIATION, this.top[this.top.length-1].y + Math.round(Math.random() * (2 * Math.random() - 1))));
                if(this.top[this.top.length-1].y !== y){
                    this.top[this.top.length-1].type = undefined;
                }

                this.top.push(
                    new MapVertex(
                        this.top[this.top.length-1].x + 1,
                        y,
                        this.pattern.getTop()
                    )
                );
            }

            this.bottom.shift();
            if(this.bottom[this.bottom.length-1].y != this.bottom[this.bottom.length-2].y){
                this.bottom.push(
                    new MapVertex(
                        this.bottom[this.bottom.length-1].x + 1,
                        this.bottom[this.bottom.length-1].y,
                        this.pattern.getBottom()
                    )
                );
            }else{
                let y = Math.max(MAP_SIZE - (MAP_BORDER + 2 * MAP_DEVIATION), Math.min(MAP_SIZE - MAP_BORDER, this.bottom[this.bottom.length-1].y + Math.round(Math.random() * (2 * Math.random() - 1))));
                if(this.bottom[this.bottom.length-1].y !== y){
                    this.bottom[this.bottom.length-1].type = undefined;
                }

                this.bottom.push(
                    new MapVertex(
                        this.bottom[this.bottom.length-1].x + 1,
                        y,
                        this.pattern.getBottom()
                    )
                );
            }
        }

        if(this.pattern.isEmpty()){
            this.pattern = new this.patterns[Math.floor(Math.random() * this.patterns.length)]();
        }

        let index = this.getIndex(ball.x);
        let x1, y1, x2, y2, m, c;

        if(ball.dy <= 0){
            x1 = this.top[index].x / MAP_SIZE;
            y1 = this.top[index].y / MAP_SIZE;
            x2 = this.top[index + 1].x / MAP_SIZE;
            y2 = this.top[index + 1].y / MAP_SIZE;

            m = (y2 - y1) / (x2 - x1);
            c = y1 - m * x1;
            if(ball.y <= m * ball.x + c + BALL_RADIUS || ball.onTop){
                this.top[index].handleBall(ball);

                if(!ball.onTop && !gameOver.checked){
                    audioHandler.playOnGround();
                }

                ball.y = m * ball.x + c + BALL_RADIUS;
                ball.dy = 0;
                ball.onTop = true;
            }
        }
        
        if(ball.dy >= 0){
            x1 = this.bottom[index].x / MAP_SIZE;
            y1 = this.bottom[index].y / MAP_SIZE;
            x2 = this.bottom[index + 1].x / MAP_SIZE;
            y2 = this.bottom[index + 1].y / MAP_SIZE;

            m = (y2 - y1) / (x2 - x1);
            c = y1 - m * x1;
            if(ball.y >= m * ball.x + c - BALL_RADIUS || ball.onBottom){
                this.bottom[index].handleBall(ball);
                
                if(!ball.onBottom && !gameOver.checked){
                    audioHandler.playOnGround();
                }

                ball.y = m * ball.x + c - BALL_RADIUS;
                ball.dy = 0;
                ball.onBottom = true;
            }
        }        
    }

    getIndex(x){
        for(let i=0;i<this.bottom.length;i++){
            if(this.bottom[i].x / MAP_SIZE < x && this.bottom[i+1].x / MAP_SIZE > x){
                return i;
            }
        }
    }

    render(ctxt){
        ctxt.fillStyle = "#AAA";
        ctxt.beginPath();
        ctxt.moveTo(tileSize * this.top[0].x, 0);
        for(let vertex of this.top){
            vertex.lineTo(ctxt, -VERTEX_BACKGROUND_OFFSET_X / 2, VERTEX_BACKGROUND_OFFSET_Y / 2);
        }
        ctxt.lineTo(tileSize * this.top[this.top.length-1].x, 0);
        ctxt.fill();

        ctxt.beginPath();
        ctxt.moveTo(tileSize * this.bottom[0].x, gameHeight);
        for(let vertex of this.bottom){
            vertex.lineTo(ctxt, -VERTEX_BACKGROUND_OFFSET_X / 2, -VERTEX_BACKGROUND_OFFSET_Y / 2);
        }
        ctxt.lineTo(tileSize * this.bottom[this.bottom.length-1].x, gameHeight);
        ctxt.fill();
        
        ctxt.fillStyle = "#EEE";
        ctxt.beginPath();
        ctxt.moveTo(tileSize * this.top[0].x, 0);
        for(let vertex of this.top){
            vertex.lineTo(ctxt, VERTEX_BACKGROUND_OFFSET_X / 2, -VERTEX_BACKGROUND_OFFSET_Y / 2);
        }
        ctxt.lineTo(tileSize * this.top[this.top.length-1].x, 0);
        ctxt.fill();

        ctxt.beginPath();
        ctxt.moveTo(tileSize * this.bottom[0].x, gameHeight);
        for(let vertex of this.bottom){
            vertex.lineTo(ctxt, VERTEX_BACKGROUND_OFFSET_X / 2, VERTEX_BACKGROUND_OFFSET_Y / 2);
        }
        ctxt.lineTo(tileSize * this.bottom[this.bottom.length-1].x, gameHeight);
        ctxt.fill();

        for(let i=this.top.length-1;i>=0;i--){
            this.top[i].render(ctxt, -VERTEX_BACKGROUND_OFFSET_X / 2, VERTEX_BACKGROUND_OFFSET_Y / 2, VERTEX_BACKGROUND_OFFSET_X / 2, -VERTEX_BACKGROUND_OFFSET_Y / 2, VERTEX_TYPE_OFFSET_X, VERTEX_TYPE_OFFSET_Y);
        }

        for(let i=this.bottom.length-1;i>=0;i--){
            this.bottom[i].render(ctxt, -VERTEX_BACKGROUND_OFFSET_X / 2, -VERTEX_BACKGROUND_OFFSET_Y / 2, VERTEX_BACKGROUND_OFFSET_X / 2, VERTEX_BACKGROUND_OFFSET_Y / 2, VERTEX_TYPE_OFFSET_X, -VERTEX_TYPE_OFFSET_Y);
        }
    }
}

class MapVertex{
    constructor(x, y, type){
        this.x = x;
        this.y = y;
        this.type = type;
    }

    lineTo(ctxt, offsetX, offsetY){
        ctxt.lineTo(tileSize * (this.x + offsetX), tileSize * (this.y + offsetY));
    }

    render(ctxt, offsetX1, offsetY1, offsetX2, offsetY2, padX, padY){
        let color1;
        let color2;
        if(this.type === undefined){
            return;
        }else if(this.type === VERTEX_FLIP){
            color1 = "#09F";
            color2 = "#0AF";
        }else if(this.type === VERTEX_HIT){
            color1 = "#A00";
            color2 = "#F00";
        }

        let a1x = tileSize * (this.x + 1 + offsetX1);
        let a2x = tileSize * (this.x + 1 + offsetX2);
        let a3x = tileSize * (this.x + offsetX2);
        let a4x = tileSize * (this.x + offsetX1);
        let b1x = tileSize * (this.x + 1 + offsetX1 + padX);
        let b2x = tileSize * (this.x + 1 + offsetX2 + padX);
        let b3x = tileSize * (this.x + offsetX2 + padX);
        let b4x = tileSize * (this.x + offsetX1 + padX);
        let a1y = tileSize * (this.y + offsetY1);
        let a2y = tileSize * (this.y + offsetY2);
        let a3y = tileSize * (this.y + offsetY2);
        let a4y = tileSize * (this.y + offsetY1);
        let b1y = tileSize * (this.y + offsetY1 + padY);
        let b2y = tileSize * (this.y + offsetY2 + padY);
        let b3y = tileSize * (this.y + offsetY2 + padY);
        let b4y = tileSize * (this.y + offsetY1 + padY);

        ctxt.fillStyle = color1;
        ctxt.beginPath();
        ctxt.moveTo(a3x, a3y);
        ctxt.lineTo(a2x, a2y);
        ctxt.lineTo(b2x, b2y);
        ctxt.lineTo(b3x, b3y);
        ctxt.fill();

        ctxt.beginPath();
        ctxt.moveTo(a3x, a3y);
        ctxt.lineTo(a4x, a4y);
        ctxt.lineTo(b4x, b4y);
        ctxt.lineTo(b3x, b3y);
        ctxt.fill();
        
        ctxt.fillStyle = color2;
        ctxt.beginPath();
        ctxt.moveTo(b1x, b1y);
        ctxt.lineTo(b2x, b2y);
        ctxt.lineTo(b3x, b3y);
        ctxt.lineTo(b4x, b4y);
        ctxt.fill();
    }

    handleBall(ball){
        if(this.type === undefined){
            return;
        }else if(this.type === VERTEX_FLIP){
            ball.flip();
        }else if(this.type === VERTEX_HIT){
            audioHandler.playLost();
            gameOver.checked = true;
        }
    }
}

class Pattern{
    constructor(a, b){
        if(Math.random() < 0.5){
            this.top = a;
            this.bottom = b;
        }else{
            this.top = b;
            this.bottom = a;
        }
    }

    getTop(){
        return this.top.shift();
    }
    
    getBottom(){
        return this.bottom.shift();
    }

    isEmpty(){
        return this.top.length === 0 && this.bottom.length === 0;
    }
}

class PatternA extends Pattern{
    constructor(){
        super(
            [undefined, undefined, undefined, undefined],
            [undefined, undefined, undefined, undefined]
        );
    }
}

class PatternB extends Pattern{
    constructor(){
        super(
            [undefined, undefined, undefined, undefined, undefined, undefined],
            [undefined, undefined, VERTEX_HIT, VERTEX_HIT, undefined, undefined]
        );
    }
}

class PatternC extends Pattern{
    constructor(){
        super(
            [undefined, undefined, undefined, undefined, undefined, VERTEX_FLIP, undefined, undefined, undefined, undefined],
            [undefined, VERTEX_HIT, VERTEX_HIT, undefined, undefined, undefined, undefined, undefined, VERTEX_HIT, VERTEX_HIT]
        );
    }
}

class PatternD extends Pattern{
    constructor(){
        super(
            [undefined, undefined, undefined, undefined, VERTEX_FLIP, VERTEX_HIT, VERTEX_HIT, VERTEX_HIT, VERTEX_HIT],
            [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined]
        );
    }
}

class PatternE extends Pattern{
    constructor(){
        super(
            [undefined, undefined, undefined, undefined, VERTEX_HIT, undefined, undefined, undefined, undefined, undefined, undefined],
            [undefined, undefined, undefined, undefined, undefined, undefined, VERTEX_HIT, undefined, undefined, undefined, undefined]
        );
    }
}

class PatternF extends Pattern{
    constructor(){
        super(
            [undefined, undefined, undefined, undefined, VERTEX_FLIP, undefined, undefined, undefined, undefined],
            [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined]
        );
    }
}
