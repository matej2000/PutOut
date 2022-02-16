export class Application {

    constructor(canvas, glOptions) {
        this._update = this._update.bind(this);

        this.canvas = canvas;
        this.canvas2 = document.getElementById("canvas-2d");
        this.ctx = this.canvas2.getContext("2d");
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas2.width = window.innerWidth;
        this.canvas2.height = window.innerHeight;
        this._initGL(glOptions);
        this.start();

        requestAnimationFrame(this._update);
    }

    _initGL(glOptions) {
        this.gl = null;
        try {
            this.gl = this.canvas.getContext('webgl2', glOptions);
        } catch (error) {
        }

        if (!this.gl) {
            console.log('Cannot create WebGL 2.0 context');
        }
    }

    _update() {
        this._resize();
        this.update2d();
        this.update();
        this.render();
        requestAnimationFrame(this._update);
    }

    _resize() {
        const canvas = this.canvas;
        const gl = this.gl;

        if (canvas.width !== window.innerWidth ||
            canvas.height !== window.innerHeight)
        {
            /*canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;*/
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            this.canvas2.width = window.innerWidth;
            this.canvas2.height = window.innerHeight;

            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

            this.resize();
        }
    }

    start() {
        // initialization code (including event handler binding)
    }

    update() {
        // update code (input, animations, AI ...)
    }

    update2d(){
        // update 2d context
    }

    render() {
        // render code (gl API calls)
    }

    resize() {
        // resize code (e.g. update projection matrix)
    }

}
