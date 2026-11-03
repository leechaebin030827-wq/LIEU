// Port of LIEU_Simulator/src/engine/{rig,rigDefaults}.ts and Machine.tsx.
// Work in the source GLB rest-world frame; adapt the whole rig to the cabin once.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const DEG=Math.PI/180;
function about(axis,angle,p){return new THREE.Matrix4().makeTranslation(...p).multiply(axis==='y'?new THREE.Matrix4().makeRotationY(angle*DEG):new THREE.Matrix4().makeRotationZ(angle*DEG)).multiply(new THREE.Matrix4().makeTranslation(...p.map(v=>-v)));}
export function computeStageMatrices(m,rig){
 const carriage=new THREE.Matrix4().makeTranslation(m.railX,m.liftY||0,0).multiply(about('y',m.bodyYaw||0,rig.pivots.yaw));
 return {fixedRail:new THREE.Matrix4(),carriage,yaw:carriage.clone().multiply(about('y',m.yawY,rig.pivots.yaw)),tilt:carriage.clone().multiply(about('z',m.tiltZ,rig.pivots.tilt)).multiply(about('y',m.yawY,rig.pivots.yaw))};
}
export async function loadSourceRobot(parent,center,material){
 const [g,rig]=await Promise.all([new GLTFLoader().loadAsync('assets/scenario/lieu-source.glb'),fetch('assets/scenario/rig.json').then(r=>r.json())]);
 const root=new THREE.Group();root.name='LIEU original simulator rig';
 // Original robot is 26 cm wide; the existing cabin asset is at quarter scale.
 root.scale.setScalar(.25);root.rotation.y=-Math.PI/2;root.position.set(-center.x,.25-center.y,-center.z);parent.add(root);
 g.scene.updateMatrixWorld(true);const parts=[];
 g.scene.traverse(mesh=>{if(!mesh.isMesh)return;let o=mesh,node;while(o){node=g.parser.associations.get(o)?.nodes;if(node!==undefined)break;o=o.parent;}if(rig.owner[node]!==undefined)parts.push({mesh,node,rest:mesh.matrixWorld.clone()});});
 // Centre the fixed rail over the cabin origin while retaining its height.
 // Update rest too: the per-frame stage solver must not restore the source offset.
 const railBounds=new THREE.Box3();
 for(const p of parts)if(p.node===143){p.mesh.geometry.computeBoundingBox();railBounds.union(p.mesh.geometry.boundingBox.clone().applyMatrix4(p.rest));}
 if(!railBounds.isEmpty()){
   const midpoint=railBounds.getCenter(new THREE.Vector3());
   const align=new THREE.Matrix4().makeTranslation(-midpoint.x,0,-midpoint.z);
   for(const p of parts)if(p.node===143)p.rest.premultiply(align);
 }
 const railGhost=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.28,depthWrite:false,side:THREE.FrontSide,toneMapped:false});
 for(const p of parts){root.add(p.mesh);p.mesh.material=p.node===143?railGhost:material;p.mesh.matrixAutoUpdate=false;p.mesh.matrix.copy(p.rest);}
 // Seat each LED on the actual shell at the source calibration's Y/Z coordinates.
 const shell=parts.find(p=>p.node===135),eyes=[];
 if(shell){root.updateMatrixWorld(true);const shellLocal=new THREE.Mesh(shell.mesh.geometry,material);shellLocal.matrixAutoUpdate=false;shellLocal.matrix.copy(shell.rest);shellLocal.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(),geometry=new THREE.SphereGeometry(.00085,6,4),ink=new THREE.MeshBasicMaterial({color:0xf2f2f6,toneMapped:false});
 rig.eyes.forEach((eye,side)=>eye.pixels.forEach(pixel=>{const [,y,z]=pixel.worldPositionMeters;ray.set(new THREE.Vector3(.3,y,z),new THREE.Vector3(-1,0,0));const hit=ray.intersectObject(shellLocal,false)[0];if(!hit)return;const dot=new THREE.Mesh(geometry,ink);dot.position.copy(hit.point);dot.position.x+=.00035;dot.updateMatrix();const rest=dot.matrix.clone();dot.matrixAutoUpdate=false;root.add(dot);eyes.push({dot,rest,side,row:pixel.row,col:pixel.col});}));}
 return {root,parts,update(state,sample){const tracks=state.sequence.tracks;const motion=Object.fromEntries(['railX','liftY','bodyYaw','yawY','tiltZ'].map(k=>[k,sample(tracks.motion[k],state.time)]));const stages=computeStageMatrices(motion,rig);
 for(const p of parts){p.mesh.matrix.multiplyMatrices(stages[rig.owner[p.node]||'fixedRail'],p.rest);p.mesh.matrixWorldNeedsUpdate=true;}
 for(const e of eyes){const rows=sample(tracks.eyes[e.side===0?'left':'right'],state.time);e.dot.visible=Array.isArray(rows)&&!!(rows[e.row]&(1<<(7-e.col)));e.dot.matrix.multiplyMatrices(stages.tilt,e.rest);e.dot.matrixWorldNeedsUpdate=true;}
 }};
}
