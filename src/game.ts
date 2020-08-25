//Player's position and rotation 
const player = Camera.instance

//tells whether axies follow player or the marker target
let followPlayer = true
let targetLocation = new Vector3(8,0,8)

//What distance from the player should the axies stop
const followDistance = 0

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


//default values for every follower object
@Component("FollowsPlayer")
export class FollowsPlayer {  
  defaultHeight:number = 0
  speed:number = 0.2
  randomOffsetX:number =  (Math.random()*2-1) * followDistance 
  randomOffsetZ:number =  (Math.random()*2-1) * followDistance 
  moving:boolean = true
  elapsedTime:number = 0
  followDistance:number = 3
}

function distance(pos1: Vector3, pos2: Vector3): number {
  const a = pos1.x - pos2.x
  const b = pos1.z - pos2.z
  return a * a + b * b
}

/////////////////////////////////////////////////////////
// This function below creates an axie with parameters: 
// modelShape: (required parameter) this should be the .glb or .gltf file of the axie
// _floatHeight: (optional, default is 2 meters) this will be the height measured from the ground where the axie will move around 
// _speed: (optional, default is 2 meters/second) the speed if the axie 
// _flipForward: (optional) make the axie mesh face the other direction  
/////////////////////////////////////////////////////////
function spawnAxie(modelShape:GLTFShape, _startPosition?:Vector3, _defaultHeight?:number, _speed?:number, _flipForward?:boolean ){
    
  let axieMeshRotate = new Entity()
  axieMeshRotate.addComponent(modelShape)  
  axieMeshRotate.addComponent(new Transform({position: new Vector3(0, 0, 0)}))

  let axie = new Entity()
  axie.addComponent(new Transform({position: new Vector3(8, 2, 8), scale: new Vector3(0.4,0.4,0.4)}))
  axie.addComponent(new FollowsPlayer())

  axieMeshRotate.setParent(axie)

  if(_startPosition){

    //Out of bounds spawn
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
  }

  if(_defaultHeight){
    axie.getComponent(FollowsPlayer).defaultHeight = _defaultHeight
  }

  if(_speed){
    axie.getComponent(FollowsPlayer).speed = _speed
  }

  if(_flipForward){    
    axieMeshRotate.getComponent(Transform).rotation = Quaternion.Euler(0,180,0)
  }

  axie.getComponent(FollowsPlayer).elapsedTime = Math.random() * 0.5
  axie.getComponent(FollowsPlayer).followDistance = Math.random() * 6 + followDistance
  axie.getComponent(FollowsPlayer).randomOffsetX =  (Math.random()*2-1) * axie.getComponent(FollowsPlayer).followDistance
  axie.getComponent(FollowsPlayer).randomOffsetZ = (Math.random()*2-1) * axie.getComponent(FollowsPlayer).followDistance

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

      let lookatPosition = new Vector3(targetLocation.x , objectInfo.defaultHeight, targetLocation.z )
     
      let fraction = dt

      if(fraction > 1){
        fraction = 1
      }

      //don't let axie closer than its stored followDistance
      if(distance(targetPosition, transform.position) > 0.25 ){

        objectInfo.moving = true
        let nextPosition = Vector3.Lerp(origin, targetPosition, fraction)
        
        //Out of bounds movement?
        if( nextPosition.x > boundarySizeXMax || nextPosition.x < boundarySizeXMin){
            nextPosition.x = origin.x
        }
        if( nextPosition.z > boundarySizeZMax || nextPosition.z < boundarySizeZMin){
          nextPosition.z = origin.z
        }

        this.moveVector =  nextPosition.subtract(origin).normalize().multiplyByFloats(objectInfo.speed,objectInfo.speed,objectInfo.speed)         

        transform.position.addInPlace(this.moveVector)
      }
      else{
        objectInfo.moving = false
      }

      //gradually rotate towards the target point (player position)
      let targetRotation = Quaternion.FromToRotation(Vector3.Forward(), lookatPosition.subtract(origin.multiplyByFloats(1,0,1)))        
       transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, dt*4)  
    } 
  }
}
engine.addSystem(new PlayerFollowSystem())


//idle floating movement of axies 
//remove completely if not needed
class bounceSystem {

  //jump height
  amplitude = 0.4
  group = engine.getComponentGroup(FollowsPlayer)

  update(dt: number) {   

     for (let entity of this.group.entities) {

      const objectInfo = entity.getComponent(FollowsPlayer)      
      let transform = entity.getComponentOrCreate(Transform)

      objectInfo.elapsedTime += dt

      //bounce only while moving
      if(objectInfo.moving){
        transform.position.y = objectInfo.defaultHeight + Math.abs(Math.sin(objectInfo.elapsedTime*10) * this.amplitude) 
      }
      else{
        transform.position.y = objectInfo.defaultHeight
      }     
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

//Spawn axies: (glb/gltf shape's name, start position vector, height above ground, movement speed, flip forward direction of object)

for(let i=0; i<50; i++){
  spawnAxie(axieShapeArray[i%10], new Vector3(Math.random()*parcelsCountX*16,2,Math.random()*parcelsCountX*16), 0, Math.random()*0.15 + 0.1 , false)
}

//Create target marker
let markerShape =  new GLTFShape('models/marker.glb')

let marker = new Entity()
marker.addComponent(markerShape)
marker.addComponent(new Transform({position: new Vector3(8,-20, 8)}))
marker.addComponent(new Billboard(false,true,false))
engine.addEntity(marker)


//Ground
let groundShape = new GLTFShape('models/ground.glb')

for(let i = 0; i < parcelsCountX; i++){
  for(let j = 0; j < parcelsCountZ; j++){
    let ground = new Entity()
    ground.addComponent(groundShape)
    ground.addComponent(new Transform({position:new Vector3(i*16+8, 0.1, j*16+8)}))
    engine.addEntity(ground)
  }
}

let ground = new Entity()
ground.addComponent(new BoxShape())
ground.addComponent(new Transform({position:new Vector3(parcelsCountX*16/2,0,parcelsCountZ*16/2),
scale: new Vector3(parcelsCountX*16-4,0.1,parcelsCountZ*16-4)}))
engine.addEntity(ground)



function makeFollowPlayer(){

  followPlayer = true
  marker.getComponent(Transform).position.set(8,-20,8)
}

function makeFollowLocation(_loc:Vector3){
  followPlayer = false
  targetLocation = _loc
  marker.getComponent(Transform).position.copyFrom(_loc)

}

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

