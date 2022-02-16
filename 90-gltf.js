import { Application } from './common/engine/Application.js';

import { GLTFLoader } from './GLTFLoader.js';
import { Renderer } from './Renderer.js';
import { vec3, mat4 } from './lib/gl-matrix-module.js';
import { GUI } from './lib/dat.gui.module.js';
import { Physics } from './Physics.js';
import {Node} from './Node.js';
import {Scene} from './Scene.js';
import {HouseSlider} from './HouseSlider.js';

class App extends Application {

    initHandlers() {
        this.pointerlockchangeHandler = this.pointerlockchangeHandler.bind(this);
        this.mousemoveHandler = this.mousemoveHandler.bind(this);
        this.keydownHandler = this.keydownHandler.bind(this);
        this.keyupHandler = this.keyupHandler.bind(this);
        this.press = false;
        this.dtPress = 0;
        this.water = 100;
        this.mouseDown = this.mouseDown.bind(this);
        this.mouseUp = this.mouseUp.bind(this);
        this.keys = {};
        this.shoot = this.shoot.bind(this);
        this.newFire = this.newFire.bind(this);
        this.putOut = this.putOut.bind(this);
        this.mapHouses = new Map();

        document.addEventListener('pointerlockchange', this.pointerlockchangeHandler);
        document.addEventListener('keydown', this.keydownHandler);
        document.addEventListener('keyup', this.keyupHandler);
        //const canvas = document.querySelector('canvas');
        const canvas = document.getElementById("canvas-2d");
        canvas.addEventListener('click', this.enableMouseLook);
        canvas.addEventListener('click', this.shoot);
        canvas.addEventListener('mousedown', this.mouseDown);
        canvas.addEventListener('mouseup', this.mouseUp);

        // sound design
        this.extinguish_audio = new Audio('common/audio/extinguishing.mp3');
        this.refill_audio     = new Audio('common/audio/waterRefill.mp3');
        this.walking_audio    = new Audio('common/audio/walking.mp3');
        this.fire_audio       = new Audio('common/audio/fire.mp3');
        this.gamewon_audio    = new Audio('common/audio/gamewon.mp3');
        this.gameover_audio   = new Audio('common/audio/gameover.mp3');
        // walking also need a set for keys that were pressed
        this.keysWalking = new Set();
        
    }

    innitVariables() {
        this.otherObjects = [];
        this.targets      = [];
        this.recharge     = [];
        this.balls        = [];
        this.counters     = [];
        this.position     = [];
        this.previous = 10;
        this.zero     = 0;

        this.OnFire = [false,false,false,false,false,false,false,false,false];
        this.dtOfHousesOnFire = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        this.waterHitCounters = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    async start() {
        this.initHandlers();
        this.loader = new GLTFLoader();
        await this.loader.load('./common/models/Map/map5.gltf');

        this.scene  = await this.loader.loadScene(this.loader.defaultScene);
        this.camera = await this.loader.loadNode('Camera');
        this.innitVariables();
        
        this.otherObjects.push(this.scene.nodes[1]);
        
        if (!this.scene || !this.camera) {
            throw new Error('Scene or Camera not present in glTF');
        }

        if (!this.camera.camera) {
            throw new Error('Camera node does not contain a camera reference');
        }

        Object.assign(this.camera, {
            translation      : vec3.set(vec3.create(), 0, 2,20),
            velocity         : vec3.set(vec3.create(), 0, 0, 0),
            mouseSensitivity : 0.002,
            maxSpeed         : 2,
            friction         : 0.2,
            acceleration     : 1,
            aabb: {
                "min": [-0.7, 0, -0.7],
                "max": [0.7, 3, 0.7]
            },
        });

        this.camera.rotation[0] = 0.05;
        mat4.rotateX(this.camera.matrix, this.camera.rotation[0]);
        this.camera2 = new Node(this.camera.options, null);

        Object.assign(this.camera2, {
            translation      : vec3.set(vec3.create(), 0, -6,20),
            velocity         : vec3.set(vec3.create(), 0, 0, 0),
            mouseSensitivity : 0.002,
            maxSpeed         : 3,
            friction         : 0.2,
            acceleration     : 1,
            aabb: {
                "min": [-0.7, -0.7, -0.7],
                "max": [0.7, 0.7, 0.7]
            },
        });

        this.time      = Date.now();
        this.startTime = this.time;

        //add water nozzle
        await this.loader.load('./common/models/VodnoOrozje/VodnoOrozje.gltf');
        this.nozzle = await this.loader.loadNode("Cylinder.002");
        this.scene2 = await this.loader.loadScene(this.loader.defaultScene);
        mat4.fromTranslation(this.scene2.nodes[2].matrix, [8, -50, 4]);
        
        this.nozzle.rotation[0] = -6;
        this.nozzle.rotation[1] = 0;
        this.nozzle.rotation[2] = -0.2;
        this.nozzle.rotation[3] = 0.8;
        this.nozzle.scale[0] = 0.05;
        this.nozzle.scale[1] = 0.05;
        this.nozzle.scale[2] = 0.05;
        this.nozzle.aabb = null;
        let tt = this.nozzle.matrix;
        mat4.translate(tt, tt, this.nozzle.translation);
        mat4.rotateY(tt, tt, this.nozzle.rotation[1]);
        mat4.rotateX(tt, tt, this.nozzle.rotation[0]);
        mat4.rotateZ(tt, tt, this.nozzle.rotation[2]);
        
        // water ball
        await this.loader.load('./common/models/ball/ballgltf.gltf');
        let t = await this.loader.loadScene(this.loader.defaultScene);
        console.log(t);
        this.kocka = t.nodes[0];
        mat4.fromTranslation(this.kocka.matrix, [0, 2, 0]);
        this.scene.addNode(this.kocka);
        

        // houses
        await this.loader.load('./common/models/Houses/house1.gltf');
        let h = await this.loader.loadScene(this.loader.defaultScene);
        this.hisa = h.nodes[1];
        mat4.fromTranslation(this.hisa.matrix, [-1.4, 0.12, 0]);
        this.scene.addNode(this.hisa);
        this.targets.push(this.hisa);

        await this.loader.load('./common/models/Houses/house2.gltf');
        let r = await this.loader.loadScene(this.loader.defaultScene);
        this.hisa1 = r.nodes[1];
        mat4.fromTranslation(this.hisa1.matrix, [8.8, 0.12, 0]);
        this.scene.addNode(this.hisa1);
        this.targets.push(this.hisa1);

        await this.loader.load('./common/models/Houses/house3.gltf');
        h = await this.loader.loadScene(this.loader.defaultScene);
        this.hisa = h.nodes[1];
        mat4.fromTranslation(this.hisa.matrix, [-11.8, 0.12, 0]);
        this.scene.addNode(this.hisa);
        this.targets.push(this.hisa);

        await this.loader.load('./common/models/Houses/house4.gltf');
        h = await this.loader.loadScene(this.loader.defaultScene);
        this.hisa = h.nodes[1];
        mat4.fromTranslation(this.hisa.matrix, [8.8, 0.12, 35]);
        this.scene.addNode(this.hisa);
        this.targets.push(this.hisa);

        await this.loader.load('./common/models/Houses/house5.gltf');
        h = await this.loader.loadScene(this.loader.defaultScene);
        this.hisa = h.nodes[1];
        mat4.fromTranslation(this.hisa.matrix, [-11.8, 0.12, 35]);
        this.scene.addNode(this.hisa);
        this.targets.push(this.hisa);

        await this.loader.load('./common/models/Houses/house6.gltf');
        h = await this.loader.loadScene(this.loader.defaultScene);
        this.hisa = h.nodes[1];
        mat4.fromTranslation(this.hisa.matrix, [-1.4, 0.12, 35]);
        this.scene.addNode(this.hisa);
        this.targets.push(this.hisa);

        await this.loader.load('./common/models/Houses/house7.gltf');
        h = await this.loader.loadScene(this.loader.defaultScene);
        this.hisa = h.nodes[1];
        mat4.fromTranslation(this.hisa.matrix, [-1.4, 0.12, -35]);
        this.scene.addNode(this.hisa);
        this.targets.push(this.hisa);

        await this.loader.load('./common/models/Houses/house8.gltf');
        h = await this.loader.loadScene(this.loader.defaultScene);
        this.hisa = h.nodes[1];
        mat4.fromTranslation(this.hisa.matrix, [8.8, 0.12, -35]);
        this.scene.addNode(this.hisa);
        this.targets.push(this.hisa);

        await this.loader.load('./common/models/Houses/house9.gltf');
        h = await this.loader.loadScene(this.loader.defaultScene);
        this.hisa = h.nodes[1];
        mat4.fromTranslation(this.hisa.matrix, [-11.8, 0.12, -35]);
        this.scene.addNode(this.hisa);
        this.targets.push(this.hisa);

        // two wells
        await this.loader.load('./common/models/Well/well.gltf');
        h = await this.loader.loadScene(this.loader.defaultScene);
        this.well = h.nodes[1];
        //this.well.scale = [0.2, 0.2, 0.2];
        mat4.fromTranslation(this.well.matrix, [31, 0, 0]);
        this.scene.addNode(this.well);
        this.otherObjects.push(this.well);

        await this.loader.load('./common/models/Well/well.gltf');
        h = await this.loader.loadScene(this.loader.defaultScene);
        this.well = h.nodes[1];
        mat4.fromTranslation(this.well.matrix, [-33, 0, 0]);
        this.scene.addNode(this.well);
        this.otherObjects.push(this.well);
        
        // two recharge zones
        this.rechargeZone = new Node(this.well.options, this.well.accessors);
        let a = 5;
        this.rechargeZone.aabb = this.hisa.aabb;
        mat4.fromTranslation(this.rechargeZone.matrix, [31, 0, 0]);
        this.recharge.push(this.rechargeZone);

        this.rechargeZone = new Node(this.well.options, this.well.accessors);
        this.rechargeZone.aabb = this.hisa.aabb;
        mat4.fromTranslation(this.rechargeZone.matrix, [-33, 0, 0]);
        this.recharge.push(this.rechargeZone);

        // the forrest
        await this.loader.load('./common/models/Map/forest1.gltf');
        h = await this.loader.loadScene(this.loader.defaultScene);
        this.well = h.nodes[1];
        mat4.fromTranslation(this.well.matrix, [150, 2, 150]);
        this.scene.addNode(this.well);

        await this.loader.load('./common/models/Map/forest1.gltf');
        h = await this.loader.loadScene(this.loader.defaultScene);
        this.forest = h.nodes[1];
        mat4.fromTranslation(this.forest.matrix, [-150, 2, 150]);
        this.scene.addNode(this.forest);

        await this.loader.load('./common/models/Map/forest2.gltf');
        h = await this.loader.loadScene(this.loader.defaultScene);
        this.forest = h.nodes[1];
        mat4.fromTranslation(this.forest.matrix, [-170, 2, 150]);
        this.scene.addNode(this.forest);

        await this.loader.load('./common/models/Map/forest2.gltf');
        h = await this.loader.loadScene(this.loader.defaultScene);
        this.forest = h.nodes[1];
        mat4.fromTranslation(this.forest.matrix, [-170, 2, -150]);
        this.scene.addNode(this.forest);
        
        // invisible walls
        await this.loader.load('./common/models/Map/wall1.gltf');
        h = await this.loader.loadScene(this.loader.defaultScene);
        this.well = h.nodes[1];
        mat4.fromTranslation(this.well.matrix, [-53, -2, 0]);
        this.scene.addNode(this.well);

        await this.loader.load('./common/models/Map/wall1.gltf');
        h = await this.loader.loadScene(this.loader.defaultScene);
        this.well = h.nodes[1];
        mat4.fromTranslation(this.well.matrix, [53, -2, 0]);
        this.scene.addNode(this.well);

        await this.loader.load('./common/models/Map/wall2.gltf');
        h = await this.loader.loadScene(this.loader.defaultScene);
        this.well = h.nodes[1];
        mat4.fromTranslation(this.well.matrix, [0, -2, 83]);
        this.scene.addNode(this.well);

        await this.loader.load('./common/models/Map/wall2.gltf');
        h = await this.loader.loadScene(this.loader.defaultScene);
        this.well = h.nodes[1];
        mat4.fromTranslation(this.well.matrix, [0, -2, -83]);
        this.scene.addNode(this.well);
        
        this.camera.camera.updateProjection();
        this.physics = new Physics(this.scene);
        this.renderer = new Renderer(this.gl);
        this.renderer.prepareScene(this.scene);
        this.renderer2 = new Renderer(this.gl);
        this.renderer2.prepareScene(this.scene2);

        this.resize();
        
        // start the game
        this.startGame(10, 5000, 40, 31);

    }

    render() {
        if (this.renderer) {
            this.renderer.render(this.scene, this.camera);
            this.camera.camera.updateProjection();
        }
        if(this.renderer2){
            this.renderer2.render2(this.scene2, this.camera2);
        }
    }

    resize() {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        const aspectRatio = w / h;

        if (this.camera) {
            this.camera.camera.aspect = aspectRatio;
            this.camera.camera.updateMatrix();
        }
    }

    update2d() {
        this.time2 = Date.now();
        const dt2 = (this.time2 - this.startTime2);
        this.startTime2 = this.time2;

        // water slider
        if(!isNaN(this.water)) {
            let current = Math.floor(this.water/10);
            if(this.water == 0 && this.zero == 0){
                this.zero = 1;
            }
            if(current != this.previous){
                this.updateWaterDisplay();
                this.previous = current;
                this.zero = 0;
            }
            if(this.zero == 1){
                this.updateWaterDisplay();
                this.zero = 2;
            }
        }

        // house slider
        if(this.mapHouses) {
            for (let x of this.mapHouses){
                this.dtOfHousesOnFire[x[0] - 1]+= dt2;
                // update slider
                if(this.dtOfHousesOnFire[x[0] - 1] >= 1000){
                    this.updateTimer(this.ctx, x[1],x[0]);
                    this.dtOfHousesOnFire[x[0] - 1] = 0;
                }
                // if house burns down
                if(x[1].time > 30) {
                    this.gameOver();                    
                }
                if(this.waterHitCounters[x[0] - 1] > this.amountOfWater){
                    this.OnFire[x[0] - 1] =false;
                    this.waterHitCounters[x[0] - 1] = 0;
                    this.dtOfHousesOnFire[x[0] - 1] = 0;
                    this.putOut(x[0]);
                } 
            }
        }
    }

    update() {
        this.time = Date.now();
        const dt = (this.time - this.startTime) * 0.01;
        this.startTime = this.time;

        if(this.camera !== undefined){
            this.camera.updateCamera(dt, this);
        }
        if(this.physics){
            this.physics.update(dt);
        }

        if(this.press){ 
            if(document.pointerLockElement === this.canvas2){
                this.dtPress += dt;
                if(this.dtPress >1){
                    this.shoot();
                    this.dtPress = 0;
                } 
            }
            
        }
        
        // water hit
        if(this.balls) {
            let zadetek = false;
            if(this.targets) {
                for(let a = 0; a < this.balls.length; a++ ) {
                    for(let i = 0; i < this.targets.length;  i++) {
                        if(this.physics.checkCollision(this.balls[a], this.targets[i])) {
                            this.removeWater(a);
                            if(this.OnFire[i]){
                                this.waterHitCounters[i] += 1;
                            }
                            zadetek = true;
                            break;
                        }
                    }
                    // for other objects
                    if(!zadetek){
                        for(let target of this.otherObjects){
                            if(target.aabb){
                                if(this.physics.checkCollision(this.balls[a], target)){
                                    this.removeWater(a);
                                    break;
                                }
                            }  
                        }
                    }
                }
            }
            
            for (let a = 0; a < this.balls.length; a++ ){
                mat4.translate(this.balls[a].matrix, this.balls[a].matrix, [0, -this.counters[a] *0.004, -0.9]);
                this.counters[a]++;
            }
        }

        if(this.recharge){
            if(this.water < 100){
                for(let zone of this.recharge){
                    if(this.physics.checkCollision(zone, this.camera)){
                        this.refill_audio.play();
                        this.water++;
                    }
                }
            }
        }

        if(this.gameTime){
            const dt2 = Date.now() - this.gameTime;
            this.gameLogic(dt2);
        }
       
    }

    removeWater(a){
        this.scene.nodes.splice(this.position[a],1);
        this.balls.splice(a,1);
        this.counters.splice(a,1);
        let num = this.position[a];
        this.position.splice(a,1);
        this.updatePositions(num);
    }

    shoot(){
        if (document.pointerLockElement === this.canvas2) {
            if(this.water > 0){
                console.log("shot");
                let f = new Node(this.kocka.options, this.kocka.accessors);
                // set ball on the right spot
                f.scale = [0.95,0.95,0.95];
                mat4.scale(f.matrix, f.matrix, f.scale);
                mat4.copy(f.matrix, this.camera.matrix);
                mat4.translate(f.matrix, f.matrix, [0, 0, -10]);
                this.balls.push(f);
                this.counters.push(0);
                this.position.push(this.scene.nodes.length);
                this.scene.addNode(f);
                this.water -= 1;
                }
        }
    }

    updatePositions(num){
        for(let i = 0; i < this.position.length; i++){
            if(this.position[i] > num){
                this.position[i] -= 1;
            }
        }
    }

    updateWaterDisplay() {
        const canvas = document.getElementById('canvas-2d');
        const ctx = canvas.getContext('2d');
        let x = this.canvas.width - 220;
        let y = this.canvas.height - 210; 
        let image = document.createElement("img");
        image.src = "common/images/water_slider.png";
        ctx.clearRect(x, y, 200, 200);
        switch(true) {
            case this.water > 90:
                image.addEventListener('load', e => {
                    ctx.drawImage(image, 0, 0, 200, 200, x, y, 200, 200);
                });
                break;
            case this.water > 80:
                image.addEventListener('load', e => {
                    ctx.drawImage(image, 200, 0, 200, 200, x, y, 200, 200);
                });
                break;
            case this.water > 70:
                image.addEventListener('load', e => {
                    ctx.drawImage(image, 400, 0, 200, 200, x, y, 200, 200);
                });
                break;
            case this.water > 60:
                image.addEventListener('load', e => {
                    ctx.drawImage(image, 600, 0, 200, 200, x, y, 200, 200);
                });
                break;
            case this.water > 50:
                image.addEventListener('load', e => {
                    ctx.drawImage(image, 800, 0, 200, 200, x, y, 200, 200);
                });
                break;
            case this.water > 40:
                image.addEventListener('load', e => {
                    ctx.drawImage(image, 1000, 0, 200, 200, x, y, 200, 200);
                });
                break;
            case this.water > 30:
                image.addEventListener('load', e => {
                    ctx.drawImage(image, 1200, 0, 200, 200, x, y, 200, 200);
                });
                break;
            case this.water > 20:
                image.addEventListener('load', e => {
                    ctx.drawImage(image, 1400, 0, 200, 200, x, y, 200, 200);
                });
                break;
            case this.water > 10:
                image.addEventListener('load', e => {
                    ctx.drawImage(image, 1600, 0, 200, 200, x, y, 200, 200);
                });
                break;
            case this.water > 0:
                image.addEventListener('load', e => {
                    ctx.drawImage(image, 1800, 0, 200, 200, x, y, 200, 200);
                });
                break;
            default:
                image.addEventListener('load', e => {
                    ctx.drawImage(image, 2000, 0, 200, 200, x, y, 200, 200);
                });
          }
    }

    mouseDown() {
       this.press = true;
       if (this.water > 0)
        this.extinguish_audio.play();
       this.dtPress = 100;
    }

    mouseUp() {
        this.press = false; 
        this.extinguish_audio.pause();
        this.extinguish_audio.currentTime = 0;
        this.dtPress = 0;
    }
    

    enableMouseLook() {
        this.requestPointerLock();
    }

    pointerlockchangeHandler() {
        if (document.pointerLockElement === this.canvas2) {
            this.canvas2.addEventListener('mousemove', this.mousemoveHandler);
        } else {
            this.canvas2.removeEventListener('mousemove', this.mousemoveHandler);
        }
    }

    mousemoveHandler(e) {
        const dx = e.movementX;
        const dy = e.movementY;
        const c = this.camera;
        c.rotation[0] -= dy * c.mouseSensitivity;
        c.rotation[1] -= dx * c.mouseSensitivity;

        const pi = Math.PI;
        const twopi = pi * 2;
        const halfpi = pi / 2;

        // Limit pitch
        if (c.rotation[0] > halfpi) {
            c.rotation[0] = halfpi;
        }
        if (c.rotation[0] < -halfpi) {
            c.rotation[0] = -halfpi;
        }

        // Constrain yaw to the range [0, pi * 2]
        c.rotation[1] = ((c.rotation[1] % twopi) + twopi) % twopi;
    }

    keydownHandler(e) {
        this.keys[e.code] = true;
        const keysForWalking = new Set(["KeyW", "KeyS", "KeyA", "KeyD"]);
        if (keysForWalking.has(e.code)) {
            this.walking_audio.play();
            this.keysWalking.add(e.code);
        }  
    }

    keyupHandler(e) {
        this.keys[e.code] = false;
        this.keysWalking.delete(e.code);
        if (this.keysWalking.size==0) {
            this.walking_audio.pause();
            this.walking_audio.currentTime = 0;
        }   
    }

    startGame(gameDuration, fireInterval, amountOfWater, timeOfFIre) {
        this.gameTime = Date.now();
        this.fireInterval = fireInterval;
        this.gameDuration = gameDuration;
        this.dtFromLastOnFire = this.fireInterval + 1;
        this.amountOfWater = amountOfWater;
        this.timeOfFire = timeOfFIre;
        this.countHouses = 0;
    }

    gameLogic(dt){
        if(this.countHouses < this.gameDuration){
            if( Date.now() - this.dtFromLastOnFire > this.fireInterval){
                // start fire at random house
                let randomHouse = 0;
                do{
                    randomHouse = Math.floor(Math.random() * this.targets.length);
                }
                while(this.OnFire[randomHouse])
                
                this.newFire(randomHouse + 1);
                this.countHouses++;

                this.OnFire[randomHouse] = true;
                this.dtFromLastOnFire = Date.now();
            }
        }
        else{
            let fire = false;
            for(let a of this.OnFire){
                if(a){
                    return;
                }
            }
            // game won
            this.gamewon_audio.play();
            const canvas = document.getElementById('canvas-2d');
            const ctx = canvas.getContext('2d');
            let image = document.createElement("img");
            image.src = `common/images/levelcompleted.png`;   
            image.addEventListener('load', e => {   
                ctx.drawImage(image, 0, 0, 592, 122, canvas.width / 2 - 296, canvas.height / 2 - 61, 592, 122);
                setTimeout(this.gameWonAlert, 1000);
            });
        }
    }

    gameWonAlert(){
        window.alert("Congrats on completing the level!\n Refresh the page (F5) and click OK to play again.");
    }

    
    updateTimer(ctx, hs, houseNumber) { 
        let image = document.createElement("img");
        image.src = `common/images/house_bar${houseNumber}.png`;   
        image.addEventListener('load', e => {
            ctx.drawImage(image, 200*hs.time, 0, 200, 107, 20 + 220*hs.position, 10, 200, 107);
        });
        hs.time++;
    }

    gameOver() {
        this.gameover_audio.play();
        const canvas = document.getElementById('canvas-2d');
        const ctx = canvas.getContext('2d'); 
        let image = document.createElement("img");
        image.src = "common/images/gameover.png";
        image.addEventListener('load', e => {
            ctx.drawImage(image, 0, 0, 592, 122, canvas.width / 2 - 296, canvas.height / 2 - 61, 592, 122);
            setTimeout(this.gameOverAlert, 1000);
        });
        
    }

    gameOverAlert(){
        window.alert("You failed to stop the fire. Game over.\n Refresh the page (F5) and click OK to play again.");
    }

    newFire(houseNumber) {
        if (this.mapHouses.size==0) {
            this.fire_audio.play();
        }
        let hs = new HouseSlider(houseNumber, this.mapHouses.size);
        hs.time = 30 - this.timeOfFire;
        this.mapHouses.set(houseNumber, hs);
        hs.stopped = false;   
    }

    moveSliders(ctx, position) {
        for (const hs of this.mapHouses.values()) {
            if (position <= hs.position) {
                ctx.clearRect(20 + 220*hs.position, 10, 200, 107);
                hs.position--;
            }
        }
    }

    putOut(putOutNumber) {
        let hs = this.mapHouses.get(putOutNumber);
        this.ctx.clearRect(20 + 220*hs.position, 10, 200, 107);
        hs.resetSlider();
        this.mapHouses.delete(putOutNumber);
        if (this.mapHouses.size==0) {
            this.fire_audio.pause();
            this.fire_audio.currentTime = 0;
        }
        this.moveSliders(this.ctx, hs.position);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('canvas');
    const app = new App(canvas);   
});
