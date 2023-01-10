const FPS = 60;

const ARC_START_SIZE_ANGLE = Math.PI * 3 / 2;
const ARC_SIZE_ANGLE_GROW_SIZE = Math.PI / 5;
const ARC_SIZE_ANGLE_SHRINK_FACTOR = 0.9;
const ARC_DISTANCE = 0.25;
const ARC_WIDTH = 0.015;
const ARC_MAX_ANGLE_CHANGE = Math.PI / 50;
const CORE_SIZE = 0.15;
const PARTICLE_START_DISTANCE = 1.5;
const PARTICLE_SIZE = 0.02;
const PARTICLE_SPEED = 0.001;
const PARTICLE_ZIGZAG_AMPLITUDE = 0.1;
const PARTICLE_ZIGZAG_FREQUENCY = 50;
const PARTICLE_SPIRAL_ANGLE = 0.005;
const PARTICLE_SPAWN_FRAME_COUNTER_CAP = 200;

let canvas;
let ctxt;

let audio;

let gameOver;

let mouseDown = false;

let gameSize;

let game;

function setViewportSize(){
    canvas = document.getElementById("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctxt = canvas.getContext("2d");

    document.documentElement.style.setProperty('--screen-width', `${window.innerWidth}px`);
    document.documentElement.style.setProperty('--screen-height', `${window.innerHeight}px`);

    gameSize = Math.min(canvas.width, canvas.height);
}

window.onresize = () => setViewportSize();

window.onorientationchange = () => setViewportSize();

window.onload = () => {
    if("serviceWorker" in navigator){
        navigator.serviceWorker.register("./serviceWorker.js");
    }

    setViewportSize();

    gameOver = document.getElementById("gameOver");

    audio = new AudioHandler();

    game = new Game();

    canvas.addEventListener("mousedown", (e) => {
        e.preventDefault();

        audio.context.resume();

        mouseDown = true;
        
        let angle = Math.atan2(
            e.clientY - canvas.height / 2,
            e.clientX - canvas.width / 2
        );

        game.handleInput(angle);
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
            let angle = Math.atan2(
                e.clientY - canvas.height / 2,
                e.clientX - canvas.width / 2
            );

            game.handleInput(angle);
        }
    });

    canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();

        audio.context.resume();

        let angle = Math.atan2(
            e.touches[0].clientY - canvas.height / 2,
            e.touches[0].clientX - canvas.width / 2
        );

        game.handleInput(angle);
    });

    canvas.addEventListener("touchmove", (e) => {
        e.preventDefault();

        let angle = Math.atan2(
            e.touches[0].clientY - canvas.height / 2,
            e.touches[0].clientX - canvas.width / 2
        );

        game.handleInput(angle);
    });

    setInterval(updateLoop, FPS / 1000);
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

    playPowerup(){
        let endTime = this.context.currentTime + 0.15;

        let volume = this.context.createGain();
        volume.connect(this.context.destination);
        volume.gain.setValueAtTime(1, this.context.currentTime);
        volume.gain.linearRampToValueAtTime(0, endTime);

        let oscillator = this.context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(293.66, this.context.currentTime);
        oscillator.frequency.setValueAtTime(329.63, this.context.currentTime + 0.1);
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
        oscillator.type = 'sine';
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
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(329.63, this.context.currentTime);
        oscillator.frequency.setValueAtTime(293.66, this.context.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(261.63, this.context.currentTime + 0.2);
        oscillator.connect(volume);

        oscillator.start();
        oscillator.stop(endTime);
    }
}

class Game{
    constructor(){
        this.particleTypes = [
            LinearParticle,
            ZigzagParticle,
            SpiralParticle,
            ReverseSpiralParticle,
            FastParticle
        ];
        this.reset();
    }

    render(ctxt){
        this.arc.render(ctxt);
        this.core.render(ctxt);

        for(let particle of this.particles){
            particle.render(ctxt);
        }
    }

    update(){
        if(!gameOver.checked){
            this.arc.update();

            for(let i=this.particles.length-1;i>=0;i--){
                this.particles[i].update();
                if(this.arc.intercepts(this.particles[i])){
                    this.particles.splice(i, 1);
                    this.arc.shrink();
                    audio.playGeneric();
                }else if(this.core.intercepts(this.particles[i])){
                    if(this.particles[i] instanceof LinearParticle){
                        this.core.score++;
                        this.arc.grow();
                        audio.playPowerup();
                    }else{
                        gameOver.checked = true;
                        audio.playLost();
                    }

                    this.particles.splice(i, 1);
                }
            }

            this.particleSpawnFrameCounter++;
            if(this.particleSpawnFrameCounter > PARTICLE_SPAWN_FRAME_COUNTER_CAP){
                this.particles.push(
                    new this.particleTypes[Math.floor(Math.random() * this.particleTypes.length)]
                );
                this.particleSpawnFrameCounter = 0;
            }
        }
    }

    reset(){
        this.arc = new Arc();
        this.core = new Core();

        this.particles = [];

        this.particleSpawnFrameCounter = PARTICLE_SPAWN_FRAME_COUNTER_CAP;
    }

    handleInput(angle){
        this.arc.setGoalRotation(angle);
    }
}

class Arc{
    constructor(){
        this.x = 0.5;
        this.y = 0.5;
        this.rotation = 0;
        this.goalRotation = 0;
        this.arcSizeAngle = ARC_START_SIZE_ANGLE;
    }

    render(ctxt){
        ctxt.setLineDash([gameSize / 100, gameSize / 100]);
        ctxt.fillStyle = "#000";
        ctxt.lineWidth = ARC_WIDTH * gameSize / 10;
        ctxt.beginPath();
        ctxt.arc(
            this.x * canvas.width,
            this.y * canvas.height,
            ARC_DISTANCE * gameSize,
            0,
            2 * Math.PI
        );
        ctxt.stroke();
        
        ctxt.setLineDash([]);
        ctxt.fillStyle = "#000";
        ctxt.lineWidth = ARC_WIDTH * gameSize;
        ctxt.lineCap = "round";
        ctxt.beginPath();
        ctxt.arc(
            this.x * canvas.width,
            this.y * canvas.height,
            ARC_DISTANCE * gameSize,
            this.rotation - this.arcSizeAngle / 2,
            this.rotation + this.arcSizeAngle / 2
        );
        ctxt.stroke();
    }

    update(){
        if(this.rotation !== this.goalRotation){
            if(this.rotation < this.goalRotation){
                this.rotation = Math.min(this.goalRotation, this.rotation + ARC_MAX_ANGLE_CHANGE);
            }else{
                this.rotation = Math.max(this.goalRotation, this.rotation - ARC_MAX_ANGLE_CHANGE);
            }
        }
    }

    setGoalRotation(rotation){
        while(rotation >= Math.PI * 2){
            rotation -= Math.PI * 2;
        }
        while(rotation < 0){
            rotation += Math.PI * 2;
        }
        this.goalRotation = rotation;

        let diff = this.rotation - this.goalRotation;
        if(diff > Math.PI){
            this.rotation -= 2 * Math.PI;
        }else if(diff < -Math.PI){
            this.rotation += 2 * Math.PI;
        }
    }

    intercepts(particle){
        if(particle.distance + PARTICLE_SIZE / 2 > ARC_DISTANCE - ARC_WIDTH / 2 && particle.distance - PARTICLE_SIZE / 2 < ARC_DISTANCE + ARC_WIDTH / 2){
            return (
                particle.angle > this.rotation - this.arcSizeAngle / 2 && particle.angle < this.rotation + this.arcSizeAngle / 2 ||
                particle.angle - 2 * Math.PI > this.rotation - this.arcSizeAngle / 2 && particle.angle - 2 * Math.PI < this.rotation + this.arcSizeAngle / 2 ||
                particle.angle + 2 * Math.PI > this.rotation - this.arcSizeAngle / 2 && particle.angle + 2 * Math.PI < this.rotation + this.arcSizeAngle / 2
            );
        }
        return false;
    }

    grow(){
        this.arcSizeAngle = Math.min(this.arcSizeAngle + ARC_SIZE_ANGLE_GROW_SIZE, ARC_START_SIZE_ANGLE);
    }

    shrink(){
        this.arcSizeAngle *= ARC_SIZE_ANGLE_SHRINK_FACTOR;
    }
}

class Core{
    constructor(){
        this.x = 0.5;
        this.y = 0.5;
        this.score = 0;
    }

    render(ctxt){
        ctxt.fillStyle = "#09F";
        ctxt.beginPath();
        ctxt.arc(
            this.x * canvas.width,
            this.y * canvas.height,
            CORE_SIZE * gameSize,
            0,
            2 * Math.PI
        );
        ctxt.fill();

        ctxt.fillStyle = "#FFF";
        ctxt.textAlign = "center";
        ctxt.textBaseline = "middle";
        ctxt.font = `${gameSize / 10}px arial`;
        ctxt.fillText(
            this.score,
            this.x * canvas.width,
            this.y * canvas.height
        );
    }

    intercepts(particle){
        return particle.distance < CORE_SIZE;
    }
}

class LinearParticle{
    constructor(){
        this.x = 0.5;
        this.y = 0.5;
        this.angle = 2 * Math.PI * Math.random();
        this.distance = PARTICLE_START_DISTANCE;
    }

    render(ctxt){
        let x = this.x * canvas.width + this.distance * gameSize * Math.cos(this.angle);
        let y = this.y * canvas.height + this.distance * gameSize * Math.sin(this.angle);
        ctxt.fillStyle = "#09F";
        ctxt.beginPath();
        ctxt.arc(
            x,
            y,
            PARTICLE_SIZE * gameSize,
            0,
            2 * Math.PI
        );
        ctxt.fill();
    }

    update(){
        this.distance -= PARTICLE_SPEED;
    }
}

class ZigzagParticle{
    constructor(){
        this.x = 0.5;
        this.y = 0.5;
        this.baseAngle = 2 * Math.PI * Math.random();
        this.angle = this.baseAngle;
        this.distance = PARTICLE_START_DISTANCE;
        this.startTime = Date.now();
    }

    render(ctxt){
        let x = this.x * canvas.width + this.distance * gameSize * Math.cos(this.angle);
        let y = this.y * canvas.height + this.distance * gameSize * Math.sin(this.angle);
        let r = PARTICLE_SIZE * gameSize;
        let t = (Date.now() - this.startTime)/ 200;
        ctxt.fillStyle = "#9F0";
        ctxt.beginPath();
        ctxt.moveTo(x + r * Math.cos(t), y + r * Math.sin(t));
        for(let i=1;i<5;i++){
            ctxt.lineTo(x + r * Math.cos(t + Math.PI * 2 * i / 5), y + r * Math.sin(t + Math.PI * 2 * i / 5));
        }
        ctxt.fill();
    }

    update(){
        this.distance -= PARTICLE_SPEED;
        this.angle = this.baseAngle + PARTICLE_ZIGZAG_AMPLITUDE * Math.sin(PARTICLE_ZIGZAG_FREQUENCY * this.distance);
    }
}

class SpiralParticle{
    constructor(){
        this.x = 0.5;
        this.y = 0.5;
        this.angle = 2 * Math.PI * Math.random();
        this.distance = PARTICLE_START_DISTANCE;
        this.startTime = Date.now();
    }

    render(ctxt){
        let x = this.x * canvas.width + this.distance * gameSize * Math.cos(this.angle);
        let y = this.y * canvas.height + this.distance * gameSize * Math.sin(this.angle);
        let r = PARTICLE_SIZE * gameSize;
        let t = (Date.now() - this.startTime)/ 200;
        ctxt.fillStyle = "#F09";
        ctxt.beginPath();
        ctxt.moveTo(x + r * Math.cos(t), y + r * Math.sin(t));
        for(let i=1;i<3;i++){
            ctxt.lineTo(x + r * Math.cos(t + Math.PI * 2 * i / 3), y + r * Math.sin(t + Math.PI * 2 * i / 3));
        }
        ctxt.fill();
    }

    update(){
        this.distance -= PARTICLE_SPEED;
        this.angle += PARTICLE_SPIRAL_ANGLE;
        if(this.angle > 2 * Math.PI){
            this.angle -= 2 * Math.PI;
        }
    }
}

class ReverseSpiralParticle{
    constructor(){
        this.x = 0.5;
        this.y = 0.5;
        this.angle = 2 * Math.PI * Math.random();
        this.distance = PARTICLE_START_DISTANCE;
        this.startTime = Date.now();
    }

    render(ctxt){
        let x = this.x * canvas.width + this.distance * gameSize * Math.cos(this.angle);
        let y = this.y * canvas.height + this.distance * gameSize * Math.sin(this.angle);
        let r = PARTICLE_SIZE * gameSize;
        let t = (Date.now() - this.startTime)/ 200;
        ctxt.fillStyle = "#F90";
        ctxt.beginPath();
        ctxt.moveTo(x + r * Math.cos(t), y + r * Math.sin(t));
        for(let i=1;i<3;i++){
            ctxt.lineTo(x + r * Math.cos(t + Math.PI * 2 * i / 3), y + r * Math.sin(t + Math.PI * 2 * i / 3));
        }
        ctxt.fill();
    }

    update(){
        this.distance -= PARTICLE_SPEED;
        this.angle -= PARTICLE_SPIRAL_ANGLE;
        if(this.angle < 0){
            this.angle += 2 * Math.PI;
        }
    }
}

class FastParticle{
    constructor(){
        this.x = 0.5;
        this.y = 0.5;
        this.angle = 2 * Math.PI * Math.random();
        this.distance = PARTICLE_START_DISTANCE;
        this.startTime = Date.now();
    }

    render(ctxt){
        let x = this.x * canvas.width + this.distance * gameSize * Math.cos(this.angle);
        let y = this.y * canvas.height + this.distance * gameSize * Math.sin(this.angle);
        let r = PARTICLE_SIZE * gameSize;
        let t = (Date.now() - this.startTime)/ 200;
        ctxt.fillStyle = "#F00";
        ctxt.beginPath();
        ctxt.moveTo(x + r * Math.cos(t), y + r * Math.sin(t));
        for(let i=1;i<4;i++){
            ctxt.lineTo(x + r * Math.cos(t + Math.PI * 2 * i / 4), y + r * Math.sin(t + Math.PI * 2 * i / 4));
        }
        ctxt.fill();
    }

    update(){
        this.distance -= PARTICLE_SPEED * 1.1;
    }
}
