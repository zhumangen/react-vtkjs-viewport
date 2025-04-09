import getImageData from './getImageData.js';
import loadImageData from './loadImageData.js';
import { math } from './math/index.js';
import { MPR } from './MPR/index.js';
import { switchToMPRMode } from './switchToMPRMode.js';
import ohifInteractorStyleSlice from './ohifInteractorStyleSlice.js';
import ohifInteractorObserver from './ohifInteractorObserver.js';
import throttle from './throttle.js';

const VTKUtils = {
  getImageData,
  loadImageData,
  math,
  MPR,
  ohifInteractorStyleSlice,
  switchToMPRMode,
  ohifInteractorObserver,
  throttle,
};

// TODO: this probably isn't the best thing to do here
window.VTKUtils = VTKUtils;
