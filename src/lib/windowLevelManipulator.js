import macro from 'vtk.js/Sources/macro';
import vtkCompositeCameraManipulator from 'vtk.js/Sources/Interaction/Manipulators/CompositeCameraManipulator';
import vtkCompositeMouseManipulator from 'vtk.js/Sources/Interaction/Manipulators/CompositeMouseManipulator';
import { toWindowLevel, toLowHighRange } from './windowLevelRangeConverter';

function windowLevelManipulator(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('windowLevelManipulator');

  publicAPI.onButtonDown = (interactor, renderer, position) => {
    model.previousPosition = position;
  };

  publicAPI.onMouseMove = (interactor, renderer, position) => {
    if (!position) {
      return;
    }

    const pos = position;
    const lastPos = model.previousPosition;
    model.previousPosition = position;

    const range = model.volumeMapper
      .getMapper()
      .getInputData()
      .getPointData()
      .getScalars()
      .getRange();
    const imageDynamicRange = range[1] - range[0];
    const multiplier = (imageDynamicRange / 1024) * model.levelScale;

    const dx = (pos.x - lastPos.x) * multiplier;
    // scale the center at a smaller scale
    const dy = (pos.y - lastPos.y) * multiplier * 0.5;

    let { windowWidth, windowCenter } = publicAPI.getWindowLevel();

    windowWidth = Math.max(1, Math.round(windowWidth + dx));
    windowCenter = Math.round(windowCenter + dy);

    publicAPI.setWindowLevel(windowWidth, windowCenter);

    if (interactor.getLightFollowCamera()) {
      renderer.updateLightsGeometryToFollowCamera();
    }
  };

  publicAPI.getWindowLevel = () => {
    const range = model.volumeMapper
      .getProperty()
      .getRGBTransferFunction(0)
      .getMappingRange()
      .slice();
    return toWindowLevel(...range);
  };

  publicAPI.setWindowLevel = (windowWidth, windowCenter) => {
    const lowHigh = toLowHighRange(windowWidth, windowCenter);

    model.volumeMapper
      .getProperty()
      .getRGBTransferFunction(0)
      .setMappingRange(lowHigh.lower, lowHigh.upper);
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  previousPosition: [0, 0],
  levelScale: 1,
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Inheritance
  macro.obj(publicAPI, model);
  vtkCompositeCameraManipulator.extend(publicAPI, model, initialValues);
  vtkCompositeMouseManipulator.extend(publicAPI, model, initialValues);
  macro.setGet(publicAPI, model, ['volumeMapper']);

  // Object specific methods
  windowLevelManipulator(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'windowLevelManipulator');

// ----------------------------------------------------------------------------

export default { newInstance, extend };
