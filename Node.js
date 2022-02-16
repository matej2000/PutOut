import { vec3, mat4, quat } from './lib/gl-matrix-module.js';

export class Node {

    constructor(options = {},accessors = null, num = 0) {
        this.options = options;
        this.accessors = accessors;
        //console.log(this.options, this.accessors);
        this.translation = options.translation
            ? vec3.clone(options.translation)
            : vec3.fromValues(0, 0, 0);
        this.rotation = options.rotation
            ? quat.clone(options.rotation)
            : quat.fromValues(0, 0, 0, 1);
        this.scale = options.scale
            ? vec3.clone(options.scale)
            : vec3.fromValues(1, 1, 1);
        this.matrix = options.matrix
            ? mat4.clone(options.matrix)
            : mat4.create();

        //TODO: popravi
        //this.rotation = [0,0,0,1]

        if (options.matrix) {
            this.updateTransform();
        } else if (options.translation || options.rotation || options.scale) {
            this.updateMatrix();
        }

        this.camera = options.camera || null;
        
        this.mesh = options.mesh || null;

        this.children = [...(options.children || [])];
        for (const child of this.children) {
            child.parent = this;
        }
        this.parent = null;

        if(this.mesh){
            this.aabb = {
                min: this.mesh.primitives[0].attributes.POSITION.min,
                max: this.mesh.primitives[0].attributes.POSITION.max,
            };

            
            this.aabb.min[0] *= this.scale[0];
            this.aabb.min[1] *= this.scale[1];
            this.aabb.min[2] *= this.scale[2];
            this.aabb.max[0] *= this.scale[0];
            this.aabb.max[1] *= this.scale[1];
            this.aabb.max[2] *= this.scale[2];
        
            
        }
       

        if(accessors !== null){
            this.aabb2 = {
                min: accessors[0].min,
                max: accessors[0].max,
            };
        }

        /*if(this.camera) {
            console.log(options, "dd", this)
        }*/
           
    }

    /*updateTransform() {
        mat4.getRotation(this.rotation, this.matrix);
        mat4.getTranslation(this.translation, this.matrix);
        mat4.getScaling(this.scale, this.matrix);
    }*/

    updateTransform() {
        const t = this.matrix;
        const degrees = this.rotation.map(x => x * 180 / Math.PI);
        const q = quat.fromEuler(quat.create(), ...degrees);
        const v = vec3.clone(this.translation);
        const s = vec3.clone(this.scale);
        mat4.fromRotationTranslationScale(t, q, v, s);
        
    }

    updateMatrix() {
        mat4.fromRotationTranslationScale(
            this.matrix,
            this.rotation,
            this.translation,
            this.scale);
    }

    addChild(node) {
        this.children.push(node);
        node.parent = this;
    }

    removeChild(node) {
        const index = this.children.indexOf(node);
        if (index >= 0) {
            this.children.splice(index, 1);
            node.parent = null;
        }
    }

    clone() {
        return new Node({
            ...this,
            children: this.children.map(child => child.clone()),
        });
    }

    getGlobalTransform() {
        if (!this.parent) {
            return mat4.clone(this.matrix);
        } else {
            let transform = this.parent.getGlobalTransform();
            return mat4.mul(transform, transform, this.matrix);
        }
    }

    /*traverse(before, after) {
        if (before) {
            before(this);
        }
        for (let child of this.children) {
            child.traverse(before, after);
        }
        if (after) {
            after(this);
        }
    }*/

    updateCamera(dt, app){
        const c = this;

        const forward = vec3.set(vec3.create(),
            -Math.sin(c.rotation[1]), 0, -Math.cos(c.rotation[1]));
        const right = vec3.set(vec3.create(),
            Math.cos(c.rotation[1]), 0, -Math.sin(c.rotation[1]));

        // 1: add movement acceleration
        let acc = vec3.create();
        if (app.keys['KeyW']) {
            vec3.add(acc, acc, forward);
        }
        if (app.keys['KeyS']) {
            vec3.sub(acc, acc, forward);
        }
        if (app.keys['KeyD']) {
            vec3.add(acc, acc, right);
        }
        if (app.keys['KeyA']) {
            vec3.sub(acc, acc, right);
        }

        // 2: update velocity
        vec3.scaleAndAdd(c.velocity, c.velocity, acc, dt * c.acceleration);

        // 3: if no movement, apply friction
        if (!app.keys['KeyW'] &&
            !app.keys['KeyS'] &&
            !app.keys['KeyD'] &&
            !app.keys['KeyA'])
        {
            vec3.scale(c.velocity, c.velocity, 1 - c.friction);
        }

        // 4: limit speed
        const len = vec3.len(c.velocity);
        if (len > c.maxSpeed) {
            vec3.scale(c.velocity, c.velocity, c.maxSpeed / len);
        }

        // 5: update translation
        /*vec3.scaleAndAdd(c.translation, c.translation, c.velocity, dt);

        // 6: update the final transform
        const t = c.matrix;
        mat4.identity(t);
        let prej = t;
        mat4.translate(t, t, c.translation);
        mat4.rotateY(t, t, c.rotation[1]);
        mat4.rotateX(t, t, c.rotation[0]);*/
    }


}