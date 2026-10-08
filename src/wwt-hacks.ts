// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

/* eslint-disable */

import {
  Color, Colors, Constellations, Coordinates, Grids,
  LayerManager, LayerMap, PushPin, Settings, SpaceTimeController,
  SpreadSheetLayer, Text3d, Text3dBatch, URLHelpers,
  Vector3d, WWTControl
} from "@wwtelescope/engine";

export function zoom(factor: number) {
  this.renderContext.targetCamera.zoom *= factor;
  if (this.renderContext.targetCamera.zoom > this.get_zoomMax()) {
    this.renderContext.targetCamera.zoom = this.get_zoomMax();
  }
  if (this.renderContext.targetCamera.zoom < this.get_zoomMin()) {
    this.renderContext.targetCamera.zoom = this.get_zoomMin();
  }

  if (!Settings.get_globalSettings().get_smoothPan()) {
    this.renderContext.viewCamera = this.renderContext.targetCamera.copy();
  }
}

export function drawSkyOverlays() {
  if (Settings.get_active().get_showConstellationLabels()) {
    Constellations.drawConstellationNames(this.renderContext, 1, Colors.get_yellow());
  }
  if (Settings.get_active().get_showConstellationFigures()) {
    if (WWTControl.constellationsFigures == null) {
      WWTControl.constellationsFigures = Constellations.create('Constellations', URLHelpers.singleton.engineAssetUrl('figures.txt'), false, false, false);
    }
    WWTControl.constellationsFigures.draw(this.renderContext, false, 'UMA', false);
  }
  if (Settings.get_active().get_showAltAzGrid()) {
    const altAzColor = Color.fromArgb(1, 3, 92, 134);
    Grids.drawAltAzGrid(this.renderContext, 1, altAzColor);
    if (Settings.get_active().get_showAltAzGridText()) {
      Grids.drawAltAzGridText(this.renderContext, 1, altAzColor);
    }
  }
}

export function initializeConstellationNames() {
  if (Constellations.constellationCentroids == null) {
    return;
  }
  const textSize = 50;
  Constellations._namesBatch = new Text3dBatch(textSize);
  Object.keys(Constellations.constellationCentroids).forEach(key => {
    const centroid = Constellations.constellationCentroids[key];
    const center = Coordinates.raDecTo3dAu(centroid.get_RA(), centroid.get_dec(), 1);
    const up = Vector3d.create(0, 1, 0);
    let name = centroid.get_name();
    if (centroid.get_name() === 'Triangulum Australe') {
      name = name.replace(" ", "\n   ");
    }
    Constellations._namesBatch.add(new Text3d(center, up, name, textSize, 0.000125));
  });
};

export function makeAltAzGridText() {
  if (Grids._altAzTextBatch == null) {
    const glyphHeight = 70;
    Grids._altAzTextBatch = new Text3dBatch(glyphHeight);
    const sign = SpaceTimeController.get_location().get_lat() < 0 ? -1 : 1;
    const alt = 0.03 * sign;
    const up = Vector3d.create(0, sign, 0);
    const directions = [
      [[0, alt, -1], "N"],
      [[-1, alt, 0], "E"],
      [[0, alt, 1], "S"],
      [[1, alt, -0.0095], "V"],
      [[1, alt, 0.0095], "V"]
    ]
    directions.forEach(([v, text]) => {
      Grids._altAzTextBatch.add(new Text3d(Vector3d.create(...v), up, text, 75, 0.00018));
    });
  }
}

export function drawSpreadSheetLayer(renderContext, opacity, flat) {
  var device = renderContext;
  if (this.version !== this.lastVersion) {
    this.cleanUp();
  }
  this.lastVersion = this.version;
  if (this.bufferIsFlat !== flat) {
    this.cleanUp();
    this.bufferIsFlat = flat;
  }
  if (this.dirty) {
    this.prepVertexBuffer(device, opacity);
  }
  var jNow = SpaceTimeController.get_jNow() - SpaceTimeController.utcToJulian(this.baseDate);
  var adjustedScale = this.scaleFactor * 3;
  if (flat && this.astronomical && (this._markerScale$1 === 1)) {
    adjustedScale = (this.scaleFactor / (renderContext.viewCamera.zoom / 360));
  }
  if (this.triangleList2d != null) {
    this.triangleList2d.decay = this.decay;
    this.triangleList2d.sky = this.get_astronomical();
    this.triangleList2d.timeSeries = this.timeSeries;
    this.triangleList2d.jNow = jNow;
    this.triangleList2d.draw(renderContext, opacity * this.get_opacity(), 1);
  }
  if (this.triangleList != null) {
    this.triangleList.decay = this.decay;
    this.triangleList.sky = this.get_astronomical();
    this.triangleList.timeSeries = this.timeSeries;
    this.triangleList.jNow = jNow;
    this.triangleList.draw(renderContext, opacity * this.get_opacity(), 1);
  }
  if (this.pointList != null) {
    this.pointList.depthBuffered = false;
    this.pointList.showFarSide = this.get_showFarSide();
    this.pointList.decay = (this.timeSeries) ? this.decay : 0;
    this.pointList.sky = this.get_astronomical();
    this.pointList.timeSeries = this.timeSeries;
    this.pointList.jNow = jNow;
    this.pointList.scale = (this._markerScale$1 === 1) ? adjustedScale : -adjustedScale;
    switch (this._plotType$1) {
      case 0:
        this.pointList.draw(renderContext, opacity * this.get_opacity(), false);
        break;
      case 2:
        this.pointList.drawTextured(renderContext, SpreadSheetLayer.get__circleTexture$1().texture2d, opacity * this.get_opacity());
        break;
      case 1:
        this.pointList.drawTextured(renderContext, PushPin.getPushPinTexture(19), opacity * this.get_opacity());
        break;
      case 3:
        this.pointList.drawTextured(renderContext, PushPin.getPushPinTexture(35), opacity * this.get_opacity());
        break;
      case 5:
      case 4:
        this.pointList.drawTextured(renderContext, PushPin.getPushPinTexture(this._markerIndex$1), opacity * this.get_opacity());
        break;
      default:
        break;
    }
  }
  if (this.lineList != null) {
    this.lineList.sky = this.get_astronomical();
    this.lineList.decay = this.decay;
    this.lineList.timeSeries = this.timeSeries;
    this.lineList.jNow = jNow;
    this.lineList.drawLines(renderContext, opacity * this.get_opacity());
  }
  if (this.lineList2d != null) {
    this.lineList2d.sky = this.get_astronomical();
    this.lineList2d.decay = this.decay;
    this.lineList2d.timeSeries = this.timeSeries;
    this.lineList2d.showFarSide = this.get_showFarSide();
    this.lineList2d.jNow = jNow;
    this.lineList2d.drawLines(renderContext, opacity * this.get_opacity());
  }
  return true;
}

// ── Milky Way texture fade + size override ────────────────────────────────────
// WWT computes: opacity = clamp((log(zoom) - FADE_ZERO) / FADE_RANGE, 0, 1)
// Stock values: FADE_ZERO = 17.9, FADE_RANGE = 2.3
const MW_FADE_ZERO   = 18.6;  // ← raise to fade out sooner when zooming in
const MW_FADE_RANGE  = 2.3;   // ← widen for a softer fade
// MW_ANGLE_SCALE expands the ±64° lat/lng quad extents built by _createGalaxyImage.
// The camera sits at the origin so world-matrix scaling has no angular effect;
// we instead rebuild the GL vertex buffer with a larger angular footprint.
const MW_ANGLE_SCALE = 1.05;  // ← increase to make the galaxy image larger

let _galaxyVertexBufferPatched = false;

function _patchGalaxyVertexBuffer(renderContext) {
  if (!Grids._galaxyImageVertexBuffer) return;
  const subdivs     = 50;
  const scaleFactor = 60800000;
  const ecliptic    = Coordinates.meanObliquityOfEcliptic(SpaceTimeController.get_jNow()) / 180 * Math.PI;
  const step        = 1 / subdivs;
  const data        = new Float32Array((subdivs + 1) * (subdivs + 1) * 5);
  for (let y1 = 0; y1 <= subdivs; y1++) {
    // Original WWT formula: latMin=64, latMax=-64, latDegrees=-128
    // → lat runs from -64 at y1=0 to +64 at y1=50.  Mirror exactly, scaled.
    const lat = (-64 + 128 * (y1 < subdivs ? y1 : subdivs) * step) * MW_ANGLE_SCALE;
    for (let x1 = 0; x1 <= subdivs; x1++) {
      const lng = (-64 + 128 * (x1 < subdivs ? x1 : subdivs) * step) * MW_ANGLE_SCALE;
      const pt  = Vector3d.create(lng * scaleFactor, 0, (lat - 28) * scaleFactor);
      pt.rotateY( 213           / 180 * Math.PI);
      pt.rotateZ((-62.87175)    / 180 * Math.PI);
      pt.rotateY((-192.8595083) / 180 * Math.PI);
      pt.rotateX(ecliptic);
      const vi = (y1 * (subdivs + 1) + x1) * 5;
      data[vi]     = pt.x;
      data[vi + 1] = pt.y;
      data[vi + 2] = pt.z;
      data[vi + 3] = 1 - x1 * step;  // u  (matches original)
      data[vi + 4] = y1 * step;       // v  (matches original)
    }
  }
  const gl = renderContext.gl;
  gl.bindBuffer(gl.ARRAY_BUFFER, Grids._galaxyImageVertexBuffer.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

const _origDrawGalaxyImage = Grids.drawGalaxyImage;
export function drawGalaxyImage(renderContext, _opacity) {
  const zoom    = renderContext.viewCamera.zoom;
  const opacity = Math.min(1, Math.max(0, (Math.log(zoom) - MW_FADE_ZERO) / MW_FADE_RANGE));
  if (opacity > 0) {
    _origDrawGalaxyImage.call(this, renderContext, opacity);
    if (!_galaxyVertexBufferPatched && Grids._galaxyImageVertexBuffer) {
      _patchGalaxyVertexBuffer(renderContext);
      _galaxyVertexBufferPatched = true;
    }
  }
}

export function layerManagerDraw(renderContext, opacity, astronomical, referenceFrame, nested, cosmos) {
  if (!(referenceFrame in LayerManager.get_allMaps())) {
    return;
  }
  var thisMap = LayerManager.get_allMaps()[referenceFrame];
  if (!thisMap.enabled || (!thisMap.layers.length && !(thisMap.frame.showAsPoint || thisMap.frame.showOrbitPath))) {
    return;
  }
  var matOld = renderContext.get_world();
  var matOldNonRotating = renderContext.get_worldBaseNonRotating();
  var oldNominalRadius = renderContext.get_nominalRadius();
  if ((thisMap.frame.reference === 18 | thisMap.frame.reference === 18) === 1) {
    thisMap.computeFrame(renderContext);
    if (thisMap.frame.referenceFrameType !== 1 && thisMap.frame.referenceFrameType !== 2) {
      renderContext.set_world(Matrix3d.multiplyMatrix(thisMap.frame.worldMatrix, renderContext.get_world()));
    }
    else {
      renderContext.set_world(Matrix3d.multiplyMatrix(thisMap.frame.worldMatrix, renderContext.get_worldBaseNonRotating()));
    }
    renderContext.set_nominalRadius(thisMap.frame.meanRadius);
  }
  //console.log("========");
  for (const layer of LayerManager.get_allMaps()[referenceFrame].layers) {
    if (layer.enabled) {
      //console.log(layer);
      var layerStart = SpaceTimeController.utcToJulian(layer.get_startTime());
      var layerEnd = SpaceTimeController.utcToJulian(layer.get_endTime());
      var fadeIn = SpaceTimeController.utcToJulian(layer.get_startTime()) - ((layer.get_fadeType() === 1 || layer.get_fadeType() === 3) ? (layer.get_fadeSpan() / 864000000) : 0);
      var fadeOut = SpaceTimeController.utcToJulian(layer.get_endTime()) + ((layer.get_fadeType() === 2 || layer.get_fadeType() === 3) ? (layer.get_fadeSpan() / 864000000) : 0);
      if (SpaceTimeController.get_jNow() > fadeIn && SpaceTimeController.get_jNow() < fadeOut) {
        var fadeOpacity = 1;
        if (SpaceTimeController.get_jNow() < layerStart) {
          fadeOpacity = ((SpaceTimeController.get_jNow() - fadeIn) / (layer.get_fadeSpan() / 864000000));
        }
        if (SpaceTimeController.get_jNow() > layerEnd) {
          fadeOpacity = ((fadeOut - SpaceTimeController.get_jNow()) / (layer.get_fadeSpan() / 864000000));
        }
        layer.set_astronomical(astronomical);
        layer.draw(renderContext, opacity * fadeOpacity, cosmos);
      }
    }
  }
  renderContext.set_nominalRadius(oldNominalRadius);
  renderContext.set_world(matOld);
  renderContext.set_worldBaseNonRotating(matOldNonRotating);
};