const FPS = 60;
const TARGET_POSITION = 0.22;
const TARGET_SIZE = 0.2;
const TARGET_LINE_WIDTH = 0.01;
const BULLET_POSITION = 0.75;
const BULLET_RADIUS = 0.02;
const BULLET_SPEED = 0.03;

let gameSize;

let canvas;
let ctxt;

let audio;

let game;

function setViewportSize(){
    canvas = document.getElementById("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctxt = canvas.getContext("2d");
    
    document.documentElement.style.setProperty("--screen-width", `${window.innerWidth}px`);
    document.documentElement.style.setProperty("--screen-height", `${window.innerHeight}px`);

    gameSize = Math.min(canvas.width, canvas.height);
}

window.onresize = () => setViewportSize();

window.onorientationchange = () => setViewportSize();

window.onload = () => {
    if("serviceWorker" in navigator){
        navigator.serviceWorker.register("./serviceWorker.js");
    }

    setViewportSize();

    canvas.addEventListener("mousedown", (e) => {
        e.preventDefault();

        if(audio === undefined){
            audio = new AudioHandler();
        }

        game.handleInput();
    });

    canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();

        if(audio === undefined){
            audio = new AudioHandler();
        }

        game.handleInput();
    });

    window.addEventListener("keydown", (e) => {
        if (e.repeat) return;

        if(audio === undefined){
            audio = new AudioHandler()
        }

        if(e.key === " "){
            game.handleInput();
        }
    });

    game = new Game();
    game.generate();

    setInterval(updateLoop, 1000 / FPS);
    renderLoop();
}

function renderLoop(){
    ctxt.clearRect(0, 0, canvas.width, canvas.height);

    ctxt.save();
    ctxt.translate((canvas.width - gameSize) / 2, (canvas.height - gameSize) / 2);

    game.render(ctxt);

    ctxt.restore();

    requestAnimationFrame(renderLoop);
}

function updateLoop(){
    game.update();
}

class AudioHandler{
    constructor(){
        this.context = new AudioContext();
    }

    play(frequency){
        let volume = this.context.createGain();
        let oscillator = this.context.createOscillator();

        oscillator.type = "sine";
        volume.connect(this.context.destination);
        oscillator.connect(volume);

        let endTime = this.context.currentTime + 0.1;
        volume.gain.setValueAtTime(1, this.context.currentTime);
        volume.gain.linearRampToValueAtTime(0, endTime);
        oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);

        oscillator.start();
        oscillator.stop(endTime);
    }
}

class Game{
    constructor(){
        
    }

    generate(){
        this.target = new Target();
        this.bullet = new Bullet();
    }

    render(ctxt){
        this.target.render(ctxt);

        if(this.bullet !== null){
            this.bullet.render(ctxt);
        }
    }

    handleInput(){
        if(this.bullet !== null){
            this.bullet.start();
        }
    }

    update(){
        this.target.update();

        if(this.bullet === null){
            return;
        }

        this.bullet.update();
        
        let [touches, valid] = this.target.touches(this.bullet);
        if(touches){
            if(valid){
                this.bullet = new Bullet();
            }else{
                this.bullet = null;
                document.getElementById("gameCompleted").checked = true;
            }
        }

        if(this.target.completed()){
            document.getElementById("gameCompleted").checked = true;
        }
    }
}

class Target{
    constructor(x, y){
        this.x = 0.5;
        this.y = TARGET_POSITION;

        this.t = 0;

        let rotators = [LinearRotator, ReverseLinearRotator, PeriodicRotator];
        this.rotator = new rotators[Math.floor(Math.random() * rotators.length)]();

        this.points = [];
        let amount = Math.round(Math.random() * 7 + 3);
        for(let i=0;i<amount;i++){
            this.points.push(Math.random() < 0.3);
        }

        this.points[Math.floor(Math.random() * this.points.length)] = false;
    }

    render(ctxt){
        let x1 = gameSize * (this.x + TARGET_SIZE * Math.cos(this.t));
        let y1 = gameSize * (this.y + TARGET_SIZE * Math.sin(this.t));
        let x2;
        let y2;
        ctxt.lineWidth = gameSize * TARGET_LINE_WIDTH;
        ctxt.lineCap = "round";
        for(let i=0;i<this.points.length+1;i++){
            x2 = x1;
            y2 = y1;
            x1 = gameSize * (this.x + TARGET_SIZE * Math.cos(this.t + 2 * Math.PI * i / this.points.length));
            y1 = gameSize * (this.y + TARGET_SIZE * Math.sin(this.t + 2 * Math.PI * i / this.points.length));

            if(this.points[i % this.points.length]){
                ctxt.strokeStyle = "#09F";
            }else{
                ctxt.strokeStyle = "#000";
            }
            ctxt.beginPath();
            ctxt.moveTo(x1, y1);
            ctxt.lineTo(x2, y2);
            ctxt.stroke();
        }
    }

    update(){
        this.rotator.update();
        this.t = this.rotator.get();
    }

    touches(bullet){
        let i = -Math.floor(this.t * this.points.length / (2 * Math.PI) - this.points.length / 4);
        let x1 = this.x + TARGET_SIZE * Math.cos(this.t + 2 * Math.PI * i / this.points.length);
        let y1 = this.y + TARGET_SIZE * Math.sin(this.t + 2 * Math.PI * i / this.points.length);
        let j = i - 1;
        let x2 = this.x + TARGET_SIZE * Math.cos(this.t + 2 * Math.PI * j / this.points.length);
        let y2 = this.y + TARGET_SIZE * Math.sin(this.t + 2 * Math.PI * j / this.points.length);

        
        let m = (y2 - y1) / (x2 - x1);
        let c = y1 - m * x1;
        
        let hitY = 0.5 * m + c;
        
        if(Math.abs(bullet.y - hitY) < BULLET_RADIUS){
            let k = (this.points.length + (i % this.points.length)) % this.points.length;
            let valid = !this.points[k];
            this.points[k] = true;
            return [true, valid];
        }else{
            return [false, false];
        }
    }

    completed(){
        for(let i=0;i<this.points.length;i++){
            if(!this.points[i]){
                return false;
            }
        }
        return true;
    }
}

class Bullet{
    constructor(){
        this.x = 0.5;
        this.y = BULLET_POSITION;
        this.ySpeed = 0;
    }

    render(ctxt){
        ctxt.fillStyle = "#09F";
        ctxt.beginPath();
        ctxt.arc(gameSize * this.x, gameSize * this.y, gameSize * BULLET_RADIUS, 0, 2 * Math.PI);
        ctxt.fill();
    }

    update(){
        this.y += this.ySpeed;
    }

    start(){
        this.ySpeed = -BULLET_SPEED;
    }
}

class LinearRotator{
    constructor(){
        this.t = 0;
        this.d = 0.02 + 0.01 * Math.random();
        console.log("linear")
    }

    update(){
        this.t += this.d;
    }

    get(){
        return this.t;
    }
}

class ReverseLinearRotator{
    constructor(){
        this.t = 0;
        this.d = 0.02 + 0.01 * Math.random();
        console.log("reverse")
    }

    update(){
        this.t -= this.d;
    }

    get(){
        return this.t;
    }
}

class PeriodicRotator{
    constructor(){
        this.t = 0;
        this.d = 0.01 + 0.01 * Math.random();
        this.offset = 2 * Math.PI * Math.random();
        console.log("periodic")
    }

    update(){
        this.t += this.d;
    }

    get(){
        return Math.PI * Math.sin(this.t) + this.offset;
    }
}
