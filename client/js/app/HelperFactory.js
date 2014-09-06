/**
 * @author Kevin Lee
 *
 * A factory that creates Helper Voxels. Extends VoxelFactory.
 */


var HelperFactory = function () {

	var myVoxelFactory = VoxelFactory();

	myVoxelFactory.createVoxel = function(color) {
        if (!myVoxelFactory._hasMaterial(color)) {
            var parsedColor = parseInt(color);
            myVoxelFactory._cubeMaterials[color] = new THREE.MeshBasicMaterial( { color: parsedColor, opacity: 0.25, transparent: true } );
        }

        return myVoxelFactory._createNewMesh(color);
    };

    return myVoxelFactory;

};
