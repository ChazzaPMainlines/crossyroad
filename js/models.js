import * as THREE from 'three';
import { CONFIG } from './constants.js';

export function createPanther() {
    const group = new THREE.Group();
    
    // Body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(25, 15, 15),
        new THREE.MeshPhongMaterial({ color: CONFIG.COLORS.PANTHER })
    );
    body.position.y = 12;
    group.add(body);

    // Head
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(12, 12, 12),
        new THREE.MeshPhongMaterial({ color: CONFIG.COLORS.PANTHER })
    );
    head.position.set(12, 18, 0);
    group.add(head);

    // Tail
    const tail = new THREE.Mesh(
        new THREE.BoxGeometry(15, 4, 4),
        new THREE.MeshPhongMaterial({ color: CONFIG.COLORS.PANTHER })
    );
    tail.position.set(-15, 12, 0);
    group.add(tail);

    group.castShadow = true;
    group.receiveShadow = true;
    return group;
}

export function createCar() {
    const color = CONFIG.COLORS.CAR[Math.floor(Math.random() * CONFIG.COLORS.CAR.length)];
    const group = new THREE.Group();
    
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(50, 20, 30),
        new THREE.MeshPhongMaterial({ color })
    );
    body.position.y = 10;
    group.add(body);

    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(25, 15, 26),
        new THREE.MeshPhongMaterial({ color: 0xccffff, transparent: true, opacity: 0.7 })
    );
    cabin.position.set(-5, 25, 0);
    group.add(cabin);

    return group;
}

export function createLog() {
    const geometry = new THREE.BoxGeometry(70, 10, 30);
    const material = new THREE.MeshPhongMaterial({ color: CONFIG.COLORS.LOG });
    const log = new THREE.Mesh(geometry, material);
    log.position.y = 5;
    return log;
}
