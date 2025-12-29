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
        const d = 200; // Camera zoom level
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 2000);
        
        // Initial camera position
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

        // Movement state
        this.gridX = 0; // Horizontal grid position
        this.gridZ = 0; // Forward grid position (0 is start)
        
        this.targetPos = new THREE.Vector3(0, 0, 0);
        this.isMoving = false;
        this.score = 0;
        this.highScore = localStorage.getItem('pantherHighScore') || 0;
        this.isGameOver = false;

        document.getElementById('high-score').innerText = `Best: ${this.highScore}`;
        document.getElementById('score').innerText = `Score: 0`;
        document.getElementById('game-over').classList.add('hidden');

        // Generate starting environment
        for (let i = 0; i < 30; i++) {
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
        window.addEventListener('keydown', (e) => {
            if (this.isMoving || this.isGameOver) return;

            if (e.key === 'ArrowUp' || e.key === 'w') this.move(0, 1);
            if (e.key === 'ArrowDown' || e.key === 's') this.move(0, -1);
            if (e.key === 'ArrowLeft' || e.key === 'a') this.move(-1, 0);
            if (e.key === 'ArrowRight' || e.key === 'd') this.move(1, 0);
        });

        document.getElementById('retry-btn').onclick = () => {
            // Simple reset: clear scene and re-init
            while(this.scene.children.length > 0){ 
                this.scene.remove(this.scene.children[0]); 
            }
            this.initGame();
        };
    }

    move(dirX, dirZ) {
        // Update Grid Coordinates
        const nextGridX = this.gridX + dirX;
        const nextGridZ = this.gridZ + dirZ;

        // Boundaries
        if (nextGridZ < 0) return; // Don't go back past start
        if (Math.abs(nextGridX) > 5) return; // Side boundaries

        this.gridX = nextGridX;
        this.gridZ = nextGridZ;

        // Calculate 3D target position based on Grid
        // Multiplied by Grid Size. Z is negative because Forward in Three.js is -Z
        this.targetPos.x = this.gridX * CONFIG.GRID_SIZE;
        this.targetPos.z = -this.gridZ * CONFIG.GRID_SIZE;

        this.isMoving = true;

        // Update Score
        if (this.gridZ > this.score) {
            this.score = this.gridZ;
            document.getElementById('score').innerText = `Score: ${this.score}`;
            
            // Add new lanes as we progress
            if (this.score + 20 > this.lanes.length) {
                this.addLane(this.lanes.length);
            }
        }
    }

    checkCollisions() {
        // Which lane is the panther currently on?
        const currentLaneIndex = this.gridZ;
        const lane = this.lanes[currentLaneIndex];

        if (!lane) return;

        let onLog = false;
        
        // Check obstacles in the current lane
        lane.obstacles.forEach(obj => {
            // Distance check between panther and obstacle
            const dx = Math.abs(this.player.position.x - obj.position.x);
            
            // If panther is within obstacle width
            if (dx < 25) {
                if (lane.type === CONFIG.TYPES.ROAD) {
                    this.gameOver();
                }
                if (lane.type === CONFIG.TYPES.RIVER) {
                    onLog = true;
                    // Panther hitches a ride on the log
                    this.player.position.x += lane.speed * lane.direction;
                    this.targetPos.x = this.player.position.x;
                    // Sync gridX back from world position so movement remains consistent
                    this.gridX = this.player.position.x / CONFIG.GRID_SIZE;
                }
            }
        });

        // Water death
        if (lane.type === CONFIG.TYPES.RIVER && !onLog && !this.isMoving) {
            this.gameOver();
        }

        // Out of bounds death (pushed off screen by logs)
        if (Math.abs(this.player.position.x) > 220) {
            this.gameOver();
        }
    }

    gameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('pantherHighScore', this.score);
        }
        document.getElementById('game-over').classList.remove('hidden');
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (!this.isGameOver) {
            // 1. Smoothly interpolate (Lerp) toward the target grid position
            const moveStep = 0.15;
            this.player.position.x += (this.targetPos.x - this.player.position.x) * moveStep;
            this.player.position.z += (this.targetPos.z - this.player.position.z) * moveStep;
            
            // 2. Jumping Animation (Sine wave based on distance to target)
            const distance = this.player.position.distanceTo(this.targetPos);
            if (distance > 1) {
                // The panther is mid-hop
                this.player.position.y = Math.sin((distance / CONFIG.GRID_SIZE) * Math.PI) * 15;
            } else {
                // The hop is finished
                this.isMoving = false;
                this.player.position.y = 0;
            }

            // 3. Update lane obstacles (cars/logs)
            this.lanes.forEach(lane => lane.update());

            // 4. Collision Logic
            this.checkCollisions();
        }

        // 5. Camera follow (Smooth lerp)
        // We offset the camera relative to the panther's current position
        const camTargetX = this.player.position.x + 300;
        const camTargetZ = this.player.position.z + 300;
        
        this.camera.position.x += (camTargetX - this.camera.position.x) * 0.05;
        this.camera.position.z += (camTargetZ - this.camera.position.z) * 0.05;
        this.camera.lookAt(this.player.position.x, 0, this.player.position.z);

        this.renderer.render(this.scene, this.camera);
    }
}

new Game();
