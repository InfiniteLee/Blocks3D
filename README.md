Blocks3D
=============

This is a networked 3D voxel painting application. It is based on the three.js example:
http://threejs.org/examples/#webgl_interactive_voxelpainter

It allows for multiple users (represented as a client running in a single tab) to cooperatively create voxel paintings together in multiple rooms.

The code is setup to easily be run on a single machine. With slight modification, it can easily be run on multiple machines (one socketserver, multiple clients), however its current state is primarly for demonstration. It is very easy to run though!

Setup:

1. Install latest node.js
2. run "npm install" in Blocks3D directory
3. run the standalone node webserver "node webserver.js" 
(this just makes it easier to run the client without having to install and setup anything else)
4. run the socket server "node server/socketserver.js"
5. open "http://localhost:8080/client" in several tabs in chrome
6. click around in each tab, open/close tabs, see what happens!