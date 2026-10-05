import * as THREE from 'three';

const BOX = new THREE.Vector3(40, 25, 40);
const MAX = 4500;
const TILT = (10 * Math.PI) / 180;
const FALL = 22;

/** Mưa xiên: vệt dài 0.6, rơi 22 đơn vị/giây, nghiêng 10° về +X, chạy trên GPU trong hộp 40×25×40 bám theo camera. */
export class Rain {
  readonly lines: THREE.LineSegments;
  private mat: THREE.ShaderMaterial;

  constructor() {
    const base = new Float32Array(MAX * 2 * 3);
    const end = new Float32Array(MAX * 2);
    for (let i = 0; i < MAX; i++) {
      const x = Math.random() * BOX.x, y = Math.random() * BOX.y, z = Math.random() * BOX.z;
      base.set([x, y, z, x, y, z], i * 6);
      end[i * 2] = 0; end[i * 2 + 1] = 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(base, 3));
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false,
      uniforms: { uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uBox: { value: BOX }, uColor: { value: new THREE.Color('#9FB8CC') } },
      vertexShader: /* glsl */ `
        uniform float uTime; uniform vec3 uCenter, uBox; attribute float aEnd; varying float vA;
        void main() {
          vec3 vel = vec3(sin(${TILT.toFixed(5)}), -cos(${TILT.toFixed(5)}), 0.) * ${FALL.toFixed(1)};
          vec3 p = mod(position + vel * uTime, uBox) - uBox * .5 + uCenter;
          p -= normalize(vel) * .6 * aEnd;     // đuôi vệt nằm phía trên
          vA = .22 * (1. - aEnd);
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.);
        }`,
      fragmentShader: /* glsl */ `uniform vec3 uColor; varying float vA; void main() { gl_FragColor = vec4(uColor, vA); }`,
    });
    this.lines = new THREE.LineSegments(g, this.mat);
    this.lines.frustumCulled = false;
    this.setCount(3000);
  }

  setCount(n: number) {
    this.lines.visible = n > 0;
    this.lines.geometry.setDrawRange(0, Math.min(n, MAX) * 2);
  }

  update(t: number, camera: THREE.Camera) {
    this.mat.uniforms.uTime.value = t;
    this.mat.uniforms.uCenter.value.set(camera.position.x, camera.position.y - 4, camera.position.z - 12);
  }
}
