import { vec3, mat4 } from '../../lib/gl-matrix-module.js';

export class Camera {

    constructor(options = {}) {
        this.node = options.node || null;
        this.children=[];
        this.matrix = options.matrix
            ? mat4.clone(options.matrix)
            : mat4.create();
        
    }

    addChild(node) {
        this.children.push(node);
        node.parent = this;
    }

    getGlobalTransform() {
        if (!this.parent) {
            return mat4.clone(this.transform);
        } else {
            let transform = this.parent.getGlobalTransform();
            return mat4.mul(transform, transform, this.transform);
        }
    }

    traverse(before, after) {
        if (before) {
            before(this);
        }
        for (let child of this.children) {
            child.traverse(before, after);
        }
        if (after) {
            after(this);
        }
    }

    updateProjection() {
        mat4.perspective(this.matrix, this.fov, this.aspect, this.near, this.far);
    }

    updateTransform() {
        const t = this.matrix;
        const degrees = this.rotation.map(x => x * 180 / Math.PI);
        const q = quat.fromEuler(quat.create(), ...degrees);
        const v = vec3.clone(this.translation);
        const s = vec3.clone(this.scale);
        mat4.fromRotationTranslationScale(t, q, v, s);
    }


}
