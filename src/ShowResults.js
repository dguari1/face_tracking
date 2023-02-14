import React, { Component, createRef, useState, useEffect, useMemo, useCallback } from "react";

import  "./ShowResults.css";
import Plot from 'react-plotly.js'

// import {minimal_find_peaks} from './findpeaks.js'
import { average, getStandardDeviation, lowPassFilter, difftoNumber} from "./utils";
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

        this.plotLabel = ''

        this.data = []
        this.timeStamp = []

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

        this.handleProcessInputData()
        this.handleFilterData()
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

    handleCreateSelectItems = () => {


        let keys = Object.keys(this.props.distances)

        let items = [];         
        for (let i = 0; i <= keys.length-1; i++) {      
            if (keys[i] !== 'timeStamp') {items.push(<option key={keys[i]} value={keys[i]}>{keys[i]}</option>);}       
            //here I will be creating my options dynamically based on
            //what props are currently passed to the parent component
        }
        return items;
    }

    handleProcessInputData = () => {
        // update variables with data
        this.data = this.props.distances.areaMouth
        this.timeStamp = this.props.distances.timeStamp
        this.plotLabel =  'areaMouth'
    }

   
    handleFilterData = () => {
        // filter the signals
        if (this.data.length > 0){
            lowPassFilter(this.data, 10, this.frameRate,1)
        }
        this.setState({revision : this.state.revision + 1})
    }

  
    handleSignalSelectChange = (event) => {

        //update plot 

        this.data = eval('this.props.distances.'+event.target.value)
        this.plotLabel =  event.target.value
        this.handleFilterData()
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
                 item = {areaMouth: this.props.distances.areaMouth,
                        distanceNoseLowerLip : this.props.distances.distanceNoseLowerLip , 
                        distanceNoseJaw : this.props.distances.distanceNoseJaw, 
                        distanceNoseLeftEyebrow: this.props.distances.distanceNoseLeftEyebrow,
                        distanceNoseRightEyebrow: this.props.distances.distanceNoseRightEyebrow,
                        distanceEyeCanthus: this.props.distances.distanceEyeCanthus,
                        timeStamp: this.props.distances.timeStamp
                    }
                 fileName = this.fileName.split(".")[0]+'-signals.json';
                 this.handleSave(item,fileName)
                break;

            case 'savelandmarks':
                item =     {landmarks : this.props.landmarks.landmarks,
                            timeStamp : this.props.landmarks.timeStamp,
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

             {/* <div className="sliderPlot"  >
                <label className="interact-label" style={{float: "left"}}>Minimum distance</label> 
                <label className='interact-slider-value' ref={this.labelRight} style={{float: "right"}}> 0.3s </label>
                <br/>
                <input className="interact-slider-right" type="range" min="0" max="3" step="0.1" defaultValue="0.3" id="slider" ref={this.sliderRightRef} onChange={this.handleSliderChange}  />
            </div> */}

            <div className="signal-selector">
                    <label htmlFor="signalSelect" style={{marginLeft : '10px'}}>Select Signal to Plot</label><br/>
                    <select id="signalSelect" defaultValue={'areaMouth'} ref={this.signalSelect} onChange={this.handleSignalSelectChange}>
                        {this.handleCreateSelectItems()}
                    </select>
                    {/* <Input type="select" id="signalSelect" ref={this.signalSelect} onChange={this.handleSignalSelectChange} label="Multiple Select" multiple>
                        {this.handleCreateSelectItems()}
                    </Input> */}
                    {/* <select id="signalSelect" defaultValue={'50%'} ref={this.signalSelect} onChange={this.handleSignalSelectChange}>
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
                    </select> */}
            </div>

            <Plot ref={this.plot} data ={[
                {
                x : this.timeStamp,
                y : this.data,
                name: 'Plot',
                type : 'scatter',
                mode : 'lines',
                marker : {color:'#1f77b4',
                          width: 5}
                }
            ]}
            layout = {{height: 400, xaxis : {title: 'Time [s]'}, yaxis : {title: this.plotLabel}, title: '', font: {
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