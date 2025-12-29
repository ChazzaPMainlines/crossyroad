import * as THREE from 'three';
import { CONFIG } from './constants.js';
import { createCar, createLog } from './models.js';

export class Lane {
    constructor(index, type) {
        this.index = index;
        this.type = type;
        this.direction = Math.random() > 0.5 ? 1 : -1;
        
        // Slightly randomized speed per lane
        this.speed = 1.2 + Math.random() * 2.0;
        
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
        mesh.position.y = -1; // Keep floor slightly below obstacles
        mesh.position.z = -this.index * CONFIG.GRID_SIZE;
        mesh.receiveShadow = true;
        return mesh;
    }

    spawnObstacles() {
        // Spawn 3 items per lane with significant spacing
        for (let i = 0; i < 3; i++) {
            const obj = this.type === CONFIG.TYPES.ROAD ? createCar() : createLog();
            
            // Set Z position to match the lane
            obj.position.z = -this.index * CONFIG.GRID_SIZE;
            
            // Initial X spacing
            obj.position.x = -400 + (i * 350); 
            
            // Add to the tracking array
            this.obstacles.push(obj);
        }
    }

    update() {
        // Move every tracked obstacle
        this.obstacles.forEach(obj => {
            obj.position.x += this.speed * this.direction;

            // Seamless wrap-around logic
            if (this.direction > 0 && obj.position.x > 550) {
                obj.position.x = -550;
            } else if (this.direction < 0 && obj.position.x < -550) {
                obj.position.x = 550;
            }
        });
    }
}
