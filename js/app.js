/**
 * init getUserMedia
 * init THREE.js scene
 * init WebWorker
 * --> init camera matrix
 * 
 * function updateScene()
 * --> function addItem()
 * --> function removeItem()
 *
 * process()
 * render() 
 *
 *
 * handle resize
 * 
 **/

const settings = {
    autoRotate: {
        x: 0,
        y: 0.01,
        z: 0,
    }
}

const interpolationFactor = 2;

let trackedMatrix = {
    // for interpolation
    delta: [
        0,0,0,0,
        0,0,0,0,
        0,0,0,0,
        0,0,0,0
    ],
    interpolated: [
        0,0,0,0,
        0,0,0,0,
        0,0,0,0,
        0,0,0,0        
    ]
}



let autoRotate;

let ARObjects = {}
let currentMarkerId = undefined;

let stats = {}


let video = document.getElementById( 'video' );

let renderer;
let camera;
let root;

let canvas_process = document.createElement( 'canvas' );
let context_process = canvas_process.getContext( '2d' );

let vw, vh;
let sw, sh;
let pscale, sscale;
let w, h;
let pw, ph;
let ox, oy;
let worker;


let init = function() {
    initStats();
    initScene();
    initUserMedia();
}

let initUserMedia = function() {
    if( !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia ) {
        return false;
    }

    let hint = {
        audio: false,
        video: true
    };

    if( window.innerWidth < 800 ) {
        let videoWidth = ( window.innerWidth < window.innerHeight ) ? 240 : 360;
        let videoHeight = ( window.innerWidth < window.innerHeight ) ? 360 : 240;

        console.log( videoWidth, videoHeight );

        hint = {
            audio: false,
            video: {
                facingMode: 'environment',                
                width: { min: videoWidth, max: videoWidth }
            },
        };

        console.log( hint );        
    }
    
    navigator.mediaDevices.getUserMedia( hint )
        .then( function( stream ) {
            video.addEventListener( 'loadedmetadata', () => {
                video.play();

                console.log( 'video', video, video.videoWidth, video.videoHeight );

                initTracking();

                tick();
                process();
            } );

            video.srcObject = stream;            
    } );
}

let initScene = function() {
    /**
     * RENDERER
     */
    renderer = new THREE.WebGLRenderer( { 
        alpha: true, 
        antialias: true 
    } );
    
    renderer.setPixelRatio( window.devicePixelRatio );

    renderer.domElement.setAttribute( 'id', 'canvas' );
    document.getElementById( 'app' ).appendChild( renderer.domElement );

    
/**
 * SCENE
 */
    let scene = new THREE.Scene();

    window.scene = scene;
    window.THREE = THREE;


/**
 * LIGHTS
 */
    const light = new THREE.AmbientLight( 0xaaaaaa );
    scene.add( light );


    const light2 = new THREE.PointLight( 0xdddddd );
    light2.position.set( 10, 10, 10 );
    scene.add( light2 ); 


    const light3 = new THREE.PointLight( 0xdddddd );
    light3.position.set( -10, 10, -10 );
    scene.add( light3 ); 


    const light4 = new THREE.PointLight( 0xeeeeee );
    light4.position.set( 12, 8, 20 );
    scene.add( light4 ); 

    
/**
 * CAMERA
 */    
    camera = new THREE.Camera();
    camera.matrixAutoUpdate = false;
    scene.add( camera );

    
/**
 * ROOT
 */    
    root = new THREE.Object3D();
    root.matrixAutoUpdate = false;
    
    scene.add( root );    


/**
 * OBJECT
 */     

    let ARVideo = document.getElementById( 'arvideo' );
    let texture = new THREE.VideoTexture( ARVideo );

    ARVideo.play();

    let material = new THREE.MeshStandardMaterial( { 
        color: 0xffffff,
        roughness: 0.4,
        metalness: 0.8,
        map: texture         
    } );


    let geometry = new THREE.IcosahedronBufferGeometry( 1, 0 );
    geometry.center();

    // Object 1
    let _material = material.clone();
    _material.color = new THREE.Color( 0xff0000 );

    console.log( _material ); 
    let object = new THREE.Mesh( geometry, _material ); 
    // object.id = 33;
    object.position.x = 0;
    object.position.y = 0;
    object.position.z = 1;

    ARObjects[33] = object;
    root.add( ARObjects[33] );



    // Object 2
    _material = material.clone();
    _material.color = new THREE.Color( 0xffff00 );

    console.log( _material ); 
    object = new THREE.Mesh( geometry, _material ); 
    // object.id = 33;
    object.position.x = 0;
    object.position.y = 0;
    object.position.z = 1;

    ARObjects[34] = object;
    root.add( ARObjects[34] );



    // Object 3
    _material = material.clone();
    _material.color = new THREE.Color( 0x00ffff );

    console.log( _material ); 
    object = new THREE.Mesh( geometry, _material ); 
    // object.id = 33;
    object.position.x = 0;
    object.position.y = 0;
    object.position.z = 1;

    ARObjects[0] = object;
    root.add( ARObjects[0] ); 




    // Object 4
    _material = material.clone();
    _material.color = new THREE.Color( 0x00ff00 );

    console.log( _material ); 
    object = new THREE.Mesh( geometry, _material ); 
    // object.id = 33;
    object.position.x = 0;
    object.position.y = 0;
    object.position.z = 1;

    ARObjects[3] = object;
    root.add( ARObjects[3] );     
}

let initTracking = function() {
    vw = video.videoWidth;
    vh = video.videoHeight;

    pscale = 1;
    sscale = 1;

    sw = vw * sscale;
    sh = vh * sscale;

    renderer.domElement.width = sw;
    renderer.domElement.height = sh;
    w = vw * pscale;
    h = vh * pscale;
    pw = Math.max( w, h / 3 * 4 );
    ph = Math.max( h, w / 4 * 3 );
    ox = ( pw - w ) / 2;
    oy = ( ph - h ) / 2;


    canvas_process.width = pw;
    canvas_process.height = ph;


    renderer.setSize( sw, sh );


    console.table( [
        ['vw', vw],
        ['vh', vh],
        ['pscale', pscale],
        ['sscale', sscale],
        ['sw', sw],
        ['sh', sh],
        ['w', w],
        ['h', h],
        ['pw', pw],
        ['ph', ph],
        ['ox', oy]
    ] );




    // service worker
    worker = new Worker( 'js/worker.js' );

    worker.postMessage( { 
        type: 'load', 
        pw: pw, 
        ph: ph
    } );

    worker.onmessage = ( event ) => {
        let data = event.data; 

        switch( data.type ) {
            case 'loaded': {                    
                let proj = JSON.parse( data.proj );
                let ratioW = pw / w;
                let ratioH = ph / h;
                
                proj[0] *= ratioW;
                proj[4] *= ratioW;
                proj[8] *= ratioW;
                proj[12] *= ratioW;
                proj[1] *= ratioH;
                proj[5] *= ratioH;
                proj[9] *= ratioH;
                proj[13] *= ratioH;
                
                // set camera matrix to detected 'projection' matrix
                setMatrix( camera.projectionMatrix, proj );

                document.body.classList.remove( 'loading' );
                
                break;
            }

            case 'found': {
                found( data );
                
                break;
            }

            case 'not found': {
                found( null );
                
                break;
            }
        }
        
        /**
         * Callback
         */
        if( stats['worker'] ) {
            stats['worker'].update();
        }
        
        process();
    };
}

let initStats = function() {
    stats['main'] = new Stats();
    stats['main'].showPanel( 0 );
    document.getElementById( 'stats1' ).appendChild( stats['main'].dom );

    stats['worker'] = new Stats();
    stats['worker'].showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.getElementById( 'stats2' ).appendChild( stats['worker'].dom );    
}


    
let world;


let found = function( data ) {
    if( !data ) {
        console.log( 'not found' );

        world = null;
        currentMarkerId = undefined;
    } else {
        console.log( 'found', data.markerId );

        world = JSON.parse( data.matrixGL_RH );
        currentMarkerId = data.markerId;
    }
};



/** 
 * Renders the THREE.js scene
 */
let draw = function() {

    /**
     * Callback 
     */
    if( stats['main'] ) {
        stats['main'].update();
    }
    

    // marker not found
    if( currentMarkerId === undefined ) {
        ARObjects[33].visible = false;
        ARObjects[34].visible = false;
        ARObjects[0].visible = false;
        ARObjects[3].visible = false;

    // marker found            
    } else {
        if( ARObjects[currentMarkerId] ) {
            ARObjects[currentMarkerId].visible = true;
        }

        // interpolate matrix
        for( let i = 0; i < 16; i++ ) { 
            trackedMatrix.delta[i] = world[i] - trackedMatrix.interpolated[i];            
            trackedMatrix.interpolated[i] = trackedMatrix.interpolated[i] + ( trackedMatrix.delta[i] / interpolationFactor );
        }        

        // set matrix of 'root' by detected 'world' matrix
        setMatrix( root.matrix, trackedMatrix.interpolated );

        // autorotate
        ARObjects[33].rotation.y = ARObjects[33].rotation.y + settings.autoRotate.y;
        ARObjects[34].rotation.y = ARObjects[34].rotation.y + settings.autoRotate.y;
        ARObjects[0].rotation.y = ARObjects[0].rotation.y + settings.autoRotate.y;
        ARObjects[3].rotation.y = ARObjects[3].rotation.y + settings.autoRotate.y;
    }

    
    renderer.render( scene, camera );
};



/**
 * This is called on every frame 
 */ 
let process = function() {
    // clear canvas
    context_process.fillStyle = 'black';
    context_process.fillRect( 0, 0, pw, ph );
    
    // draw video to canvas
    context_process.drawImage( video, 0, 0, vw, vh, ox, oy, w, h );

    // send video frame to worker
    let imageData = context_process.getImageData( 0, 0, pw, ph );
    worker.postMessage( 
        { 
            type: 'process', 
            imagedata: imageData 
        }, 
        [ 
            imageData.data.buffer
        ]
    );
}


let tick = function() {
    draw();
    
    requestAnimationFrame( tick );
};




/**
 * Helper function
 */
let setMatrix = function( matrix, value ) {
    let array = [];
    
    for( let key in value ) {
        array[key] = value[key];
    }
    
    if( typeof matrix.elements.set === 'function' ) {
        matrix.elements.set( array );
    } else {
        matrix.elements = [].slice.call( array );
    }
};





init();