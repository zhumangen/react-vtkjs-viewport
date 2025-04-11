import macro from 'vtk.js/Sources/macro';
import vtkMouseCameraTrackballRotateManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballRotateManipulator';
import vtkMouseCameraTrackballPanManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseCameraTrackballPanManipulator';
import vtkMouseRangeManipulator from 'vtk.js/Sources/Interaction/Manipulators/MouseRangeManipulator';
import Constants from 'vtk.js/Sources/Rendering/Core/InteractorStyle/Constants';

import vtkInteractorStyleMPRSlice from './vtkInteractorStyleMPRSlice.js';
import windowLevelManipulator from '../windowLevelManipulator.js';

const { States } = Constants;

// ----------------------------------------------------------------------------
// Global methods
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// vtkInteractorStyleMPRStackScroll methods
// ----------------------------------------------------------------------------

function vtkInteractorStyleMPRStackScroll(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkInteractorStyleMPRStackScroll');

  // model.stackScrollManipulator = vtkMouseRangeManipulator.newInstance({
  //   button: 1,
  // });
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
    // publicAPI.addMouseManipulator(model.stackScrollManipulator);
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

  const superSetVolumeMapper = publicAPI.setVolumeMapper;
  publicAPI.setVolumeMapper = mapper => {
    model.wlManipulator.setVolumeMapper(mapper);
    if (superSetVolumeMapper(mapper)) {
      const renderer = model.interactor.getCurrentRenderer();
      const camera = renderer.getActiveCamera();
      if (mapper) {
        // prevent zoom manipulator from messing with our focal point
        camera.setFreezeFocalPoint(true);

        // NOTE: Disabling this because it makes it more difficult to switch
        // interactor styles. Need to find a better way to do this!
        // publicAPI.setSliceNormal(...publicAPI.getSliceNormal());
      } else {
        camera.setFreezeFocalPoint(false);
      }
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

  macro.setGet(publicAPI, model, [
    'volumeMapper',
    'onLevelsChanged',
    'levelScale',
  ]);

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
