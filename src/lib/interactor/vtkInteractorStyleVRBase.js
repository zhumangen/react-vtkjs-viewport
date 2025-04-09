import macro from 'vtk.js/Sources/macro';
import vtkMath from 'vtk.js/Sources/Common/Core/Math';
import vtkInteractorStyleTrackballCamera from 'vtk.js/Sources/Interaction/Style/InteractorStyleTrackballCamera';

// ----------------------------------------------------------------------------
// vtkInteractorStyleVRBase methods
// ----------------------------------------------------------------------------

function vtkInteractorStyleVRBase(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkInteractorStyleVRBase');

  let cameraSub = null;
  let interactorSub = null;
  const superSetInteractor = publicAPI.setInteractor;

  publicAPI.setInteractor = interactor => {
    superSetInteractor(interactor);

    if (cameraSub) {
      cameraSub.unsubscribe();
      cameraSub = null;
    }

    if (interactorSub) {
      interactorSub.unsubscribe();
      interactorSub = null;
    }

    if (interactor) {
      const renderer = interactor.getCurrentRenderer();
      const camera = renderer.getActiveCamera();

      cameraSub = camera.onModified(() => {
        publicAPI.modified();
      });

      interactorSub = interactor.onAnimation(() => {
        camera.setThicknessFromFocalPoint(model.slabThickness);
      });
    }
  };

  function isCameraViewInitialized(camera) {
    const dist = camera.getDistance();

    return (
      typeof dist === 'number' && dist === Number(dist) && Number.isFinite(dist)
    );
  }

  function setViewUpInternal(viewUp) {
    const renderer = model.interactor.getCurrentRenderer();
    const camera = renderer.getActiveCamera();
    camera.setViewUp(...viewUp);
  }

  // in world space
  function setSliceNormalInternal(normal) {
    const renderer = model.interactor.getCurrentRenderer();
    const camera = renderer.getActiveCamera();

    //copy arguments for internal editing so we don't cause sideeffects
    const _normal = [...normal];

    if (model.volumeActor) {
      vtkMath.normalize(_normal);

      let center = camera.getFocalPoint();
      let dist = camera.getDistance();
      let angle = camera.getViewAngle();

      if (!isCameraViewInitialized(camera)) {
        const bounds = model.volumeActor.getMapper().getBounds();
        // diagonal will be used as "width" of camera scene
        const diagonal = Math.sqrt(
          vtkMath.distance2BetweenPoints(
            [bounds[0], bounds[2], bounds[4]],
            [bounds[1], bounds[3], bounds[5]]
          )
        );

        // center will be used as initial focal point
        center = [
          (bounds[0] + bounds[1]) / 2.0,
          (bounds[2] + bounds[3]) / 2.0,
          (bounds[4] + bounds[5]) / 2.0,
        ];

        angle = 90;

        // distance from camera to focal point
        dist = diagonal / (2 * Math.tan((angle / 360) * Math.PI));
      }

      const cameraPos = [
        center[0] - _normal[0] * dist,
        center[1] - _normal[1] * dist,
        center[2] - _normal[2] * dist,
      ];

      camera.setPosition(...cameraPos);
      camera.setDistance(dist);
      // should be set after pos and distance
      camera.setDirectionOfProjection(..._normal);
      camera.setViewAngle(angle);

      camera.setThicknessFromFocalPoint(model.slabThickness);
    }
  }

  publicAPI.setVolumeActor = actor => {
    model.volumeActor = actor;
  };

  // Slice normal is just camera DOP
  publicAPI.getSliceNormal = () => {
    if (model.volumeActor && model.interactor) {
      const renderer = model.interactor.getCurrentRenderer();
      const camera = renderer.getActiveCamera();
      return camera.getDirectionOfProjection();
    }
    return [0, 0, 0];
  };

  publicAPI.setSliceNormal = (...normal) => {
    setSliceNormalInternal(normal);
  };

  publicAPI.getViewUp = () => {
    if (model.volumeActor && model.interactor) {
      const renderer = model.interactor.getCurrentRenderer();
      const camera = renderer.getActiveCamera();

      return camera.getViewUp();
    }

    return [0, 0, 0];
  };

  publicAPI.setViewUp = (...viewUp) => {
    setViewUpInternal(viewUp);
  };

  publicAPI.setOrientation = (normal, viewUp) => {
    setSliceNormalInternal(normal);
    setViewUpInternal(viewUp);
  };

  publicAPI.setSlabThickness = slabThickness => {
    model.slabThickness = slabThickness;

    // Update the camera clipping range if the slab
    // thickness property is changed
    const renderer = model.interactor.getCurrentRenderer();
    const camera = renderer.getActiveCamera();
    camera.setThicknessFromFocalPoint(slabThickness);
  };

  publicAPI.setUid = uid => {
    model.uid = uid;
  };

  publicAPI.getUid = () => {
    return model.uid;
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  slabThickness: 0.1,
  uid: '',
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Inheritance
  vtkInteractorStyleTrackballCamera.extend(publicAPI, model, initialValues);

  macro.setGet(publicAPI, model, ['onScroll']);
  macro.get(publicAPI, model, [
    'slabThickness',
    'volumeActor',
    'apis',
    'apiIndex',
  ]);

  // Object specific methods
  vtkInteractorStyleVRBase(publicAPI, model);
}

// ----------------------------------------------------------------------------

// Returns new instance factory, takes initial values object
export const newInstance = macro.newInstance(
  extend,
  'vtkInteractorStyleVRBase'
);

// ----------------------------------------------------------------------------

export default Object.assign({ newInstance, extend });
