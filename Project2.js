BORDER_COLOR = [1, 0, 0];

class Point{
    /**
     * Create a point with given x, y in canvas coordinate system,
     * and convert it to WebGL coordinate system
     * @constructor
     * @param {number} xInCanvas
     * @param {number} yInCanvas
     * @param {number} widthOfCanvas
     * @param {number} heightOfCanvas
     */
    constructor(xInCanvas, yInCanvas, widthOfCanvas, heightOfCanvas){
        if(xInCanvas < 0 || xInCanvas > widthOfCanvas || yInCanvas < 0 || yInCanvas > heightOfCanvas){
            throw new Error("Point out of bounds");
        }
        this.x = 0;
        this.y = 0;
        this.z = 0;
        [this.x, this.y] = Point.canvasCoordinateToWebGL(xInCanvas, yInCanvas, widthOfCanvas, heightOfCanvas);
    }

    /**
     * Convert the canvas coordinate to WebGL coordinate
     * @param {number} xInCanvas
     * @param {number} yInCanvas
     * @param {number} widthOfCanvas
     * @param {number} heightOfCanvas
     * @returns {number[]} [xInWebGL, yInWebGL]
     */
    static canvasCoordinateToWebGL(xInCanvas, yInCanvas, widthOfCanvas, heightOfCanvas){
        return [
            (xInCanvas - widthOfCanvas/2)/(widthOfCanvas/2),
            (heightOfCanvas/2 - yInCanvas)/(heightOfCanvas/2),
        ];
    }

    /**
     * Check if the clicked position is in the circle with given radius of the point
     * @param {number} clickedX - xInWebGL
     * @param {number} clickedY - yInWebGL
     * @param {number} radius - radius of the circle (default 0.1)
     * @returns {boolean}
     */
    isInPointCircle(clickedX, clickedY, radius = 0.1) {
        return Math.sqrt((clickedX - this.x) ** 2 + (clickedY - this.y) ** 2) < radius;
    }

    /**
     * Set the color of the point of normalized value [0, 1]
     * @param {number} r [0-255]
     * @param {number} g [0-255]
     * @param {number} b [0-255]
     */
    setColor(r, g, b){
        if(r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255){
            throw new Error("Color out of bounds");
        }
        this.r = r / 255;
        this.g = g / 255;
        this.b = b / 255;
    }

    /**
     * Get the position and color of the point
     * @returns {number[]} [x, y, z, r, g, b]
     */
    getPosWithColors(){
        return [this.x, this.y, this.z, this.r, this.g, this.b];
    }
}

class Triangle{
    /**
     * Create a triangle with three given points
     * @constructor
     * @param {Point} p1
     * @param {Point} p2
     * @param {Point} p3
     */
    constructor(p1, p2, p3){
        this.p1 = p1;
        this.p2 = p2;
        this.p3 = p3;
    }

    /**
     * Get the vertices of the triangle with colors
     * @returns {number[]} [x1, y1, z1, r1, g1, b1, x2, y2, ..., x3, y3, ...]
     */
    getVerticesWithColors(){
        return [...this.p1.getPosWithColors(), ...this.p2.getPosWithColors(), ...this.p3.getPosWithColors()];
    }

}

/**
 * @class Shapes
 * A class to store positions and colors of points and triangles
 */
class Shapes {

    /**
     * Create with given HTML Canvas element, width and height
     * @constructor
     * @param {HTMLCanvasElement} dom
     * @param {number} width
     * @param {number} height
     */
    constructor(dom, width, height) {
        dom.height = height
        dom.width = width
        this.dom = dom;
        this.points = [];
        this.triangles = [];
    }

    get width(){
        return this.dom.width;
    }
    get height(){
        return this.dom.height;
    }
    get trianglesCount(){
        return this.triangles.length;
    }

    /**
     * Add a point to the shapes
     * @param {number} xInCanvas - x coordinate in canvas coordinate system
     * @param {number} yInCanvas - y coordinate in canvas coordinate system
     * @param {number} r - red color value [0-255]
     * @param {number} g - green color value [0-255]
     * @param {number} b - blue color value [0-255]
     */
    addPoint(xInCanvas, yInCanvas, r, g, b){
        let p = new Point(xInCanvas, yInCanvas, this.width, this.height);
        p.setColor(r, g, b);
        this.points.push(p);
    }

    /**
     * Add a polygon as two triangles to the shapes
     * @param {number[]} pointIndices - indices of the points in the shapes
     */
    addPolygon(pointIndices){
        if(pointIndices.length !== 4){
            throw new Error("Polygon must have exactly 4 points");
        }else if(pointIndices.some(i => i < 0 || i >= this.points.length)){
            throw new Error("Point index out of bounds");
        }

        let points = pointIndices.map(i => this.points[i]);
        this.triangles.push(new Triangle(points[0], points[1], points[2]));
        this.triangles.push(new Triangle(points[0], points[2], points[3]));
    }

    /**
     * Get the vertices of all the triangles with colors
     * @returns {Float32Array}
     */
    getVerticesWithColors(){
        return new Float32Array(
            this.triangles.reduce((acc, t) => [...acc, ...t.getVerticesWithColors()], [])
        );
    }

}

/**
 * @class Transform
 * A class to store and update the transform matrix of the shapes
 */
class Transform{

    constructor(){
        this.rotationAngle = 0;
        this.scale = 1;
        this.isShrink = true;
        this.lastTimeRecord = Date.now();
        this.modelMatrix = new Matrix4().setIdentity();
    }

    get modelMatrixElements(){
        return this.modelMatrix.elements;
    }

    /**
     * Start the transform animation
     *
     * record the time for calculating the elapsed time
     */
    startTransform(){
        this.lastTimeRecord = Date.now();
    }

    /**
     * Update the transform matrix
     *
     * use the elapsed time to calculate the rotation angle and scale
     */
    updateTransform(){
        // calculate the elapsed time
        let now = Date.now();
        let elapsed = now - this.lastTimeRecord;
        this.lastTimeRecord = now;

        // rotate 45 degrees per second
        this.rotationAngle = (this.rotationAngle + elapsed / 1000 * 45) % 360;

        // scale between 0.2 and 1, at the speed of 0.2 per second
        if(this.isShrink){
            this.scale -= 0.2 * elapsed / 1000;
            if(this.scale <= 0.2) {
                this.scale = 0.2;
                this.isShrink = false;
            }
        }else{
            this.scale += 0.2 *  elapsed / 1000;
            if(this.scale >= 1) {
                this.scale = 1;
                this.isShrink = true;
            }
        }

        // update the transform matrix
        this.modelMatrix.setRotate(this.rotationAngle, 0, 0, 1);
        this.modelMatrix.scale(this.scale, this.scale, 1);
    }
}

/**
 * @class Renderer
 * A class to render the shapes with transform
 *
 * Fetch vertex data from class Shapes and transform data from class Transform
 */
class Renderer{
    // Vertex shader program
    V_SHADER_SOURCE =
        'attribute vec4 a_Position;\n' +
        'attribute vec4 a_Color;\n' +
        'uniform mat4 u_ModelMatrix;\n' +
        'varying vec4 v_Color;\n' +
        'void main() {\n' +
        '  gl_Position = u_ModelMatrix * a_Position;\n' +
        '  v_Color = a_Color;\n' +
        '}\n';

    // Fragment shader program
    F_SHADER_SOURCE =
        'precision mediump float;\n' +
        'varying vec4 v_Color;\n' +
        'void main() {\n' +
        '  gl_FragColor = v_Color;\n' +
        '}\n';

    /**
     * Create a renderer with given shapes and transform,
     * and initialize the webgl context, shaders and buffers
     * @constructor
     * @param {Shapes} shapes
     * @param {Transform} transform
     * @param {number[]} border_color - r, g, b [0-1]
     */
    constructor(shapes, transform, border_color){
        this.shapes = shapes;
        this.transform = transform;
        this.border_color = border_color

        this.gl = getWebGLContext(this.shapes.dom);
        if (!this.gl) {
            throw new Error('Failed to get the rendering context for WebGL');
        }
        if (!initShaders(this.gl, this.V_SHADER_SOURCE, this.F_SHADER_SOURCE)) {
            throw new Error('Failed to initialize shaders.');
        }
        this.vertexColorBuffer = this.gl.createBuffer();
        if (!this.vertexColorBuffer) {
            throw new Error('Failed to create the buffer object');
        }
        this.u_ModelMatrix = this.gl.getUniformLocation(this.gl.program, 'u_ModelMatrix');
        if (!this.u_ModelMatrix) {
            throw new Error('Failed to get the storage location of u_ModelMatrix');
        }
        this.initVertexBuffer();
    }

    /**
     * Initialize the vertex buffer
     *
     * Notice: being called in the constructor
     * @method
     */
    initVertexBuffer(){
        let emptyVertices = new Float32Array([])

        // Bind the buffer object to target
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexColorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, emptyVertices, this.gl.DYNAMIC_DRAW);
        let F_SIZE = emptyVertices.BYTES_PER_ELEMENT;

        //Get the storage location of a_Position, assign and enable buffer
        let a_Position = this.gl.getAttribLocation(this.gl.program, 'a_Position');
        if (a_Position < 0) {
            throw new Error('Failed to get the storage location of a_Position');
        }
        this.gl.vertexAttribPointer(a_Position, 3, this.gl.FLOAT, false, F_SIZE * 6, 0);
        this.gl.enableVertexAttribArray(a_Position);

        // Get the storage location of a_Color, assign and enable buffer
        let a_Color = this.gl.getAttribLocation(this.gl.program, 'a_Color');
        if(a_Color < 0) {
            throw new Error('Failed to get the storage location of a_Color');
        }
        this.gl.vertexAttribPointer(a_Color, 3, this.gl.FLOAT, false, F_SIZE * 6, F_SIZE * 3);
        this.gl.enableVertexAttribArray(a_Color);

        // Unbind the buffer object
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    }

    /**
     * Render the shapes
     *
     * Notice: fetch data from this.shapes and this.transform
     * @param {boolean} needBorder - whether to render the border
     */
    render(needBorder){
        // Render Shapes
        // Pass the vertices and colors to the shader
        let verticesColors = this.shapes.getVerticesWithColors();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexColorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, verticesColors, this.gl.DYNAMIC_DRAW);

        // Pass the transformation matrix to the shader
        this.gl.uniformMatrix4fv(this.u_ModelMatrix, false, this.transform.modelMatrixElements);

        // Clear and Draw
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.shapes.trianglesCount * 3);

        // Render Border
        if(!needBorder){
            return;
        }
        // Change the colors of vertices to border color
        for(let i = 0; i < verticesColors.length; i+=6){
            verticesColors[i+3] = this.border_color[0];
            verticesColors[i+4] = this.border_color[1];
            verticesColors[i+5] = this.border_color[2];
        }

        // Pass the borders and colors to the shader
        this.gl.bufferData(this.gl.ARRAY_BUFFER, verticesColors, this.gl.DYNAMIC_DRAW);

        // Draw the borders
        for(let i = 0; i < this.shapes.trianglesCount; i++){
            this.gl.drawArrays(this.gl.LINE_LOOP, i * 3, 3);
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    }

}

/**
 * @class Controller
 * A class which control the renderer for show/hide border, drag vertex and animation
 */
class Controller{
    /**
     * @constructor
     * Create a controller with given renderer
     * @param {Renderer} renderer
     */
    constructor(renderer) {
        this.renderer = renderer;
        this.isShowBorder = true;
        this.animationID = null;

        this.drag_flag = false;
        this.drag_point = null;
        this.drag_offset = [0, 0];
    }

    /**
     * Tell the renderer to render the shapes
     *
     * use this.isShowBorder to determine whether to render the border
     */
    render(){
        this.renderer.render(this.isShowBorder);
    }

    startAnimation(){
        this.renderer.transform.startTransform();
        this.updateAnimation();
    }

    updateAnimation(){
        this.renderer.transform.updateTransform();
        this.render();
        this.animationID = requestAnimationFrame(() => this.updateAnimation());
    }

    stopAnimation(){
        cancelAnimationFrame(this.animationID);
        this.animationID = null;
    }

    /**
     * coordinate stored in Shapes -> coordinate after rotation and scale
     * @param {number} x - x coordinate of the point stored in Shapes
     * @param {number} y - y coordinate of the point stored in Shapes
     * @returns {[number, number]} - coordinate after rotation and scale
     */
    transformPoint(x, y){
        let vec = this.renderer.transform.modelMatrix.multiplyVector4(new Vector4([x, y, 0, 1]));
        return [vec.elements[0], vec.elements[1]];
    }

    /**
     * coordinate after rotation and scale -> coordinate stored in Shapes
     * @param {number} x - x coordinate of the point after rotation and scale
     * @param {number} y - y coordinate of the point after rotation and scale
     * @returns {[number, number]} - coordinate stored in Shapes
     */
    inverseTransformPoint(x, y){
        let inverseModelMatrix = new Matrix4().setInverseOf(this.renderer.transform.modelMatrix)
        let vec = inverseModelMatrix.multiplyVector4(new Vector4([x, y, 0, 1]));
        return [vec.elements[0], vec.elements[1]];
    }

    /**
     * Handle mouse down event
     * @param {number} clientX - x coordinate of the mouse in canvas system
     * @param {number} clientY - y coordinate of the mouse in canvas system
     */
    mouseDown(clientX, clientY){
        // coordinate in canvas system -> coordinate in webgl system -> coordinate before rotation and scale
        let clickedPoint, inv_clickedPoint;
        clickedPoint = Point.canvasCoordinateToWebGL(clientX, clientY,
            this.renderer.shapes.width, this.renderer.shapes.height);
        inv_clickedPoint = this.inverseTransformPoint(...clickedPoint);

        // check whether there are any points near the clicked position
        let point = this.renderer.shapes.points.find(p => p.isInPointCircle(...inv_clickedPoint))
        if(point){
            this.drag_flag = true;
            this.drag_point = point;
            // save the offset between the clicked position and the point coordinate after rotation and scale
            let trans_point = this.transformPoint(point.x, point.y);
            this.drag_offset = [clickedPoint[0] - trans_point[0], clickedPoint[1] - trans_point[1]];
        }
    }

    /**
     * Handle mouse move event
     * @param {number} clientX - x coordinate of the mouse in canvas system
     * @param {number} clientY - y coordinate of the mouse in canvas system
     */
    mouseMove(clientX, clientY){
        if(this.drag_flag){
            // clicked position in canvas system -> clicked position in webgl system
            let clickedPoint, tx, ty;
            clickedPoint = Point.canvasCoordinateToWebGL(clientX, clientY,
                this.renderer.shapes.width, this.renderer.shapes.height);
            // clicked position in webgl system -> actual point coordinate after rotation and scale
            tx = clickedPoint[0] - this.drag_offset[0];
            ty = clickedPoint[1] - this.drag_offset[1];
            // actual point coordinate after rotation and scale -> actual point coordinate stored in Shapes
            let inv_point = this.inverseTransformPoint(tx, ty);
            this.drag_point.x = inv_point[0];
            this.drag_point.y = inv_point[1];
            // redraw the shapes
            this.render();
        }
    }

    /**
     * Handle mouse up event
     */
    mouseUp(){
        this.drag_flag = false;
        this.drag_point = null;
        this.drag_offset = [0, 0];
    }

}

/**
 * @class InteractionManager
 * A class which handle the interaction between user and the program
 */
class InteractionManager{
    /**
     * Create an interaction manager with given controller and HTML elements
     *
     * add event listeners of keyboard stroke and mouse drag
     * @constructor
     * @param {Controller} controller
     * @param {Document} document - DOM document
     * @param {HTMLParagraphElement} hint - HTML paragraph element for hint
     * @param {HTMLParagraphElement} msg - HTML paragraph element for message
     */
    constructor(controller, document, hint, msg){
        this.controller = controller;
        let canvasElement = this.controller.renderer.shapes.dom;
        this.document = document;
        this.hintElement = hint;
        this.msgElement = msg;

        this.isEdit = true;
        this.isAnimating = false;
        this.controller.isShowBorder = true;
        this.updateHint();

        this.document.addEventListener('keydown', (event) => {
            if(event.key === 'b' || event.key === 'B'){
                this.toggleBorder();
            }else if(event.key === 't' || event.key === 'T') {
                this.toggleAnimation();
            }else if(event.key === 'e' || event.key === 'E'){
                this.toggleEdit();
            }
        });

        canvasElement.addEventListener('mousedown', e => this.mouseDownHandler(e));
        canvasElement.addEventListener('mousemove', e => this.mouseMoveHandler(e));
        canvasElement.addEventListener('mouseup', _ => this.mouseUpHandler());

    }


    /**
     * update the hint on the HTML page
     */
    updateHint(){
        this.hintElement.innerText = '';
        this.hintElement.innerText += `边框[B]: ${this.controller.isShowBorder ? '开' : '关'}\u00A0\u00A0\u00A0\u00A0`;
        this.hintElement.innerText += `动画[T]: ${this.isAnimating ? '开' : '关'}\u00A0\u00A0\u00A0\u00A0`;
        this.hintElement.innerText += `编辑[E]: ${this.isEdit ? '开' : '关'}\u00A0\u00A0\u00A0\u00A0`;
    }

    /**
     * update the message on the HTML page
     * @param {String} msg
     */
    updateMsg(msg){
        this.msgElement.innerText = msg;
        if(msg !== ''){
            setTimeout(() => {
                this.msgElement.innerText = '';
            }, 1000);
        }
    }

    /**
     * Handle keyboard stroke [B] event to show/hide borders
     */
    toggleBorder(){
        this.controller.isShowBorder = !this.controller.isShowBorder;
        this.updateHint();
        this.controller.render();
    }

    /**
     * Handle keyboard stroke [T] event to start/stop animation
     */
    toggleAnimation(){
        this.isAnimating = !this.isAnimating;
        this.updateHint();
        if(this.isAnimating){
            this.controller.startAnimation();
        }else{
            this.controller.stopAnimation();
        }
    }

    /**
     * Handle keyboard stroke [E] event to switch on/off edit mode
     */
    toggleEdit(){
        this.isEdit = !this.isEdit;
        this.updateHint();
    }

    /**
     * Handle mouse down event
     *
     * If the edit mode is off or the animation is on, show message.
     * Otherwise, call the controller's mouseDown method.
     * @param {MouseEvent} event
     */
    mouseDownHandler(event){
        if(!this.isEdit){
            this.updateMsg('请先按下E键开启编辑模式');
            return;
        }else if(this.isAnimating){
            this.updateMsg('请先按下T键关闭动画');
            return;
        }
        this.updateMsg('');
        this.controller.mouseDown(event.clientX, event.clientY);
    }

    /**
     * Handle mouse move event by calling controller's mouseMove method
     * @param {MouseEvent} event
     */
    mouseMoveHandler(event){
        this.controller.mouseMove(event.clientX, event.clientY);
    }

    /**
     * Handle mouse up event by calling controller's mouseUp method
     */
    mouseUpHandler(){
        this.controller.mouseUp();
    }

}


/**
 * Read the config file, add points and polygons to the shapes
 * @param {Shapes} shapes
 */
function readConfigFile(shapes){
    for(let i = 0; i < vertex_pos.length; i++){
        shapes.addPoint(vertex_pos[i][0], vertex_pos[i][1],
            vertex_color[i][0], vertex_color[i][1], vertex_color[i][2]);
    }
    polygon.forEach(p => shapes.addPolygon(p));
}

function main() {
    // init Shapes
    let canvasWidth = canvasSize.maxX
    let canvasHeight = canvasSize.maxY
    let shapes = new Shapes(document.getElementById('myCanvas'), canvasWidth, canvasHeight);
    readConfigFile(shapes);

    // init Transform and Renderer
    let transform = new Transform();
    let renderer = new Renderer(shapes, transform, BORDER_COLOR);
    renderer.render(true);

    // init Controller and InteractionManager
    let controller = new Controller(renderer);
    new InteractionManager(controller, document,
     document.getElementById('hint'), document.getElementById('msg'));
}

