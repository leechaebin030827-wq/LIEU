# Scenario adaptation

Source: user-supplied `LIEU_U2D2_WORKING_2026-11-02.zip`.
Selected original sequences: 01_boarding, 02_driving_a, 04_driving_b, 03_arrival.

`sequences.json` retains the original motion, eyes, projector, and event tracks.
Audio and RGBW ring tracks are omitted in this silent monochrome website adaptation.
These sequences are project preview examples, not hardware-confirmed behavior.

The website timeline maps 0.32 viewport heights to one sequence second, matching
its existing automatic scroll speed. Motion keys retain their original time,
interpolation, yaw and tilt. `lieu-source.glb` is the unchanged original
`LIEU_Senario.glb` from the supplied ZIP. `rig.json` carries the source node ownership
and pivots from rigDefaults.ts, plus the original LED calibration.
`scenario-robot.js` ports the original stage matrix composition: fixed rail,
carriage/body yaw, upright centre yaw, and shell tilt Z followed by yaw Y.
Every pose is recomputed from each mesh's original world matrix, never accumulated.
A single parent placement (uniform quarter scale, -90° Y, head height 0.25)
fits the entire original rig into the existing cabin; joint axes remain unchanged.
No hardware commands are sent.

Projector timing/opacity is preserved. Its graphics are restated in monochrome text
using the existing website palette; no external textures or UI styles are introduced.

Human assets are the user-supplied Remy and Ch22 Mixamo-rigged models. They contain
only a basic pose, not motion clips. The seated gestures, head turns and spine motion
are authored here; they are not downloaded Mixamo motion-capture clips.
Reference: https://helpx.adobe.com/creative-cloud/help/animate-characters-mixamo.html

Camera shot groups: wide establishing view, passenger shoulder, LIEU expression closeup,
high angle for projection, and wide departure. Existing cabin renderer/Grainient reused.

Camera revision: continuous orbital paths with quintic ease-in/ease-out, matching position and look-at at every chapter boundary. Guidance/arrival rise and widen to retain the ceiling robot and floor together; conversation lowers to passenger eye level. No shot cuts or time-based camera drift in the directed sequence.

Seating revision: cushion surface sampled at y≈0.114 m; hips placed at y=0.129,
z=±0.150, x=∓0.054, facing the aisle. Palms use a two-bone arm solve onto
the thighs. Source skeletons and limb lengths are retained. People share the seats’ solid black material. The fixed ceiling rail retains
28% black ghost material and is centred over the cabin in both horizontal axes;
its height and the robot joint motion remain unchanged.
Each chapter now has four timed story beats, tied to the original projector windows.
Actor gestures are small chapter-specific cues rather than a recurring large wave.
