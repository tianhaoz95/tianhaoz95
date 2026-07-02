import {
  Color3,
  GlowLayer,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  Vector3,
  type Scene,
} from '@babylonjs/core';
import {
  createMeteorTexturePool,
  paintAccretionDiskTexture,
  paintCreatureTexture,
  paintPlanetTexture,
} from './textures';
import { themeColorHex } from './themeColors';

const SPAWN_MIN_DIST = 60;
const SPAWN_MAX_DIST = 140;
const DESPAWN_BEHIND_DIST = 40;
const DESPAWN_RADIUS = 260;

const METEOR_CAP = 12;
const METEOR_INTERVAL: [number, number] = [1, 3];
const PLANET_CAP = 3;
const PLANET_INTERVAL: [number, number] = [15, 30];
const CREATURE_CAP = 1;
const CREATURE_INTERVAL: [number, number] = [20, 40];
const BLACKHOLE_CAP = 1;
const BLACKHOLE_INTERVAL: [number, number] = [45, 90];

interface LiveObject {
  root: TransformNode;
  velocity: Vector3;
  spin: Vector3;
  update?: (dt: number, elapsedSec: number) => void;
}

function randRange([min, max]: [number, number]): number {
  return min + Math.random() * (max - min);
}

function randomOffset(spread: number): Vector3 {
  return new Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread * 0.6, 0);
}

export interface SpaceObjectsRig {
  dispose: () => void;
}

/**
 * Owns every non-cockpit prop flying around the ship: meteors, planets, a
 * rare black hole, and creatures that sweep across the window. Create-and-
 * dispose per instance rather than pooling — at these spawn cadences the
 * cost of a new mesh + a small procedural texture is negligible, so pooling
 * would add reset-all-state complexity without a measurable perf win.
 */
export function createSpaceObjects(scene: Scene, shipNode: TransformNode, glow: GlowLayer): SpaceObjectsRig {
  const live = new Set<LiveObject>();
  const meteorTextures = createMeteorTexturePool(scene);

  let meteorTimer = 0.5;
  let planetTimer = randRange(PLANET_INTERVAL);
  let creatureTimer = randRange(CREATURE_INTERVAL);
  let blackholeTimer = randRange(BLACKHOLE_INTERVAL);
  let elapsed = 0;

  let meteorCount = 0;
  let planetCount = 0;
  let creatureCount = 0;
  let blackholeCount = 0;

  function spawnPointAhead(spread: number): Vector3 {
    const forward = shipNode.forward;
    const dist = randRange([SPAWN_MIN_DIST, SPAWN_MAX_DIST]);
    return shipNode.position.add(forward.scale(dist)).add(randomOffset(spread));
  }

  function track(root: TransformNode, velocity: Vector3, spin = Vector3.Zero(), update?: LiveObject['update']) {
    live.add({ root, velocity, spin, update });
  }

  function spawnMeteor() {
    const size = 0.6 + Math.random() * 1.6;
    const mesh = MeshBuilder.CreatePolyhedron(
      `spaceship-meteor-${Date.now()}`,
      { type: Math.floor(Math.random() * 4), size },
      scene,
    );
    mesh.position.copyFrom(spawnPointAhead(50));
    const mat = new StandardMaterial('spaceship-meteor-mat', scene);
    mat.diffuseTexture = meteorTextures[Math.floor(Math.random() * meteorTextures.length)];
    mat.specularColor = new Color3(0.05, 0.05, 0.05);
    mesh.material = mat;

    const velocity = new Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 2);
    const spin = new Vector3(Math.random() * 1.2, Math.random() * 1.2, Math.random() * 1.2);
    track(mesh, velocity, spin);
    meteorCount += 1;
    mesh.metadata = { kind: 'meteor' };
  }

  function spawnPlanet() {
    const isGasGiant = Math.random() > 0.5;
    const diameter = isGasGiant ? 30 + Math.random() * 20 : 14 + Math.random() * 10;
    const mesh = MeshBuilder.CreateSphere(`spaceship-planet-${Date.now()}`, { diameter, segments: 24 }, scene);
    mesh.position.copyFrom(spawnPointAhead(160));
    mesh.position.y -= 20; // keep planets from constantly filling the direct forward view
    const mat = new StandardMaterial('spaceship-planet-mat', scene);
    mat.diffuseTexture = paintPlanetTexture(scene, isGasGiant ? 'gas-giant' : 'rocky', Math.random() * 360);
    mat.specularColor = new Color3(0.02, 0.02, 0.02);
    mesh.material = mat;

    if (isGasGiant && Math.random() > 0.4) {
      const ring = MeshBuilder.CreateTorus(`spaceship-planet-ring-${Date.now()}`, { diameter: diameter * 1.7, thickness: diameter * 0.06, tessellation: 48 }, scene);
      ring.parent = mesh;
      ring.rotation.x = Math.PI / 2.2;
      const ringMat = new StandardMaterial('spaceship-ring-mat', scene);
      ringMat.diffuseColor = new Color3(0.6, 0.55, 0.45);
      ringMat.alpha = 0.7;
      ring.material = ringMat;
    }

    const velocity = new Vector3((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3);
    const spin = new Vector3(0, 0.05, 0);
    track(mesh, velocity, spin);
    planetCount += 1;
    mesh.metadata = { kind: 'planet' };
  }

  function spawnCreature() {
    const accent = themeColorHex('--accent-2', '#06b6d4');
    const body = MeshBuilder.CreateSphere(`spaceship-creature-${Date.now()}`, { diameterX: 3.2, diameterY: 1.1, diameterZ: 1.4, segments: 16 }, scene);
    const mat = new StandardMaterial('spaceship-creature-mat', scene);
    mat.emissiveTexture = paintCreatureTexture(scene, accent);
    mat.diffuseColor = Color3.Black();
    mat.emissiveColor = Color3.White();
    body.material = mat;
    glow.addIncludedOnlyMesh(body);

    const tendrils: Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const tendril = MeshBuilder.CreateCylinder(`spaceship-creature-tendril-${i}-${Date.now()}`, { diameterTop: 0.02, diameterBottom: 0.12, height: 2 }, scene);
      tendril.parent = body;
      tendril.position.set((i - 1.5) * 0.5, -0.6, -0.9);
      tendril.rotation.x = Math.PI / 2.4;
      tendril.material = mat;
      tendrils.push(tendril);
    }

    // Near-miss trajectory: spawn to one side near the ship, aim across to
    // the other side, so it visibly sweeps through the window rather than
    // just receding like meteors/planets do.
    const forward = shipNode.forward;
    const side = Math.random() > 0.5 ? 1 : -1;
    const start = shipNode.position.add(forward.scale(40 + Math.random() * 20)).add(new Vector3(side * 22, (Math.random() - 0.5) * 8, 0));
    body.position.copyFrom(start);
    const velocity = new Vector3(-side * 5, (Math.random() - 0.5) * 1.5, 1.5);

    let swimClock = 0;
    track(body, velocity, Vector3.Zero(), (dt) => {
      swimClock += dt;
      for (const [i, tendril] of tendrils.entries()) {
        tendril.rotation.z = Math.sin(swimClock * 3 + i) * 0.35;
      }
      body.rotation.y = Math.atan2(velocity.x, velocity.z);
    });
    creatureCount += 1;
    body.metadata = { kind: 'creature' };
  }

  function spawnBlackHole() {
    const core = MeshBuilder.CreateSphere(`spaceship-blackhole-${Date.now()}`, { diameter: 14, segments: 24 }, scene);
    const coreMat = new StandardMaterial('spaceship-blackhole-core-mat', scene);
    coreMat.diffuseColor = Color3.Black();
    coreMat.specularColor = Color3.Black();
    core.material = coreMat;
    core.position.copyFrom(spawnPointAhead(60));

    const disk = MeshBuilder.CreateTorus('spaceship-blackhole-disk', { diameter: 26, thickness: 3.2, tessellation: 64 }, core.getScene());
    disk.parent = core;
    disk.rotation.x = Math.PI / 2.3;
    const diskMat = new StandardMaterial('spaceship-blackhole-disk-mat', scene);
    diskMat.emissiveTexture = paintAccretionDiskTexture(scene, themeColorHex('--accent', '#4f46e5'), themeColorHex('--accent-2', '#06b6d4'));
    diskMat.diffuseColor = Color3.Black();
    diskMat.emissiveColor = Color3.White();
    disk.material = diskMat;
    glow.addIncludedOnlyMesh(disk);

    track(core, Vector3.Zero(), new Vector3(0, 0.15, 0));
    blackholeCount += 1;
    core.metadata = { kind: 'blackhole' };
  }

  const observer = scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    elapsed += dt;

    meteorTimer -= dt;
    if (meteorTimer <= 0) {
      meteorTimer = randRange(METEOR_INTERVAL);
      if (meteorCount < METEOR_CAP) spawnMeteor();
    }
    planetTimer -= dt;
    if (planetTimer <= 0) {
      planetTimer = randRange(PLANET_INTERVAL);
      if (planetCount < PLANET_CAP) spawnPlanet();
    }
    creatureTimer -= dt;
    if (creatureTimer <= 0) {
      creatureTimer = randRange(CREATURE_INTERVAL);
      if (creatureCount < CREATURE_CAP) spawnCreature();
    }
    blackholeTimer -= dt;
    if (blackholeTimer <= 0) {
      blackholeTimer = randRange(BLACKHOLE_INTERVAL);
      if (blackholeCount < BLACKHOLE_CAP) spawnBlackHole();
    }

    const forward = shipNode.forward;
    for (const obj of Array.from(live)) {
      obj.root.position.addInPlace(obj.velocity.scale(dt));
      obj.root.rotation.x += obj.spin.x * dt;
      obj.root.rotation.y += obj.spin.y * dt;
      obj.root.rotation.z += obj.spin.z * dt;
      obj.update?.(dt, elapsed);

      const relative = obj.root.position.subtract(shipNode.position);
      const along = Vector3.Dot(relative, forward);
      if (along < -DESPAWN_BEHIND_DIST || relative.length() > DESPAWN_RADIUS) {
        const kind = (obj.root as Mesh).metadata?.kind;
        if (kind === 'meteor') meteorCount -= 1;
        else if (kind === 'planet') planetCount -= 1;
        else if (kind === 'creature') creatureCount -= 1;
        else if (kind === 'blackhole') blackholeCount -= 1;
        obj.root.dispose(false, true);
        live.delete(obj);
      }
    }
  });

  return {
    dispose() {
      scene.onBeforeRenderObservable.remove(observer);
      for (const obj of live) obj.root.dispose(false, true);
      live.clear();
      for (const tex of meteorTextures) tex.dispose();
    },
  };
}
