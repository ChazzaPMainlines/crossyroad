import * as THREE from 'three';
import { CONFIG } from './constants.js';
import { createCar, createLog } from './models.js';

export class Lane {
    constructor(index, type) {
        this.index = index;
        this.type = type;
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.speed = 0.8 + Math.random() * 1.5;
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
        mesh.position.y = -2; // Slightly below floor
        mesh.position.z = -this.index * CONFIG.GRID_SIZE;
        mesh.receiveShadow = true;
        return mesh;
    }

    spawnObstacles() {
        // Space cars/logs out properly
        const spacing = 300;
        for (let i = 0; i < 3; i++) {
            const obj = this.type === CONFIG.TYPES.ROAD ? createCar() : createLog();
            obj.position.z = -this.index * CONFIG.GRID_SIZE;
            obj.position.x = -450 + (i * spacing);
            this.obstacles.push(obj);
        }
    }

    update() {
        this.obstacles.forEach(obj => {
            obj.position.x += this.speed * this.direction;

            // Simple wrap around with a wide margin (600) to hide teleporting
            if (this.direction > 0 && obj.position.x > 600) {
                obj.position.x = -600;
            } else if (this.direction < 0 && obj.position.x < -600) {
                obj.position.x = 600;
            }
        });
    }
}
