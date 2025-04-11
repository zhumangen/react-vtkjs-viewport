import React, { Component } from 'react';
import PropTypes from 'prop-types';
import vtkGenericRenderWindow from 'vtk.js/Sources/Rendering/Misc/GenericRenderWindow';
import vtkWidgetManager from 'vtk.js/Sources/Widgets/Core/WidgetManager';
import vtkCoordinate from 'vtk.js/Sources/Rendering/Core/Coordinate';
import vtkInteractorStyleMPRSlice from '../lib/interactor/vtkInteractorStyleMPRSlice';
import ViewportOverlay from '../ViewportOverlay/ViewportOverlay.js';
import { createSub } from '../lib/createSub.js';
import { uuidv4 } from './../helpers';
import CrosshairOverlay from '../CrosshairOverlay/CrosshairOverlay.js';
import { quat, vec3, mat4 } from 'gl-matrix';
import { degrees2radians } from '../lib/math/angles';

export default class View2D extends Component {
  static propTypes = {
    volumes: PropTypes.array.isRequired,
    dataDetails: PropTypes.object,
    onCreated: PropTypes.func,
    onDestroyed: PropTypes.func,
    onRotate: PropTypes.func,
    onThickness: PropTypes.func,
    orientation: PropTypes.object,
    viewportIndex: PropTypes.number.isRequired,
    onDoubleClick: PropTypes.func,
    viewRotation: PropTypes.number,
  };

  static defaultProps = {
    viewRotation: 0,
  };

  constructor(props) {
    super(props);

    this.genericRenderWindow = null;
    this.widgetManager = vtkWidgetManager.newInstance();
    this.container = React.createRef();

    this.subs = {
      interactor: createSub(),
      data: createSub(),
    };
    this.interactorStyleSubs = [];
    this.state = {
      voi: this.getVOI(props.volumes[0]),
      rotation: { x: 0, y: 0 },
      canvasCoords: { x: 0, y: 0 },
      orientation: {
        sliceNormal: [...props.orientation.sliceNormal],
        viewUp: [...props.orientation.viewUp],
      },
      showCrosshair: false,
      xAxis: {
        color: '',
        rotation: 0,
        thickness: 0,
      },
      yAxis: {
        color: '',
        rotation: 0,
        thickness: 0,
      },
    };

    this.apiProperties = {};
  }

  componentDidMount() {
    // Tracking ID to tie emitted events to this component
    const uid = uuidv4();

    this.genericRenderWindow = vtkGenericRenderWindow.newInstance({
      background: [0, 0, 0],
    });

    this.genericRenderWindow.setContainer(this.container.current);

    let widgets = [];
    let volumes = [];

    this.renderer = this.genericRenderWindow.getRenderer();
    this.renderWindow = this.genericRenderWindow.getRenderWindow();
    const oglrw = this.genericRenderWindow.getOpenGLRenderWindow();

    // update view node tree so that vtkOpenGLHardwareSelector can access
    // the vtkOpenGLRenderer instance.
    oglrw.buildPass(true);

    const istyle = vtkInteractorStyleMPRSlice.newInstance();
    istyle.setOnScroll();
    this.renderWindow.getInteractor().setInteractorStyle(istyle);

    // trigger pipeline update
    this.componentDidUpdate({});

    if (this.props.volumes) {
      volumes = volumes.concat(this.props.volumes);
    }

    // Set orientation based on props
    if (this.props.orientation) {
      const { orientation } = this.props;

      this.setOrientation(orientation.sliceNormal, orientation.viewUp);
    } else {
      istyle.setSliceNormal(0, 0, 1);
    }

    const camera = this.renderer.getActiveCamera();

    camera.setParallelProjection(true);
    this.renderer.resetCamera();

    // istyle.setVolumeActor(this.props.volumes[0]);
    const range = istyle.getSliceRange();
    istyle.setSlice((range[0] + range[1]) / 2);

    this.updateSlicePlane();

    // TODO: Not sure why this is necessary to force the initial draw
    this.genericRenderWindow.resize();

    const boundUpdateVOI = this.updateVOI.bind(this);
    const boundGetOrienation = this.getOrientation.bind(this);
    const boundSetOrientation = this.setOrientation.bind(this);
    const boundResetOrientation = this.resetOrientation.bind(this);
    const boundGetViewUp = this.getViewUp.bind(this);
    const boundGetSliceNormal = this.getSliceNormal.bind(this);
    const boundSetInteractorStyle = this.setInteractorStyle.bind(this);
    const boundGetSlabThickness = this.getSlabThickness.bind(this);
    const boundSetSlabThickness = this.setSlabThickness.bind(this);
    const boundGetApiProperty = this.getApiProperty.bind(this);
    const boundSetApiProperty = this.setApiProperty.bind(this);
    const boundUpdateImage = this.updateImage.bind(this);
    const boundupdateCanvasCoords = this.updateCanvasCoords.bind(this);
    const boundSetAxis = this.setAxis.bind(this);
    const boundGetAxis = this.getAxis.bind(this);
    const boundSetRotation = this.setRotation.bind(this);
    const boundGetRotation = this.getRotation.bind(this);
    const boundToggleCrosshairs = this.toggleCrosshairs.bind(this);

    this.svgWidgets = {};

    if (this.props.onCreated) {
      /**
       * Note: The contents of this Object are
       * considered part of the API contract
       * we make with consumers of this component.
       */
      const api = {
        uid, // Tracking id available on `api`
        genericRenderWindow: this.genericRenderWindow,
        widgetManager: this.widgetManager,
        container: this.container.current,
        widgets,
        svgWidgets: this.svgWidgets,
        volumes,
        _component: this,
        updateImage: boundUpdateImage,
        updateVOI: boundUpdateVOI,
        getOrientation: boundGetOrienation,
        setOrientation: boundSetOrientation,
        resetOrientation: boundResetOrientation,
        getViewUp: boundGetViewUp,
        getSliceNormal: boundGetSliceNormal,
        setInteractorStyle: boundSetInteractorStyle,
        getSlabThickness: boundGetSlabThickness,
        setSlabThickness: boundSetSlabThickness,
        get: boundGetApiProperty,
        set: boundSetApiProperty,
        updateCanvasCoords: boundupdateCanvasCoords,
        setAxis: boundSetAxis,
        getAxis: boundGetAxis,
        setRotation: boundSetRotation,
        getRotation: boundGetRotation,
        toggleCrosshairs: boundToggleCrosshairs,
        type: 'VIEW2D',
      };

      this.props.onCreated(api);
    }
  }

  toggleCrosshairs() {
    this.setState({ showCrosshair: !this.state.showCrosshair });
  }

  updateCanvasCoords(intersection) {
    const point3d = intersection;
    if (this.renderer) {
      const wPos = vtkCoordinate.newInstance();
      wPos.setCoordinateSystemToWorld();
      wPos.setValue(point3d);
      const coord = wPos.getComputedDisplayValue(this.renderer);
      this.setState({
        canvasCoords: {
          x: coord[0],
          y: coord[1],
        },
      });
    }
  }

  updateSlicePlane() {
    // TODO: optimize so you don't have to calculate EVERYTHING every time?
    // rotate around the vector of the cross product of the plane and viewup as the X component
    let sliceXRotVector = [];
    const {
      sliceNormal: propSliceNormal,
      viewUp: propViewUp,
    } = this.props.orientation;
    const { viewRotation } = this.props;
    const { sliceNormal, viewUp } = this.state.orientation;
    const { x: xRotate, y: yRotate } = this.state.rotation;
    vec3.cross(sliceXRotVector, viewUp, sliceNormal);
    vec3.normalize(sliceXRotVector, sliceXRotVector);
    let sliceYRotVector = viewUp;
    const planeMat = mat4.create();
    mat4.rotate(planeMat, planeMat, degrees2radians(yRotate), sliceYRotVector);
    mat4.rotate(planeMat, planeMat, degrees2radians(xRotate), sliceXRotVector);
    vec3.transformMat4(propSliceNormal, sliceNormal, planeMat);

    // Rotate the viewUp in 90 degree increments
    const viewRotQuat = quat.create();
    // Use - degrees since the axis of rotation should really be the direction of projection, which is the negative of the plane normal
    quat.setAxisAngle(
      viewRotQuat,
      propSliceNormal,
      degrees2radians(-viewRotation)
    );
    quat.normalize(viewRotQuat, viewRotQuat);

    // rotate the ViewUp with the x and z rotations
    const xQuat = quat.create();
    quat.setAxisAngle(xQuat, sliceXRotVector, degrees2radians(xRotate));
    quat.normalize(xQuat, xQuat);
    const viewUpQuat = quat.create();
    quat.add(viewUpQuat, xQuat, viewRotQuat);
    vec3.transformQuat(propViewUp, viewUp, viewRotQuat);

    // update the view's slice
    const renderWindow = this.genericRenderWindow.getRenderWindow();
    const istyle = renderWindow.getInteractor().getInteractorStyle();
    if (istyle && istyle.setSliceNormal) {
      istyle.setSliceNormal(propSliceNormal, propViewUp);
    }

    renderWindow.render();
  }

  setAxis(xAxis, yAxis) {
    this.setState({ xAxis, yAxis });
  }

  getAxis() {
    const { xAxis, yAxis } = this.state;
    return { xAxis, yAxis };
  }

  setRotation({ x, y }) {
    const { x: ox, y: oy } = this.state.rotation;
    this.setState({ x: x ? x : ox, y: y ? y : oy });
    this.updateSlicePlane();
  }

  getRotation() {
    return this.state.rotation;
  }

  getViewUp() {
    const renderWindow = this.genericRenderWindow.getRenderWindow();
    const currentIStyle = renderWindow.getInteractor().getInteractorStyle();

    return currentIStyle.getViewUp();
  }

  getSliceNormal() {
    const renderWindow = this.genericRenderWindow.getRenderWindow();
    const currentIStyle = renderWindow.getInteractor().getInteractorStyle();

    return currentIStyle.getSliceNormal();
  }

  setOrientation(sliceNormal, viewUp) {
    const renderWindow = this.genericRenderWindow.getRenderWindow();
    const currentIStyle = renderWindow.getInteractor().getInteractorStyle();

    if (currentIStyle && currentIStyle.setSliceNormal)
      currentIStyle.setSliceNormal(sliceNormal, viewUp);

    this.setState({ rotation: { sliceNormal, viewUp } });
  }

  resetOrientation() {
    const orientation = this.props.orientation || {
      sliceNormal: [0, 0, 1],
      viewUp: [0, -1, 0],
    };

    // Reset orientation.
    this.setOrientation(orientation.sliceNormal, orientation.viewUp);

    // Reset slice.
    const renderWindow = this.genericRenderWindow.getRenderWindow();
    const currentIStyle = renderWindow.getInteractor().getInteractorStyle();
    const range = currentIStyle.getSliceRange();

    currentIStyle.setSlice((range[0] + range[1]) / 2);
  }

  getApiProperty(propertyName) {
    return this.apiProperties[propertyName];
  }

  setApiProperty(propertyName, value) {
    this.apiProperties[propertyName] = value;
  }

  getSlabThickness() {
    const renderWindow = this.genericRenderWindow.getRenderWindow();
    const currentIStyle = renderWindow.getInteractor().getInteractorStyle();

    if (currentIStyle.getSlabThickness) {
      return currentIStyle.getSlabThickness();
    }
  }

  setSlabThickness(slabThickness) {
    const renderWindow = this.genericRenderWindow.getRenderWindow();
    const istyle = renderWindow.getInteractor().getInteractorStyle();

    if (istyle.setSlabThickness) {
      istyle.setSlabThickness(slabThickness);
    }

    renderWindow.render();
  }

  updateImage() {
    const renderWindow = this.genericRenderWindow.getRenderWindow();

    renderWindow.render();
  }

  setInteractorStyle(istyle) {
    const { volumes } = this.props;
    const renderWindow = this.genericRenderWindow.getRenderWindow();
    // We are assuming the old style is always extended from the MPRSlice style
    const oldStyle = renderWindow.getInteractor().getInteractorStyle();
    oldStyle && oldStyle.setVolumeMapper(null);

    istyle.setInteractor(renderWindow.getInteractor());

    // Make sure to set the style to the interactor itself, because reasons...?!
    const inter = renderWindow.getInteractor();
    inter.setInteractorStyle(istyle);

    // Copy previous interactors styles into the new one.
    if (istyle.setSliceNormal && oldStyle.getSliceNormal()) {
      // console.log("setting slicenormal from old normal");
      istyle.setSliceNormal(oldStyle.getSliceNormal(), oldStyle.getViewUp());
    }
    if (istyle.setSlabThickness && oldStyle.getSlabThickness()) {
      istyle.setSlabThickness(oldStyle.getSlabThickness());
    }
    if (istyle.setSliceCenter && oldStyle.getSliceCenter) {
      istyle.setSliceCenter(oldStyle.getSliceCenter());
    }
    istyle.setVolumeMapper(volumes[0]);
  }

  updateVOI(windowWidth, windowCenter) {
    this.setState({ voi: { windowWidth, windowCenter } });
  }

  updateRotation(x, y) {
    this.setState({ rotation: { x, y } });
  }

  getOrientation() {
    return this.props.orientation;
  }

  componentDidUpdate(prevProps) {
    if (prevProps.volumes !== this.props.volumes) {
      this.props.volumes.forEach(volume => {
        if (!volume.isA('vtkVolume')) {
          console.warn('Data to <Vtk2D> is not vtkVolume data');
        }
      });

      this.renderer.removeAllVolumes();
      if (this.props.volumes.length) {
        this.props.volumes.forEach(this.renderer.addVolume);
      }

      this.renderWindow.render();
    }
  }

  componentWillUnmount() {
    Object.keys(this.subs).forEach(k => {
      this.subs[k].unsubscribe();
    });

    if (this.props.onDestroyed) {
      this.props.onDestroyed();
    }

    this.genericRenderWindow.delete();
  }

  getVOI = actor => {
    // Note: This controls window/level

    // TODO: Make this work reactively with onModified...
    const rgbTransferFunction = actor.getProperty().getRGBTransferFunction(0);
    const range = rgbTransferFunction.getMappingRange();
    const windowWidth = Math.abs(range[1] - range[0]);
    const windowCenter = range[0] + windowWidth / 2;

    return {
      windowCenter,
      windowWidth,
    };
  };

  onDoubleClick = () => {
    if (this.props.onDoubleClick) {
      this.props.onDoubleClick(this.props.viewportIndex);
      setTimeout(() => {
        this.genericRenderWindow.resize();
        this.renderWindow.render();
      }, 0);
    }
  };

  render() {
    const {
      volumes,
      onRotate,
      onThickness,
      dataDetails,
      viewRotation,
    } = this.props;
    if (!volumes || !volumes.length) {
      return null;
    }

    const style = { width: '100%', height: '100%', position: 'relative' };
    const { showCrosshair, voi, xAxis, yAxis, canvasCoords } = this.state;
    const [width, height] = this.container.current
      ? [
          this.container.current.offsetWidth,
          this.container.current.offsetHeight,
        ]
      : [0, 0];

    return (
      <div style={style}>
        <div
          ref={this.container}
          style={style}
          onDoubleClick={this.onDoubleClick}
        />
        {showCrosshair ? (
          <CrosshairOverlay
            width={width}
            height={height}
            xAxis={xAxis}
            yAxis={yAxis}
            viewRotation={viewRotation}
            point={canvasCoords}
            rotateChanged={onRotate}
            thicknessChanged={onThickness}
          />
        ) : null}
        <ViewportOverlay {...dataDetails} voi={voi} />
      </div>
    );
  }
}
