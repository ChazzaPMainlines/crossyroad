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
        const d = 150;
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

        // This group will hold ALL game objects (lanes, cars, logs)
        this.worldGroup = new THREE.Group();
        this.scene.add(this.worldGroup);
    }

    initGame() {
        // 1. COMPLETELY CLEAR THE WORLD
        while(this.worldGroup.children.length > 0) {
            this.worldGroup.remove(this.worldGroup.children[0]);
        }

        // 2. Reset Variables
        this.lanes = [];
        this.gridX = 0;
        this.gridZ = 0;
        this.targetPos = new THREE.Vector3(0, 0, 0);
        this.isMoving = false;
        this.score = 0;
        this.isGameOver = false;

        // 3. Reset Panther
        if (this.player) this.scene.remove(this.player);
        this.player = createPanther();
        this.scene.add(this.player);

        document.getElementById('score').innerText = `Score: 0`;
        document.getElementById('game-over').classList.add('hidden');

        // 4. Generate Starting Lanes
        for (let i = 0; i < 40; i++) {
            this.addLane(i);
        }
    }

    addLane(index) {
        let type = CONFIG.TYPES.GRASS;
        // Logic to decide lane type
        if (index > 3) {
            const rand = Math.random();
            if (rand > 0.8) type = CONFIG.TYPES.RIVER;
            else if (rand > 0.4) type = CONFIG.TYPES.ROAD;
        }
        
        const lane = new Lane(index, type);
        this.lanes.push(lane);
        
        // Add lane floor and all its obstacles to the world group
        this.worldGroup.add(lane.mesh);
        lane.obstacles.forEach(o => this.worldGroup.add(o));
    }

    handleInput() {
        window.addEventListener('keydown', (e) => {
            if (this.isMoving || this.isGameOver) return;
            if (['ArrowUp', 'w'].includes(e.key)) this.move(0, 1);
            if (['ArrowDown', 's'].includes(e.key)) this.move(0, -1);
            if (['ArrowLeft', 'a'].includes(e.key)) this.move(-1, 0);
            if (['ArrowRight', 'd'].includes(e.key)) this.move(1, 0);
        });
        document.getElementById('retry-btn').onclick = () => this.initGame();
    }

    move(dirX, dirZ) {
        const nextX = this.gridX + dirX;
        const nextZ = this.gridZ + dirZ;

        if (nextZ < 0 || Math.abs(nextX) > 5) return;

        this.gridX = nextX;
        this.gridZ = nextZ;
        this.targetPos.x = this.gridX * CONFIG.GRID_SIZE;
        this.targetPos.z = -this.gridZ * CONFIG.GRID_SIZE;
        this.isMoving = true;

        if (this.gridZ > this.score) {
            this.score = this.gridZ;
            document.getElementById('score').innerText = `Score: ${this.score}`;
            if (this.score + 25 > this.lanes.length) this.addLane(this.lanes.length);
        }
    }

    checkCollisions() {
        // Find lane index based on actual Z position
        const laneIndex = Math.round(Math.abs(this.player.position.z / CONFIG.GRID_SIZE));
        const lane = this.lanes[laneIndex];
        if (!lane) return;

        let standingOnLog = false;

        lane.obstacles.forEach(obj => {
            const dx = Math.abs(this.player.position.x - obj.position.x);
            const dz = Math.abs(this.player.position.z - obj.position.z);

            // Car collision (Road) - increased hit box slightly for fairness
            if (lane.type === CONFIG.TYPES.ROAD && dx < 35 && dz < 18) {
                this.gameOver();
            }

            // Log contact (River)
            if (lane.type === CONFIG.TYPES.RIVER && dx < 40 && dz < 18) {
                standingOnLog = true;
                if (!this.isMoving) {
                    this.player.position.x += lane.speed * lane.direction;
                    this.targetPos.x = this.player.position.x;
                    this.gridX = this.player.position.x / CONFIG.GRID_SIZE;
                }
            }
        });

        if (lane.type === CONFIG.TYPES.RIVER && !standingOnLog && !this.isMoving) {
            this.gameOver();
        }

        if (Math.abs(this.player.position.x) > 240) this.gameOver();
    }

    gameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        document.getElementById('game-over').classList.remove('hidden');
        this.player.traverse(c => { if(c.isMesh) c.material.color.set(0xff0000); });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.isGameOver) return;

        // Player Movement
        this.player.position.x += (this.targetPos.x - this.player.position.x) * 0.2;
        this.player.position.z += (this.targetPos.z - this.player.position.z) * 0.2;

        const dist = new THREE.Vector2(this.player.position.x, this.player.position.z)
            .distanceTo(new THREE.Vector2(this.targetPos.x, this.targetPos.z));

        if (dist > 0.5) {
            this.player.position.y = Math.sin((dist / CONFIG.GRID_SIZE) * Math.PI) * 20;
        } else {
            this.player.position.y = 0;
            this.isMoving = false;
        }

        // Update Obstacles
        this.lanes.forEach(l => l.update());
        this.checkCollisions();

        // Camera Follow
        const camX = this.player.position.x + 200;
        const camZ = this.player.position.z + 200;
        this.camera.position.x += (camX - this.camera.position.x) * 0.1;
        this.camera.position.z += (camZ - this.camera.position.z) * 0.1;
        this.camera.lookAt(this.player.position.x, 0, this.player.position.z);

        this.renderer.render(this.scene, this.camera);
    }
}

new Game();
