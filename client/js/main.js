requirejs.config({
    baseUrl: 'js/lib',
    shim: {
        'app/VoxelFactory': {
            deps:['three.min']
        },
    },
    paths: {
        app: '../app',
        shared: '../../../shared/js',
    }
});

require(['three.min', 'stats.min', 'app/Detector', 'app/VoxelFactory', 'shared/World'], function() {

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

    var colorList, color;

    var helpers;

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
        info.innerHTML = 'Blocks 3D - Multiplayer Voxel Painter<br>based on: <a href="http://threejs.org" target="_blank">three.js</a> - voxel painter - webgl<br><strong>click</strong>: add voxel, <strong>shift + click</strong>: remove voxel, <strong>control</strong>: rotate';
        container.appendChild( info );

        camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
        camera.position.y = 800;

        scene = new THREE.Scene();

        // roll-over helpers
        
        var index = Math.floor((Math.random() * colorList.length));
        color = colorList[index];

        rollOverMesh = VoxelFactory.createHelperVoxel(color);
        scene.add( rollOverMesh );

        // picking

        projector = new THREE.Projector();

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

        mouse2D = new THREE.Vector3( 0, 10000, 0.5 );

        // Lights

        var ambientLight = new THREE.AmbientLight( 0x606060 );
        scene.add( ambientLight );

        var directionalLight = new THREE.DirectionalLight( 0xffffff );
        directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
        scene.add( directionalLight );

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

        //

        window.addEventListener( 'resize', onWindowResize, false );

        socket = io('http://localhost:1337');

        createSocketListeners();

        setInterval(function () {
            socket.emit('helper_update', {position:voxelPosition, color:color});
        }, 1000);
    }

    function createSocketListeners() {

        socket.on('connection_info', onConnectionInfo)
        socket.on('add_voxel', onAddVoxel);
        socket.on('remove_voxel', onRemoveVoxel);
        socket.on('helper_update', onHelperUpdate);
        socket.on('disconnect', onDisconnect)
    }

    function onWindowResize() {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth, window.innerHeight );

    }

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
                    var key = World.createKey(position);
                    socket.emit('remove_voxel', {key:key});
                }

            // create cube
            } else {
                intersector = getRealIntersector( intersects );
                setVoxelPosition( intersector );
                socket.emit('add_voxel', {position:voxelPosition, color:color});
            }
        }
    }

    function onConnectionInfo(data) {
        socketId = data.id;

        data.world.forEach(function (voxel) {
            addVoxel(voxel.color, voxel.position);
        });
    }

    function onAddVoxel(data) {
        addVoxel(data.color, data.position);
    }

    function addVoxel(color, position) {
        var voxel = VoxelFactory.createVoxel(color, position);

        scene.add( voxel );
        objects.push(voxel);

        World.addVoxel(voxel, position, color);
        //TODO: add voxel immediately and handle if server says otherwise later
    }

    function onRemoveVoxel(data) {

        var voxel = World.getVoxel(data.key);

        if (voxel) {
            scene.remove( voxel );
            objects.splice( objects.indexOf( voxel ), 1 );
            World.removeVoxel(data.key);
        }  
    }

    function onHelperUpdate(data) {

        if (data.id === socketId) {
            return;
        }

        var helper = World.getHelper(data.id);
        if (!helper) {
            helper = VoxelFactory.createHelperVoxel(data.color);
            helper.matrixAutoUpdate = false;
            World.addHelper(data.id, helper);

            scene.add(helper);
        }

        helper.position.copy( data.position );
        helper.updateMatrix();
        
    }

    function onDisconnect(data) {
        var helper = World.getHelper(data.id);
        if (helper) {
            scene.remove(helper);
            World.removeHelper(data.id);
        }
    }

    function onDocumentKeyDown( event ) {

        switch( event.keyCode ) {

            case 16: isShiftDown = true; break;
            case 17: isCtrlDown = true; break;

        }

    }

    function onDocumentKeyUp( event ) {

        switch ( event.keyCode ) {

            case 16: isShiftDown = false; break;
            case 17: isCtrlDown = false; break;

        }

    }

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