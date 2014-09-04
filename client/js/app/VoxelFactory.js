var VoxelFactory = (function () {

    var cubeMaterials = {};
    var helperCubeMaterials = {};

    var cubeGeo = new THREE.BoxGeometry( 50, 50, 50 );

    var rollOverGeo = new THREE.BoxGeometry( 50, 50, 50 );

    function createVoxel(color, position) {
        if (!cubeMaterials.hasOwnProperty(color)) {
            var parsedColor = parseInt(color);
            cubeMaterials[color] = new THREE.MeshLambertMaterial( { color: parsedColor, ambient: 0xFFFFFF, shading: THREE.FlatShading } );
        }

        var voxel = new THREE.Mesh( cubeGeo, cubeMaterials[color] );

        voxel.position.copy( position );
        voxel.matrixAutoUpdate = false;
        voxel.updateMatrix();
        
        return voxel;
    };

    function createHelperVoxel(color) {
        if (!helperCubeMaterials.hasOwnProperty(color)) {
            var parsedColor = parseInt(color);
            helperCubeMaterials[color] = new THREE.MeshBasicMaterial( { color: parsedColor, opacity: 0.25, transparent: true } );
        }

        return new THREE.Mesh( rollOverGeo, helperCubeMaterials[color] );
    };


    return {
        createVoxel : createVoxel,
        createHelperVoxel : createHelperVoxel
    };

})();
