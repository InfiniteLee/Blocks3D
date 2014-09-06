/**
 * @author Kevin Lee
 *
 * The main module. A lot of this is taken from the three.js voxelpainter example.
 * It is heavily modified to support the multiplayer aspects, but the rendering
 * code and logic is largely untouched.
 */

var SOCKET_HOST = 'http://localhost:1337';

requirejs.config({
    baseUrl: 'js/lib',
    shim: {
        'app/VoxelFactory': {
            deps:['three.min']
        },
        'app/HelperFactory': {
            deps:['app/VoxelFactory']
        }
    },
    paths: {
        app: '../app',
        shared: '../../../shared/js',
    }
});

require(['three.min', 'stats.min', 'app/Detector', 'app/VoxelFactory', 'app/HelperFactory', 'shared/World'], function() {

    if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

    var container, stats;
    var camera, scene, renderer;
    var projector, plane, cube;
    var mouse2D, mouse3D, raycaster,
    rollOveredFace, isShiftDown = false,
    theta = 45 * 0.5, isCtrlDown = false;

    var rollOverMesh, rollOverMaterial;
    var voxelPosition = new THREE.Vector3(), tmpVec = new THREE.Vector3(), normalMatrix = new THREE.Matrix3();
    var cubeGeo, cubeMaterial;
    var i, intersector;

    var objects = [];

    var socket, socketId;

    var roomId;

    var myWorld = World();

    var colorList, color, colorIndex;

    var helpers;

    var voxelFactory = VoxelFactory();
    var helperFactory = HelperFactory();

    $.getJSON('colors.json', function (data) {
        colorList = data;
    }).done(init).done(animate);
    

    function init() {

        container = document.createElement( 'div' );
        document.body.appendChild( container );

        var info = document.createElement( 'div' );
        info.style.position = 'absolute';
        info.style.top = '10px';
        info.style.width = '100%';
        info.style.textAlign = 'center';
        info.innerHTML = 'Blocks 3D - Multiplayer Voxel Painter<br>based on: <a href="http://threejs.org" target="_blank">three.js</a> - voxel painter - webgl';
        info.innerHTML += '<br><strong>click</strong>: add voxel, <strong>shift + click</strong>: remove voxel, <strong>control</strong>: rotate<br>';
        info.innerHTML += '<button type="button" id="switchRoom">Switch Room </button>';
        info.innerHTML += '<button type="button" id="changeColor">Change Color </button>';
        container.appendChild( info );

        camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
        camera.position.y = 800;

        scene = new THREE.Scene();

        // roll-over helpers

        colorIndex = Math.floor((Math.random() * colorList.length));
        color = colorList[colorIndex];

        rollOverMesh = helperFactory.createVoxel(color);

        // picking

        projector = new THREE.Projector();

        
        mouse2D = new THREE.Vector3( 0, 10000, 0.5 );

        renderer = new THREE.WebGLRenderer( { antialias: true } );
        renderer.setClearColor( 0xf0f0f0 );
        renderer.setSize( window.innerWidth, window.innerHeight );

        container.appendChild( renderer.domElement );

        stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.top = '0px';
        container.appendChild( stats.domElement );

        document.addEventListener( 'mousemove', onDocumentMouseMove, false );
        document.addEventListener( 'mousedown', onDocumentMouseDown, false );
        document.addEventListener( 'keydown', onDocumentKeyDown, false );
        document.addEventListener( 'keyup', onDocumentKeyUp, false );

        window.addEventListener( 'resize', onWindowResize, false );

        socket = io(SOCKET_HOST);

        createSocketListeners();

        setInterval(function () {
            if (typeof voxelPosition !== 'undefined') {
                socket.emit('helper_update', {position:voxelPosition, color:color});
            }
        }, 1000);

        $("#switchRoom").click(switchRoom);
        $("#changeColor").click(changeColor);
    }

    function createSocketListeners() {
        socket.on('connection_info', onConnectionInfo)
        socket.on('helper_update', onHelperUpdate);
        socket.on('update', onUpdate);
        socket.on('disconnect', onDisconnect);
    }

    function initScene() {

        scene.add( rollOverMesh );

        // Lights

        var ambientLight = new THREE.AmbientLight( 0x606060 );
        scene.add( ambientLight );

        var directionalLight = new THREE.DirectionalLight( 0xffffff );
        directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
        scene.add( directionalLight );

        // grid

        var size = 500, step = 50;

        var geometry = new THREE.Geometry();

        for ( var i = - size; i <= size; i += step ) {

            geometry.vertices.push( new THREE.Vector3( - size, 0, i ) );
            geometry.vertices.push( new THREE.Vector3(   size, 0, i ) );

            geometry.vertices.push( new THREE.Vector3( i, 0, - size ) );
            geometry.vertices.push( new THREE.Vector3( i, 0,   size ) );

        }

        var material = new THREE.LineBasicMaterial( { color: 0x000000, opacity: 0.2, transparent: true } );

        var line = new THREE.Line( geometry, material );
        line.type = THREE.LinePieces;
        scene.add( line );

        plane = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000 ), new THREE.MeshBasicMaterial() );
        plane.rotation.x = - Math.PI / 2;
        plane.visible = false;
        scene.add( plane );

        objects.push( plane );
    }

    function destroyScene() {
        objects = [];
        var toRemove = scene.children.slice(0);
        toRemove.forEach(function (child) {
            scene.remove(child);
        });
    }

    // HELPERS

    function getRealIntersector( intersects ) {

        for( i = 0; i < intersects.length; i++ ) {

            intersector = intersects[ i ];

            if ( intersector.object != rollOverMesh ) {

                return intersector;

            }

        }

        return null;
    }

    function setVoxelPosition( intersector ) {

        if ( intersector.face === null ) {
            console.log( intersector )
        }

        normalMatrix.getNormalMatrix( intersector.object.matrixWorld );

        tmpVec.copy( intersector.face.normal );
        tmpVec.applyMatrix3( normalMatrix ).normalize();

        voxelPosition.addVectors( intersector.point, tmpVec );
        voxelPosition.divideScalar( 50 ).floor().multiplyScalar( 50 ).addScalar( 25 );
    }

    function switchRoom() {
        myWorld.destroyWorld();
        destroyScene();

        socket.emit('switch_room', {roomId:roomId});
    }

    function changeColor() {
        colorIndex = (colorIndex + 1) % colorList.length;
        scene.remove(rollOverMesh);
        color = colorList[colorIndex];
        rollOverMesh = helperFactory.createVoxel(color);
        scene.add(rollOverMesh);
    }

    // EVENT LISTENERS

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth, window.innerHeight );
    }

    function onDocumentMouseMove( event ) {
        event.preventDefault();

        mouse2D.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouse2D.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    }

    function onDocumentMouseDown( event ) {

        event.preventDefault();

        var intersects = raycaster.intersectObjects( objects );

        if ( intersects.length > 0 ) {
            intersector = getRealIntersector( intersects );

            // delete cube
            if ( isShiftDown ) {
                if ( intersector.object != plane ) {
                    var position = intersector.object.position;
                    var key = myWorld.createKey(position);
                    socket.emit('remove_voxel', {key:key});
                    removeVoxel(key);
                }

            // create cube
            } else {
                intersector = getRealIntersector( intersects );
                setVoxelPosition( intersector );
                socket.emit('add_voxel', {color:color, position:voxelPosition});
                addVoxel(color, voxelPosition);
            }
        }
    }

    function onDocumentKeyDown(event) {

        switch (event.keyCode) {

            case 16: isShiftDown = true; break;
            case 17: isCtrlDown = true; break;

        }
    }

    function onDocumentKeyUp(event) {

        switch (event.keyCode) {

            case 16: isShiftDown = false; break;
            case 17: isCtrlDown = false; break;

        }
    }

    // SOCKET LISTENERS

    function onConnectionInfo(data) {
        socketId = data.id;

        roomId = data.roomId;

        initScene();

        data.world.forEach(function (voxel) {
            addVoxel(voxel.color, voxel.position);
        });
    }

    function onHelperUpdate(data) {

        if (data.id === socketId) {
            return;
        }

        var helper = myWorld.getHelper(data.id);
        if (!helper) {
            helper = helperFactory.createVoxel(data.color);
            helper.matrixAutoUpdate = false;
            myWorld.addHelper(data.id, helper);

            scene.add(helper);
        }

        helper.position.copy( data.position );
        helper.updateMatrix();
        
    }

    function onUpdate(actions) {
        console.log(actions);
        actions.sort(sortActions);

        actions.forEach(processAction);
    }

    function processAction(action) {
        switch(action[0])
        {
            case "add_voxel":
                addVoxel(action[2], action[3]);
                break;
            case "remove_voxel":
                removeVoxel(action[2]);
                break;
        }
    }

    function sortActions(a, b) {
        if (a[1] < b[1]) {
            return -1;
        }

        if (a[1] > b[1]) {
            return 1;
        }

        return 0;
    }

    function addVoxel(color, position) {
        if (myWorld.hasVoxel(position)) {
            var key = myWorld.createKey(position);
            if (myWorld.getVoxelColor(key) != color) {
                removeVoxel(key);
            }
            return;
        }

        var voxel = voxelFactory.createVoxel(color, position);

        scene.add( voxel );
        objects.push(voxel);

        myWorld.addVoxel(voxel, position, color);
    }

    function removeVoxel(key) {
        console.log(key);
        var voxel = myWorld.getVoxel(key);
        console.log(voxel);
        if (voxel) {
            scene.remove( voxel );
            objects.splice( objects.indexOf( voxel ), 1 );
            myWorld.removeVoxel(key);
        }  
    }

    function onDisconnect(data) {
        if (data == "transport error") {
            destroyScene();
        }

        var helper = myWorld.getHelper(data.id);
        if (helper) {
            scene.remove(helper);
            myWorld.removeHelper(data.id);
        }
    }

    // RENDER LOOP

    function animate() {

        requestAnimationFrame( animate );

        render();
        stats.update();

    }

    function render() {

        if ( isCtrlDown ) {

            theta += mouse2D.x * 1.5;

        }

        raycaster = projector.pickingRay( mouse2D.clone(), camera );

        var intersects = raycaster.intersectObjects( objects );

        if ( intersects.length > 0 ) {

            intersector = getRealIntersector( intersects );

            if ( intersector ) {

                setVoxelPosition( intersector );
                rollOverMesh.position.copy( voxelPosition );
            }

        }

        camera.position.x = 1400 * Math.sin( THREE.Math.degToRad( theta ) );
        camera.position.z = 1400 * Math.cos( THREE.Math.degToRad( theta ) );

        camera.lookAt( scene.position );

        renderer.render( scene, camera );

    }

});