import*as THREE from 'three';

import {GUI} from 'three/addons/libs/lil-gui.module.min.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Water} from 'three/addons/objects/Water2.js';

let scene, camera, renderer, water;

let makeBrush = ()=>{
    let canvas = document.createElement('canvas');
    let w = canvas.width = 256;
    let w2 = (w / 2) | 0
    let h = canvas.height = 256;
    const ctx = canvas.getContext("2d", {
        willReadFrequently: true
    });

    let v0 = new THREE.Vector3();
    let v1 = new THREE.Vector3();
    ctx.writeVelocity = (x,y)=>{
        v0.set(-x, y, 0);
        const maxVel = .01;
        if (v0.length() > maxVel)
            v0.setLength(128);
        else
            v0.multiplyScalar(128 / maxVel);
        let vx = (v0.x + 128) | 0
        let vy = (v0.y + 128) | 0
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        let idat = ctx.getImageData(0, 0, canvas.width, canvas.height)
        let d = idat.data;
        let bw = ctx.canvas.width;
        let bh = ctx.canvas.height;
        for (let i = 0, j = 0, k = d.length; i < k; i += 4,
        j++) {
            let x = (j | 0) % bw;
            let y = Math.floor(j / bw);
            v1.set(x - (bw / 2), y - (bh / 2), 0.)

            let alpha = ((v1.length() / (bw / 2)) * 255) | 0;
            d[i] = vx
            d[i + 1] = vy
            d[i + 2] = 0;
            //128;
            //255-alpha;
            d[i + 3] = (255 - alpha) * .25;
        }
        ctx.putImageData(idat, 0, 0);
    }
    ctx.paint = (dctx,px,py,vx,vy)=>{
        let bw = brushCtx.canvas.width
        let bh = brushCtx.canvas.height
        ctx.writeVelocity(vx, vy);

        dctx.drawImage(brushCtx.canvas, px - (bh * .5), py - (bh * .5), bw, bh);

        flowMap.needsUpdate = true;
    }
    return ctx;
}
let brushCtx = makeBrush()

// scene

scene = new THREE.Scene();

// camera

camera = new THREE.PerspectiveCamera(45,window.innerWidth / window.innerHeight,0.1,200);
camera.position.set(0, 25, 0);
camera.lookAt(scene.position);

// ground

const groundGeometry = new THREE.PlaneGeometry(20,20,10,10);
const groundMaterial = new THREE.MeshBasicMaterial({
    color: 0xe7e7e7
});
const ground = new THREE.Mesh(groundGeometry,groundMaterial);
ground.rotation.x = Math.PI * -0.5;
scene.add(ground);
THREE.DefaultLoadingManager.resolveURL = from=>{
    if (from.startsWith('textures/'))
        return `https://threejs.org/examples/` + from
    return from;
}

const cubeTextureLoader = new THREE.CubeTextureLoader();
cubeTextureLoader.setPath('textures/cube/Park2/');

const cubeTexture = cubeTextureLoader.load(['posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg']);

scene.background = cubeTexture;

const textureLoader = new THREE.TextureLoader();
textureLoader.load('https://threejs.org/examples/textures/floors/FloorsCheckerboard_S_Diffuse.jpg', function(map) {

    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 16;
    map.repeat.set(4, 4);
    map.colorSpace = THREE.SRGBColorSpace;
    groundMaterial.map = map;
    groundMaterial.needsUpdate = true;

});

// water

const waterGeometry = new THREE.PlaneGeometry(20,20);
let flowMap = await textureLoader.loadAsync('https://threejs.org/examples/textures/water/Water_1_M_Flow.jpg');

let cnv = document.createElement('canvas');
cnv.width = flowMap.source.data.width;
cnv.height = flowMap.source.data.height;
let ctx = cnv.getContext('2d');
//   ctx.drawImage(flowMap.source.data, 0, 0, cnv.width, cnv.height);
ctx.fillStyle = '#888';
ctx.fillRect(0, 0, cnv.width, cnv.height)

flowMap = new THREE.CanvasTexture(cnv)
flowMap.colorSpace = 'srgb-linear'
const normalMap0 = textureLoader.load('textures/water/Water_1_M_Normal.jpg');
const normalMap1 = textureLoader.load('textures/water/Water_2_M_Normal.jpg');

let waterParams = {

    scale: 2.,
    textureWidth: 1024,
    textureHeight: 1024,
    flowMap,
    normalMap0,
    normalMap1,
    flowSpeed: .03
}
let flushWaterParams = ()=>{
    water = new Water(waterGeometry,waterParams);
    water.position.y = 1;
    water.rotation.x = Math.PI * -0.5;
    scene.add(water);
}
flushWaterParams();
// flow map helper

const helperGeometry = new THREE.PlaneGeometry(20,20);
const helperMaterial = new THREE.MeshBasicMaterial({
    map: flowMap
});
const helper = new THREE.Mesh(helperGeometry,helperMaterial);
helper.position.y = 1.01;
helper.rotation.x = Math.PI * -0.5;
helper.visible = false;
scene.add(helper);

// renderer

renderer = new THREE.WebGLRenderer({
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

//

const gui = new GUI();
gui.add(helper, 'visible').name('Show Flow Map');

let brushParams = {
    _size: 128,
    get size() {
        return this._size
    },
    set size(v) {
        this._size = v;
        brushCtx.canvas.width = brushCtx.canvas.height = v
    }
}
gui.add({
    save: function() {
        let canvas = ctx.canvas;
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'flowmap.png';
        link.click();
    }
}, 'save').name('Save flowmap...');
gui.add(brushParams, 'size', 0, 256, 1).name('Brush size...');
/*
gui.add(water.material.uniforms.config.value,'x',.1,10.,.01).name('SclX size...');
gui.add(water.material.uniforms.config.value,'y',.1,10.,.01).name('SclY size...');
gui.add(water.material.uniforms.config.value,'z',.1,10.,.01).name('SclZ size...');
gui.add(water.material.uniforms.config.value,'w',.1,10.,.01).name('SclW size...');
*/
gui.open();

//

const controls = new OrbitControls(camera,renderer.domElement);
controls.minDistance = 5;
controls.maxDistance = 50;

//

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let buttons;
let pdown = (e)=>{
    buttons = e.buttons;
    doPaint();
    if (!controls.enabled)
        e.stopPropagation()

}
let pmove = (e)=>{
    if (buttons) {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }
}
let pup = (e)=>{
    buttons = e.buttons;
    controls.enabled = true;
}

let lastMouse;
let curMouse = new THREE.Vector3();
let doPaint = ()=>{

    if (!buttons) {
        controls.enabled = true;
        return;
    }

    raycaster.setFromCamera(pointer, camera);

    let hits = raycaster.intersectObject(water)
    if (hits.length) {
        controls.enabled = false;
        curMouse.copy(hits[0].point);
        water.worldToLocal(curMouse);
        if (!lastMouse) {
            lastMouse = curMouse.clone();
        }
        let vx = lastMouse.x - curMouse.x;
        let vy = lastMouse.y - curMouse.y;
        let px = (((curMouse.x / 10) + 1) * ctx.canvas.width * .5);
        let py = (((curMouse.y / -10) + 1) * ctx.canvas.height * .5);

        brushCtx.paint(ctx, px, py, vx, vy);

        lastMouse.copy(curMouse);
    }
}
function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

}

window.addEventListener('resize', onWindowResize);
document.addEventListener('pointerdown', pdown)
document.addEventListener('pointermove', pmove)
document.addEventListener('pointerup', pup)
function animate() {
    doPaint()
    renderer.render(scene, camera);

}


function enableImageDrop(canvas) {
    canvas.addEventListener('dragover', (e) => e.preventDefault());

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // Draw the image on canvas
                    
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

// Usage example
enableImageDrop(renderer.domElement);