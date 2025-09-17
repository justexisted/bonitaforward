import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useAnimation, useTransform } from 'motion/react';

// Define the types locally since they're not exported from the newer version
interface PanInfo {
  offset: { x: number; y: number };
  velocity: { x: number; y: number };
}

interface ResolvedValues {
  [key: string]: any;
}

const IMGS: string[] = [
  'https://images.unsplash.com/photo-1528181304800-259b08848526?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1506665531195-3566af2b4dfa?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=3456&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1495103033382-fe343886b671?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1506781961370-37a89d6b3095?q=80&w=3264&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1599576838688-8a6c11263108?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1494094892896-7f14a4433b7a?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://plus.unsplash.com/premium_photo-1664910706524-e783eed89e71?q=80&w=3869&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1503788311183-fa3bf9c4bc32?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1585970480901-90d6bb2a48b5?q=80&w=3774&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
];

interface RollingGalleryProps {
  autoplay?: boolean;
  pauseOnHover?: boolean;
  images?: string[];
}

const RollingGallery: React.FC<RollingGalleryProps> = ({ autoplay = false, pauseOnHover = false, images = [] }) => {
  const galleryImages = images.length > 0 ? images : IMGS;

  const [isScreenSizeSm, setIsScreenSizeSm] = useState<boolean>(window.innerWidth <= 640);
  const [isAutoplayActive, setIsAutoplayActive] = useState<boolean>(autoplay);
  const [hoveredImageIndex, setHoveredImageIndex] = useState<number | null>(null);
  useEffect(() => {
    const handleResize = () => setIsScreenSizeSm(window.innerWidth <= 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cylinderWidth: number = isScreenSizeSm ? 1300 : 1500;
  const faceCount: number = galleryImages.length;
  const faceWidth: number = (cylinderWidth / faceCount) * 2;
  const radius: number = cylinderWidth / (2 * Math.PI);

  const dragFactor: number = 0.01;
  const rotation = useMotionValue(0);
  const controls = useAnimation();

  const transform = useTransform(rotation, (val: number) => `rotate3d(0,1,0,${val}deg)`);

  const startInfiniteSpin = (startAngle: number) => {
    controls.start({
      rotateY: [startAngle, startAngle - 360],
      transition: {
        duration: 20,
        ease: 'linear',
        repeat: Infinity
      }
    });
  };

  useEffect(() => {
    if (isAutoplayActive) {
      const currentAngle = rotation.get();
      startInfiniteSpin(currentAngle);
    } else {
      controls.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoplayActive]);

  const handleUpdate = (latest: ResolvedValues) => {
    if (typeof latest.rotateY === 'number') {
      rotation.set(latest.rotateY);
    }
  };

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): void => {
    controls.stop();
    rotation.set(rotation.get() + info.offset.x * dragFactor);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): void => {
    const finalAngle = rotation.get() + info.velocity.x * dragFactor;
    rotation.set(finalAngle);
    if (isAutoplayActive) {
      startInfiniteSpin(finalAngle);
    }
  };

  const handleMouseEnter = (): void => {
    if (isAutoplayActive && pauseOnHover) {
      controls.stop();
    }
  };

  const handleMouseLeave = (): void => {
    if (isAutoplayActive && pauseOnHover) {
      const currentAngle = rotation.get();
      startInfiniteSpin(currentAngle);
    }
  };

  // Handle click/tap to toggle autoplay
  const handleClick = (): void => {
    setIsAutoplayActive(!isAutoplayActive);
  };

  // Handle image hover/touch
  const handleImageHover = (index: number): void => {
    setHoveredImageIndex(index);
    // Calculate the rotation needed to center this image (face it toward user)
    const targetRotation = -(360 / faceCount) * index;
    rotation.set(targetRotation);
  };

  const handleImageLeave = (): void => {
    setHoveredImageIndex(null);
    // Resume autoplay rotation if it was active
    if (isAutoplayActive) {
      const currentAngle = rotation.get();
      startInfiniteSpin(currentAngle);
    }
  };

  return (
    <div className="w-full overflow-hidden">
      <div className="relative lg:h-[33vh] h-[20vh] w-full overflow-hidden">
        {/* Autoplay toggle indicator */}
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={handleClick}
            className="bg-black/70 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm hover:bg-black/80 transition-colors"
            style={{
              display: 'none'
            }}
          >
            {isAutoplayActive ? '⏸️ Pause' : '▶️ Play'}
          </button>
        </div>
        <div className="flex h-full items-center justify-center sm:[perspective:60vh] md:[perspective:40vh] [transform-style:preserve-3d]">
        <motion.div
          drag="x"
          dragElastic={1}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          animate={controls}
          onUpdate={handleUpdate}
          style={{
            transform: transform,
            rotateY: rotation,
            width: cylinderWidth,
            transformStyle: 'preserve-3d'
          }}
          className="flex min-h-[200px] cursor-grab items-center justify-center [transform-style:preserve-3d]"
        >
          {galleryImages.map((url, i) => {
            const isHovered = hoveredImageIndex === i;
            return (
              <div
                key={i}
                className="group absolute flex h-fit items-center justify-center p-[8%] [backface-visibility:hidden] md:p-[6%]"
                style={{
                  width: `${faceWidth}px`,
                  transform: `rotateY(${(360 / faceCount) * i}deg) translateZ(${isHovered ? radius + 20 : radius}px)`
                }}
                onMouseEnter={() => handleImageHover(i)}
                onMouseLeave={handleImageLeave}
                onTouchStart={() => handleImageHover(i)}
                onTouchEnd={handleImageLeave}
              >
                <img
                  src={url}
                  alt="gallery"
                  className={`rounded-[15px] border-[3px] border-white object-cover transition-all duration-500 ease-out ${
                    isHovered 
                      ? 'h-[150px] w-[350px] scale-105 z-20 shadow-xl ring-2 ring-white/30 sm:h-[100px] sm:w-[220px] sm:scale-100' 
                      : 'h-[120px] w-[300px] group-hover:scale-105 sm:h-[100px] sm:w-[220px]'
                  }`}
                />
              </div>
            );
          })}
        </motion.div>
        </div>
      </div>
    </div>
  );
};

export default RollingGallery;
