import React, { Component, createRef, useState, useEffect, useMemo, useCallback } from "react";

import  "./ShowResults.css";
import Plot from 'react-plotly.js'


import { average, getStandardDeviation, lowPassFilter, dividebyValue, areaPolygon, normalizeArray} from "./utils";
import { toHaveDescription, toHaveStyle } from "@testing-library/jest-dom/dist/matchers";
// import filter from "plotly.js/lib/filter";

// const lowPassFilter = require('low-pass-filter').lowPassFilter;



class ShowResults extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isMarkUp : false,
            revision : 0,
            isAddNewPeakHigh : false,
            isAddNewPeakLow : false,
            isViewinPlot : false,
        }

        this.canvasRef = createRef();
        this.plot = createRef();
        this.signalSelect = createRef();
        this.regionSelect = createRef();

        this.plotLabel = ''



        this.data = this.props.distances
        this.dataProcessed = []
        this.timeStamp = this.props.distances.timeStamp
        this.currentPlotRegion = 0

        this.frameRate = this.props.frameRate
        this.fileName = this.props.fileName
        
    }


    componentDidMount = () => {

        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener("keyup", (event) => {
            if (event.isComposing || event.code === 229) {
              return;
            }
            this.handleKeyUp(event)
          });

        // set labels 
        this.processInputData()
        this.handleProcessInputData()
        // this.handleFilterData()
    }

    componentWillUnmount = () => {
        window.addEventListener('beforeunload', (event) => {
            event.preventDefault();
            document.removeEventListener('keydown', this.handleKeyPress);
            console.log('unmounting')
       })
    }

    handleKeyUp = (event) => {
        // release V 
        switch(event.code) {
            case 'KeyV':
                this.setState({isViewinPlot : true})
            default: 
                break;
        }
    }

    handleKeyDown = (event) => {
        // Handle key press
        // hold down V to update video time to correspond to time selected in plot
        switch (event.code) {
            case 'KeyV':
                this.setState({isViewinPlot : true})
            default:
                break;
        }

    }

    handleCreateSelectRegions = () => {

        let items = [];         
        for (let i = 0; i <= this.data.length-1; i++) {      
           {items.push(<option key={i} value={i}>Region {i+1}</option>);}       
            //here I will be creating my options dynamically based on
            //what props are currently passed to the parent component
        }
        return items;

    }

    handleCreateSelectSignals = () => {


        let keys = Object.keys(this.data[0])

        let items = [];         
        for (let i = 0; i <= keys.length-1; i++) {      
            if (keys[i] !== 'timeStamp') {items.push(<option key={keys[i]} value={keys[i]}>{keys[i]}</option>);}       
            //here I will be creating my options dynamically based on
            //what props are currently passed to the parent component
        }
        return items;
    }



    processInputData = () => {
        const numRegions = this.data.length 
        var interCanthalDistanceRegions = []

        //get the intercanthal distance by finding the average for all the regions
        this.data.forEach(item => {
            interCanthalDistanceRegions.push(average(item.distanceEyeCanthus))
        })
        const interCanthalDistance = average(interCanthalDistanceRegions)
        //process the input data
        this.data.forEach((item,idx) => {
            //
            this.dataProcessed.push({   areaMouth : [],
                                        distanceNoseLowerLip : [],
                                        distanceNoseJaw : [],
                                        distanceNoseLeftEyebrow : [],
                                        distanceNoseRightEyebrow : [],   
                                        eyeAspectRatioLeft : [],
                                        eyeAspectRatioRight : [], 
                                        distanceEyeCanthus : [],
                                        timeStamp : []
                                    })

            this.dataProcessed[idx].areaMouth = normalizeArray(item.areaMouth);lowPassFilter(this.dataProcessed[idx].areaMouth, 10, this.frameRate,1)
            this.dataProcessed[idx].distanceNoseLowerLip = dividebyValue(item.distanceNoseLowerLip ,interCanthalDistance);lowPassFilter(this.dataProcessed[idx].distanceNoseLowerLip, 10, this.frameRate,1)
            this.dataProcessed[idx].distanceNoseJaw = dividebyValue(item.distanceNoseJaw ,interCanthalDistance);lowPassFilter(this.dataProcessed[idx].distanceNoseJaw, 10, this.frameRate,1)
            this.dataProcessed[idx].distanceNoseLeftEyebrow = dividebyValue(item.distanceNoseLeftEyebrow ,interCanthalDistance);lowPassFilter(this.dataProcessed[idx].distanceNoseLeftEyebrow , 10, this.frameRate,1)
            this.dataProcessed[idx].distanceNoseRightEyebrow = dividebyValue(item.distanceNoseRightEyebrow ,interCanthalDistance);lowPassFilter(this.dataProcessed[idx].distanceNoseRightEyebrow, 10, this.frameRate,1)
            this.dataProcessed[idx].eyeAspectRatioLeft  = dividebyValue(item.eyeAspectRatioLeft,1);lowPassFilter(this.dataProcessed[idx].eyeAspectRatioLeft, 10, this.frameRate,1)
            this.dataProcessed[idx].eyeAspectRatioRight  = dividebyValue(item.eyeAspectRatioRight,1);lowPassFilter(this.dataProcessed[idx].eyeAspectRatioRight, 10, this.frameRate,1)
            this.dataProcessed[idx].distanceEyeCanthus = dividebyValue(item.distanceEyeCanthus ,interCanthalDistance);lowPassFilter(this.dataProcessed[idx].distanceEyeCanthus, 10, this.frameRate,1)
            this.dataProcessed[idx].timeStamp = item.timeStamp
        })

    }

    handleProcessInputData = () => {
        // update variables with data
        this.dataToPlot = this.dataProcessed[this.currentPlotRegion].areaMouth
        this.timeStamp = this.dataProcessed[this.currentPlotRegion].timeStamp
        this.plotLabel =  'areaMouth'
        this.setState({revision : this.state.revision + 1})
    }

   
    handleFilterData = () => {
        // filter the signals
        if (this.dataToPlot.length > 0){
            lowPassFilter(this.dataToPlot, 10, this.frameRate,1)
        }
        this.setState({revision : this.state.revision + 1})
    }

  
    handleSignalSelectChange = (event) => {

        //update plot 

        this.dataToPlot = this.dataProcessed[this.currentPlotRegion][event.target.value]
        this.timeStamp = this.dataProcessed[this.currentPlotRegion].timeStamp
        this.plotLabel =  event.target.value
        this.setState({revision : this.state.revision + 1})
        // this.handleFilterData()
    }

    handleRegionSelectChange = (event) => {
        
        //update plot 
        this.currentPlotRegion = parseInt(event.target.value)

        this.dataToPlot = this.dataProcessed[this.currentPlotRegion][this.signalSelect.current.value]
        this.timeStamp = this.dataProcessed[this.currentPlotRegion].timeStamp
        this.plotLabel =  this.signalSelect.current.value
        this.setState({revision : this.state.revision + 1})
        // this.handleFilterData()
    }

    handleClickonPlot = (data) => {

        // click on plot. Update time in video if V is pressed
        if (this.state.isViewinPlot) {

            this.props.updatePositioninVideo(data.points[0].y,data.points[0].x)

        }

    }


    handleClick = (event) => {
        var item = null
        var fileName = null
        switch (event.target.value) {
            case 'savesignals':

                item = {}
                for (let i = 0; i <= this.data.length-1; i++) { 
                    let key = "Region_"+(i+1).toString()
                    item[key] = this.data[i]
                }


                 fileName = this.fileName.split(".")[0]+'-signalsRaw.json';
                 this.handleSave(item,fileName)


                item = {}
                for (let i = 0; i <= this.data.length-1; i++) { 
                    let key = "Region_"+(i+1).toString()
                    item[key] = this.dataProcessed[i]
                }


                 fileName = this.fileName.split(".")[0]+'-signalsProcessed.json';
                 this.handleSave(item,fileName)
                break;

            case 'savelandmarks':

                item = {}
                for (let i = 0; i <= this.landmarks.length-1; i++) { 
                    let key = "Region_"+(i+1).toString()
                    item[key] = this.landmarks[i]
                }

                fileName = this.fileName.split(".")[0]+'-landmarks.json';
                this.handleSave(item,fileName)

            default:
                break
        }

    }

    handleSave = (saveItem, fileName ) => {

        var blob = new Blob([JSON.stringify(saveItem)], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        //a.style.display = 'none';
        a.target = '_blank';
        a.type = 'button';
        a.href = url;
        a.download = fileName; 
        document.body.appendChild(a);
        a.click(function (event){
            event.preventDefault();
        });
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    render () {
        return(

            <div className="container">
            <center>
            <hr className="topLine"/>


            <div className="plot">


            <div className="signal-selector">
                    <div className='label-for-selector'>
                    <label htmlFor="signalSelect" style={{marginLeft : '10px'}}>Select Signal to Plot</label><br/>
                    </div>
                    <div className='selector-signal'>
                    <select id="signalSelect" defaultValue={'areaMouth'} ref={this.signalSelect} onChange={this.handleSignalSelectChange}>
                        {this.handleCreateSelectSignals()}
                    </select>
                    </div>
                    <div className='selector-region'>
                    <select id="regionSelect" defaultValue={'Region 1'} ref={this.regionSelect} onChange={this.handleRegionSelectChange}>
                        {this.handleCreateSelectRegions()}
                    </select>
                    </div>
                 
            </div>

            <Plot ref={this.plot} data ={[
                {
                x : this.timeStamp,
                y : this.dataToPlot,
                name: 'Plot',
                type : 'scatter',
                mode : 'lines',
                marker : {color:'#1f77b4',
                          width: 5}
                }
            ]}
            layout = {{height: 400, xaxis : {title: 'Time [s]'}, yaxis : {autorange: true, title: this.plotLabel}, title: '', font: {
        family: 'Verdana, Geneva, sans-serif;',
        size: 16,
        color: '#7f7f7f'
      },showlegend: false,
      datarevision : this.state.revision, // datarevision helps to update the plot when the data is updated 
      uirevision : true // uirevision helps to maintain the current zoom leven when the state chages
      }} 
      revision = {this.state.revision}
      onClick={(data) => this.handleClickonPlot(data)}
      config ={{
            scrollZoom : true,
            }}
      />
      </div>
      
            <div className="process-button">

                    <button style = {{ width:'45%', minWidth:'250px'}}  type="button" value='savesignals' ref={this.processVideoButtonTag} onClick={this.handleClick} disabled={false}>Save Signals</button>
                    <button style = {{ width:'45%', minWidth:'250px'}}  type="button" value='savelandmarks' ref={this.processVideoButtonTag} onClick={this.handleClick} disabled={false}>Save Landmarks</button> <br/>

            </div>

            
              </center>
            </div>

            

        );
    }
}

export default ShowResults;