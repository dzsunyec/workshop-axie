//Player's position and rotation 
const player = Camera.instance

//What distance from the player should the kittys stop
const followDistance = 4

//kittys' maximum size in meters!! (for checking out of bounds around estate)
const kittySize = 1.5

//size of scene/estate (number of parcels on each axis)
const parcelsCountX = 3
const parcelsCountZ = 3

//boundaries in which kittys can move, in meters (respecting kitty's maximum size as well)
const boundarySizeXMin = 0 + kittySize
const boundarySizeXMax = parcelsCountX * 16 - kittySize
const boundarySizeZMin = 0 + kittySize
const boundarySizeZMax = parcelsCountZ * 16 - kittySize


//default values for every follower object
@Component("FollowsPlayer")
export class FollowsPlayer {  
  defaultHeight:number = 0
  speed:number = 2
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
// This function below creates an kitty with parameters: 
// modelShape: (required parameter) this should be the .glb or .gltf file of the kitty
// _floatHeight: (optional, default is 2 meters) this will be the height measured from the ground where the kitty will move around 
// _speed: (optional, default is 2 meters/second) the speed if the kitty 
// _flipForward: (optional) make the kitty mesh face the other direction  
/////////////////////////////////////////////////////////
function createKitty(modelShape:GLTFShape, _startPosition?:Vector3, _defaultHeight?:number, _speed?:number, _flipForward?:boolean ){
    
  let kittyMeshRotate = new Entity()
  kittyMeshRotate.addComponent(modelShape)  
  kittyMeshRotate.addComponent(new Transform({position: new Vector3(0, 0, 0)}))

  let kitty = new Entity()
  kitty.addComponent(new Transform({position: new Vector3(8, 2, 8), scale: new Vector3(0.4,0.4,0.4)}))
  kitty.addComponent(new FollowsPlayer())

  kittyMeshRotate.setParent(kitty)

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
    kitty.getComponent(Transform).position = _startPosition
  }

  if(_defaultHeight){
    kitty.getComponent(FollowsPlayer).defaultHeight = _defaultHeight
  }

  if(_speed){
    kitty.getComponent(FollowsPlayer).speed = _speed
  }

  if(_flipForward){    
    kittyMeshRotate.getComponent(Transform).rotation = Quaternion.Euler(0,180,0)
  }

  kitty.getComponent(FollowsPlayer).elapsedTime = Math.random()*0.5
  kitty.getComponent(FollowsPlayer).followDistance = Math.random()*6 + 3
  kitty.getComponent(FollowsPlayer).randomOffsetX =  (Math.random()*2-1) * kitty.getComponent(FollowsPlayer).followDistance
  kitty.getComponent(FollowsPlayer).randomOffsetZ =  (Math.random()*2-1) * kitty.getComponent(FollowsPlayer).followDistance

  kitty.addComponent(new Billboard())


  engine.addEntity(kitty)  
}

//this system updates and moves the objects on every frame (the ones which have the FollowsPlayer componenet added)
class PlayerFollowSystem {
 
  group = engine.getComponentGroup(FollowsPlayer)

  update(dt: number) {
     for (let entity of this.group.entities) {

      const objectInfo = entity.getComponent(FollowsPlayer)      
      let transform = entity.getComponentOrCreate(Transform)      

      let origin = new Vector3(transform.position.x, transform.position.y, transform.position.z)
      let targetPosition = new Vector3(player.feetPosition.x + objectInfo.randomOffsetX, objectInfo.defaultHeight, player.feetPosition.z + objectInfo.randomOffsetZ )

      let lookatPosition = new Vector3(player.feetPosition.x , objectInfo.defaultHeight, player.feetPosition.z )
     
      let fraction = objectInfo.speed * dt
      if(fraction > 1){
        fraction = 1
      }

      //don't let kitty closer than followDistance
      if(distance(player.feetPosition, transform.position) > Math.pow(objectInfo.followDistance,2) ){

        objectInfo.moving = true
        let nextPosition = Vector3.Lerp(origin, targetPosition, fraction)

        //Out of bounds movement?
        if( nextPosition.x > boundarySizeXMax || nextPosition.x < boundarySizeXMin){
            nextPosition.x = origin.x
        }
        if( nextPosition.z > boundarySizeZMax || nextPosition.z < boundarySizeZMin){
          nextPosition.z = origin.z
        }

        transform.position = nextPosition
      }
      else{
        objectInfo.moving = false
      }

      //gradually rotate towards the target point (player position)
      //let targetRotation = Quaternion.FromToRotation(Vector3.Forward(), lookatPosition.subtract(origin.multiplyByFloats(1,0,1)))        
      // transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, dt*4)  
    } 
  }
}
engine.addSystem(new PlayerFollowSystem())


//idle floating movement of kittys 
//remove completely if not needed
class floatIdleSystem {

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

engine.addSystem(new floatIdleSystem())


//Ground
let groundShape = new GLTFShape('models/ground.glb')

for(let i = 0; i < parcelsCountX; i++){
  for(let j = 0; j < parcelsCountZ; j++){
    let ground = new Entity()
    ground.addComponent(groundShape)
    ground.addComponent(new Transform({position:new Vector3(i*16+8, 0, j*16+8)}))
    engine.addEntity(ground)
  }
}



/////////////////////
// CREATE AXIES BELOW
/////////////////////

let kittyShape =  new GLTFShape('models/kitty.glb')

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

let shapes = []

shapes.push(axieShape1)
shapes.push(axieShape2)
shapes.push(axieShape3)
shapes.push(axieShape4)
shapes.push(axieShape5)
shapes.push(axieShape6)
shapes.push(axieShape7)
shapes.push(axieShape8)
shapes.push(axieShape9)
shapes.push(axieShape10)





//...

//Set up kitty: (glb/gltf shape's name, start position vector, height above ground, movement speed, flip forward direction of object)
//createkitty(kittyShape1, new Vector3(4,2,8), 0, 0.8 , false)
//createkitty(kittyShape2, new Vector3(10,2,8), 0, 0.8 , false)

for(let i=0; i<50; i++){
  createKitty(shapes[i%10], new Vector3(Math.random()*parcelsCountX*16,2,Math.random()*parcelsCountX*16), 0, Math.random() + 0.5 , false)
}
//...