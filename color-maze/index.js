const FPS = 60;
const MAP_SIZE = 16;
const ACTIONS_MIN_LENGTH = 10;
const ACTIONS_MAX_LENGTH = 100;
const MIN_DISABLED_POINTS_COUNT = 6;
const MIN_ACTIVE_POINTS_COUNT = 20;
const PATH_MAX_LENGTH = 10;

const SHADOW_LENGTH = 0.1;
const WALL_LENGTH_X = 0.2;
const WALL_LENGTH_Y = 0.2;

const MAP_GAP_COLOR = "#000";
const TILE_COLOR = "#222";
const COLORED_TILE_COLOR = "#08D";
const WALL_COLOR = "#999";
const MAP_COLOR = "#EEE";
const TILE_PADDING_FACTOR = Math.pow(2, -8);
const BALL_SIZE_FACTOR = 0.4;
const BALL_SPEED = 0.4;

let tileSize;
let gameSize;

let canvas;
let ctxt;

let mapCompleted;

let inputHandler;
let audioHandler;

let map;

function setViewportSize(){
    canvas = document.getElementById("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctxt = canvas.getContext("2d");
    
    document.documentElement.style.setProperty("--screen-width", `${window.innerWidth}px`);
    document.documentElement.style.setProperty("--screen-height", `${window.innerHeight}px`);

    gameSize = Math.min(canvas.width, canvas.height);
    tileSize = (gameSize / MAP_SIZE);
}

window.onresize = () => setViewportSize();

window.onorientationchange = () => setViewportSize();

window.onload = () => {
    if("serviceWorker" in navigator){
        navigator.serviceWorker.register("./serviceWorker.js");
    }

    setViewportSize();

    mapCompleted = document.getElementById("mapCompleted");

    inputHandler = new InputHandler();

    canvas.addEventListener("mousedown", (e) => {
        e.preventDefault();

        if(audioHandler === undefined){
            audioHandler = new AudioHandler()
        }
        
        let x = e.clientX / gameSize;
        let y = e.clientY / gameSize;

        inputHandler.start(x, y);
    });

    canvas.addEventListener("mouseleave", (e) => {
        inputHandler.stop();
    })

    canvas.addEventListener("mouseup", (e) => {
        inputHandler.stop();
    });

    canvas.addEventListener("mousemove", (e) => {
        e.preventDefault();
        
        let x = e.clientX / gameSize;
        let y = e.clientY / gameSize;

        inputHandler.move(x, y);
    });

    canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();

        if(audioHandler === undefined){
            audioHandler = new AudioHandler()
        }

        let x = e.touches[0].clientX / gameSize;
        let y = e.touches[0].clientY / gameSize;

        inputHandler.start(x, y);
    });

    canvas.addEventListener("touchmove", (e) => {
        e.preventDefault();

        let x = e.touches[0].clientX / gameSize;
        let y = e.touches[0].clientY / gameSize;

        inputHandler.move(x, y);
    });

    canvas.addEventListener("touchcancel", (e) => {
        inputHandler.stop();
    });

    canvas.addEventListener("touchend", (e) => {
        inputHandler.stop();
    });

    window.addEventListener("keydown", (e) => {
        if (e.repeat) return;

        if(audioHandler === undefined){
            audioHandler = new AudioHandler()
        }

        if(e.key === "ArrowUp" || e.key === "w"){
            map.ball.goUp();
        }else if(e.key === "ArrowLeft" || e.key === "a"){
            map.ball.goLeft();
        }else if(e.key === "ArrowDown" || e.key === "s"){
            map.ball.goDown();
        }else if(e.key === "ArrowRight" || e.key === "d"){
            map.ball.goRight();
        }
    });

    map = new Map();
    
    map.generate();

    setInterval(updateLoop, 1000 / FPS);
    renderLoop();
}

function renderLoop(){
    ctxt.save();
    ctxt.translate((canvas.width - gameSize) / 2, (canvas.height - gameSize) / 2);

    map.render(ctxt);

    ctxt.restore();
    ctxt.fillStyle = MAP_COLOR;
    ctxt.fillRect(0, 0, canvas.width, (canvas.height - gameSize) / 2);
    ctxt.fillRect(0, canvas.height - (canvas.height - gameSize) / 2, canvas.width, (canvas.height - gameSize) / 2);
    ctxt.fillRect(0, 0, (canvas.width - gameSize) / 2, canvas.height);
    ctxt.fillRect(canvas.width - (canvas.width - gameSize) / 2, 0, (canvas.width - gameSize) / 2, canvas.height);

    requestAnimationFrame(renderLoop);
}

function updateLoop(){
    map.update();
}

class InputHandler{
    constructor(){
        this.mousePosition = [undefined, undefined];
    }

    start(x, y){
        this.mousePosition = [x, y];
    }
    
    stop(){
        this.mousePosition = [undefined, undefined];
    }

    move(x, y){
        let dx = x - this.mousePosition[0];
        let dy = y - this.mousePosition[1];
        if(Math.hypot(dy, dx) > 0.05){
            if(Math.abs(dx) > Math.abs(dy)){
                if(dx > 0){
                    map.ball.goRight();
                }else{
                    map.ball.goLeft();
                }
            }else{
                if(dy > 0){
                    map.ball.goDown();
                }else{
                    map.ball.goUp();
                }
            }
            this.stop();
        }
    }
}

class AudioHandler{
    constructor(){
        this.context = new AudioContext();
        this.volume = this.context.createGain();
        this.oscillator = this.context.createOscillator(); 

        this.oscillator.type = "sine";
        this.volume.connect(this.context.destination);
        this.oscillator.connect(this.volume);
    
        this.volume.gain.setValueAtTime(0, this.context.currentTime);
        this.oscillator.frequency.setValueAtTime(196, this.context.currentTime);
        this.oscillator.start();
    }

    playStop(){
        this.volume.gain.setTargetAtTime(1, this.context.currentTime, 0.01);
        this.volume.gain.setTargetAtTime(0, this.context.currentTime + 0.1, 0.01);
    }
}

class Map{
    constructor(){
        this.grid = [];
        for(let i=0;i<MAP_SIZE;i++){
            let row = [];
            for(let j=0;j<MAP_SIZE;j++){
                row.push(new MapTile(j, i));
            }
            this.grid.push(row);
        }

        this.ball;
    }

    generate(){
        for(let i=0;i<MAP_SIZE;i++){
            for(let j=0;j<MAP_SIZE;j++){
                this.grid[i][j].reset();
            }
        }

        let currentPosition = [Math.floor(Math.random() * (MAP_SIZE-2) + 1), Math.floor(Math.random() * (MAP_SIZE-2) + 1)];
        this.grid[currentPosition[1]][currentPosition[0]].active = true;
        this.grid[currentPosition[1]][currentPosition[0]].colored = true;
        this.ball = new Ball(currentPosition[0], currentPosition[1]);
        
        for(let i=0;i<ACTIONS_MAX_LENGTH;i++){
            let options = [];
            if(
                currentPosition[0] !== 1 &&
                !this.grid[currentPosition[1]][currentPosition[0] - 1].disabled &&
                (currentPosition[0] === MAP_SIZE-2 || !this.grid[currentPosition[1]][currentPosition[0] + 1].active)
            ){
                options.push([-1, 0]);
            }
            if(
                currentPosition[1] !== 1 &&
                !this.grid[currentPosition[1] - 1][currentPosition[0]].disabled &&
                (currentPosition[1] === MAP_SIZE-2 || !this.grid[currentPosition[1] + 1][currentPosition[0]].active)
            ){
                options.push([0, -1]);
            }
            if(
                currentPosition[0] !== MAP_SIZE - 2 &&
                !this.grid[currentPosition[1]][currentPosition[0] + 1].disabled &&
                (currentPosition[0] === 1 || !this.grid[currentPosition[1]][currentPosition[0] - 1].active)
            ){
                options.push([1, 0]);
            }
            if(
                currentPosition[1] !== MAP_SIZE - 2 &&
                !this.grid[currentPosition[1] + 1][currentPosition[0]].disabled &&
                (currentPosition[1] === 1 || !this.grid[currentPosition[1] - 1][currentPosition[0]].active)
            ){
                options.push([0, 1]);
            }

            if(options.length === 0){
                if(i <= ACTIONS_MIN_LENGTH){
                    this.generate();
                    return;
                }
                break;
            }

            let choosenOption = options[Math.floor(Math.random() * options.length)];
            
            if(
                currentPosition[0] - choosenOption[0] >= 1 &&
                currentPosition[1] - choosenOption[1] >= 1 &&
                currentPosition[0] - choosenOption[0] < MAP_SIZE - 1 &&
                currentPosition[1] - choosenOption[1] < MAP_SIZE - 1 &&
                !this.grid[currentPosition[1] - choosenOption[1]][currentPosition[0] - choosenOption[0]].active
            ){
                this.grid[currentPosition[1] - choosenOption[1]][currentPosition[0] - choosenOption[0]].disabled = true;
            }

            let pathLength = Math.floor(Math.random() * PATH_MAX_LENGTH);
            for(let j=0;;j++){
                if(
                    currentPosition[0] + choosenOption[0] >= 1 &&
                    currentPosition[1] + choosenOption[1] >= 1 &&
                    currentPosition[0] + choosenOption[0] < MAP_SIZE - 1 &&
                    currentPosition[1] + choosenOption[1] < MAP_SIZE - 1 &&
                    !this.grid[currentPosition[1] + choosenOption[1]][currentPosition[0] + choosenOption[0]].disabled
                ){
                    if(
                        !this.grid[currentPosition[1] + choosenOption[1]][currentPosition[0] + choosenOption[0]].active &&
                        j > pathLength
                    ){
                        break;
                    }

                    currentPosition[0] += choosenOption[0];
                    currentPosition[1] += choosenOption[1];
                    this.grid[currentPosition[1]][currentPosition[0]].active = true;
                }else{
                    break;
                }
            }

            if(
                currentPosition[0] + choosenOption[0] >= 1 &&
                currentPosition[1] + choosenOption[1] >= 1 &&
                currentPosition[0] + choosenOption[0] < MAP_SIZE - 1 &&
                currentPosition[1] + choosenOption[1] < MAP_SIZE - 1
            ){
                this.grid[currentPosition[1] + choosenOption[1]][currentPosition[0] + choosenOption[0]].disabled = true;
            }
        }

        let activePointsCount = 0;
        let disabledPointsCount = 0;
        for(let i=0;i<MAP_SIZE;i++){
            for(let j=0;j<MAP_SIZE;j++){
                if(this.grid[i][j].active){
                    activePointsCount++;
                }
                if(this.grid[i][j].disabled){
                    disabledPointsCount++;
                }
            }
        }

        if(activePointsCount < MIN_ACTIVE_POINTS_COUNT || disabledPointsCount < MIN_DISABLED_POINTS_COUNT){
            this.generate();
        }
    }

    render(ctxt){
        ctxt.fillStyle = MAP_GAP_COLOR;
        ctxt.fillRect(0, 0, gameSize, gameSize);

        for(let i=MAP_SIZE-1;i>=0;i--){
            for(let j=MAP_SIZE-1;j>=0;j--){
                if(this.grid[i][j].active){
                    this.grid[i][j].render(ctxt);
                }
            }
        }

        this.ball.render(ctxt);

        // draw walls from outward to inward
        for(let i=0;i<MAP_SIZE;i++){
            for(let j=0;j<MAP_SIZE/2;j++){
                if(!this.grid[i][j].active){
                    this.grid[i][j].render(ctxt);
                }
            }
            for(let j=MAP_SIZE-1;j>=MAP_SIZE/2;j--){
                if(!this.grid[i][j].active){
                    this.grid[i][j].render(ctxt);
                }
            }
        }

        // hide wall of lowest row
        ctxt.fillStyle = MAP_COLOR;
        ctxt.fillRect(0, gameSize - tileSize * WALL_LENGTH_Y, gameSize, tileSize * WALL_LENGTH_Y);
    }

    update(){
        this.ball.update();

        let x;
        let y;
        if(this.ball.dx > 0){
            x = Math.round(this.ball.x + BALL_SIZE_FACTOR);
            y = Math.round(this.ball.y);
        }else if(this.ball.dx < 0){
            x = Math.round(this.ball.x - BALL_SIZE_FACTOR);
            y = Math.round(this.ball.y);
        }else if(this.ball.dy > 0){
            x = Math.round(this.ball.x);
            y = Math.round(this.ball.y + BALL_SIZE_FACTOR);
        }else if(this.ball.dy < 0){
            x = Math.round(this.ball.x);
            y = Math.round(this.ball.y - BALL_SIZE_FACTOR);
        }

        if(x !== undefined || y !== undefined){
            if(
                x < 0 ||
                y < 0 ||
                x > MAP_SIZE-1 ||
                y > MAP_SIZE-1 ||
                !this.grid[y][x].active
            ){
                audioHandler.playStop();
                this.ball.stop();
            }else if(!this.grid[y][x].colored){
                this.grid[y][x].colored = true;

                if(this.completed()){
                    mapCompleted.checked = true;
                }
            }
        }
    }

    completed(){
        for(let i=0;i<this.grid.length;i++){
            for(let j=0;j<this.grid[i].length;j++){
                if(this.grid[i][j].active && !this.grid[i][j].colored){
                    return false;
                }
            }
        }
        return true;
    }
}

class MapTile{
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.active = false;
        this.disabled = false;
        this.colored = false;
    }

    render(ctxt){
        if(this.active){
            if(this.colored){
                ctxt.fillStyle = COLORED_TILE_COLOR;
            }else{
                ctxt.fillStyle = TILE_COLOR;
            }
            ctxt.fillRect(
                tileSize * (this.x + TILE_PADDING_FACTOR),
                tileSize * (this.y + TILE_PADDING_FACTOR),
                tileSize * (1 - 2 * TILE_PADDING_FACTOR),
                tileSize * (1 - 2 * TILE_PADDING_FACTOR)
            );
        }else{
            let wallX = WALL_LENGTH_X * (this.x - MAP_SIZE/2) / MAP_SIZE
            
            ctxt.fillStyle = WALL_COLOR;
            ctxt.beginPath();
            if(wallX < 0){
                ctxt.moveTo(tileSize * (this.x + 1), tileSize * this.y);
                ctxt.lineTo(tileSize * (this.x + 1), tileSize * (this.y + 1));
                ctxt.lineTo(tileSize * this.x, tileSize * (this.y + 1));
                ctxt.lineTo(tileSize * (this.x + wallX), tileSize * (this.y + 1 - WALL_LENGTH_Y));
                ctxt.lineTo(tileSize * (this.x + 1 + wallX), tileSize * (this.y + 1 - WALL_LENGTH_Y));
                ctxt.lineTo(tileSize * (this.x + 1 + wallX), tileSize * (this.y - WALL_LENGTH_Y));
            }else{
                ctxt.moveTo(tileSize * this.x, tileSize * this.y);
                ctxt.lineTo(tileSize * this.x, tileSize * (this.y + 1));
                ctxt.lineTo(tileSize * (this.x + 1), tileSize * (this.y + 1));
                ctxt.lineTo(tileSize * (this.x + 1 + wallX), tileSize * (this.y + 1 - WALL_LENGTH_Y));
                ctxt.lineTo(tileSize * (this.x + wallX), tileSize * (this.y + 1 - WALL_LENGTH_Y));
                ctxt.lineTo(tileSize * (this.x + wallX), tileSize * (this.y - WALL_LENGTH_Y));
            }
            ctxt.fill();
            
            ctxt.fillStyle = MAP_COLOR;
            ctxt.fillRect(
                tileSize * (this.x + wallX) - 1,
                tileSize * (this.y - WALL_LENGTH_Y) - 1,
                tileSize + 2,
                tileSize + 2
            );
        }
    }

    reset(){
        this.active = false;
        this.disabled = false;
        this.colored = false;
    }
}

class Ball{
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.dx = 0;
        this.dy = 0;
        this.history = [];
        for(let i=0;i<15;i++){
            this.history.push([this.x, this.y]);
        }
    }

    render(ctxt){
        // trail
        ctxt.fillStyle = "#09F";
        for(let i=0;i<this.history.length;i++){
            ctxt.beginPath();
            ctxt.arc(
                tileSize * (this.history[i][0] + 0.5),
                tileSize * (this.history[i][1] + 0.5),
                tileSize * BALL_SIZE_FACTOR * Math.pow(i / this.history.length, 2),
                0,
                2 * Math.PI
            );
            ctxt.fill();
        }

        ctxt.shadowOffsetX = 0;
        ctxt.shadowOffsetY = tileSize * SHADOW_LENGTH;
        ctxt.shadowBlur = 7;
        ctxt.shadowColor = "#000";

        ctxt.beginPath();
        ctxt.arc(
            tileSize * (this.x + 0.5),
            tileSize * (this.y + 0.5),
            tileSize * BALL_SIZE_FACTOR,
            0,
            2 * Math.PI
        );
        ctxt.fill();

        ctxt.shadowOffsetX = 0;
        ctxt.shadowOffsetY = 0;
        ctxt.shadowBlur = 0;
        ctxt.shadowColor = "";

        // bottom shadow
        ctxt.fillStyle = "#0006"
        ctxt.beginPath();
        ctxt.arc(
            tileSize * (this.x + 0.5),
            tileSize * (this.y + 0.5),
            tileSize * BALL_SIZE_FACTOR,
            0,
            Math.PI
        );
        ctxt.arc(
            tileSize * (this.x + 0.5),
            tileSize * (this.y + 0.5 - SHADOW_LENGTH),
            tileSize * BALL_SIZE_FACTOR,
            Math.PI,
            0,
            true
        );
        ctxt.fill()
        
        // bottom highlight
        ctxt.fillStyle = "#FFF6"
        ctxt.beginPath();
        ctxt.arc(
            tileSize * (this.x + 0.5),
            tileSize * (this.y + 0.5),
            tileSize * BALL_SIZE_FACTOR,
            0,
            Math.PI
        );
        ctxt.arc(
            tileSize * (this.x + 0.5),
            tileSize * (this.y + 0.5) - 1,
            tileSize * BALL_SIZE_FACTOR,
            Math.PI,
            0,
            true
        );
        ctxt.fill()

        // top highlight
        ctxt.fillStyle = "#FFF4"
        ctxt.ellipse(
            tileSize * (this.x + 0.65),
            tileSize * (this.y + 0.3),
            tileSize * BALL_SIZE_FACTOR / 3,
            tileSize * BALL_SIZE_FACTOR / 5,
            Math.PI / 4,
            0,
            2 * Math.PI
        );
        ctxt.fill()
    }

    update(){
        this.x += this.dx;
        this.y += this.dy;

        this.history.push([this.x, this.y]);
        this.history.shift();
    }

    stop(){
        this.x = Math.round(this.x - this.dx);
        this.y = Math.round(this.y - this.dy);
        this.dx = 0;
        this.dy = 0;
    }

    goUp(){
        if(this.dx === 0 && this.dy === 0){
            this.dx = 0;
            this.dy = -BALL_SPEED;
        }
    }

    goRight(){
        if(this.dx === 0 && this.dy === 0){
            this.dx = BALL_SPEED;
            this.dy = 0;
        }
    }

    goDown(){
        if(this.dx === 0 && this.dy === 0){
            this.dx = 0;
            this.dy = BALL_SPEED;
        }
    }

    goLeft(){
        if(this.dx === 0 && this.dy === 0){
            this.dx = -BALL_SPEED;
            this.dy = 0;
        }
    }
}
