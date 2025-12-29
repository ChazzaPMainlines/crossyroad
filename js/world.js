import * as THREE from 'three';
import { CONFIG } from './constants.js';
import { createCar, createLog } from './models.js';

export class Lane {
    constructor(index, type) {
        this.index = index;
        this.type = type;
        this.mesh = this.createMesh();
        this.obstacles = [];
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.speed = 1.5 + Math.random() * 2.5;

        if (type === CONFIG.TYPES.ROAD || type === CONFIG.TYPES.RIVER) {
            this.setupObstacles();
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
        mesh.position.z = -this.index * CONFIG.GRID_SIZE;
        mesh.receiveShadow = true;
        return mesh;
    }

    setupObstacles() {
        const count = 3;
        for (let i = 0; i < count; i++) {
            const obj = this.type === CONFIG.TYPES.ROAD ? createCar() : createLog();
            obj.position.z = -this.index * CONFIG.GRID_SIZE;
            obj.position.x = (i * 300) - 450;
            this.obstacles.push(obj);
        }
    }

    update(delta) {
        this.obstacles.forEach(obj => {
            obj.position.x += this.speed * this.direction;
            if (this.direction > 0 && obj.position.x > 500) obj.position.x = -500;
            if (this.direction < 0 && obj.position.x < -500) obj.position.x = 500;
        });
    }
}
