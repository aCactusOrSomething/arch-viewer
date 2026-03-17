// for now, this code is based on https://github.com/mcneel/rhino-developer-samples/blob/8/rhino3dm/js/SampleViewer/01_basic/script.js

import rhino3dm, { RhinoModule } from 'rhino3dm';
import wasmUrl from 'rhino3dm/rhino3dm.wasm?url'
const file = '/models/hello_mesh.3dm'

export async function load3dm() {
    //wait until the rhino3dm library is loaded, then load the 3dm file
    const rhino = await (rhino3dm as any)({
        locateFile: (_file: string) => wasmUrl
    }) as RhinoModule;
    console.log('Loaded rhino3dm...');

    let res = await fetch(file);

    let buffer = await res.arrayBuffer();
    let arr = new Uint8Array(buffer);
    let doc = rhino.File3dm.fromByteArray(arr);

    let objects = doc.objects();
    for (let i = 0; i < objects.count; i++) {
        let mesh = objects.get(i).geometry();
        if (mesh instanceof rhino.Mesh) {
            // eventually this converts the meshes into a compatible format
            // but for now, i just want to print the files themselves.
            console.log(mesh.toThreejsJSON())
        }
    }
}
