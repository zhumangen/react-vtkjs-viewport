import macro from 'vtk.js/Sources/macro';
import vtkMouseCameraTrackballPanManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballPanManipulator';
import vtkMouseRangeManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseRangeManipulator';
import vtkInteractorStyleMPRSlice from './vtkInteractorStyleMPRSlice.js';
import windowLevelManipulator from './Manipulators/windowLevelManipulator.js';

// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// vtkInteractorStyleMPRStackScroll methods
// ----------------------------------------------------------------------------

function vtkInteractorStyleMPRStackScroll(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkInteractorStyleMPRStackScroll');

  model.panManipulator = vtkMouseCameraTrackballPanManipulator.newInstance({
    button: 2,
  });
  model.wlManipulator = windowLevelManipulator.newInstance({
    button: 3,
  });
  model.scrollManipulator = vtkMouseRangeManipulator.newInstance({
    button: 1,
    scrollEnabled: true,
  });

  function setManipulators() {
    publicAPI.removeAllMouseManipulators();
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
  vtkInteractorStyleMPRStackScroll(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(
  extend,
  'vtkInteractorStyleMPRStackScroll'
);

// ----------------------------------------------------------------------------

export default Object.assign({ newInstance, extend });
