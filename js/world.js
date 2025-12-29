import * as THREE from 'three';
import { CONFIG } from './constants.js';
import { createCar, createLog } from './models.js';

export class Lane {
    constructor(index, type) {
        this.index = index;
        this.type = type;
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.speed = 1.0 + Math.random() * 2.0;
        this.obstacles = [];
        this.mesh = this.createMesh();

        if (type !== CONFIG.TYPES.GRASS) {
            this.spawnObstacles();
        }
    }

    createMesh() {
        let color = CONFIG.COLORS.GRASS;
        if (this.type === CONFIG.TYPES.ROAD) color = CONFIG.COLORS.ROAD;
        if (this.type === CONFIG.TYPES.RIVER) color = CONFIG.COLORS.RIVER;

        const geometry = new THREE.PlaneGeometry(1000, CONFIG.GRID_SIZE);
        const material = new THREE.MeshPhongMaterial({ color });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.rotation.x = -Math.PI / 2;
        // Position lanes sequentially along negative Z
        mesh.position.z = -this.index * CONFIG.GRID_SIZE;
        mesh.receiveShadow = true;
        return mesh;
    }

    spawnObstacles() {
        for (let i = 0; i < 3; i++) {
            const obj = this.type === CONFIG.TYPES.ROAD ? createCar() : createLog();
            obj.position.z = -this.index * CONFIG.GRID_SIZE;
            obj.position.x = (i * 350) - 500;
            this.obstacles.push(obj);
        }
    }

    update() {
        this.obstacles.forEach(obj => {
            obj.position.x += this.speed * this.direction;
            // Wrap around
            if (this.direction > 0 && obj.position.x > 500) obj.position.x = -500;
            if (this.direction < 0 && obj.position.x < -500) obj.position.x = 500;
        });
    }
}
