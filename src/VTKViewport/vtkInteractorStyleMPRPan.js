import macro from 'vtk.js/Sources/macro';
import vtkMouseCameraTrackballPanManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballPanManipulator';
import vtkMouseRangeManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseRangeManipulator';
import vtkInteractorStyleMPRSlice from './vtkInteractorStyleMPRSlice.js';
import windowLevelManipulator from './Manipulators/windowLevelManipulator';

// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// vtkInteractorStyleMPRPan methods
// ----------------------------------------------------------------------------

function vtkInteractorStyleMPRPan(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkInteractorStyleMPRPan');

  model.trackballManipulator = vtkMouseCameraTrackballPanManipulator.newInstance(
    {
      button: 1,
    }
  );
  model.panManipulator = vtkMouseCameraTrackballPanManipulator.newInstance({
    button: 2,
  });
  model.wlManipulator = windowLevelManipulator.newInstance({
    button: 3,
  });
  model.scrollManipulator = vtkMouseRangeManipulator.newInstance({
    scrollEnabled: true,
    dragEnabled: false,
  });

  function setManipulators() {
    publicAPI.removeAllMouseManipulators();
    publicAPI.addMouseManipulator(model.trackballManipulator);
    publicAPI.addMouseManipulator(model.panManipulator);
    publicAPI.addMouseManipulator(model.wlManipulator);
    publicAPI.addMouseManipulator(model.scrollManipulator);
    publicAPI.updateScrollManipulator();
  }

  const superHandleMouseMove = publicAPI.handleMouseMove;
  publicAPI.handleMouseMove = callData => {
    publicAPI.invokeInteractionEvent({ type: 'InteractionEvent' });

    if (superHandleMouseMove) {
      superHandleMouseMove(callData);
    }
  };

  setManipulators();
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Inheritance
  vtkInteractorStyleMPRSlice.extend(publicAPI, model, initialValues);

  macro.setGet(publicAPI, model, ['onInteractiveRotateChanged']);

  // Object specific methods
  vtkInteractorStyleMPRPan(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(
  extend,
  'vtkInteractorStyleMPRPan'
);

// ----------------------------------------------------------------------------

export default Object.assign({ newInstance, extend });
