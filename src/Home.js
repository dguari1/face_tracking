import { useState, createRef, useEffect } from "react";
import './Home.css';


export function Home() {



  return (
    <div className="outer-container">
    <main id="page-wrap">

    <h1>
        Face Tracking Tool
    </h1>
    <div className='home-container'>
        <h2 className="description">
                User can record and process short videos of facial movements to identify signs of hypomimia.
                <br/><br/>
                Videos are processed to localize and track the movement of different parts of the face. Movement signals are used to identify signs of hypomimia.
        </h2>
    </div>

    
    </main>
    {/* <center>
    <div style={{margin: 'auto auto'}}> 
    <a href="https://dguari1.github.io/hand_tracking_documentation/">Documentation</a> | <a href="mailto: d.guarinlopez@ufl.edu">Contact</a>
    </div> 
     </center>*/}
    <div className="navbar" id="myNavbar">
      <a href="https://dguari1.github.io/hand_tracking_documentation/">Documentation</a>
      <a href="mailto: d.guarinlopez@ufl.edu">Contact</a>
    </div>

   

  </div>
  )
    
}

//export default Home;
