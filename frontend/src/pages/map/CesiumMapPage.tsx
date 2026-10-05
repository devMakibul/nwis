import { useState } from "react";
import { Viewer, Globe, Entity, CylinderGraphics } from "resium";
import { Cartesian3, Color } from "cesium";

export function CesiumMapPage() {
  return (
    <div style={{ height: "100vh" }}>
      <Viewer full>
        <Globe translucent={true} depthTestAgainstTerrain={true} />
        <Entity position={Cartesian3.fromDegrees(-114.0, 40.0, -1500.0)}>
          <CylinderGraphics length={3000} topRadius={50000} bottomRadius={50000} material={Color.RED.withAlpha(0.5)} />
        </Entity>
      </Viewer>
    </div>
  );
}
