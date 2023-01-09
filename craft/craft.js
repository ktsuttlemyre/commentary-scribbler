let craftZone = function(id,geometry){
	
	let zone = document.createElement('div');
	zone.id=id;
	Object.keys(geometry).forEach(function(key){
		//filter out secondary
		if(key == 'secondary'){return}
		zone.style[key]=geometry[key]
	})

	let secondary;
	if(geometry.secondary){
		secondary = craftZone(`${id}_secondary`,geometry.secondary)
	}

	
	
	zone.dataset.geometry=encodeURIComponent(JSON.stringify(geometry))
	// enable draggables to be dropped into this
	interact(zone).dropzone({
	  // only accept elements matching this CSS selector
	  accept: '.craft',
	  // Require a 75% element overlap for a drop to be possible
	  overlap: 0.90,

	  // listen for drop related events:
	  ondropactivate: function (event) {
	    // add active dropzone feedback
	    event.target.classList.add('active')
	  },
	  ondragenter: function (event) {
	    var draggableElement = event.relatedTarget
	    var dropzoneElement = event.target

	    // feedback the possibility of a drop
	    dropzoneElement.classList.add('targeted')
	    draggableElement.classList.add('can-drop')
	  },
	  ondragleave: function (event) {
	    // remove the drop feedback style
	    event.target.classList.remove('targeted')
	    event.relatedTarget.classList.remove('can-drop')
	  },
	  ondrop: function (event) {
	    // attach the zone with the view
	    var elem = event.relatedTarget
	    let zone = event.target
	    let associated = craft.instances[zone.dataset.craft]
	    if(!associated.emulateDrop){
		  if(!associated.isReflow){
		    return
		  }
	    }
	    var video = elem.querySelector('.craft-cargo')

	    if(associated){
	    	associated.free()
	    }
	    
	    let id = elem.id
	    let geometry = JSON.parse(localStorage.getItem(zone.id+"."+id)||'{}')
	    geometry = Object.assign(JSON.parse(decodeURIComponent(zone.dataset.geometry)||'{}'),geometry)
	    let zDems = zone.getBoundingClientRect()
	    elem.left=zDems.left
	    elem.top=zDems.top
	    elem.width=zDems.width
	    elem.height=zDems.height

	    elem.classList.add('animate-transition') 
	    video.classList.add('animate-transition')
	    
	    
	    if((video.width||video.videoWidth)>(video.height||video.videoHeight)){
		video.style.width=zDems.width
	    }else{
		video.style.height=zDems.height
	    }
	
	    //associate them
	    zone.dataset.craft=zone.id
	    craft.dataset.zone=craft.id

	  },
	  ondropdeactivate: function (event) {
	    // remove active dropzone feedback
	    event.target.classList.remove('active')
	    event.target.classList.remove('target')
	  }
	})
	
	let face = {
		elem:zone,
		geometry:geometry,
		secondary:secondary,
		saveGeoMods:function(){
			let geometry = {}
			let associated = document.getElementById(zone.dataset.craft)
			localStorage.setItem(id+"."+associated.id,JSON.stringify(geometry))
		}
	}
	craftZone.instances[id]=face
	if(secondary){
		craftZone.instances[secondary.elem.id]=secondary
		face.secondary=secondary
	}
	return face
}
craftZone.instances={}


//to gesture move the inside use "options.panMedia"
//that option is buggy though so its optional

//if you are adding a video add the video after the video.loadeddata or video.loadedmetadata event
// whichever makes sure you can ge the video.videoWidth variable
let gappingOnSide=function(elem1,elem2){
  let rect1=elem1.getBoundingClientRect()
  let rect2=elem2.getBoundingClientRect()
  let notCovering=''
  //let dems={}
  
  if(rect1.left < rect2.left){
    notCovering+='left'
    //dems.x=rect1.left
  }
  if(rect1.right > rect2.right){
    notCovering+='right'
  } 
  if(rect1.bottom > rect2.bottom){
    notCovering+='bottom'
  }
  if(rect1.top < rect2.top){
    notCovering+='top'
    //dems.y=rec1.dataset.y
  }
  
  console.log('need to fix=',notCovering)
  return notCovering
}

let craft = function(target,options){
  options = Object.assign({panMedia:false},options||{})
  target.classList.add('events-none')
  target.classList.add('craft')
  let editMode=false

  let initGestDist=0
  
  let editDebounceId=null;
  let resetDebounce=5000
  let resetDebounceCustom
  let actions=0
  let startFn=function(event) {
    actions++
    clearTimeout(editDebounceId)
  }
  let endFn=function(event) {
    actions--
    if(actions==1){
	//TODO future optimization. Only check for collision at the end of the move
	// then calculate difference to move the elemet to proper position
	//gappingOnSide(target,mediaElem)

	editDebounceId = setTimeout(endEditMode, resetDebounceCustom || resetDebounce)
    }
  }
  let endEditMode=function(){
    resetDebounceCustom=0 
    clearTimeout(editDebounceId)
      editMode=false
      target.dataset.editmode=false
      target.classList.remove('edit-mode')
      target.classList.add('animate-transition') 
      mediaElem.classList.add('animate-transition')
    }
  let startEditMode=function(inital){
    resetDebounceCustom=inital
    editMode=true
    target.dataset.editmode=true
    target.classList.add('edit-mode')
    target.classList.remove('animate-transition') 
    mediaElem.classList.remove('animate-transition')
    let updateGhost=function () {
		if(!editMode){return}
		let box = mediaElem.getBoundingClientRect()
		let style = videoGhost.style
		style.left=(box.left)+'px'
		style.top=(box.top)+'px'
		style.width=(box.width || mediaElem.videoWidth || 20)+'px'
		style.height=(box.height || mediaElem.videoHeight || 20)+'px';
		
		return setTimeout(function() {
			requestAnimationFrame(updateGhost)
		}, 1)
	}
    updateGhost()
  }
  let dragMoveFn=function (target,x,y) {
          // translate the element
          target.style.transform = 'translate(' + x + 'px, ' + y + 'px)'

          // update the posiion attributes
          target.setAttribute('data-x', x)
          target.setAttribute('data-y', y)
        }
  let handles={/*tl:'circle',br:'circle',tr:'corner',bl:'corner',*/
	       mr:'circle',ml:'circle',mt:'circle',mb:'circle',
	       mc:'cross','transition-indicator':'cross'}
  
  let videoGhost=document.createElement('div')
  videoGhost.className='video-ghost'
  document.body.insertBefore(videoGhost,target)
  

 let mediaPos;
 let lastSafe;
  let init = function(){
      mediaPos=Object.assign({angle:0,scale:0},mediaElem.getBoundingClientRect())
      lastSafe=Object.assign({},mediaPos)
      let aspectRatio=(mediaElem.videoWidth||mediaPos.width) / (mediaElem.videoHeight||mediaPos.height)
  
  
    //add handles
    Object.keys(handles).forEach(function(key){
      let elem = document.createElement('div')
      elem.className='handle ' +((key||'').trim()+' '+(handles[key]||'').trim()).trim()
      //elem.textContent="&nbsp;";
      target.appendChild(elem) //.insertBefore(elem,target.firstChild)
      handles[key]=elem;
    })
    
    let interactable = interact(target).pointerEvents({
    holdDuration: 5000,
    }) .styleCursor(false)

//         .resizable({
//         edges: { left: handles.tl,
//                 right: handles.br,
//                 bottom: handles.br,
//                 top: handles.tl
// 	       },

//         listeners: {
//           start:startFn,
//           move (event) {
//             if(!editMode){
//               return
//             }
//             var x = (parseFloat(target.getAttribute('data-x')) || 0)
//             var y = (parseFloat(target.getAttribute('data-y')) || 0)

//             // translate when resizing from top or left edges
//             x += event.deltaRect.left
//             y += event.deltaRect.top


//             // update the element's style
//             target.style.width = event.rect.width + 'px'
//             target.style.height = event.rect.height + 'px'

//             target.style.transform = 'translate(' + x + 'px,' + y + 'px)'

//             target.setAttribute('data-x', x)
//             target.setAttribute('data-y', y)

//           },end:endFn
//         },
//         modifiers: [
// 		interact.modifiers.aspectRatio({
// 			// make sure the width is always double the height
// 			ratio: aspectRatio,
// 			// also restrict the size by nesting another modifier
// 		modifiers: [
// 			// keep the edges inside the parent
// 			interact.modifiers.restrictEdges({
// 			outer: mediaElem
// 			}),
// 			//interact.modifiers.restrictSize({ max: 'parent' }),
// 			// keep the edges inside the parent
// 			interact.modifiers.restrictEdges({
// 				outer: 'parent'
// 			}),
// 			interact.modifiers.restrictSize({
// 				min: { width: 50, height: 50 }
// 			})
// 		    ],
// 		}),
//         ],
//         inertia: false
//       })

        .resizable({
        edges: { left: handles.ml,
                right: handles.mr,
                bottom: handles.mb,
                top: handles.mt
	       },

        listeners: {
          start:startFn,
          move (event) {
            if(!editMode){
              return
            }
            var x = (parseFloat(target.getAttribute('data-x')) || 0)
            var y = (parseFloat(target.getAttribute('data-y')) || 0)
	    if(event.matchElement){
	    	let box=event.matchElement.getBoundingClientRect();
		target.style.width=box.width
		target.style.height=box.height
		target.style.transform = 'translate(' + box.x + 'px,' + box.y + 'px)'
	    }else{
		    // translate when resizing from top or left edges
		    x += event.deltaRect.left
		    y += event.deltaRect.top


		    // update the element's style
		    target.style.width = event.rect.width + 'px'
		    target.style.height = event.rect.height + 'px'

		    target.style.transform = 'translate(' + x + 'px,' + y + 'px)'
	    }
            target.setAttribute('data-x', x)
            target.setAttribute('data-y', y)

          },end:function(event){
		  let zone=getZone();
		  if(zone){
			 zone.saveGeoMods() 
		  }
		  endFn(event)
	  }
        },
        modifiers: [
          // keep the edges inside the parent
          interact.modifiers.restrictEdges({
            outer: mediaElem
          }),

          // minimum size
          interact.modifiers.restrictSize({
            min: { width: 100, height: 50 },
           // max: mediaElem
          }),
	  interact.modifiers.restrictEdges({
            outer: 'parent',
          })
		
        ],
        inertia: false
      })

      .draggable({
        listeners: {
          start:startFn,
          move: function(event){
            if(!editMode){
              return
            }
            // keep the dragged position in the data-x/data-y attributes
            let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx
            let y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy
            dragMoveFn(target,x,y)
          },
          end:endFn
    },
        inertia: true,
        modifiers: [
          interact.modifiers.restrictRect({
            restriction: 'parent',
          })
        ]
      })
      .on('tap', function (event) {

        console.log('move to secondary',event)
      })
      .on('doubletap', function (event) {
        if(!editMode){return}
        console.log('trigger lockin',event)
      })
      .on('hold', function (event) {
      startEditMode()
      }).gesturable({
  //         modifiers: [
  //           interact.modifiers.restrictRect({
  //             restriction: mediaElem
  //           })
  //         ],
        listeners: {
          start:function(event){
            let box = mediaElem.getBoundingClientRect()
            mediaPos.width=box.width || mediaElem.videoWidth || 0
            mediaPos.height=box.height || mediaElem.videoHeight || 0
            initGestDist=event.distance
          startFn()
          },
          move (event) {
            if(!editMode){
              return
            }
            let style = mediaElem.style
            //let angleDelta = currentAngle-event.angle
            //let vector = angleDelta
            //let vector = event.scale*currentScale
            //currentScale=vector
            let initGestDelta=event.distance-initGestDist
            console.log(mediaPos.width,initGestDist-event.distance,style.height)
            //let vector = (Math.abs(event.dy)>Math.abs(event.dx))?event.dy:event.dx;
            let isGap=''
            if(style.height=="auto" || style.height=='' || style.height==null || parseFloat(style.height<=0 )){
              style.width=mediaPos.width+initGestDelta+'px'
               isGap+=gappingOnSide(target,mediaElem)
            }else{
              style.height=mediaPos.height+initGestDelta+'px'
               isGap+=gappingOnSide(target,mediaElem)
            }
              // keep the dragged position in the data-x/data-y attributes
            if(options.panMedia){
              let x = (parseFloat(mediaElem.getAttribute('data-x')) || 0) + event.dx
              let y = (parseFloat(mediaElem.getAttribute('data-y')) || 0) + event.dy
              dragMoveFn(mediaElem,x,y)
            }
            isGap+=gappingOnSide(target,mediaElem)
            if(!isGap){
              lastSafe=Object.assign(lastSafe,mediaElem.getBoundingClientRect())
            }
              //interactable.reflow({ name: 'drag', axis: 'xy' })
		let box1=target.getBoundingClientRect()
		let box2=mediaElem.getBoundingClientRect()
		if(box1.x==box2.x && box1.y==box2.y && box1.width==box2.width && box1.height==box2.height){
			interactable.fire({
				type: 'resizestart',
				target: target,
			});
			interactable.fire({
				type: 'resizemove',
				target: target,
				matchElement: mediaElem,
			});
			interactable.fire({
				type: 'resizeend',
				target: target,
			});
		}
              target.style.width=window.innerWidth
              target.style.height=window.innerHeight
              // start a drag action
              interactable.reflow({
                name: 'resize',
                edges: { right: true, bottom: true,},
              })
          },
          end:function(){
  //           let style = mediaElem.style
  //           style.width = lastSafe.width
  //           style.height = lastSafe.height
  //           dragMoveFn(mediaElem,lastSafe.x,lastSafe.y)
              // start a resize action and wait for inertia to finish
		interactable.reflow({
			name: 'resize',
			edges: { left: true, top: true,},
		      })
            endFn()
          }
        }
    })
    startEditMode(120000)
    let getZone = function(){
	let zone = craftZone.instances[target.dataset.zone]
	if(zone && zone.dataset.craft==target.id){
		return zone
	}
    }
    let free=function(){
		let zone = getZone()
		if(zone){
			//free them
			zone.elem.dataset.craft=''
			target.dataset.zone=''
			
			reflow()
// 			interactable.fire({
// 				type: 'dragstart',
// 				target: element,
// 				dx: 20,
// 				dy: 20,
// 			});
			
			
		
		}
	}
    let edit=function(){
	alert('edit on craft public interface not implmeneted')
	}
    let reflow = function(){
	face.isReflow=true
	interactable.reflow({
		name: 'resize',
		edges: { left: true, top: true,},
	})
	interactable.reflow({ name: 'drag', axis: 'xy' })
	face.isReflow=false
	}
    //promise.resolve(
    letface={
	free:free,
	edit:edit,
	reflow:reflow,	
	}
	craft.instances[target.id]=face
   //   )
   // }
	//let promise=new Promise()
	//return promise
  }
  
  
  let mediaElem=target.querySelector('video')
  if(mediaElem){
    mediaElem.classList.add('craft-cargo')
    if(!mediaElem.videoWidth || mediaElem.videoWidth==null){
	    
      mediaElem.addEventListener( "loadedmetadata", function (e) {
        init()
      })
    }else{
      init()
    }
  }else{
      mediaElem=target.querySelector('img,canvas')
      mediaElem.classList.add('craft-cargo')
      init()
  }
}
craft.instances={}

//document.querySelectorAll('.craft').forEach(craftIt)




let animationFrameId=0
window.addEventListener('resize', function() {
    cancelAnimationFrame(animationFrameId)
    window.requestAnimationFrame(function() {
        Object.keys(craft.instances).forEach(function(key){
		let inst = craft.instances[key]
		inst.reflow()
	})
    });
}, true);

