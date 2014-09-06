/**
 * @author Kevin Lee
 *
 * Module that represents a World. It keeps references to all voxels for easy search
 * and removal. It is designed to be used by both the client and the server for
 * maximum parity. 
 */

var World = function () {

    var voxelMap = {};

    var helperMap = {};

    function addVoxel(voxel, position, color) {

        var key = createKey(position);
        if (voxelMap.hasOwnProperty[key]) {
            return false;
        }

        voxelMap[key] = {
            voxel: voxel,
            position: position,
            color: color
        };

        return true;
    }

    function getVoxel(key) {
        if (voxelMap.hasOwnProperty(key)) {
            return voxelMap[key].voxel;
        } else {
            return null;
        }
    }

    function getVoxelColor(key) {
        if (voxelMap.hasOwnProperty(key)) {
            return voxelMap[key].color;
        } else {
            return null;
        }
    }

    function removeVoxel(key) {
        if (voxelMap.hasOwnProperty(key)) {
            delete voxelMap[key];
            return true;
        }
        return false;
    }

    function createKey(position) {
        return position.x + '_' + position.y + '_' + position.z;
    }

    function hasVoxel(position) {
        var key = createKey(position);
        if (voxelMap.hasOwnProperty(key)) {
            return true;
        }
        return false;
    }

    function getWorld() {
        return Object.keys(voxelMap).map(function (key) {
            return {color: voxelMap[key].color, position: voxelMap[key].position};
        });
    }

    function addHelper(id, helper) {
        if (!helperMap.hasOwnProperty(id)) {
            helperMap[id] = helper;
            return true;
        }
        return false;
    }

    function getHelper(id) {
        if (helperMap.hasOwnProperty(id)) {
            return helperMap[id];
        }
        return null;
    }

    function removeHelper(id) {
        if (helperMap.hasOwnProperty(id)) {
            delete helperMap[id];
            return true;
        }
        return false;
    }

    function destroyWorld() {
        voxelMap = {};
        helperMap = {};
    }

    return {
        addVoxel: addVoxel,
        getVoxel: getVoxel,
        hasVoxel: hasVoxel,
        getVoxelColor: getVoxelColor,
        removeVoxel: removeVoxel,
        createKey: createKey,
        getWorld: getWorld,
        addHelper: addHelper,
        getHelper: getHelper,
        removeHelper: removeHelper,
        destroyWorld: destroyWorld
    };

};

//export for node.js
if (typeof exports !== 'undefined') {
    module.exports = World;
}
