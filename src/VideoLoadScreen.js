import React, { Component, createRef} from "react";
import { average, getStandardDeviation, dividebyValue, areaPolygon, normalizeArray} from "./utils";
// import { videoProcess } from "./videoProcess";
import  "./VideoLoadScreen.css";

import ShowResults from "./ShowResults.js"

import TimelinePlugin from "wavesurfer.js/dist/plugin/wavesurfer.timeline.min.js";
import CursorPlugin from "wavesurfer.js/dist/plugin/wavesurfer.cursor.min.js";
import RegionsPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.regions.min.js';
import MiniMapPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.minimap.min.js';
// import { wait } from "@testing-library/user-event/dist/utils";
// import { toHaveStyle } from "@testing-library/jest-dom/dist/matchers";
// import { TbRectangle } from "react-icons/tb";
// import CustomWavesurfer from "./CustomWaveSurfer";
// import '@mediapipe/pose';


// import * as poseDetection from '@tensorflow-models/pose-detection'
// import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
// import '@tensorflow/tfjs-backend-webgl';
//import { toHaveDisplayValue, toHaveStyle } from "@testing-library/jest-dom/dist/matchers";
//import { toHaveStyle } from "@testing-library/jest-dom/dist/matchers";

// import * as facemesh from "@mediapipe/face_mesh";


import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-backend-webgl';



const WaveSurfer = require("wavesurfer.js");


// const pixelmatch = require('pixelmatch');

//index of face parts
const rightEyebrow = [276, 283, 282, 295, 285, 300, 293,  334, 296]
const leftEyebrow = [46, 53, 52, 65, 55, 70, 63, 105, 66, 107]
const rightCanthus = [173,133,155,243]
const leftCanthus = [362,382,398,463]
const noseTip = [44,1,274]
const centerLowerLip = [84,17,314]
const centerJaw = [148,152,377]
const lipsInner = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324,318,402,317,14,87,178,88,95]
const rightEye = [[33, 133], [160, 144], [159, 145], [158, 153]]
const leftEye = [[263, 362], [387, 373], [386, 374], [385, 380]] 


class VideoLoadScreen extends Component {
    constructor(props) {
        super(props);
        this.state = {
            videoWidth : '50%',
            mouseDown : false,
            rectangle : null,
            cancelled : false,
            showResults : false,
            fileName : null,
        }


        this.waveSurferRef = createRef();
        this.waveFormRef = createRef();
        this.timeLineRef = createRef();
        this.miniMapRef = createRef();
        this.videoRef = createRef();
        this.figureRef = createRef();
        this.canvasRef = createRef();
        this.canvasRefA = createRef();
        this.canvasRefB = createRef();

        //this.secondVideoRef = createRef()

        this.loadButtonTag = createRef();
        this.processVideoButtonTag =  createRef();


        this.inputFile = createRef();

        //buttons
        this.previousFrame = createRef();
        this.previousFrame_5 = createRef();
        this.playVideo = createRef();
        this.nextFrame = createRef();
        this.nextFrame_5 = createRef();
        this.removeButtonTag = createRef()
        this.checkboxRef = createRef();

        //variables 
        this.mouseDown = false;
        this.startX = null;
        this.startY = null;
        this.endWidth = null;
        this.endHeight = null;

        // management of regions
        this.regions = [];
        this.currentRegion = 0;
        this.processVideos = false
        this.coordsVideo = [];
        this.flipHorizontal = true; // defines if video will be flipped -- expected value: true | if false, then estimated handiness will be incorrect and must be corrected manually

        // finding the frame rate
        this.previousTime = 0; 
        this.previousFrame = 0
        this.frameCounter = 0; 
        this.arrayFrameRate = [ ]; // array that holds the frame rate estimates
        this.estimatedFrameRate = 0; // variable that holds the estimated frame rate

        //webworker
        //this.webWorker = null; // this variable will hold the webWorker
        //this.workerModelIsReady = false; // this variable will hold the status of the workerModelIsReady
        this.poseModelReady = false;
        this.handsModelReady = false;

        //models 
        this.poseDetector = null; //
        this.handsDetector = null; //
        this.faceLandmarksDetector= null;  // 

        this.distanceNoseLoweLip = []
        this.distanceNoseLeftEyebrow = []
        this.distanceNoseRightEyebrow = []
        this.distanceEyeCanthus = []

        // this.distances = [{  areaMouth : [],
        //                     distanceNoseLowerLip : [],
        //                     distanceNoseJaw : [],
        //                     distanceNoseLeftEyebrow : [],
        //                     distanceNoseRightEyebrow : [],    
        //                     distanceEyeCanthus : [],
        //                     timeStamp : []
        //                 }]
        // this.landmarks = [{
        //                     landmarks : [],
        //                     timeStamp: []
        //                 }]

        this.distances = []
        this.landmarks = []

        // //this variable will store the estimated distnace between thumb and index 
        // this.distanceThumbIndex = [{leftDistance : [ ],
        //                            leftTimeStamp : [ ],
        //                            rightDistance : [ ],
        //                            rightTimeStamp : [ ]}, 
        //                            {leftDistance : [ ],
        //                             leftTimeStamp : [ ],
        //                             rightDistance : [ ],
        //                             rightTimeStamp : [ ]}, 
        //                         ]


        // //this variable will store the landmarks for each region, there are at most two regions                           
        // this.landmarks  = [{landmarksRight : [],
        //                    timeStampRight : [],
        //                    landmarksLeft : [],
        //                    timeStampLeft : [],}, 
        //                    {landmarksRight : [],
        //                    timeStampRight : [],
        //                    landmarksLeft : [],
        //                    timeStampLeft : [],}]

    }

    componentDidMount = () => {
        document.addEventListener('resize', this.handleResize);
        document.addEventListener('keydown', this.handleKeyPress);

        this.waveSurferRef.current =  WaveSurfer.create({
            barWidth: 1,
            cursorWidth: 1,
            container: this.waveFormRef.current,
            backend: "MediaElement",
            height: 100,
            progressColor: "#4a74a5",//'transparent',//"#4a74a5", //initially transparent to hide the fps estimation
            responsive: true,
            mergeTracks: true,
            //splitChannels: true,
            waveColor:  "#ccc",
            cursorColor: "#4a74a5",//'transparent',//"#4a74a5", //initially transparent to hide the fps estimation
            normalize: true,
            scrollParent: true,
            zoom : true,
            plugins: [
              RegionsPlugin.create({
                regions: this.state.rows, //this.regions,
                dragSelection: {
                  slop: 5
                },
                color: "rgba(197, 180, 227, .25)",
                loop: false,
              }),
                TimelinePlugin.create({
                    wavesurfer: this.waveSurferRef.current,
                    container: this.timeLineRef.current,
                    height: 20,
                    notchWidth: 1,
                    notchMargin: 0.5,
                    notchOffset: 0.5,   
                    timeInterval: 2,
                }),
                CursorPlugin.create({
                    showTime: true,
                    showTimePosition: true,
                    showCursor: true,
                    opacity: 1,
                }),
                MiniMapPlugin.create({ 
                    wavesurfer: this.waveSurferRef.current,
                    container: this.miniMapRef.current,
                    waveColor: '#777',
                    progressColor: '#222',
                    height: 20
                }),
            ]
          });
        

          // define canvas context 
          this.ctx = this.canvasRef.current.getContext('2d',{willReadFrequently:true});
          this.ctx.strokeStyle = "red";
          this.ctx.lineWidth = 2;

          // create a way to remove regions by double click and prevent more than two regions
          this.waveSurferRef.current.on('region-dblclick', this.handleRegionDoubleClick)   
        //   this.waveSurferRef.current.on('region-created', this.handleRegionCreated)

        //   // mount the worker that will process the data +
        //   if (this.webWorker === null) {
        //     console.log('mounting worker')
        //     this.handleMountWorker()
        //   }

        this.handleLoadHandsModels()


    }

    handleLoadHandsModels = async() =>{
        //hand model is always loaded
        this.loadButtonTag.current.disabled = true
        this.canvasRefA.current.height = 240;
        this.canvasRefA.current.width = 240;
        var ctx = this.canvasRefA.current.getContext('2d',{willReadFrequently:true});
        const imageData = ctx.getImageData(0,0,this.canvasRefA.current.width, this.canvasRefA.current.height)


        
        const detectorConfig = {
            runtime: 'tfjs',
            //runtime: 'mediapipe',
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
            refineLandmarks: true

            }
        this.faceLandmarksDetector = await faceLandmarksDetection.createDetector(faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh, detectorConfig);
        //warm up the model
        const hands = await this.faceLandmarksDetector.estimateFaces(imageData)

        console.log('Hands Model Ready')
        this.loadButtonTag.current.disabled = false


        // const config = {
        //     locateFile: (file) => {
        //       return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${facemesh.VERSION}/${file}`
        //     }
        //   }
        
        
        // const solutionOptions = {
        //     selfieMode: true,
        //     enableFaceGeometry: true,
        //     maxNumFaces: 1,
        //     refineLandmarks: true,
        //     minDetectionConfidence: 0.5,
        //     minTrackingConfidence: 0.5
        //   }
          
          
          
        //   console.log('1')
        //   this.faceMesh = new facemesh.FaceMesh(config);
        //   console.log('2')
        //   this.faceMesh.setOptions(solutionOptions);
        //   console.log('3')
        // //   this.faceMesh.onResults(()=>{})
        //   this.faceMesh.onResults(this.faceMeshResults)
        //   console.log('4')
        //   await this.faceMesh.send({image: ImageData})
        //   console.log('5')



        // console.log('Model Ready')
        // this.loadButtonTag.current.disabled = false
          

    }


    // handleMountWorker = () => {

    //     // here we declare a sharedWorker. The worker should have been initialized by the parent component. This will link this
    //     // code to that worker and allow the code to use it. If the parent didn't initialize the SharedWorker, then it will be initialized here
    //     // this.webWorker = new window.Worker(new URL("/workers/runningModel_worker.js", import.meta.url), { type: "module" })
    //     // this.webWorker = new window.Worker(new URL("/workers/runningModel_worker.js", import.meta.url))
    //     this.webWorker = new window.Worker(new URL("/public/runningTensorFlowModel_worker.js", import.meta.url))
    //     this.webWorker.onerror = function(event) {
    //         console.log('There is an error with your worker!', event);
    //       }
    //     // create a connection (port) with the SharedWorker so that we can send work to it
    //     // this.webWorker.port.start();
    //     // ask the worker to load the model
        
    //     this.webWorker.postMessage({msg: 'init'})
        
    //     this.webWorker.onmessage = (event) => {
 
    //         if ((event.data.poseModelReady) && (event.data.handsModelReady)){
    //             this.poseModelReady = true;
    //             this.handsModelReady = true;
    //         }


    //     }
        
    // }

    handleLoadedData = () =>{

        this.videoRef.current.play();
        this.videoRef.current.requestVideoFrameCallback(this.findFrameRate)
        // 
    }

    handleRegionDoubleClick = (region) => {
        //remove the region when double click on it :->
        this.waveSurferRef.current.regions.list[region.id].remove()
        console.log(this.waveSurferRef.current.regions.list)
    }

    // handleRegionCreated = (region) => {
    //     // if there are more than two regions, then prevent more regions from being added
    //     let regions = this.waveSurferRef.current.regions.list;
    //     let keys = Object.keys(regions)
    //     if (keys.length >= 1) {
    //         // regions[keys[0]].remove()
    //         alert("You can only create one regions")
    //         region.remove()
    //     }

    // }

    componentWillUnmount = () => {
        window.addEventListener('beforeunload', (event) => {
            event.preventDefault();
            document.removeEventListener('keydown', this.handleKeyPress);
            window.removeEventListener('resize', this.handleResize);
            this.webWorker.terminate();
            console.log('unmounting')
       })
    }

    handleResize = () => {
        // Handle resize of waveform when window is changed 
        this.waveSurferRef.current.drawer.containerWidth = this.waveSurferRef.current.container.clientWidth;
        this.waveSurferRef.current.drawBuffer();
    }

    handleKeyPress = (event) => {
        // Handle key press
        switch (event.key) {
            case 'ArrowLeft':
                if (event.shiftKey) {
                    // Shift + ArrowLeft
                    this.handleMoveBackward(5)
                } else {
                    // ArrowLeft
                    this.handleMoveBackward(1)
                }
                break;
            case 'ArrowRight':
                if (event.shiftKey) {
                    // Shift + ArrowLeft
                    this.handleMoveForward(5)
                } else {
                    // ArrowLeft
                    this.handleMoveForward(1)
                }
                break;
            default:
                break;
        }

    }

    handleClick = (event) => {
        switch (event.target.value) {
            case 'previousFrame':
                this.handleMoveBackward(1)  
                break;
            case 'previousFrame_5':
                this.handleMoveBackward(5);
                break;
            case 'nextFrame':                 
                this.handleMoveForward(1);
                break;
            case 'nextFrame_5':
                this.handleMoveForward(5);
                break;
            case 'Play':
                if(this.playVideo.current.textContent === 'Play')  {
                    this.handlePlay()
                } else {
                    this.handlePause()
                }
                break;
            case 'load':
                this.inputFile.current.click();
                break;
            case 'processVideo':
                if (this.processVideoButtonTag.current.innerHTML === 'Process'){

                    this.processVideoButtonTag.current.innerHTML = 'Cancel'
                    this.handlePause()
                    this.handleProcessVideo();

                } else {
                    // cancel
                    
                    this.setState({cancelled: true},
                        () => {
                        this.processVideoButtonTag.current.innerHTML = 'Process'
                    })
                }
                

                break;
            case 'remove':
                this.mouseDown = false;
                this.startX = null;
                this.startY = null;
                this.endWidth = null;
                this.endHeight = null;
                this.setState({rectangle:null})
                this.ctx.clearRect(0,0,this.canvasRef.current.width, this.canvasRef.current.height)
                this.removeButtonTag.current.style.visibility = 'hidden';
                break;
            default:
                break;
        }
    }

    handleMoveBackward = (nFrames) => {
        // Move video backward
        if(this.videoRef.current !== null) {
            if ( this.estimatedFrameRate > 0) {
                const proposedTime = this.videoRef.current.currentTime - nFrames/this.estimatedFrameRate;
                if (proposedTime >= 0) {
                    this.handlePause();
                    this.videoRef.current.currentTime = proposedTime;
                } else {
                    this.handlePause();
                    this.videoRef.current.currentTime = 0;
                }
            }
        }
    }

    handleMoveForward = (nFrames) => {
        // Move video forward
        if(this.videoRef.current !== null) {
            if ( this.estimatedFrameRate > 0) {
                const proposedTime = this.videoRef.current.currentTime + nFrames/this.estimatedFrameRate;
                if (proposedTime <= this.videoRef.current.duration) {
                    this.handlePause();
                    this.videoRef.current.currentTime = proposedTime;
                } else {
                    this.handlePause();
                    this.videoRef.current.currentTime = this.duration;
                }
            }
        }
    }

    handlePause = () => {
        this.videoRef.current.pause();
        this.playVideo.current.textContent = 'Play';
    }

    handlePlay = () => {
        this.videoRef.current.play();
        this.playVideo.current.textContent = 'Pause';     
    }

    handleZoomChange = (event) => {
        this.setState({
            videoWidth: event.target.value
        })
    }

    fileUpload = (event) => {
        const file = event.target.files[0];

        let reader = new FileReader();
        reader.onload = (e) => {
            this.videoRef.current.src = e.target.result;
        }

        reader.onloadstart = (e) => {
            //this.videoRef.current.poster = 'loading-gif2.gif'
            this.loadButtonTag.current.disabled = true;
            this.processVideoButtonTag.current.disabled = true;
            this.playVideo.current.disabled = true;
            
        }
        // reader.onprogress = function(event) {
        //     if (event.lengthComputable) {
        //         if (LoadingBarVisible)
        //             ShowLoadingBar();
        //         AddProgress();
        //     }
        // };
        reader.onloadend = (e) => {  
           this.waveSurferRef.current.load(this.videoRef.current);
           this.waveSurferRef.current.clearRegions()
           this.removeButtonTag.current.click()
           // this.videoRef.current.setAttribute('controls', 'true')

            this.loadButtonTag.current.disabled = false;
            this.processVideoButtonTag.current.disabled = false;
            this.playVideo.current.disabled = false;
            
        };

        reader.onerror = function(event) {
            alert("Loading Failed\nThis App only supports .webm and .mp4 files.");
            console.log(event.target.error);
        };
        reader.readAsDataURL(file);
        this.setState({fileName : file.name})

    }

    getMousePosition = (event,canvas) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width/rect.width
        const scaleY = canvas.height/rect.height

        return {
            x: (event.clientX - rect.left)*scaleX,
            y: (event.clientY - rect.top)*scaleY
        }
    }

    handleMouseDown = (event) => {
        //get the current mouse position in the canvas if there is no rectangle 
        event.preventDefault();
        event.stopPropagation();

        if (this.state.rectangle == null) {
            this.mouseDown = true
            var pos = this.getMousePosition(event, this.canvasRef.current)
            this.startX = parseInt(pos.x)
            this.startY = parseInt(pos.y)
        }

    }

    handleMouseUp = (event) =>{
        event.preventDefault();
        event.stopPropagation();

        if (this.mouseDown) {
            this.mouseDown = false
            this.ctx.clearRect(0,0,this.canvasRef.current.width, this.canvasRef.current.height)
            //check that the user moved left to right
            var pos = this.getMousePosition(event, this.canvasRef.current)
            if (pos.x > this.startX) {                      
                this.ctx.strokeRect(this.startX, this.startY, this.endWidth,this.endHeight)
                this.setState({rectangle : {x1:this.startX,
                                            y1:this.startY,
                                            x2:this.startX+this.endWidth, 
                                            y2:this.startY+this.endHeight, 
                                            }
                            })

                this.removeButtonTag.current.style.visibility = 'visible'
                this.removeButtonTag.current.style.top = (this.startY/this.canvasRef.current.height)*100 + '%'
                this.removeButtonTag.current.style.left = (this.startX/this.canvasRef.current.width)*100 + '%'
            }
        }       
    }

    handleMouseMove = (event) => {
        event.preventDefault();
        event.stopPropagation();

       if (this.mouseDown){
            var pos = this.getMousePosition(event, this.canvasRef.current)
            const widthRect = parseInt(pos.x) - this.startX
            const heightRect = parseInt(pos.y) - this.startY

            this.ctx.clearRect(0,0,this.canvasRef.current.width, this.canvasRef.current.height)

            this.ctx.strokeRect(this.startX, this.startY, widthRect,heightRect)
            // console.log(parseInt(event.clientX - this.offsetX), parseInt(event.clientY - this.offsetY))
            
            this.endWidth = widthRect;
            this.endHeight = heightRect;
        }

    }

    handleProcessVideo = async () =>  {

        this.setState({showResults:false})


        // this.distances = [{  areaMouth : [],
        //                     distanceNoseLowerLip : [],
        //                     distanceNoseJaw : [],
        //                     distanceNoseLeftEyebrow : [],
        //                     distanceNoseRightEyebrow : [],    
        //                     distanceEyeCanthus : [],
        //                     timeStamp : []
        //                 }]
        // this.landmarks = [{
        //                     landmarks : [],
        //                     timeStamp: []
        //                 }]

        this.distances = []
        this.landmarks = []

        //prepare variables to store data

        // prepare at least for one region
        this.distances.push({   areaMouth : [],
                                distanceNoseLowerLip : [],
                                distanceNoseJaw : [],
                                distanceNoseLeftEyebrow : [],
                                distanceNoseRightEyebrow : [],  
                                eyeAspectRatioLeft : [],
                                eyeAspectRatioRight : [],
                                distanceEyeCanthus : [],
                                timeStamp : []
                            })
        this.landmarks.push({
                                landmarks : [],
                                timeStamp: []
                            })
        //add more regions if needed
        for (var i = 1; i < Object.keys(this.waveSurferRef.current.regions.list).length; i++ )
        {
            this.distances.push({   areaMouth : [],
                                    distanceNoseLowerLip : [],
                                    distanceNoseJaw : [],
                                    distanceNoseLeftEyebrow : [],
                                    distanceNoseRightEyebrow : [],   
                                    eyeAspectRatioLeft : [],
                                    eyeAspectRatioRight : [], 
                                    distanceEyeCanthus : [],
                                    timeStamp : []
                                })
            this.landmarks.push({
                                    landmarks : [],
                                    timeStamp: []
                                })
        }

        // only works if there is a video
        this.handlePause()
        if (this.videoRef.current) {
            if (this.state.rectangle !== null) {            
                var x1 = parseInt((this.state.rectangle.x1 / this.canvasRef.current.width) * this.videoRef.current.videoWidth);
                var y1 = parseInt((this.state.rectangle.y1 / this.canvasRef.current.height) * this.videoRef.current.videoHeight);
                var x2 = parseInt((this.state.rectangle.x2 / this.canvasRef.current.width) * this.videoRef.current.videoWidth);
                var y2 = parseInt((this.state.rectangle.y2 / this.canvasRef.current.height) * this.videoRef.current.videoHeight);
            } else {
                var x1 = parseInt(0);
                var y1 = parseInt(0);
                var x2 = parseInt(this.videoRef.current.videoWidth);
                var y2 = parseInt(this.videoRef.current.videoHeight);
            }

            this.coordsVideo = [x1,x2,y1,y2]

            this.regions = []
            this.currentRegion = 0 
            Object.keys(this.waveSurferRef.current.regions.list).forEach((id) => {

                this.regions.push({'start': this.waveSurferRef.current.regions.list[id].start,
                              'end' : this.waveSurferRef.current.regions.list[id].end,
                            })
                        })

            if (this.regions.length === 0) {

                this.regions.push({'start': 0,
                              'end' : this.videoRef.current.duration,
                            })

            }

            this.processVideos = true
            // no cancel
            this.setState({cancelled: false})
            this.currentRegion = 0 

            this.videoRef.current.currentTime = this.regions[this.currentRegion].start;

        }
    }

    // videoFrames = async(now, metadata) => {

    //     var video = this.videoRef.current
    //     var ctxA = this.getFrameImageData(video, this.canvasRefA.current)
    //     const imageData = ctxA.getImageData(0,0,this.canvasRefA.current.width, this.canvasRefA.current.height)
    //     const poses = await this.poseDetector.estimatePoses(imageData)
    //     console.log(poses)
    //     console.log(metadata.mediaTime)
    //     await this.videoRef.current.requestVideoFrameCallback(this.videoFrames)

    // }

    getFrameImageData = (video,canvas) =>{

        
        var heightCanvas = this.coordsVideo[3] - this.coordsVideo[2];
        var widthCanvas = this.coordsVideo[1] - this.coordsVideo[0]
        canvas.height = heightCanvas ;
        canvas.width = widthCanvas;
        var ctx = canvas.getContext('2d',{willReadFrequently:true});
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, this.coordsVideo[0], this.coordsVideo[2] , widthCanvas, heightCanvas, 0, 0, widthCanvas , heightCanvas);
        return ctx
    }

    // getHandLandmarks = async(handCenter, shoulder, ctx) =>{

    //     const distanceHandShoulderX = Math.abs(handCenter[0] - shoulder[0])
    //     const handImageData = ctx.getImageData(Math.round(handCenter[0] - distanceHandShoulderX),
    //                                      Math.round(handCenter[1] - distanceHandShoulderX),
    //                                      Math.round(2*distanceHandShoulderX),                   
    //                                      Math.round(2*distanceHandShoulderX)) 
        
    //     const estimationConfig = {flipHorizontal: true};
    //     const handLandmarks = await this.handsDetector.estimateHands(handImageData, estimationConfig)

    //     return handLandmarks
    // }

    // getDistanceNoseLoweLip = (landmarks, pointA, pointB) => {

    //     function distanceBetweenPoints (pointA, pointB) {
    //         let x = pointA.x - pointB.x;
    //         let y = pointA.y - pointB.y;
    //         let z = pointA.z - pointB.z
    //         return Math.sqrt(x*x + y*y + z*z)
    //     }


    //     const nose = {x:(landmarks[44].x + landmarks[1].x +landmarks[274].x)/3,
    //                   y:(landmarks[44].y + landmarks[1].y +landmarks[274].y)/3,
    //                   z:(landmarks[44].z + landmarks[1].z +landmarks[274].z)/3 
    //                 }
    //     const lowerLip = {x:(landmarks[84].x + landmarks[17].x +landmarks[314].x)/3,
    //                       y:(landmarks[84].y + landmarks[17].y +landmarks[314].y)/3,
    //                       z:(landmarks[84].z + landmarks[17].z +landmarks[314].z)/3 
    //             }
            

    //     return distanceBetweenPoints(nose, lowerLip)
    // }

    getDistanceBetweenPoints = (landmarks, indexPointA, indexPointB) => {
    
        var PointAx = 0
        var PointAy = 0
        var PointAz = 0
        indexPointA.forEach((item) => {
            PointAx += landmarks[item].x 
            PointAy += landmarks[item].y 
            PointAz += landmarks[item].z 
        })
        PointAx = PointAx/indexPointA.length
        PointAy = PointAy/indexPointA.length
        PointAz = PointAz/indexPointA.length


        var PointBx = 0
        var PointBy = 0
        var PointBz = 0
        indexPointB.forEach((item) => {
            PointBx += landmarks[item].x 
            PointBy += landmarks[item].y 
            PointBz += landmarks[item].z 
        })

        PointBx = PointBx/indexPointB.length
        PointBy = PointBy/indexPointB.length
        PointBz = PointBz/indexPointB.length

        let  distance = [PointAx-PointBx, PointAy-PointBy, PointAz-PointBz]

        return Math.sqrt(distance[0]*distance[0] + distance[1]*distance[1] + distance[2]*distance[2])


    }


    getEyeAspectRatio = (landmarks, eye) => {

        let distances = []
        eye.forEach(item => {
            distances.push(this.getDistanceBetweenPoints(landmarks, [item[0]], [item[1]]))
        })

        return (distances[1]+distances[2]+distances[3])/(3*distances[0])

    }

    getPolyArea = (landmarks, polyIndex) => {

        var polygon = []
        polyIndex.forEach(item => {
            polygon.push([landmarks[item].x, landmarks[item].y])
        })

        return areaPolygon(polygon)

    }
    


    // callback that will be activated every time a seeking event ends
    handleSeeked = async(event) => {

        if ((this.processVideos) && !(this.state.cancelled)) {
            //send data to the worker to be processed 
            var video = this.videoRef.current
            var ctxA = this.getFrameImageData(video, this.canvasRefA.current)
            const imageData = ctxA.getImageData(0,0,this.canvasRefA.current.width, this.canvasRefA.current.height)
            //check if the models are ready 

            if (this.faceLandmarksDetector !== null) {
 
                const estimationConfig = {flipHorizontal: this.flipHorizontal};
                const faceLandmarks = await this.faceLandmarksDetector.estimateFaces(imageData, estimationConfig)

                if (faceLandmarks.length == 1) {
                        if (faceLandmarks[0].keypoints){

                            this.distances[this.currentRegion].distanceEyeCanthus.push(this.getDistanceBetweenPoints(faceLandmarks[0].keypoints, rightCanthus, leftCanthus))
                            this.distances[this.currentRegion].distanceNoseJaw.push(this.getDistanceBetweenPoints(faceLandmarks[0].keypoints, noseTip, centerJaw))
                            this.distances[this.currentRegion].distanceNoseLowerLip.push(this.getDistanceBetweenPoints(faceLandmarks[0].keypoints, noseTip, centerLowerLip))
                            this.distances[this.currentRegion].distanceNoseLeftEyebrow.push(this.getDistanceBetweenPoints(faceLandmarks[0].keypoints, noseTip, leftEyebrow))
                            this.distances[this.currentRegion].distanceNoseRightEyebrow.push(this.getDistanceBetweenPoints(faceLandmarks[0].keypoints, noseTip, rightEyebrow))
                            this.distances[this.currentRegion].eyeAspectRatioLeft.push(this.getEyeAspectRatio(faceLandmarks[0].keypoints, leftEye))
                            this.distances[this.currentRegion].eyeAspectRatioRight.push(this.getEyeAspectRatio(faceLandmarks[0].keypoints, rightEye))
                            this.distances[this.currentRegion].areaMouth.push(this.getPolyArea(faceLandmarks[0].keypoints,lipsInner))
                            this.distances[this.currentRegion].timeStamp.push(video.currentTime)

                            this.landmarks[this.currentRegion].landmarks.push(faceLandmarks[0].keypoints)
                            this.landmarks[this.currentRegion].timeStamp.push(faceLandmarks[0].keypoints)

                        }
        
                            
                    }
                }

            var desiredVideoTime = video.currentTime + (1/this.estimatedFrameRate)

            if (desiredVideoTime < video.duration){

                if (desiredVideoTime < this.regions[this.currentRegion].end){

                    video.currentTime = desiredVideoTime
                } else {

                    if (this.currentRegion < this.regions.length - 1) {
                        this.currentRegion++
                        video.currentTime = this.regions[this.currentRegion].start
                    } else {
                        // the process is finished 
                        this.setState({cancelled: true},
                            () => {
                            this.processVideoButtonTag.current.innerHTML = 'Process'
                            this.handleFinishProcessingVideo()
                        })
                    }
                }

            } else {
                // the process is finished 
                this.setState({cancelled: true},
                    () => {
                    this.processVideoButtonTag.current.innerHTML = 'Process'
                    this.handleFinishProcessingVideo()
                }) }
    }

    }

    correctPixelPosition = (x,y) => {
        // provides corrected position of pixel in image
        if (this.flipHorizontal) {
            var newX = this.canvasRefA.current.width-x-1
            var newY = y
        } else {
            var newX = x
            var newY = y
        }

        // correct the position of the selected area
        newX = parseInt((newX + this.coordsVideo[0])/this.videoRef.current.videoWidth* this.canvasRef.current.width)
        newY = parseInt((newY + this.coordsVideo[2])/this.videoRef.current.videoHeight* this.canvasRef.current.height)


        // var x1 = parseInt((this.state.rectangle.x1 / this.canvasRef.current.width) * this.videoRef.current.videoWidth);
        // var y1 = parseInt((this.state.rectangle.y1 / this.canvasRef.current.height) * this.videoRef.current.videoHeight);

        return {'x': newX, 'y': newY}

    }

    handleFinishProcessingVideo = () => {


        // find average intercanthal distance
        // const interCanthalDistance = average(this.distances.distanceEyeCanthus)
        // this.distances.distanceNoseJaw = dividebyValue(this.distances.distanceNoseJaw,interCanthalDistance)
        // this.distances.distanceNoseLeftEyebrow = dividebyValue(this.distances.distanceNoseLeftEyebrow ,interCanthalDistance)
        // this.distances.distanceNoseRightEyebrow = dividebyValue(this.distances.distanceNoseRightEyebrow,interCanthalDistance)
        // this.distances.distanceNoseLowerLip = dividebyValue(this.distances.distanceNoseLowerLip ,interCanthalDistance)
        // this.distances.areaMouth = normalizeArray(this.distances.areaMouth)

        // console.log('landmarks', this.landmarks)
        // console.log('distance', this.distances)

        console.log(this.distances.length)
        this.ctx.clearRect(0, 0, this.canvasRef.current.width, this.canvasRef.current.height);
        if (this.startX !== null) {
            //draw rectangle
            this.ctx.strokeStyle = "red";
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(this.startX, this.startY, this.endWidth,this.endHeight)

        }
        this.setState({showResults:true})

    }

    findFrameRate = (now, metadata) => {

        if (metadata.presentedFrames <= 5) {
            this.previousFrame = metadata.presentedFrames
            this.previousTime = metadata.mediaTime
            this.videoFrameCallbackRef = this.videoRef.current.requestVideoFrameCallback(this.findFrameRate)

        } else {

        const video = this.videoRef.current;
        const currentVideoTime = metadata.mediaTime
        const currentVideoFrame = metadata.presentedFrames



        if (currentVideoTime !== this.previousTime){
            // console.log(1/(currentVideoTime-this.previousTime))
            this.arrayFrameRate.push(Math.abs(currentVideoFrame-this.previousFrame)/Math.abs(currentVideoTime-this.previousTime))
            this.previousTime = currentVideoTime  
            this.previousFrame = currentVideoFrame
        }
        // console.log(metadata.mediaTime, metadata.presentedFrames)
        if ((video.currentTime < video.duration) && (video.currentTime <=  1))
        {
            this.frameCounter++
            this.videoFrameCallbackRef = this.videoRef.current.requestVideoFrameCallback(this.findFrameRate)
            
        } else {

            this.handlePause()
            this.estimatedFrameRate = average(this.arrayFrameRate);
            console.log(this.estimatedFrameRate);
            this.frameCounter = 0;
            video.currentTime = 0;
            video.muted = false;      
        }
        }


    }

    handleMouseDown2 = (event) => {
        //get mouse position in canvas when click
        event.preventDefault();
        event.stopPropagation();
        var pos = this.getMousePosition(event, this.canvasRefA.current)
        console.log(pos)
    }

    handleVideoTimeUpdate = (event) => {
        console.log(this.processVideos)
        if (!this.processVideos) //this function will do something only if the videos are not being processed
        {
            var currentTime = this.videoRef.current.currentTime
            this.landmarks.forEach(item => {
                if (item.landmarksRight.length>0)
                {

                    var difference = item.timeStampRight.map(function(value,index) { return (value - currentTime); }); 
                    console.log(difference)
                    const min = Math.min(...difference);
                    console.log(min)
                    const index = difference.indexOf(min);

                }
            })
            

        }
    }

    updatePositioninVideo = (x,y) => {
        // this function updates the video position once a user click on the plot while pressing V
        this.videoRef.current.currentTime = y
    }

    render () {
        return(
 
            <div className="container">

                <center>

                <div className="figureheader">
                    <input type='file' id='file' ref={this.inputFile} onChange={this.fileUpload} style={{display: 'none'}}/>
                    <button style = {{ width:'25%', minWidth:'200px'}} type="button" value='load' ref={this.loadButtonTag}  onClick={this.handleClick} disabled={false}>Load Video</button>
                </div>

                <div className="zoom-selector">
                    <label htmlFor="zoomselect" style={{marginLeft : '10px'}}>Video Size</label>
                    <select id="zoomselect" defaultValue={'50%'} ref={this.zoomSelect} onChange={this.handleZoomChange}>
                        <option value="100%">100%</option>
                        <option value="90%">90%</option>
                        <option value="80%">80%</option>
                        <option value="70%">70%</option>
                        <option value="60%">60%</option>
                        <option value="50%">50%</option>
                        <option value="40%">40%</option>
                        <option value="30%">30%</option>
                        <option value="20%">20%</option>
                        <option value="10%">10%</option>
                    </select>
                </div>

            

            {/* <div className="video-container"> */}
            <figure className="figure" ref={this.figureRef} style = {{
                            width : this.state.videoWidth,
                        }}>
                <video  preload="auto"
                        //src = {this.props.src}
                        ref = {this.videoRef}
                        autoPlay = {false}
                        loop = {false}
                        onLoadedMetadata = {this.handleLoadedData}
                        // onCanPlay = {this.loadedData}
                        // onLoadedData= {this.loadedData} //what to do once data in avaliable in video
                        onPause = {this.handlePause}
                        onPlay = {this.handlePlay}
                        onSeeked = {this.handleSeeked}
                        // onTimeUpdate= {this.handleVideoTimeUpdate}
                        // onTimeUpdate = {this.handleTimeUpdate}
                /> 
                
                <canvas
                    ref={this.canvasRef}
                    onMouseDown = {this.handleMouseDown}
                    onMouseUp = {this.handleMouseUp}
                    onMouseMove = {this.handleMouseMove}
                />
                 {/* <canvas
                    ref={this.canvasRefB}
                    onMouseDown = {this.handleMouseDown2}
                    style={{backgroundColor : "transparent",
                            display : 'none'}}
                />  */}

               
                

            <button id='buttonFigure' type="button" value='remove' ref={this.removeButtonTag} onClick={this.handleClick} >x</button>
            
           
               



            </figure>
            {/* </div> */}
            
                
                <div className="btn-toolbar text-center well" style = {{ width:'100%'}}>
                    <button style = {{ width:'15%', minWidth:'75px', maxWidth:'75px'}} type="button " value='previousFrame_5' ref={this.previousFrame_5} onClick={this.handleClick} disabled={false}>-5</button>
                    <button style = {{ width:'15%', minWidth:'75px', maxWidth:'75px'}} type="button" value='previousFrame' ref={this.previousFrame} onClick={this.handleClick} disabled={false}>-1</button>
                    <button style = {{ width:'40%', minWidth:'150px', maxWidth:'150px'}} type="button" value='Play' ref={this.playVideo} onClick={this.handleClick} disabled={false}>Play</button>
                    <button style = {{ width:'15%', minWidth:'75px', maxWidth:'75px'}} type="button" value='nextFrame' ref={this.nextFrame} onClick={this.handleClick} disabled={false}>+1</button>
                    <button style = {{ width:'15%', minWidth:'75px', maxWidth:'75px'}} type="button" value='nextFrame_5' ref={this.nextFrame_5} onClick={this.handleClick} disabled={false}>+5</button>
                </div>
                <div className = "container-waveform" style ={{// position: 'absolute',
                                                    overflow: 'hidden', 
                                                    width: "100%",
                                                    // height: 100,  
                                                    }}>
                    <div  id="waveform" ref={this.waveFormRef} 
                                            style={{ 
                                            position: 'relative', 
                                            //border: "1px solid grey", 
                                            width: "75%", 
                                            height: 100,
                                            margin: "auto", 
                                            marginTop: "10px", 
                                            marginBottom: "10px",
                                            transform: "translateY(-100%)",
                                            //top: "-50%",
                                        }}/>
                    <div id="wave-timeline" ref={this.timeLineRef} style = {{width: "75%",}}></div>
                    <div id="wave-minimap" ref={this.miniMapRef} style = {{width: "75%",}}></div>

                </div>

                <div className="process-button">
                    <button style = {{ width:'25%', minWidth:'200px'}}  type="button" value='processVideo' ref={this.processVideoButtonTag} onClick={this.handleClick} disabled={false}>Process</button>
                </div>
                

                {this.state.showResults? <ShowResults landmarks = {this.landmarks}
                                                      distances = {this.distances}
                                                      coordsRectangleinVideo = {this.coordsVideo}
                                                      frameRate = {this.estimatedFrameRate}
                                                      fileName = {this.state.fileName}
                                                      updatePositioninVideo = {this.updatePositioninVideo}
                /> :null}
                </center>
             
                {/* <video ref={this.secondVideoRef}/>   */}
                {/* <canvas
                    ref={this.canvasRefB}
                    style={{width : '50%',
                            backgroundColor : 'rgba(0, 0, 255, 0.1)',
                            display : 'none'}}
                />  */}
                <canvas
                    ref={this.canvasRefA}
                    onMouseDown = {this.handleMouseDown2}
                    style={{backgroundColor : 'rgba(0, 0, 255, 0.01)',
                            display : 'none'}}
                /> 
            </div>

        );
    }

}


export default VideoLoadScreen;