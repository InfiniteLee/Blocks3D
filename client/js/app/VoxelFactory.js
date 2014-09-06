/**
 * @author Kevin Lee
 *
 * A factory that creates Voxels.
 */

var VoxelFactory = function () {

    var cubeMaterials = {};
    
    var cubeGeo = new THREE.BoxGeometry( 50, 50, 50 );
    
    function createVoxel(color, position) {
        if (!hasMaterial(color)) {
            createNewMaterial(color);
        }

        var voxel = createNewMesh(color);

        voxel.position.copy( position );
        voxel.matrixAutoUpdate = false;
        voxel.updateMatrix();
        
        return voxel;
    };

    function hasMaterial(color) {
        return cubeMaterials.hasOwnProperty(color);
    }

    function createNewMaterial(color) {
        var parsedColor = parseInt(color);
        cubeMaterials[color] = new THREE.MeshLambertMaterial( { color: parsedColor, ambient: 0xFFFFFF, shading: THREE.FlatShading } );
    }

    function createNewMesh(color) {
        return new THREE.Mesh( cubeGeo, cubeMaterials[color] );
    }

    return {
        _hasMaterial: hasMaterial,
        _cubeMaterials: cubeMaterials,
        _createNewMesh: createNewMesh,
        createVoxel: createVoxel
    };

};
