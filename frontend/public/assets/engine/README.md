# AeroTwin-UAV 3D Engine Asset Directory

Place your aero piston engine 3D model asset in this folder:

```
frontend/public/assets/engine/aero_piston_engine.glb
```

### Specifications:
- **Format**: Binary glTF (`.glb`) or glTF (`.gltf`).
- **Engine Type**: Aero Piston Engine (e.g., Rotax 914 / 915 iS Turbocharged 4-cylinder horizontally opposed piston engine).
- **Scale**: Normalized around origin with bounding dimension approximately 2 to 4 units.
- **Orientation**: Front (propeller flange / reduction gearbox) along +Z or -Z, top cylinders / intake plenum along +Y.

When `aero_piston_engine.glb` is present, `AeroPistonEngine3D.jsx` will automatically load and display it in place of the schematic fallback.
