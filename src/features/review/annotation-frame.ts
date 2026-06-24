export type AnnotationFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type Size = {
  width: number;
  height: number;
};

export function getContainedMediaFrame(container: Size, media: Size): AnnotationFrame | null {
  if (!isUsableSize(container) || !isUsableSize(media)) return null;

  const containerRatio = container.width / container.height;
  const mediaRatio = media.width / media.height;

  if (mediaRatio > containerRatio) {
    const height = container.width / mediaRatio;
    return {
      left: 0,
      top: (container.height - height) / 2,
      width: container.width,
      height,
    };
  }

  const width = container.height * mediaRatio;
  return {
    left: (container.width - width) / 2,
    top: 0,
    width,
    height: container.height,
  };
}

function isUsableSize(size: Size) {
  return Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0;
}
