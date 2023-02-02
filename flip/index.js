const FPS = 60;
const RENDER_OFFSET = 0.2;
const GRADIENT_LENGTH = 0.02;
const MAP_DEVIATION = 2;
const MAP_GAP = 3;
const MAP_BORDER = 1;
const MAP_SIZE = 2 * MAP_BORDER + 4 * MAP_DEVIATION + MAP_GAP;
const BALL_RADIUS = 0.02;
const BALL_GRAVITY = 0.0065;
const BALL_MAX_Y_SPEED = 0.02;
const BALL_INITIAL_X_SPEED = 0.01;
const FLIP_REQUESTED_FRAMES = 10;

let canvas;
let ctxt;

let audioHandler;

let gameOver;

let gameSize;

let game;

function setViewportSize(){
    canvas = document.getElementById("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctxt = canvas.getContext("2d");

    document.documentElement.style.setProperty("--screen-width", `${window.innerWidth}px`);
    document.documentElement.style.setProperty("--screen-height", `${window.innerHeight}px`);

    gameSize = Math.min(canvas.width, canvas.height);
    tileSize = gameSize / MAP_SIZE;
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

class Game{
    constructor(){
        this.started = false;
        this.reset();
    }

    render(ctxt){
        ctxt.fillStyle = "#333";
        ctxt.fillRect((canvas.width - gameSize) / 2, (canvas.height - gameSize) / 2, gameSize, gameSize);

        ctxt.save();
        ctxt.translate((canvas.width - gameSize) / 2 - this.renderOffsetX * gameSize, (canvas.height - gameSize) / 2);

        this.map.render(ctxt);
        this.ball.render(ctxt);

        ctxt.restore();

        /*
        let gradientLeft = ctxt.createLinearGradient((canvas.width - gameSize) / 2, 0, (canvas.width - gameSize) / 2 + gameSize * GRADIENT_LENGTH, 0);
        gradientLeft.addColorStop(0, "#EEE");
        gradientLeft.addColorStop(1, "#EEE0");
        ctxt.fillStyle = gradientLeft;
        ctxt.fillRect(Math.floor((canvas.width - gameSize) / 2), 0, gameSize * GRADIENT_LENGTH, canvas.height);

        let gradientRight = ctxt.createLinearGradient((canvas.width - gameSize) / 2 + gameSize - gameSize * GRADIENT_LENGTH, 0, (canvas.width - gameSize) / 2 + gameSize, 0);
        gradientRight.addColorStop(0, "#EEE0");
        gradientRight.addColorStop(1, "#EEE");
        ctxt.fillStyle = gradientRight;
        ctxt.fillRect(Math.ceil((canvas.width - gameSize) / 2 + gameSize - gameSize * GRADIENT_LENGTH), 0, gameSize * GRADIENT_LENGTH, canvas.height);
*/
        /*
        if(this.started){
            ctxt.fillStyle = "#FFF";
            ctxt.textAlign = "center";
            ctxt.textBaseline = "middle";
            ctxt.font = `${gameSize / 10}px arial`;
            ctxt.fillText(
                this.map.score,
                canvas.width / 2,
                canvas.height / 15
            );
        }
        */
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
        this.gravity = BALL_GRAVITY;
        this.history = [];
        for(let i=0;i<10;i++){
            this.history.push([this.x, this.y]);
        }
        this.onGround = false;
        this.flipRequested = false;
    }

    render(ctxt){
        ctxt.fillStyle = "#0DF9";
        for(let i=0;i<this.history.length;i++){
            ctxt.beginPath();
            ctxt.arc(gameSize * this.history[i][0], gameSize * this.history[i][1], gameSize * BALL_RADIUS * i / this.history.length, 0, 2 * Math.PI);
            ctxt.fill();
        }

        ctxt.fillStyle = "#0DF";
        ctxt.beginPath();
        ctxt.arc(gameSize * this.x, gameSize * this.y, gameSize * BALL_RADIUS, 0, 2 * Math.PI);
        ctxt.fill();
    }

    update(){
        if(!this.onGround){
            this.dy = Math.max(Math.min(this.dy + this.gravity, BALL_MAX_Y_SPEED), -BALL_MAX_Y_SPEED);
        }else if(this.flipRequested > 0){
            this.gravity = -this.gravity;
            this.dy = Math.max(Math.min(this.dy + this.gravity, BALL_MAX_Y_SPEED), -BALL_MAX_Y_SPEED);
            this.onGround = false;
            this.flipRequested = 0;
        }
        
        this.x += this.dx;
        this.y += this.dy;
        
        this.history.shift();
        this.history.push([this.x, this.y]);

        this.onGround = false;
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
        for(let i=0;i<2 * MAP_SIZE;i++){
            this.top.push(new MapVertex(i, MAP_BORDER + MAP_DEVIATION));
            this.bottom.push(new MapVertex(i, MAP_SIZE - MAP_BORDER - MAP_DEVIATION));
        }
    }

    update(ball){
        let x = (this.top[0].x + 1) / MAP_SIZE;
        
        if(ball.x - RENDER_OFFSET > x){
            this.top.shift();
            if(this.top[this.top.length-1].y != this.top[this.top.length-2].y){
                this.top.push(
                    new MapVertex(
                        this.top[this.top.length-1].x + 1,
                        this.top[this.top.length-1].y
                    )
                );
            }else{
                this.top.push(
                    new MapVertex(
                        this.top[this.top.length-1].x + 1,
                        Math.max(MAP_BORDER, Math.min(MAP_BORDER + 2 * MAP_DEVIATION, this.top[this.top.length-1].y + Math.round(Math.random() * (2 * Math.random() - 1))))
                    )
                );
            }

            this.bottom.shift();
            if(this.bottom[this.bottom.length-1].y != this.bottom[this.bottom.length-2].y){
                this.bottom.push(
                    new MapVertex(
                        this.bottom[this.bottom.length-1].x + 1,
                        this.bottom[this.bottom.length-1].y
                    )
                );
            }else{
                this.bottom.push(
                    new MapVertex(
                        this.bottom[this.bottom.length-1].x + 1,
                        Math.max(MAP_SIZE - (MAP_BORDER + 2 * MAP_DEVIATION), Math.min(MAP_SIZE - MAP_BORDER, this.bottom[this.bottom.length-1].y + Math.round(Math.random() * (2 * Math.random() - 1))))
                    )
                );
            }
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
            if(ball.y <= m * ball.x + c + BALL_RADIUS){
                ball.y = m * ball.x + c + BALL_RADIUS;
                ball.dy = 0;
                ball.onGround = true;
            }
        }
        
        if(ball.dy >= 0){
            x1 = this.bottom[index].x / MAP_SIZE;
            y1 = this.bottom[index].y / MAP_SIZE;
            x2 = this.bottom[index + 1].x / MAP_SIZE;
            y2 = this.bottom[index + 1].y / MAP_SIZE;

            m = (y2 - y1) / (x2 - x1);
            c = y1 - m * x1;
            if(ball.y >= m * ball.x + c - BALL_RADIUS){
                ball.y = m * ball.x + c - BALL_RADIUS;
                ball.dy = 0;
                ball.onGround = true;
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
        ctxt.fillStyle = "#EEE";
        ctxt.beginPath();
        ctxt.moveTo(tileSize * this.top[0].x, 0);
        for(let vertex of this.top){
            vertex.render(ctxt);
        }
        ctxt.lineTo(tileSize * this.top[this.top.length-1].x, 0);
        ctxt.fill();

        ctxt.beginPath();
        ctxt.moveTo(tileSize * this.bottom[0].x, gameSize);
        for(let vertex of this.bottom){
            vertex.render(ctxt);
        }
        ctxt.lineTo(tileSize * this.bottom[this.bottom.length-1].x, gameSize);
        ctxt.fill();
    }
}

class MapVertex{
    constructor(x, y){
        this.x = x;
        this.y = y;
    }

    render(ctxt){
        ctxt.lineTo(tileSize * this.x, tileSize * this.y);
    }
}
