import * as THREE from 'three';
import { CONFIG } from './constants.js';
import { createPanther } from './models.js';
import { Lane } from './world.js';

class Game {
    constructor() {
        this.initScene();
        this.initGame();
        this.handleInput();
        this.animate();
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);

        const aspect = window.innerWidth / window.innerHeight;
        const d = 150; // Zoom level
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
        this.camera.position.set(200, 200, 200);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        this.scene.add(dirLight);
    }

    initGame() {
        // Clear scene if restarting
        while(this.lanes?.length > 0) {
            const l = this.lanes.pop();
            this.scene.remove(l.mesh);
            l.obstacles.forEach(o => this.scene.add(o));
        }

        this.lanes = [];
        this.player = createPanther();
        this.scene.add(this.player);

        this.gridX = 0;
        this.gridZ = 0;
        this.targetPos = new THREE.Vector3(0, 0, 0);
        this.isMoving = false;
        this.score = 0;
        this.isGameOver = false;

        document.getElementById('score').innerText = `Score: 0`;
        document.getElementById('game-over').classList.add('hidden');

        // Initial Safe Lanes (Grass)
        for (let i = 0; i < 40; i++) {
            this.addLane(i);
        }
    }

    addLane(index) {
        let type = CONFIG.TYPES.GRASS;
        if (index > 3) {
            const rand = Math.random();
            if (rand > 0.8) type = CONFIG.TYPES.RIVER;
            else if (rand > 0.4) type = CONFIG.TYPES.ROAD;
        }
        const lane = new Lane(index, type);
        this.lanes.push(lane);
        this.scene.add(lane.mesh);
        lane.obstacles.forEach(o => this.scene.add(o));
    }

    handleInput() {
        const moveHandler = (e) => {
            if (this.isMoving || this.isGameOver) return;
            if (['ArrowUp', 'w'].includes(e.key)) this.move(0, 1);
            if (['ArrowDown', 's'].includes(e.key)) this.move(0, -1);
            if (['ArrowLeft', 'a'].includes(e.key)) this.move(-1, 0);
            if (['ArrowRight', 'd'].includes(e.key)) this.move(1, 0);
        };
        window.addEventListener('keydown', moveHandler);
        document.getElementById('retry-btn').onclick = () => this.initGame();
    }

    move(dirX, dirZ) {
        const nextX = this.gridX + dirX;
        const nextZ = this.gridZ + dirZ;

        if (nextZ < 0 || Math.abs(nextX) > 5) return;

        this.gridX = nextX;
        this.gridZ = nextZ;
        
        // Update logical target
        this.targetPos.x = this.gridX * CONFIG.GRID_SIZE;
        this.targetPos.z = -this.gridZ * CONFIG.GRID_SIZE;
        this.isMoving = true;

        if (this.gridZ > this.score) {
            this.score = this.gridZ;
            document.getElementById('score').innerText = `Score: ${this.score}`;
            if (this.score + 20 > this.lanes.length) this.addLane(this.lanes.length);
        }
    }

    checkCollisions() {
        // Calculate lane index based on ACTUAL physical Z position
        const physicalLane = Math.round(Math.abs(this.player.position.z / CONFIG.GRID_SIZE));
        const lane = this.lanes[physicalLane];
        if (!lane) return;

        let standingOnLog = false;

        lane.obstacles.forEach(obj => {
            const dx = Math.abs(this.player.position.x - obj.position.x);
            const dz = Math.abs(this.player.position.z - obj.position.z);

            // Car collision (Road)
            if (lane.type === CONFIG.TYPES.ROAD && dx < 30 && dz < 15) {
                this.gameOver();
            }

            // Log contact (River)
            if (lane.type === CONFIG.TYPES.RIVER && dx < 35 && dz < 15) {
                standingOnLog = true;
                // Hitch a ride on the log
                if (!this.isMoving) {
                    this.player.position.x += lane.speed * lane.direction;
                    this.targetPos.x = this.player.position.x;
                    this.gridX = this.player.position.x / CONFIG.GRID_SIZE;
                }
            }
        });

        // Water death: Only if we are physically in a river lane, not moving, and not on a log
        if (lane.type === CONFIG.TYPES.RIVER && !standingOnLog && !this.isMoving) {
            this.gameOver();
        }

        // Out of bounds (pushed by logs)
        if (Math.abs(this.player.position.x) > 250) this.gameOver();
    }

    gameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        document.getElementById('game-over').classList.remove('hidden');
        // Visual cue: turn panther red
        this.player.traverse(child => {
            if (child.isMesh) child.material.color.set(0xff0000);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.isGameOver) return;

        // Smooth movement to target
        const lerpFactor = 0.2;
        this.player.position.x += (this.targetPos.x - this.player.position.x) * lerpFactor;
        this.player.position.z += (this.targetPos.z - this.player.position.z) * lerpFactor;

        // Jump Arc
        const distance = new THREE.Vector2(this.player.position.x, this.player.position.z)
            .distanceTo(new THREE.Vector2(this.targetPos.x, this.targetPos.z));

        if (distance > 0.5) {
            this.player.position.y = Math.sin((distance / CONFIG.GRID_SIZE) * Math.PI) * 20;
        } else {
            this.player.position.y = 0;
            this.isMoving = false;
        }

        this.lanes.forEach(l => l.update());
        this.checkCollisions();

        // Smooth Camera Follow
        const camX = this.player.position.x + 200;
        const camZ = this.player.position.z + 200;
        this.camera.position.x += (camX - this.camera.position.x) * 0.1;
        this.camera.position.z += (camZ - this.camera.position.z) * 0.1;
        this.camera.lookAt(this.player.position.x, 0, this.player.position.z);

        this.renderer.render(this.scene, this.camera);
    }
}

new Game();
