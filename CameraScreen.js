import React, { useRef, useState, useCallback, useMemo } from "react";
import { View, StatusBar, StyleSheet, Dimensions, TouchableOpacity, Text } from "react-native";
import HumanPose from "react-native-human-pose";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// --- Asset dimensions ---
const JACKET_ASSET_WIDTH = 300;
const JACKET_ASSET_HEIGHT = 375;
const DRESS_ASSET_HEIGHT = 1275;

const DRESS_ASSET_RATIO = DRESS_ASSET_HEIGHT / JACKET_ASSET_WIDTH; // Fixed: Added = and corrected formula
const JACKET_ASPECT_RATIO = JACKET_ASSET_HEIGHT / JACKET_ASSET_WIDTH;

//Move it up → set centerYOffset: -value
//Move it down → set centerYOffset: +value
//Move it left → set centerXOffset: -value
//Move it right → set centerXOffset: +value

// --- Clothing types configuration ---
const CLOTHING_TYPES = {
  JACKET: {
    widthRatio: 1.1,
    heightMultiplier: 2,
    centerYOffset: 220,
    centerXOffset: 1, // Adjust horizontal position (negative = left, positive = right)
    useTorsoLength: true,
    torsoMultiplier: 1.5,
    aspectRatio: JACKET_ASPECT_RATIO, // Explicit aspect ratio for jacket
  },
  DRESS: {
    type: 'DRESS',
    widthRatio: 1.2,
    heightMultiplier:12,
    centerYOffset: 220,
    centerXOffset: 1,
    useTorsoLength: true,
    torsoMultiplier: 11.4,
    aspectRatio: 11.9,
  },
};

// --- Optimized Config ---
const CONFIG = {
  MIN_CONFIDENCE: 0.6,  // Smoothing factors (closer to 1 = smoother)
  SMOOTHING: { position: 0.9, size: 0.7 },  // Smoothing factors (closer to 1 = smoother)
  SPRING: { damping: 25, stiffness: 120 },  // Spring physics for transitions
  UPDATE_THRESHOLD: 20, // Pose update frequency (every 20th frame)
  SIZE_CHANGE_THRESHOLD: 15,
  POSITION_CHANGE_THRESHOLD: 20,
};

// Define your image array with types
const IMAGES = [
  { source: require("../../../assets/A1.png"), type: 'JACKET' },
  { source: require("../../../assets/A2.png"), type: 'JACKET' },
  { source: require("../../../assets/A3.png"), type: 'JACKET' },
  { source: require("../../../assets/A4.png"), type: 'DRESS' },
];

const CameraScreen = () => {
  const jacketX = useSharedValue(SCREEN_WIDTH / 2);
  const jacketY = useSharedValue(SCREEN_HEIGHT / 3);
  const jacketWidth = useSharedValue(JACKET_ASSET_WIDTH * 0.5);
  const jacketHeight = useSharedValue(JACKET_ASSET_HEIGHT * 0.5);
  const jacketScale = useSharedValue(0);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [debugInfo, setDebugInfo] = useState({ 
    headRatio: 0, 
    headY: 0,
    multiplier: 0
  });

  const frameCount = useRef(0);
  const lastUpdateTime = useRef(Date.now());

  const prevValues = useRef({
    x: SCREEN_WIDTH / 2,
    y: SCREEN_HEIGHT / 3,
    width: JACKET_ASSET_WIDTH * 0.5,
    height: JACKET_ASSET_HEIGHT * 0.5,
  });

  const currentClothingConfig = useMemo(() => 
    CLOTHING_TYPES[IMAGES[currentImageIndex].type],
    [currentImageIndex]
  );

  const shouldUpdate = useCallback(() => {
    frameCount.current++;
    const now = Date.now();
    if (frameCount.current % CONFIG.UPDATE_THRESHOLD === 0 || now - lastUpdateTime.current > 50) {
      lastUpdateTime.current = now;
      return true;
    }
    return false;
  }, []);

  const smoothValue = useCallback((newValue, oldValue, factor, deltaTime = 16) => {
    const alpha = 1 - Math.exp(-factor * deltaTime / 16);
    return oldValue + alpha * (newValue - oldValue);
  }, []);
  
  const switchToNextImage = useCallback(() => {
    setCurrentImageIndex(prev => (prev + 1) % IMAGES.length);
  }, []);

  const onPoseDetected = useCallback((pose) => {
    if (!pose?.length || !pose[0].pose) {
      if (jacketScale.value > 0) {
        jacketScale.value = withSpring(0, CONFIG.SPRING);
      }
      return;
    }

    if (!shouldUpdate()) return;

    const { nose, leftEye, rightEye, leftShoulder, rightShoulder, leftHip, rightHip } = pose[0].pose;

    const minConfidence = Math.min(
      leftShoulder?.confidence || 0,
      rightShoulder?.confidence || 0
    );

    if (minConfidence < CONFIG.MIN_CONFIDENCE) {
      if (jacketScale.value > 0) {
        jacketScale.value = withSpring(0, CONFIG.SPRING);
      }
      return;
    }

    const inputWidth = pose[0].width ?? SCREEN_WIDTH;
    const inputHeight = pose[0].height ?? SCREEN_HEIGHT;
    const xScale = SCREEN_WIDTH / inputWidth;
    const yScale = SCREEN_HEIGHT / inputHeight;

    const config = currentClothingConfig;

    // --- HEAD POSITION TRACKING ---
    const headY = ((nose?.y ?? (leftEye?.y + rightEye?.y) / 2) ?? leftShoulder.y) * yScale;

    // --- SIZE COMPUTATION ---
    const shoulderSpan = Math.abs(rightShoulder.x - leftShoulder.x) * xScale;
    const baseSize = shoulderSpan * config.widthRatio;
    let newWidth = Math.max(100, Math.min(400, baseSize));
    
    // Calculate height based on clothing type
    let newHeight;
    
    if (config.type === 'DRESS') {
      // For dress: extend BELOW the hips using torso length
      if (leftHip?.confidence > CONFIG.MIN_CONFIDENCE && 
          rightHip?.confidence > CONFIG.MIN_CONFIDENCE) {
        const shoulderCenterY = ((leftShoulder.y + rightShoulder.y) / 2) * yScale;
        const hipCenterY = ((leftHip.y + rightHip.y) / 2) * yScale;
        const torsoLength = Math.abs(hipCenterY - shoulderCenterY);
        
        // Dress extends from shoulders PAST the hips using torsoMultiplier
        // This makes the dress go below the torso, not stop at it
        newHeight = torsoLength * config.torsoMultiplier;
      } else {
        // Fallback if hips not detected: use aspect ratio
        newHeight = newWidth * config.aspectRatio;
      }
    } else {
      // For jacket: use aspect ratio with height multiplier
      newHeight = newWidth * config.aspectRatio * config.heightMultiplier;
      
      // Adjust height based on torso length for jackets
      if (config.useTorsoLength &&
          leftHip?.confidence > CONFIG.MIN_CONFIDENCE && 
          rightHip?.confidence > CONFIG.MIN_CONFIDENCE) {
        const shoulderCenterY = ((leftShoulder.y + rightShoulder.y) / 2) * yScale;
        const hipCenterY = ((leftHip.y + rightHip.y) / 2) * yScale;
        const torsoLength = Math.abs(hipCenterY - shoulderCenterY);
        newHeight = Math.max(newHeight, torsoLength * config.torsoMultiplier);
      }
    }

    // --- POSITION BELOW HEAD (ADAPTIVE TO PHONE HEIGHT) ---
    const headRatio = Math.min(1, Math.max(0, headY / SCREEN_HEIGHT));
    
    let multiplier;
      
    if (headRatio <= 0 || isNaN(headRatio)) {
      // No head detected or invalid data
      multiplier = 1.4;
    } else if (headRatio < 0.25) {
      // Head very small in frame (far from camera/phone held far)
      multiplier = 0.9;
    } else if (headRatio < 0.35) {
      // Head small-medium
      multiplier = 1.1;
    } else if (headRatio < 0.45) {
      // Head approaching medium size
      multiplier = 1.25;
    } else if (headRatio < 0.52) {
      // Head medium size
      multiplier = 1.4;
    } else if (headRatio < 0.55) {
      // Head medium-large
      multiplier = 1.55;
    } else if (headRatio <= 0.58) {
      // Head large - optimal position
      multiplier = 1.7;
    } else if (headRatio <= 0.62) {
      // Head getting larger
      multiplier = 1.8;
    } else if (headRatio <= 0.68) {
      // Head very large (close to camera)
      multiplier = 1.9;
    } else if (headRatio <= 0.75) {
      // Head extremely large
      multiplier = 2.0;
    } else {
      // Head taking up most of frame (headRatio > 0.75)
      multiplier = 2.1;
    }
      
    // Update debug info on screen
    setDebugInfo({ headRatio, headY, multiplier });

    const shoulderCenterY = ((leftShoulder.y + rightShoulder.y) / 2) * yScale;
    const baseOffset = Math.abs(shoulderCenterY - headY) * multiplier;
    
    // Calculate position below head with offset
    const offsetBelowHead = baseOffset;
    const centerY = shoulderCenterY - offsetBelowHead + config.centerYOffset;
    
    // Clamp to prevent clothing from going off-screen
    const clampedCenterY = Math.min(SCREEN_HEIGHT * 0.9, Math.max(SCREEN_HEIGHT * 0.2, centerY));
    
    // Horizontal positioning with offset adjustment
    // Negative centerXOffset = shift LEFT | Positive = shift RIGHT
    const centerX = SCREEN_WIDTH / 2 + config.centerXOffset;
    const newX = centerX - newWidth / 2;
    const newY = clampedCenterY - newHeight / 2;

    // --- SMOOTHING ---
    const smoothX = smoothValue(newX, prevValues.current.x, CONFIG.SMOOTHING.position);
    const smoothY = smoothValue(newY, prevValues.current.y, CONFIG.SMOOTHING.position);
    const smoothWidth = smoothValue(newWidth, prevValues.current.width, CONFIG.SMOOTHING.size);
    const smoothHeight = smoothValue(newHeight, prevValues.current.height, CONFIG.SMOOTHING.size);

    prevValues.current = {
      x: smoothX,
      y: smoothY,
      width: smoothWidth,
      height: smoothHeight,
    };

    // --- ANIMATIONS ---
    jacketX.value = withTiming(smoothX, { duration: 30 });
    jacketY.value = withTiming(smoothY, { duration: 30 });
    jacketWidth.value = withTiming(smoothWidth, { duration: 50 });
    jacketHeight.value = withTiming(smoothHeight, { duration: 50 });

    const targetScale = Math.min(1, Math.max(0.8, minConfidence));
    if (Math.abs(jacketScale.value - targetScale) > 0.1) {
      jacketScale.value = withSpring(targetScale, CONFIG.SPRING);
    }
  }, [shouldUpdate, smoothValue, currentClothingConfig, jacketScale]);

  const jacketStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: jacketX.value,
    top: jacketY.value,
    width: jacketWidth.value,
    height: jacketHeight.value,
    transform: [{ scale: jacketScale.value }],
    opacity: jacketScale.value,
    zIndex: 10,
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.cameraContainer}>
        <HumanPose
          height={SCREEN_HEIGHT}
          width={SCREEN_WIDTH}
          enableKeyPoints
          flipHorizontal={true}
          isBackCamera={false}
          color="255,0,0"
          onPoseDetected={onPoseDetected}
        />
      </View>

      <Animated.Image
        source={IMAGES[currentImageIndex].source}
        style={jacketStyle}
        resizeMode="contain"
      />

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={switchToNextImage}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>NEXT</Text>
        <Text style={styles.buttonSubText}>{currentImageIndex + 1}/{IMAGES.length}</Text>
      </TouchableOpacity>

      {/* Debug Info Display */}
      {/*<View style={styles.debugContainer}>
        <Text style={styles.debugText}>Head Y: {debugInfo.headY.toFixed(1)}</Text>
        <Text style={styles.debugText}>Face Ratio: {debugInfo.headRatio.toFixed(3)}</Text>
        <Text style={styles.debugText}>Multiplier: {debugInfo.multiplier ? debugInfo.multiplier.toFixed(2) : 'N/A'}</Text>
        <Text style={styles.debugText}>Screen H: {SCREEN_HEIGHT}</Text>
      </View>*/}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonSubText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  debugContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default CameraScreen;