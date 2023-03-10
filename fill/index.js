const MAP_SIZE = 6;
const PATH_MIN_LENGTH = 6;
const PATH_MAX_LENGTH = 20;

const TILE_COLOR = "#CCC";
const TILE_PADDING_FACTOR = 0.05;
const TILE_PATH_PADDING_FACTOR = 0.05;
const TILE_PATH_LINE_FACTOR = 0.01;
const TILE_PATH_DASH_FACTOR = 0.05;

let tileSize;

let canvas;
let ctxt;

let audio;

let mouseDown = false;

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

    audio = new AudioHandler();

    canvas.addEventListener("mousedown", (e) => {
        e.preventDefault();

        audio.context.resume();

        mouseDown = true;
        
        let x = Math.floor(((e.clientX - (canvas.width - gameSize) / 2) / gameSize) * MAP_SIZE);
        let y = Math.floor(((e.clientY - (canvas.height - gameSize) / 2) / gameSize) * MAP_SIZE);

        map.handleInput([x, y]);
    });

    canvas.addEventListener("mouseleave", (e) => {
        mouseDown = false;
    })

    canvas.addEventListener("mouseup", (e) => {
        mouseDown = false;
    });

    canvas.addEventListener("mousemove", (e) => {
        e.preventDefault();
        
        if(mouseDown){
            let x = Math.floor(((e.clientX - (canvas.width - gameSize) / 2) / gameSize) * MAP_SIZE);
            let y = Math.floor(((e.clientY - (canvas.height - gameSize) / 2) / gameSize) * MAP_SIZE);

            map.handleInput([x, y]);
        }
    });

    canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();

        audio.context.resume();

        let x = Math.floor(((e.touches[0].clientX - (canvas.width - gameSize) / 2) / gameSize) * MAP_SIZE);
        let y = Math.floor(((e.touches[0].clientY - (canvas.height - gameSize) / 2) / gameSize) * MAP_SIZE);

        map.handleInput([x, y]);
    });

    canvas.addEventListener("touchmove", (e) => {
        e.preventDefault();

        let x = Math.floor(((e.touches[0].clientX - (canvas.width - gameSize) / 2) / gameSize) * MAP_SIZE);
        let y = Math.floor(((e.touches[0].clientY - (canvas.height - gameSize) / 2) / gameSize) * MAP_SIZE);

        map.handleInput([x, y]);
    });

    map = new Map();

    map.generate();

    loop();
}

function loop(){
    ctxt.clearRect(0, 0, canvas.width, canvas.height);

    ctxt.save();
    ctxt.translate((canvas.width - gameSize) / 2, (canvas.height - gameSize) / 2);

    map.render(ctxt);

    ctxt.restore();

    requestAnimationFrame(loop);
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
        
        this.path;
        this.solutionPath;
    }

    generate(){
        this.hintBlocks = 1;
        for(let i=0;i<MAP_SIZE;i++){
            for(let j=0;j<MAP_SIZE;j++){
                this.grid[i][j].active = false;
            }
        }

        let currentPosition = [Math.floor(Math.random() * MAP_SIZE), Math.floor(Math.random() * MAP_SIZE)];
        this.grid[currentPosition[1]][currentPosition[0]].active = true;

        this.path = new Path(currentPosition, false);
        this.solutionPath = new Path(currentPosition, true);

        for(let i=0;i<PATH_MAX_LENGTH;i++){
            let options = [];
            if(currentPosition[0] !== 0 && !this.grid[currentPosition[1]][currentPosition[0] - 1].active){
                options.push([currentPosition[0] - 1, currentPosition[1]]);
            }
            if(currentPosition[1] !== 0 && !this.grid[currentPosition[1] - 1][currentPosition[0]].active){
                options.push([currentPosition[0], currentPosition[1] - 1]);
            }
            if(currentPosition[0] !== MAP_SIZE - 1 && !this.grid[currentPosition[1]][currentPosition[0] + 1].active){
                options.push([currentPosition[0] + 1, currentPosition[1]]);
            }
            if(currentPosition[1] !== MAP_SIZE - 1 && !this.grid[currentPosition[1] + 1][currentPosition[0]].active){
                options.push([currentPosition[0], currentPosition[1] + 1]);
            }

            if(options.length === 0){
                if(i <= PATH_MIN_LENGTH){
                    this.generate();
                }
                return;
            }

            let choosenOption = options[Math.floor(Math.random() * options.length)];
            this.grid[choosenOption[1]][choosenOption[0]].active = true;
            
            this.solutionPath.push(choosenOption);
            currentPosition = choosenOption;
        }
    }

    render(ctxt){
        try{
            for(let i=0;i<MAP_SIZE;i++){
                for(let j=0;j<MAP_SIZE;j++){
                    this.grid[i][j].render(ctxt);
                }
            }

            this.solutionPath.render(ctxt, this.hintBlocks);
            this.path.render(ctxt);
        }catch{

        }
    }

    handleInput(position){
        if(this.completed() || position[0] < 0 || position[1] < 0 || position[0] >= MAP_SIZE || position[1] >= MAP_SIZE){
            return;
        }

        let index = this.path.indexOf(position)
        if(index !== -1){
            this.path.truncate(index);
            this.path.playAudio(audio);
        }else if(this.grid[position[1]][position[0]].active && this.path.manhattanDistance(position) === 1){
            this.path.push(position);
            this.path.playAudio(audio);

            if(this.completed()){
                document.getElementById("mapCompleted").checked = true;
            }
        }
    }

    completed(){
        return this.path.count() === this.solutionPath.count();
    }

    hint(){
        this.hintBlocks += 4;
    }
}

class MapTile{
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.active = false;
    }

    render(ctxt){
        if(this.active){
            ctxt.fillStyle = TILE_COLOR;
            ctxt.fillRect(
                Math.round(tileSize * (this.x + TILE_PADDING_FACTOR)),
                Math.round(tileSize * (this.y + TILE_PADDING_FACTOR)),
                Math.round(tileSize * (1 - 2 * TILE_PADDING_FACTOR)),
                Math.round(tileSize * (1 - 2 * TILE_PADDING_FACTOR))
            );
        }
    }
}

class Path{
    constructor(start, isSolution){
        this.positions = [start.slice()];
        this.isSolution = isSolution;
    }

    render(ctxt, limit=undefined){
        let positions;
        if(isFinite(limit)){
            positions = this.positions.slice(0, Math.min(limit, this.positions.length - 1))
        }else{
            positions = this.positions;
        }

        ctxt.lineWidth = Math.round(tileSize * (1 - 2 * (TILE_PADDING_FACTOR + TILE_PATH_PADDING_FACTOR)));
        if(this.isSolution){
            ctxt.strokeStyle = "#09FA";
            ctxt.fillStyle = "#09FA";
        }else{
            ctxt.strokeStyle = "#09F";
            ctxt.fillStyle = "#09F";
        }
        
        if(positions.length === 1){
            ctxt.fillRect(
                tileSize * (positions[0][0] + TILE_PADDING_FACTOR + TILE_PATH_PADDING_FACTOR),
                tileSize * (positions[0][1] + TILE_PADDING_FACTOR + TILE_PATH_PADDING_FACTOR),
                tileSize * (1 - 2 * (TILE_PADDING_FACTOR + TILE_PATH_PADDING_FACTOR)),
                tileSize * (1 - 2 * (TILE_PADDING_FACTOR + TILE_PATH_PADDING_FACTOR))
            );
        }else{
            ctxt.setLineDash([]);
            ctxt.beginPath();
            ctxt.lineCap = "square";
            ctxt.moveTo(
                Math.round(tileSize * (positions[0][0] + 0.5)),
                Math.round(tileSize * (positions[0][1] + 0.5))
            );
            for(let i=0;i<positions.length;i++){
                ctxt.lineTo(
                    Math.round(tileSize * (positions[i][0] + 0.5)),
                    Math.round(tileSize * (positions[i][1] + 0.5))
                );
            }
            ctxt.stroke();
        }

        if(!this.isSolution){
            ctxt.lineWidth = tileSize * TILE_PATH_LINE_FACTOR;
            ctxt.strokeStyle = "#FFF";
            ctxt.setLineDash([tileSize * TILE_PATH_DASH_FACTOR, tileSize * TILE_PATH_DASH_FACTOR]);
            ctxt.beginPath();
            ctxt.moveTo(
                Math.round(tileSize * (positions[0][0] + 0.5)),
                Math.round(tileSize * (positions[0][1] + 0.5))
            );
            for(let i=1;i<positions.length;i++){
                ctxt.lineTo(
                    Math.round(tileSize * (positions[i][0] + 0.5)),
                    Math.round(tileSize * (positions[i][1] + 0.5))
                );
            }
            ctxt.stroke();
        }
    }

    push(position){
        this.positions.push(position.slice());
    }

    indexOf(position){
        for(let i=0;i<this.positions.length-1;i++){
            if(this.positions[i][0] == position[0] && this.positions[i][1] == position[1]){
                return i;
            }
        }
        return -1;
    }

    truncate(index){
        this.positions = this.positions.slice(0, index+1);
    }

    manhattanDistance(position){
        let last = this.positions[this.positions.length - 1];
        return Math.abs(last[0] - position[0]) + Math.abs(last[1] - position[1]);
    }

    count(){
        return this.positions.length;
    }

    playAudio(audio){
        audio.play(440 * Math.pow(1.059463094359, this.positions.length - 24));
    }
}
