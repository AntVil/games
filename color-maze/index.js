const FPS = 60;
const MAP_SIZE = 16;
const ACTIONS_MIN_LENGTH = 10;
const ACTIONS_MAX_LENGTH = 100;
const MIN_DISABLED_POINTS_COUNT = 6;
const MIN_ACTIVE_POINTS_COUNT = 20;
const PATH_MAX_LENGTH = 10;

const CANVAS_RESOLUTION = 1024;
const SHADOW_LENGTH = CANVAS_RESOLUTION * 0.005;
const HIGHLIGHT_LENGTH = CANVAS_RESOLUTION * 0;
const WALL_LENGTH_X = CANVAS_RESOLUTION * 0.02;
const WALL_LENGTH_Y = CANVAS_RESOLUTION * 0.01;

const MAP_GAP_COLOR = "#000";
const TILE_COLOR = "#222";
const COLORED_TILE_COLOR = "#08D";
const WALL_COLOR = "#999";
const MAP_COLOR = "#EEE";
const TILE_PADDING_FACTOR = Math.pow(2, -8);
const BALL_SIZE_FACTOR = 0.4;
const BALL_SPEED = 0.4;

const TILE_SIZE = CANVAS_RESOLUTION / MAP_SIZE;

let canvas;
let ctxt;

let mapCompleted;

let inputHandler;

let map;

function setViewportSize(){
    document.documentElement.style.setProperty('--screen-width', `${window.innerWidth}px`);
    document.documentElement.style.setProperty('--screen-height', `${window.innerHeight}px`);
}

window.onresize = () => setViewportSize();

window.onorientationchange = () => setViewportSize();

window.onload = () => {
    if("serviceWorker" in navigator){
        navigator.serviceWorker.register("./serviceWorker.js");
    }

    setViewportSize();

    canvas = document.getElementById("canvas");
    canvas.width = CANVAS_RESOLUTION;
    canvas.height = CANVAS_RESOLUTION;
    ctxt = canvas.getContext("2d");

    mapCompleted = document.getElementById("mapCompleted");

    inputHandler = new InputHandler();

    canvas.addEventListener("mousedown", (e) => {
        e.preventDefault();
        
        let rect = canvas.getBoundingClientRect();
        let x = e.offsetX / rect.width;
        let y = e.offsetY / rect.height;

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
        
        let rect = canvas.getBoundingClientRect();
        let x = e.offsetX / rect.width;
        let y = e.offsetY / rect.height;

        inputHandler.move(x, y);
    });

    canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();

        let rect = canvas.getBoundingClientRect();
        let x = (e.touches[0].clientX - rect.left) / rect.width;
        let y = (e.touches[0].clientY - rect.top) / rect.height;

        inputHandler.start(x, y);
    });

    canvas.addEventListener("touchmove", (e) => {
        e.preventDefault();

        let rect = canvas.getBoundingClientRect();
        let x = (e.touches[0].clientX - rect.left) / rect.width;
        let y = (e.touches[0].clientY - rect.top) / rect.height;

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
    ctxt.fillStyle = MAP_GAP_COLOR;
    ctxt.fillRect(0, 0, canvas.width, canvas.height);

    map.render(ctxt);

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
        if(Math.hypot(dy, dx) > 0.1){
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
        for(let i=MAP_SIZE-1;i>=0;i--){
            for(let j=MAP_SIZE-1;j>=0;j--){
                if(this.grid[i][j].active){
                    this.grid[i][j].render(ctxt);
                }
            }
        }

        this.ball.render(ctxt);

        for(let i=0;i<MAP_SIZE;i++){
            for(let j=0;j<MAP_SIZE;j++){
                if(!this.grid[i][j].active){
                    this.grid[i][j].render(ctxt);
                }
            }
        }

        ctxt.fillStyle = MAP_COLOR;
        ctxt.fillRect(CANVAS_RESOLUTION - WALL_LENGTH_X, 0, WALL_LENGTH_X, CANVAS_RESOLUTION);
        ctxt.fillRect(0, CANVAS_RESOLUTION - WALL_LENGTH_Y, CANVAS_RESOLUTION, WALL_LENGTH_Y);
    }

    update(){
        this.ball.update();

        let x;
        let y;
        if(this.ball.dx > 0){
            x = Math.round(this.ball.x + BALL_SIZE_FACTOR);
            y = Math.round(this.ball.y);
        }else if(this.ball.dx < 0){ // works
            x = Math.round(this.ball.x - BALL_SIZE_FACTOR);
            y = Math.round(this.ball.y);
        }else if(this.ball.dy > 0){
            x = Math.round(this.ball.x);
            y = Math.round(this.ball.y + BALL_SIZE_FACTOR);
        }else if(this.ball.dy < 0){ // works
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
                TILE_SIZE * (this.x + TILE_PADDING_FACTOR),
                TILE_SIZE * (this.y + TILE_PADDING_FACTOR),
                TILE_SIZE * (1 - 2 * TILE_PADDING_FACTOR),
                TILE_SIZE * (1 - 2 * TILE_PADDING_FACTOR)
            );
        }else if(this.y !== MAP_SIZE-1){
            


            ctxt.fillStyle = WALL_COLOR;
            ctxt.beginPath();
            ctxt.moveTo(TILE_SIZE * (this.x + 1), TILE_SIZE * this.y);
            ctxt.lineTo(TILE_SIZE * (this.x + 1), TILE_SIZE * (this.y + 1));
            ctxt.lineTo(TILE_SIZE * this.x, TILE_SIZE * (this.y + 1));
            ctxt.lineTo(TILE_SIZE * this.x - WALL_LENGTH_X, TILE_SIZE * (this.y + 1) - WALL_LENGTH_Y);
            ctxt.lineTo(TILE_SIZE * (this.x + 1) - WALL_LENGTH_X, TILE_SIZE * (this.y + 1) - WALL_LENGTH_Y);
            ctxt.lineTo(TILE_SIZE * (this.x + 1) - WALL_LENGTH_X, TILE_SIZE * this.y - WALL_LENGTH_Y);
            ctxt.fill();

            ctxt.fillStyle = MAP_COLOR;
            ctxt.fillRect(
                TILE_SIZE * this.x - WALL_LENGTH_X - 1,
                TILE_SIZE * this.y - WALL_LENGTH_Y - 1,
                TILE_SIZE + 2,
                TILE_SIZE + 2
            );
        }else{
            ctxt.fillStyle = MAP_COLOR;
            ctxt.fillRect(
                TILE_SIZE * this.x - WALL_LENGTH_X - 1,
                TILE_SIZE * this.y - WALL_LENGTH_Y - 1,
                TILE_SIZE + 2,
                TILE_SIZE + 2
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
        ctxt.fillStyle = "#09F";
        for(let i=0;i<this.history.length;i++){
            ctxt.beginPath();
            ctxt.arc(
                TILE_SIZE * (this.history[i][0] + 0.5),
                TILE_SIZE * (this.history[i][1] + 0.5),
                TILE_SIZE * BALL_SIZE_FACTOR * Math.pow(i / this.history.length, 2),
                0,
                2 * Math.PI
            );
            ctxt.fill();
        }

        ctxt.shadowOffsetX = 0;
        ctxt.shadowOffsetY = SHADOW_LENGTH;
        ctxt.shadowBlur = 7;
        ctxt.shadowColor = "#000";

        ctxt.beginPath();
        ctxt.arc(
            TILE_SIZE * (this.x + 0.5),
            TILE_SIZE * (this.y + 0.5),
            TILE_SIZE * BALL_SIZE_FACTOR,
            0,
            2 * Math.PI
        );
        ctxt.fill();

        ctxt.shadowOffsetX = 0;
        ctxt.shadowOffsetY = 0;
        ctxt.shadowBlur = 0;
        ctxt.shadowColor = "";
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
