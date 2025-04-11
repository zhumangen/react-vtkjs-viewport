import { PureComponent } from 'react';
import React from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import { radians2degrees } from '../lib/math/angles';
import { vec2, glMatrix } from 'gl-matrix';
import './CrosshairOverlay.css';

class CrosshairOverlay extends PureComponent {
  static propTypes = {
    rotateChanged: PropTypes.func.isRequired,
    thicknessChanged: PropTypes.func.isRequired,
    viewRotation: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
    point: PropTypes.object,
    lockAxis: PropTypes.bool,
    shiftUnlockAxis: PropTypes.bool,
    xAxis: PropTypes.object,
    yAxis: PropTypes.object,
  };

  static defaultProps = {
    xAxis: {
      color: 'red',
      rotation: 0,
      thickness: 0,
    },
    yAxis: {
      color: 'blue',
      rotation: 0,
      thickness: 0,
    },
  };

  state = {
    mousedown: false,
    invertAngle: false,
    axisOffset: 0,
    action: '',
  };

  getPoint() {
    const { point, width, height } = this.props;
    if (!point) return null;
    return window.devicePixelRatio
      ? {
          x: point.x / window.devicePixelRatio,
          y: height - point.y / window.devicePixelRatio,
        }
      : point;
  }

  getMaxMin() {
    const { width, height } = this.props;
    return width > height
      ? { max: width, min: height }
      : { max: height, min: width };
  }

  onMove(event) {
    const { mousedown, action, invertAngle, axisOffset } = this.state;
    const {
      lockAxis,
      shiftUnlockAxis,
      xAxis,
      yAxis,
      viewRotation,
    } = this.props;
    const { x, y } = this.getPoint();
    if (mousedown) {
      const shiftKey = event.shiftKey;
      const isX = action.endsWith('X');
      const newPos = [event.offsetX, event.offsetY];

      // account for the view's rotation by rotating the mouse position around the center
      if (viewRotation)
        vec2.rotate(newPos, newPos, [x, y], -glMatrix.toRadian(viewRotation));

      if (action.startsWith('rotate')) {
        // calculate the rotation angle from mouse to center [x, y]
        const nx = newPos[0] - x;
        const ny = newPos[1] - y;

        let angle = Math.floor(radians2degrees(Math.atan2(ny, nx)));

        if (invertAngle) {
          //if positive, subtract 180, if negative, add 180, to get the same value as the right handle
          angle += 180 * (angle < 0 ? 1 : -1);
        }
        if (!isX) {
          //account for Y axis difference
          angle -= 90;
        }

        // NOTE: Use this only if we fix the 90deg bug and it works 0 - 180
        // if (angle >= 90) angle -= 180;
        // else if (angle <= -90) angle += 180;

        // Otherwise force to a 178 angle swing
        if (angle >= 89) angle = 89;
        else if (angle <= -89) angle = -89;
        // emit the rotation
        this.rotateChanged({ axis: isX ? 'x' : 'y', angle: angle });
        if (lockAxis && !(shiftUnlockAxis && shiftKey)) {
          this.rotateChanged({
            axis: !isX ? 'x' : 'y',
            angle: angle - axisOffset,
          });
        }
      } else if (action.startsWith('thickness')) {
        // adjust for the rotation of the plane to compare as if the axis wasn't rotated
        vec2.rotate(
          newPos,
          newPos,
          [x, y],
          -glMatrix.toRadian(isX ? xAxis.rotation : yAxis.rotation)
        );
        let dist = Math.floor(
          isX ? Math.abs(newPos[1] - y) : Math.abs(newPos[0] - x)
        );

        // Have a deadzone so it can snap to "nothing". Default is 0.1. Must be > 0 or it shows nothing
        if (dist < 3) dist = 0.05;
        // Multiply by 2 since the thickness is split between the axis
        this.thicknessChanged({ axis: isX ? 'x' : 'y', thickness: dist * 2 });
      }
    }
  }

  startAction(event, action, invertAngle) {
    const { xAxis, yAxis } = this.props;
    const newState = {
      action,
      mousedown: true,
    };
    if (action.startsWith('rotate')) {
      newState.invertAngle = invertAngle;
      newState.axisOffset = action.endsWith('X')
        ? xAxis.rotation - yAxis.rotation
        : yAxis.rotation - xAxis.rotation;
    }
    this.setState(newState);
  }

  endMove(event) {
    this.setState({ mousedown: false });
  }

  render() {
    const { viewRotation, width, height, xAxis, yAxis } = this.props;
    const { mousedown, action, invertAngle } = this.state;

    const point = this.getPoint();
    const { x, y } = point || { x: 0, y: 0 };
    const { max } = this.getMaxMin();
    const circlePos = Math.floor(this.minLength / 2.5);
    const squarePos = Math.floor(this.minLength / 6);
    const xThicknessPixels = xAxis.thickness >= 1 ? xAxis.thickness / 2 : 0;
    const yThicknessPixels = yAxis.thickness >= 1 ? yAxis.thickness / 2 : 0;

    return point ? (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        mousemove={this.onMove}
        mouseup={this.endMove}
        className={classnames('crosshairs', {
          captureMouse: mousedown,
          rotateCursor: mousedown && action.startsWith('rotate'),
          thicknessCursor: mousedown && action.startsWith('thickness'),
        })}
      >
        <g transform={`rotate(${viewRotation}, ${x}, ${y})`}>
          <g
            transform={`rotate(${yAxis.rotation}, ${x}, ${y})`}
            color={yAxis.color}
            fill="currentColor"
          >
            <line
              x1={x}
              y1={y - max}
              x2={x}
              y2={y + max}
              style={{
                stroke: 'currentColor',
                strokeWidth: 1,
                strokeDasharray: 4,
              }}
            />
            <circle
              cx={x}
              cy={y + circlePos}
              r={6}
              onMouseDown={this.startAction.bind(this, 'thicknessY')}
              className={classnames('hover rotateCursor', {
                active: mousedown && action === 'rotateY' && !invertAngle,
              })}
            />
            <circle
              cx={x}
              cy={y - circlePos}
              r={6}
              onMouseDown={this.startAction.bind(this, 'thicknessY')}
              className={classnames('hover rotateCursor', {
                active: mousedown && action === 'rotateY' && invertAngle,
              })}
            />
            <rect
              x={x - 4 + yThicknessPixels}
              y={y + squarePos}
              width={8}
              height={8}
              onMouseDown={this.startAction.bind(this, 'thicknessY')}
              className="hover thicknessYCursor"
            />
            <rect
              x={x - 4 - yThicknessPixels}
              y={y + squarePos}
              width={8}
              height={8}
              onMouseDown={this.startAction.bind(this, 'thicknessY')}
              className="hover thicknessYCursor"
            />
            {yAxis.thickness >= 1 ? (
              <g>
                <rect
                  x={x - 4 - yThicknessPixels}
                  y={y + squarePos}
                  width={8}
                  height={8}
                  onMouseDown={this.startAction.bind(this, 'thicknessY')}
                  className="hover thicknessYCursor"
                />
                <rect
                  x={x - 4 - yThicknessPixels}
                  y={y - squarePos - 8}
                  width={8}
                  height={8}
                  onMouseDown={this.startAction.bind(this, 'thicknessY')}
                  className="hover thicknessYCursor"
                />
                <g
                  style={{
                    stroke: 'currentColor',
                    strokeWidth: 1,
                    strokeDasharray: 4,
                  }}
                >
                  <line
                    x1={x - yThicknessPixels}
                    y1={y - max}
                    x2={x - yThicknessPixels}
                    y2={y + max}
                  />
                  <line
                    x1={x + yThicknessPixels}
                    y1={y - max}
                    x2={x + yThicknessPixels}
                    y2={y + max}
                  />
                </g>
              </g>
            ) : null}
          </g>

          <g
            transform={`rotate(${xAxis.rotation}, ${x}, ${y})`}
            color={xAxis.color}
            fill="currentColor"
          >
            <line
              x1={x - max}
              y1={y}
              x2={x + max}
              y2={y}
              style={{
                stroke: 'currentColor',
                strokeWidth: 1,
                strokeDasharray: 4,
              }}
            />
            <circle
              cx={x + circlePos}
              cy={y}
              r={6}
              onMouseDown={this.startAction.bind(this, 'rotateX')}
              className={classnames('hover rotateCursor', {
                active: mousedown && action === 'rotateX' && !invertAngle,
              })}
            />
            <circle
              cx={x - circlePos}
              cy={y}
              r={6}
              onMouseDown={this.startAction.bind(this, 'rotateX', true)}
              className={classnames('hover rotateCursor', {
                active: mousedown && action === 'rotateX' && invertAngle,
              })}
            />
            <rect
              x={x + squarePos}
              y={y - 4 - xThicknessPixels}
              width={8}
              height={8}
              onMouseDown={this.startAction.bind(this, 'thicknessX')}
              className="hover thicknessXCursor"
            />
            <rect
              x={x - squarePos - 8}
              y={y - 4 - xThicknessPixels}
              width={8}
              height={8}
              onMouseDown={this.startAction.bind(this, 'thicknessX')}
              className="hover thicknessXCursor"
            />
            {xAxis.thickness >= 1 ? (
              <g>
                <rect
                  x={x + squarePos}
                  y={y - 4 + xThicknessPixels}
                  width={8}
                  height={8}
                  onMouseDown={this.startAction.bind(this, 'thicknessX')}
                  className="hover thicknessXCursor"
                />
                <rect
                  x={x - squarePos - 8}
                  y={y - 4 + xThicknessPixels}
                  width={8}
                  height={8}
                  onMouseDown={this.startAction.bind(this, 'thicknessX')}
                  className="hover thicknessXCursor"
                />
                <g
                  style={{
                    stroke: 'currentColor',
                    strokeWidth: 1,
                    strokeDasharray: 4,
                  }}
                >
                  <line
                    x1={x - max}
                    y1={y - xThicknessPixels}
                    x2={x + max}
                    y2={y - xThicknessPixels}
                  />
                  <line
                    x1={x - max}
                    y1={y + xThicknessPixels}
                    x2={x + max}
                    y2={y + xThicknessPixels}
                  />
                </g>
              </g>
            ) : null}
          </g>
        </g>
      </svg>
    ) : null;
  }
}

export default CrosshairOverlay;
