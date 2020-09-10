//Player's position and rotation 
const player = Camera.instance


//What distance around the target axies are scattered
const scatterRadius = 6

//axies' maximum size in meters!! (for checking out of bounds around estate)
const axieSize = 1.5

//size of scene/estate (number of parcels on each axis)
const parcelsCountX = 3
const parcelsCountZ = 3

//boundaries in which axies can move, in meters (respecting axie's maximum size as well)
const boundarySizeXMin = 0 + axieSize
const boundarySizeXMax = parcelsCountX * 16 - axieSize
const boundarySizeZMin = 0 + axieSize
const boundarySizeZMax = parcelsCountZ * 16 - axieSize

//tells whether axies follow player or the marker target
let followPlayer = false
let trueTarget = new Vector3(parcelsCountX*8,0, parcelsCountZ*8)
let sceneCenterTarget = new Vector3(parcelsCountX*8,0, parcelsCountZ*8)


// COMPONENT storing values unique to each axie
// defaultHeight: height above ground level where axies move around
// speed
// randomOffsetX: random position offset around the target, x-axis
// randomOffsetZ: random position offset around the target, z-axis
// moving: tells whether the axie is in movement
// elapsedTime: counting time for bounce animations
@Component("FollowsPlayer")
export class FollowsPlayer {  
  defaultHeight:number = 0 
  speed:number = 0.2
  randomOffsetX:number =  (Math.random()*2-1)
  randomOffsetZ:number =  (Math.random()*2-1) 
  moving:boolean = true
  elapsedTime:number = 0  
}

//distance between two points (squared result)
function distance(pos1: Vector3, pos2: Vector3): number {
  const a = pos1.x - pos2.x
  const b = pos1.z - pos2.z
  return a * a + b * b
}

/////////////////////////////////////////////////////////
// This function below creates an axie with parameters: 
// modelShape:  this should be the .glb or .gltf file of the axie
// _defaultHeight:  this will be the height measured from the ground where the axie will move around 
// _speed: (meters/second) the speed if the axie 
/////////////////////////////////////////////////////////
function spawnAxie(modelShape:GLTFShape, _startPosition:Vector3, _defaultHeight:number, _speed:number){
 
  let axie = new Entity()
  axie.addComponent(new Transform({position: new Vector3(8, 2, 8), scale: new Vector3(0.4,0.4,0.4)}))
  axie.addComponent(new FollowsPlayer())
  axie.addComponent(modelShape)  

  //is start position within scene boundaries? if no then restrict it to be inside
  if( _startPosition.x > boundarySizeXMax ){
    _startPosition.x = boundarySizeXMax
  }
  if(_startPosition.x < boundarySizeXMin){
    _startPosition.x = boundarySizeXMin
  }
  if( _startPosition.z > boundarySizeZMax ){
    _startPosition.z = boundarySizeZMax
  }
    if(_startPosition.z < boundarySizeZMin){
    _startPosition.z = boundarySizeZMin
  }

  // add default values to the axie's components
  axie.getComponent(Transform).position = _startPosition    
  axie.getComponent(FollowsPlayer).defaultHeight = _defaultHeight  
  axie.getComponent(FollowsPlayer).speed = _speed  
  axie.getComponent(FollowsPlayer).elapsedTime = Math.random() * 0.5  
  axie.getComponent(FollowsPlayer).randomOffsetX =  (Math.random()*2-1) * scatterRadius
  axie.getComponent(FollowsPlayer).randomOffsetZ = (Math.random()*2-1) * scatterRadius  

  engine.addEntity(axie)  
}

//this system updates and moves the objects on every frame (the ones which have the FollowsPlayer componenet added)
class PlayerFollowSystem {
 
  group = engine.getComponentGroup(FollowsPlayer,Transform)
  moveVector = new Vector3(0,0,0)
  playerInsideParcel = false

  update(dt: number) {

    // this section checks when player enters or exits the scene boundaries and make the axies follow the player on entry and reset to center on exit
      if(player.feetPosition.x > 0 && player.feetPosition.x < parcelsCountX*16 && player.feetPosition.z > 0 && player.feetPosition.z < parcelsCountZ*16){                
        if (!this.playerInsideParcel){
          this.playerInsideParcel = true
          followPlayer = true
        }        
      }else{
        this.playerInsideParcel = false
        followPlayer = false
        trueTarget.copyFrom(sceneCenterTarget)
        marker.getComponent(Transform).position.set(8,-20,8)
      }
  
    // iterating thorugh all axies
     for (let entity of this.group.entities) {

      const objectInfo = entity.getComponent(FollowsPlayer)      
      let transform = entity.getComponentOrCreate(Transform)      

      //switch between player or target point follow modes
      if(followPlayer){
        trueTarget.copyFrom(player.feetPosition) 
      }
      
      //scattering axies randomly around target
      let scatteredTarget = new Vector3(trueTarget.x + objectInfo.randomOffsetX, objectInfo.defaultHeight, trueTarget.z + objectInfo.randomOffsetZ )
      let lookatPosition = new Vector3(trueTarget.x , 1.0, trueTarget.z )           

      //move axies towards target, but stop within a certain distance from their targets
      if(distance(scatteredTarget, transform.position) > 0.5 ){

        objectInfo.moving = true  
       
        //try to move in the direction of the target with the speed amount stored in each axie's followPlayer component
        this.moveVector = scatteredTarget.subtract(transform.position).normalize().multiplyByFloats(objectInfo.speed,objectInfo.speed,objectInfo.speed)
        let nextPosition = transform.position.add(this.moveVector)

        //Out of bounds movement? if yes, then restrict coordinates to boundaries
        if( nextPosition.x > boundarySizeXMax || nextPosition.x < boundarySizeXMin){
            nextPosition.x = transform.position.x
        }
        if( nextPosition.z > boundarySizeZMax || nextPosition.z < boundarySizeZMin){
          nextPosition.z = transform.position.z
        }

        //move the axie to new position
        transform.position.copyFrom(nextPosition)
      }
      else{
        objectInfo.moving = false
      }

      // turn axie towards its target
       transform.lookAt(lookatPosition)
    } 
  }
}
engine.addSystem(new PlayerFollowSystem())


//idle floating movement of axies 
class bounceSystem {

  //jump height
  amplitude = 0.4
  frequency = 5
  group = engine.getComponentGroup(FollowsPlayer,Transform)

  update(dt: number) {   

     for (let entity of this.group.entities) {

      const objectInfo = entity.getComponent(FollowsPlayer)      
      let transform = entity.getComponentOrCreate(Transform)

      objectInfo.elapsedTime += dt

      //bounce higher and faster while moving
      if(objectInfo.moving){
        this.amplitude = 0.4
        this.frequency = 12         
      }
      else{
        this.amplitude = 0.05
        this.frequency = 5
      }   
      //bounce movement (bouncy sine wave)
      transform.position.y = objectInfo.defaultHeight + Math.abs(Math.sin(objectInfo.elapsedTime * this.frequency) * this.amplitude)  
    } 
  }
}

engine.addSystem(new bounceSystem())


//SIGNS

let axieSignShape = new GLTFShape('models/axieSign.glb')
let axieSign = new Entity()
axieSign.addComponent(axieSignShape)
axieSign.addComponent(new Transform({
  position: new Vector3(parcelsCountX*8,-0.9,parcelsCountZ*8),
  scale: new Vector3(1.5,1.5,1.5)}))
engine.addEntity(axieSign)

// let dapperSignShape = new GLTFShape('models/DAPP3.glb')
// let dapperSign = new Entity()
// dapperSign.addComponent(dapperSignShape)
// dapperSign.addComponent(new Transform({position: new Vector3(parcelsCountX*8,-0.9,parcelsCountZ*8),}))
// engine.addEntity(dapperSign)

///////////////
// CREATE AXIES 
///////////////

//load model GLBs into an array
let axieShapeArray = []

axieShapeArray.push(new GLTFShape('models/Axie_1.glb'))
axieShapeArray.push(new GLTFShape('models/Axie_2.glb'))
axieShapeArray.push(new GLTFShape('models/Axie_3.glb'))
axieShapeArray.push(new GLTFShape('models/Axie_4.glb'))
axieShapeArray.push(new GLTFShape('models/Axie_5.glb'))
axieShapeArray.push(new GLTFShape('models/Axie_6.glb'))
axieShapeArray.push(new GLTFShape('models/Axie_7.glb'))
axieShapeArray.push(new GLTFShape('models/Axie_8.glb'))
axieShapeArray.push(new GLTFShape('models/Axie_9.glb'))
axieShapeArray.push(new GLTFShape('models/Axie_10.glb'))

//Spawn 25 axies
for(let i=0; i<25; i++){
  //get random coords on x and z axes
  let randomSpawnX = Math.random()*parcelsCountX*16
  let randomSpawnZ = Math.random()*parcelsCountZ*16

  //Spawn axies: (
  //glb shape's name, 
  //start position vector, 
  //height above ground, 
  //movement speed 
  //) 

  //Spawning different axies by chosing a different shape from the 10 shapes on each loop
  spawnAxie(
    axieShapeArray[i%10], 
    new Vector3(randomSpawnX, 0.1, randomSpawnZ), 
    0.1, 
    Math.random() * 0.15 + 0.1
  )
}

//Create target marker, but hide it underground
let markerShape =  new GLTFShape('models/marker.glb')

let marker = new Entity()
marker.addComponent(markerShape)
marker.addComponent(new Transform({position: new Vector3(8,-20, 8)}))
marker.addComponent(new Billboard(false,true,false))
engine.addEntity(marker)


//Ground grass tiles
let groundShape = new GLTFShape('models/ground.glb')

for(let i = 0; i < parcelsCountX; i++){
  for(let j = 0; j < parcelsCountZ; j++){
    let ground = new Entity()
    ground.addComponent(groundShape)
    ground.addComponent(new Transform({position:new Vector3(i*16+8, 0.1, j*16+8)}))
    engine.addEntity(ground)
  }
}

// ground collider box for clicking
let groundCollider = new Entity()
groundCollider.addComponent(new BoxShape())
groundCollider.addComponent(new Transform({
  position:new Vector3(parcelsCountX*16/2,0,parcelsCountZ*16/2),
  scale: new Vector3(parcelsCountX * 16 - 4, 0.1, parcelsCountZ * 16 - 4)}))
engine.addEntity(groundCollider)


//make the axies follow the player and we hide the marker underground
function makeFollowPlayer(){

  followPlayer = true
  marker.getComponent(Transform).position.set(8,-20,8)
}

//make the axies follow the target marker, which is moved to _loc vector input
function makeFollowLocation(_loc:Vector3){
  followPlayer = false
  trueTarget = _loc
  marker.getComponent(Transform).position.copyFrom(_loc)

}

//INPUTS
const input = Input.instance

//click to send axies to a location
input.subscribe("BUTTON_DOWN", ActionButton.POINTER, true, e => {
 
  if(e.hit){
    if(e.hit.hitPoint.x != 0 || e.hit.hitPoint.z != 0){
      makeFollowLocation(e.hit.hitPoint) 
    }
  }
})

//make axies follow player with E button
input.subscribe("BUTTON_DOWN", ActionButton.PRIMARY, false, e => {     
  makeFollowPlayer()  
})


//UI
const canvas = new UICanvas()

// BOTTOM EDGE UI CONTAINER
let BottomContainer = new UIContainerRect(canvas)
BottomContainer.height = '10%'
BottomContainer.hAlign = 'center'
BottomContainer.vAlign = 'bottom'
BottomContainer.width = "30%"
BottomContainer.color = Color4.FromHexString(`#00000088`)

//INSTRUCTIONS UI TEXT
const instructionsText = new UIText(BottomContainer)
instructionsText.value = " - Click on ground to send Axies to target\n - Press 'E' to call axies to follow you"
instructionsText.hTextAlign = 'center'
instructionsText.vTextAlign = 'center'
instructionsText.fontSize = 14
instructionsText.color = Color4.White()
