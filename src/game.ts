//Player's position and rotation 
const player = Camera.instance

//tells whether axies follow player or the marker target
let followPlayer = true
let targetLocation = new Vector3(8,0,8)

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

  axie.getComponent(Transform).position = _startPosition  
  
  axie.getComponent(FollowsPlayer).defaultHeight = _defaultHeight  
  axie.getComponent(FollowsPlayer).speed = _speed  
  axie.getComponent(FollowsPlayer).elapsedTime = Math.random() * 0.5  
  axie.getComponent(FollowsPlayer).randomOffsetX =  (Math.random()*2-1) * scatterRadius
  axie.getComponent(FollowsPlayer).randomOffsetZ = (Math.random()*2-1) * scatterRadius

  //axie.addComponent(new Billboard())
  

  engine.addEntity(axie)  
}

//this system updates and moves the objects on every frame (the ones which have the FollowsPlayer componenet added)
class PlayerFollowSystem {
 
  group = engine.getComponentGroup(FollowsPlayer)
  moveVector = new Vector3(0,0,0)

  update(dt: number) {

     for (let entity of this.group.entities) {

      const objectInfo = entity.getComponent(FollowsPlayer)      
      let transform = entity.getComponentOrCreate(Transform)      

      if(followPlayer){
        targetLocation.copyFrom(player.feetPosition) 
      }

      let origin = new Vector3(transform.position.x, transform.position.y, transform.position.z)
      let targetPosition = new Vector3(targetLocation.x + objectInfo.randomOffsetX, objectInfo.defaultHeight, targetLocation.z + objectInfo.randomOffsetZ )
      let lookatPosition = new Vector3(targetLocation.x , 1.0, targetLocation.z )
           

      //move axies towards target, but stop within a certain distance from their targets
      if(distance(targetPosition, transform.position) > 0.25 ){

        objectInfo.moving = true  
       
        //try to move from origin to target with the speed amount stored in each axie's followPlayer component
        this.moveVector = targetPosition.subtract(origin).normalize().multiplyByFloats(objectInfo.speed,objectInfo.speed,objectInfo.speed)
        let nextPosition = origin.add(this.moveVector)

        //Out of bounds movement? if yes, then restrict coordinates to boundaries
        if( nextPosition.x > boundarySizeXMax || nextPosition.x < boundarySizeXMin){
            nextPosition.x = origin.x
        }
        if( nextPosition.z > boundarySizeZMax || nextPosition.z < boundarySizeZMin){
          nextPosition.z = origin.z
        }

        //move the axie to new position
        transform.position.copyFrom(nextPosition)
      }
      else{
        objectInfo.moving = false
      }

      // get the exact rotation that turns a Forward looking axie towards the target point 
      //let targetRotation = Quaternion.FromToRotation(Vector3.Forward(), lookatPosition.subtract(origin.multiplyByFloats(1,0,1)))    
      // gradually rotate axies towards the above target orientation     
      //transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, dt*4)  

       transform.lookAt(lookatPosition)
    } 
  }
}
engine.addSystem(new PlayerFollowSystem())


//idle floating movement of axies 
//remove completely if not needed
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

///////////////
// CREATE AXIES 
///////////////

//Load a GLB file from project folder 'models'
let axieShape1 =  new GLTFShape('models/Axie_1.glb')
let axieShape2 =  new GLTFShape('models/Axie_2.glb')
let axieShape3 =  new GLTFShape('models/Axie_3.glb')
let axieShape4 =  new GLTFShape('models/Axie_4.glb')
let axieShape5 =  new GLTFShape('models/Axie_5.glb')
let axieShape6 =  new GLTFShape('models/Axie_6.glb')
let axieShape7 =  new GLTFShape('models/Axie_7.glb')
let axieShape8 =  new GLTFShape('models/Axie_8.glb')
let axieShape9 =  new GLTFShape('models/Axie_9.glb')
let axieShape10 =  new GLTFShape('models/Axie_10.glb')


let axieShapeArray = []

axieShapeArray.push(axieShape1)
axieShapeArray.push(axieShape2)
axieShapeArray.push(axieShape3)
axieShapeArray.push(axieShape4)
axieShapeArray.push(axieShape5)
axieShapeArray.push(axieShape6)
axieShapeArray.push(axieShape7)
axieShapeArray.push(axieShape8)
axieShapeArray.push(axieShape9)
axieShapeArray.push(axieShape10)



for(let i=0; i<50; i++){
  //get random coords on x and z axes
  let randomSpawnX = Math.random()*parcelsCountX*16
  let randomSpawnZ = Math.random()*parcelsCountZ*16

  //Spawn axies: (
  //glb shape's name, 
  //start position vector, 
  //height above ground, 
  //movement speed 
  //) 

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


//axies follow the player and we hide the marker underground
function makeFollowPlayer(){

  followPlayer = true
  marker.getComponent(Transform).position.set(8,-20,8)
}

//axies follow the target marker, which is moved to _loc vector input
function makeFollowLocation(_loc:Vector3){
  followPlayer = false
  targetLocation = _loc
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

