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

        // Camera setup (Isometric Orthographic)
        const aspect = window.innerWidth / window.innerHeight;
        const d = 250;
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
        this.camera.position.set(300, 300, 300);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(100, 200, 50);
        dirLight.castShadow = true;
        this.scene.add(dirLight);
    }

    initGame() {
        this.lanes = [];
        this.player = createPanther();
        this.scene.add(this.player);

        this.playerGridPos = { x: 0, z: 0 };
        this.targetPos = { x: 0, z: 0 };
        this.isMoving = false;
        this.score = 0;
        this.highScore = localStorage.getItem('pantherHighScore') || 0;
        this.isGameOver = false;

        document.getElementById('high-score').innerText = `Best: ${this.highScore}`;
        document.getElementById('game-over').classList.add('hidden');

        // Generate initial safe zone
        for (let i = 0; i < 25; i++) {
            this.addLane(i);
        }
    }

    addLane(index) {
        let type = CONFIG.TYPES.GRASS;
        if (index > 3) {
            const rand = Math.random();
            if (rand > 0.7) type = CONFIG.TYPES.RIVER;
            else if (rand > 0.4) type = CONFIG.TYPES.ROAD;
        }
        const lane = new Lane(index, type);
        this.lanes.push(lane);
        this.scene.add(lane.mesh);
        lane.obstacles.forEach(o => this.scene.add(o));
    }

    handleInput() {
        window.addEventListener('keydown', (e) => {
            if (this.isMoving || this.isGameOver) return;

            if (e.key === 'ArrowUp' || e.key === 'w') this.move(0, 1);
            if (e.key === 'ArrowDown' || e.key === 's') this.move(0, -1);
            if (e.key === 'ArrowLeft' || e.key === 'a') this.move(1, 0);
            if (e.key === 'ArrowRight' || e.key === 'd') this.move(-1, 0);
        });

        document.getElementById('retry-btn').onclick = () => location.reload();
    }

    move(x, z) {
        this.targetPos.x = this.playerGridPos.x + x * CONFIG.GRID_SIZE;
        this.targetPos.z = this.playerGridPos.z - z * CONFIG.GRID_SIZE;
        
        // Boundaries
        if (Math.abs(this.targetPos.x) > 200) return;

        this.isMoving = true;
        if (z > 0) {
            this.score = Math.max(this.score, ++this.playerGridPos.z);
            document.getElementById('score').innerText = `Score: ${this.score}`;
            
            // Generate more lanes
            if (this.score + 15 > this.lanes.length) {
                this.addLane(this.lanes.length);
            }
        } else if (z < 0) {
            this.playerGridPos.z--;
        }
        
        if (x !== 0) this.playerGridPos.x += x * CONFIG.GRID_SIZE;
    }

    checkCollisions() {
        const currentLaneIndex = Math.round(Math.abs(this.player.position.z / CONFIG.GRID_SIZE));
        const lane = this.lanes[currentLaneIndex];

        if (!lane) return;

        let onLog = false;
        lane.obstacles.forEach(obj => {
            const dx = Math.abs(this.player.position.x - obj.position.x);
            const dz = Math.abs(this.player.position.z - obj.position.z);

            if (dx < 30 && dz < 20) {
                if (lane.type === CONFIG.TYPES.ROAD) this.gameOver();
                if (lane.type === CONFIG.TYPES.RIVER) onLog = true;
            }
        });

        if (lane.type === CONFIG.TYPES.RIVER) {
            if (!onLog) {
                this.gameOver();
            } else {
                // Move with log
                this.player.position.x += lane.speed * lane.direction;
                this.targetPos.x = this.player.position.x;
            }
        }

        // Out of bounds check
        if (Math.abs(this.player.position.x) > 250) this.gameOver();
    }

    gameOver() {
        this.isGameOver = true;
        if (this.score > this.highScore) {
            localStorage.setItem('pantherHighScore', this.score);
        }
        document.getElementById('game-over').classList.remove('hidden');
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (!this.isGameOver) {
            // Smooth movement lerp
            this.player.position.x += (this.targetPos.x - this.player.position.x) * CONFIG.PLAYER_SPEED;
            this.player.position.z += (this.targetPos.z - this.player.position.z) * CONFIG.PLAYER_SPEED;
            
            // Jump arc
            const dist = Math.sqrt(Math.pow(this.targetPos.x - this.player.position.x, 2) + Math.pow(this.targetPos.z - this.player.position.z, 2));
            this.player.position.y = Math.sin((dist / CONFIG.GRID_SIZE) * Math.PI) * 20;

            if (dist < 1) {
                this.isMoving = false;
                this.player.position.y = 0;
            }

            this.lanes.forEach(lane => lane.update());
            this.checkCollisions();
        }

        // Camera follow
        this.camera.position.z += (this.player.position.z + 300 - this.camera.position.z) * 0.1;
        this.camera.position.x += (this.player.position.x + 300 - this.camera.position.x) * 0.1;

        this.renderer.render(this.scene, this.camera);
    }
}

new Game();
