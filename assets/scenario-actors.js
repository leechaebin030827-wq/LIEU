import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// Pose the supplied Mixamo skeletons, preserving their actual skinned meshes.
export function addScenarioActors(parent, material) {
  const actors=[];const loader=new GLTFLoader();
  function aim(bone, child, direction){
    if(!bone||!child)return; parent.updateMatrixWorld(true);
    const a=bone.getWorldPosition(new THREE.Vector3()),b=child.getWorldPosition(new THREE.Vector3());
    const delta=new THREE.Quaternion().setFromUnitVectors(b.sub(a).normalize(),new THREE.Vector3(...direction).normalize());
    const world=bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(delta);
    bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
    bone.updateMatrixWorld(true);
  }
  ['remy','ch22'].forEach((name,index)=>loader.load(`assets/characters/${name}.glb`,g=>{
    const model=g.scene,holder=new THREE.Group();holder.add(model);parent.add(holder);
    const bones={};model.traverse(o=>{if(o.isMesh){o.material=material;o.frustumCulled=false;}if(o.isBone)bones[o.name.split(':').pop().replace(/^mixamorig\d*/, '')]=o;});
    parent.updateMatrixWorld(true);
    const hipsY=bones.Hips.getWorldPosition(new THREE.Vector3()).y,headY=bones.Head.getWorldPosition(new THREE.Vector3()).y;
    model.scale.multiplyScalar(.078/Math.abs(headY-hipsY));
    for(const side of ['Left','Right']){
      aim(bones[side+'UpLeg'],bones[side+'Leg'],[side==='Left'?.055:-.055,-.08,1]);
      aim(bones[side+'Leg'],bones[side+'Foot'],[0,-1,.08]);
      aim(bones[side+'Foot'],bones[side+'ToeBase'],[0,-.15,1]);
      aim(bones[side+'Arm'],bones[side+'ForeArm'],[side==='Left'?.12:-.12,-1,.12]);
      aim(bones[side+'ForeArm'],bones[side+'Hand'],[0,-.16,1]);
    }
    parent.updateMatrixWorld(true);
    const hip=bones.Hips.getWorldPosition(new THREE.Vector3());parent.worldToLocal(hip);model.position.sub(hip);
    // Rest the palms on the thighs with a two-bone solve; preserve arm lengths.
    parent.updateMatrixWorld(true);
    for(const side of ['Left','Right']){
      const arm=bones[side+'Arm'],elbow=bones[side+'ForeArm'],hand=bones[side+'Hand'];
      const start=arm.getWorldPosition(new THREE.Vector3()),mid=elbow.getWorldPosition(new THREE.Vector3()),end=hand.getWorldPosition(new THREE.Vector3());
      const hip=bones.Hips.getWorldPosition(new THREE.Vector3()),sign=side==='Left'?1:-1;
      const target=hip.clone().add(new THREE.Vector3(sign*.024,.002,.046));
      const upper=start.distanceTo(mid),lower=mid.distanceTo(end),axis=target.clone().sub(start),distance=Math.min(axis.length(),upper+lower-.0001);axis.normalize();
      const pole=new THREE.Vector3(sign,0,-.3).addScaledVector(axis,-new THREE.Vector3(sign,0,-.3).dot(axis)).normalize();
      const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
      const joint=start.clone().addScaledVector(axis,along).addScaledVector(pole,height);
      aim(arm,elbow,joint.clone().sub(start).toArray());
      aim(elbow,hand,target.clone().sub(elbow.getWorldPosition(new THREE.Vector3())).toArray());
    }
    holder.position.set(index===0?-.054:.054,.129,index===0?.150:-.150);holder.rotation.y=index===0?Math.PI:0;
    const rest={};Object.entries(bones).forEach(([k,b])=>rest[k]=b.quaternion.clone());actors.push({index,bones,rest});
  }));
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  return {update(t,state){
    const phase=Math.max(0,t-3),turn=smooth((phase-1)/1.2),second=smooth((phase-5)/1.3);
    for(const a of actors){
      const chapter=state?.index??0,time=state?.time??phase;
      const cue=chapter===0?(a.index?9:3):chapter===1?18:chapter===2?(a.index?8:2.4):15;
      const local=time-cue,wave=smooth(local/1.2)*(1-smooth((local-2.8)/1.8));
      const greeting=(chapter===0||chapter===3)?wave:0,calling=chapter===2&&a.index===0?wave:0;
      const head=a.bones.Head;head.quaternion.copy(a.rest.Head).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),(chapter===1?.10:-.10)*wave));
      head.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),(a.index?-.16:.16)*wave));
      const spine=a.bones.Spine;spine.quaternion.copy(a.rest.Spine).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.035*wave));
      const arm=a.bones.RightArm;arm.quaternion.copy(a.rest.RightArm).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-.18*greeting-.32*calling));
      const hand=a.bones.RightHand;hand.quaternion.copy(a.rest.RightHand).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),.12*Math.sin(wave*Math.PI)));
    }
    return {yaw:-.55*turn+1.1*second,tilt:.13*(turn-second)+.1*second};
  }};
}
