export default function buildMetadata(imageIds) {
  // Retrieve the Cornerstone imageIds from the display set
  // TODO: In future, we want to get the metadata independently from Cornerstone
  // NOTE: The caller of buildMetaData must have already registered a metaData Provider
  const imagePlaneModule = cornerstone.metaData.get(
    'imagePlaneModule',
    imageIds[0]
  );
  const imagePixelMetaData = cornerstone.metaData.get(
    'imagePixelModule',
    imageIds[0]
  );
  const imageVoiMetaData = cornerstone.metaData.get(
    'voiLutModule',
    imageIds[0]
  );
  const { sliceThickness } = imagePlaneModule;
  const {
    pixelRepresentation,
    bitsAllocated,
    bitsStored,
    highBit,
    photometricInterpretation,
    samplesPerPixel,
  } = imagePixelMetaData;
  const { windowCenter, windowWidth } = imageVoiMetaData;

  // Compute the image size and spacing given the meta data we already have available.
  const metaDataMap = new Map();
  imageIds.forEach(imageId => {
    // TODO: Retrieve this from somewhere other than Cornerstone
    const metaData = cornerstone.metaData.get('imagePlaneModule', imageId);

    metaDataMap.set(imageId, metaData);
  });

  return {
    metaData0: metaDataMap.values().next().value,
    metaDataMap,
    imageIds,
    imageMetaData0: {
      windowCenter,
      windowWidth,
      bitsAllocated,
      bitsStored,
      samplesPerPixel,
      sliceThickness,
      highBit,
      photometricInterpretation,
      pixelRepresentation,
    },
  };
}
