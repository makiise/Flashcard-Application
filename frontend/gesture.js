const videoElement = document.getElementById('webcamVideo');
const canvasElement = document.getElementById('outputCanvas');
const canvasCtx = canvasElement.getContext('2d');
const difficultyInput = document.getElementById('difficultyInput');
const gestureDisplay = document.getElementById('detectedGesture');

let difficultyChosen = false;
let camera = null;
let gestureState = {
    stableGesture: "None",
    consecutiveFrames: 0,
    requiredFrames: 3,  // Reduced for more responsiveness
    
    // Debug for gesture detection investigation
    lastDetections: [],
    debugMode: true
};

// --- MediaPipe Hands Setup ---
const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    } 
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.65, // Slightly reduced for better detection
    minTrackingConfidence: 0.5   // Slightly reduced for better tracking
});

// --- Process Results Callback ---
hands.onResults(onResults);

function onResults(results) {
    // Check elements
    if (!difficultyInput || !gestureDisplay || !canvasElement || !videoElement || !canvasCtx) {
        console.error("onResults: Missing required HTML elements.");
        return;
    }

    // Canvas size sync
    if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        if (canvasElement.width !== videoElement.videoWidth || canvasElement.height !== videoElement.videoHeight) {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
        }
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1); // Mirror canvas

    let currentGesture = "None";

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const handedness = results.multiHandedness ? results.multiHandedness[0].label : "Unknown"; // 'Left' or 'Right'

        // Draw landmarks
        if (window.drawConnectors && window.drawLandmarks && window.HAND_CONNECTIONS) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 3 });
            drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1, radius: 3 });
        } else {
            console.warn("MediaPipe drawing utilities not fully loaded.");
        }

        // Gesture Recognition (Using the improved function)
        currentGesture = interpretGesture(landmarks, handedness);
        
        // Debug for gesture analysis
        if (gestureState.debugMode) {
            gestureState.lastDetections.push(currentGesture);
            if (gestureState.lastDetections.length > 20) {
                gestureState.lastDetections.shift();
            }
            
            // Log positions for debugging
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            
            // Only log occasionally to avoid console spam
            if (Math.random() < 0.05) { 
                console.log(`Current Gesture: ${currentGesture}`);
                console.log(`  Thumb position: ${thumbTip.x.toFixed(2)}, ${thumbTip.y.toFixed(2)}`);
                console.log(`  Index position: ${indexTip.x.toFixed(2)}, ${indexTip.y.toFixed(2)}`);
            }
        }
        
        // Gesture stabilization logic
        if (currentGesture === gestureState.stableGesture) {
            gestureState.consecutiveFrames++;
        } else {
            gestureState.consecutiveFrames = 0;
            gestureState.stableGesture = currentGesture;
        }

        // Only accept a gesture if it's stable for enough frames
        if (gestureState.consecutiveFrames >= gestureState.requiredFrames) {
            // --- Update Difficulty Input Field ---
            if (!difficultyChosen) {
                let feedbackValue = null;

                switch (gestureState.stableGesture) {
                    case "Thumbs Up":
                        feedbackValue = "Easy";
                        break;
                    case "Fist": // Fist maps to Hard
                        feedbackValue = "Hard";
                        break;
                    case "Open Palm": // Open Palm maps to Wrong
                        feedbackValue = "Wrong";
                        break;
                    case "High Five": // Added High Five mapping
                        feedbackValue = "Wrong";
                        break;
                }

                if (feedbackValue) {
                    difficultyInput.value = feedbackValue;
                    difficultyChosen = true;
                    console.log(`Difficulty set to ${feedbackValue}!`);
                    gestureDisplay.textContent = `Detected Gesture: ${gestureState.stableGesture}`;

                    if (camera) {
                        console.log("Pausing video feed...");
                        videoElement.pause();
                    }
                }
            }
        }
    } else {
        currentGesture = "None"; // No hand detected
        gestureState.consecutiveFrames = 0;
        gestureState.stableGesture = "None";
    }

    // Update status display if choice not made
    if (!difficultyChosen) {
        gestureDisplay.textContent = `Detected Gesture: ${currentGesture} (${gestureState.consecutiveFrames}/${gestureState.requiredFrames})`;
        
        // Add debug info if in debug mode
        if (gestureState.debugMode && gestureState.lastDetections.length > 0) {
            // Count occurrences of each gesture in last detections
            const counts = {};
            gestureState.lastDetections.forEach(g => {
                counts[g] = (counts[g] || 0) + 1;
            });
            
            // Add small debug info
            const debugElement = document.getElementById('gestureDebug');
            if (debugElement) {
                const gestureStats = Object.entries(counts)
                    .map(([gesture, count]) => `${gesture}: ${count}`)
                    .join(', ');
                debugElement.textContent = `Recent detections: ${gestureStats}`;
            }
        }
    }

    canvasCtx.restore();
}

// --- Webcam Setup ---
function setupCamera() {
    console.log("Inside setupCamera function...");
    if (!videoElement) {
        console.error("Video element not found.");
        if(difficultyInput) difficultyInput.value = "Video Error!";
        return;
    }
    camera = new Camera(videoElement, {
        onFrame: async () => {
            if (!difficultyChosen && videoElement.readyState >= 2 && !videoElement.paused) {
                try {
                    if(hands) await hands.send({ image: videoElement });
                } catch (error) {
                    console.error("Error sending frame to Hands:", error);
                }
            }
        },
        width: 480, height: 360
    });

    console.log("Attempting camera.start()...");
    camera.start()
        .then(() => {
            console.log("Camera started successfully.");
            videoElement.play().catch(e => console.error("Error playing video:", e));
            if(gestureDisplay) gestureDisplay.textContent = "Detected Gesture: None";
        })
        .catch(err => {
            console.error("Camera start failed:", err);
            if(difficultyInput) difficultyInput.value = "Camera Error!";
            if(gestureDisplay) { /* Set appropriate error message */
                if (err.name === "NotAllowedError") gestureDisplay.textContent = "Camera permission denied.";
                else if (err.name === "NotFoundError") gestureDisplay.textContent = "No camera found.";
                else gestureDisplay.textContent = `Camera error: ${err.name}`;
            }
        });
}

// --- COMPLETELY REVISED Gesture Interpretation Function ---
function interpretGesture(landmarks, handedness) {
    // Enhanced thresholds for more accurate gesture detection
    const FINGER_CURL_THRESHOLD = 0.05;          // Higher threshold for more definitive curl
    const FINGER_STRAIGHT_THRESHOLD = 0.07;      // Higher threshold for more definitive straightness
    const THUMB_UP_MIN_Y_DIFF = 0.12;            // Minimum vertical difference for thumbs up
    const PALM_FLATNESS_THRESHOLD = 0.03;        // How flat the palm must be for "Open Palm"
    const FINGER_SEPARATION_THRESHOLD = 0.02;    // Min distance between fingers for Open Palm
    
    // --- Landmark Indices ---
    const wrist = landmarks[0];
    
    // Thumb landmarks
    const thumbCmc = landmarks[1];
    const thumbMcp = landmarks[2];
    const thumbIp = landmarks[3];
    const thumbTip = landmarks[4];
    
    // Index finger landmarks
    const indexMcp = landmarks[5];
    const indexPip = landmarks[6];
    const indexDip = landmarks[7];
    const indexTip = landmarks[8];
    
    // Middle finger landmarks
    const middleMcp = landmarks[9];
    const middlePip = landmarks[10];
    const middleDip = landmarks[11];
    const middleTip = landmarks[12];
    
    // Ring finger landmarks
    const ringMcp = landmarks[13];
    const ringPip = landmarks[14];
    const ringDip = landmarks[15];
    const ringTip = landmarks[16];
    
    // Pinky finger landmarks
    const pinkyMcp = landmarks[17];
    const pinkyPip = landmarks[18];
    const pinkyDip = landmarks[19];
    const pinkyTip = landmarks[20];
    
    // --- Helper functions ---
    
    // Calculate 3D distance between two points
    function distance3D(point1, point2) {
        return Math.sqrt(
            Math.pow(point1.x - point2.x, 2) +
            Math.pow(point1.y - point2.y, 2) +
            Math.pow(point1.z - point2.z, 2)
        );
    }
    
    // Calculate angle between three points (in radians)
    function calculateAngle(point1, point2, point3) {
        // Vectors from point2 to points 1 and 3
        const vector1 = {
            x: point1.x - point2.x,
            y: point1.y - point2.y,
            z: point1.z - point2.z
        };
        
        const vector2 = {
            x: point3.x - point2.x,
            y: point3.y - point2.y,
            z: point3.z - point2.z
        };
        
        // Dot product
        const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y + vector1.z * vector2.z;
        
        // Magnitudes
        const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y + vector1.z * vector1.z);
        const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y + vector2.z * vector2.z);
        
        // Angle in radians
        return Math.acos(dotProduct / (magnitude1 * magnitude2));
    }
    
    // Determine if a finger is curled using angle-based measurement
    function isFingerCurled(mcp, pip, dip, tip) {
        // Get the angle at the PIP joint
        const pipAngle = calculateAngle(mcp, pip, dip);
        // Get the angle at the DIP joint
        const dipAngle = calculateAngle(pip, dip, tip);
        
        // Convert to degrees for easier interpretation
        const pipAngleDegrees = pipAngle * (180 / Math.PI);
        const dipAngleDegrees = dipAngle * (180 / Math.PI);
        
        // A finger is considered curled if both joints are significantly bent
        return (pipAngleDegrees < 160 || dipAngleDegrees < 160);
    }
    
    // Check if a finger is straight
    function isFingerStraight(mcp, pip, dip, tip) {
        // Calculate angles at PIP and DIP joints
        const pipAngle = calculateAngle(mcp, pip, dip) * (180 / Math.PI);
        const dipAngle = calculateAngle(pip, dip, tip) * (180 / Math.PI);
        
        // For a straight finger, both angles should be close to 180 degrees
        return (pipAngle > 160 && dipAngle > 160);
    }
    
    // Determine relative positions for fingers
    function areFingersSeparated(f1Tip, f2Tip, mcpDistance) {
        const tipDistance = distance3D(f1Tip, f2Tip);
        // Tips should be at least as far apart as their MCPs for separation
        return tipDistance >= mcpDistance * (1 + FINGER_SEPARATION_THRESHOLD);
    }
    
    // --- Detect finger states using the improved functions ---
    const indexCurled = isFingerCurled(indexMcp, indexPip, indexDip, indexTip);
    const middleCurled = isFingerCurled(middleMcp, middlePip, middleDip, middleTip);
    const ringCurled = isFingerCurled(ringMcp, ringPip, ringDip, ringTip);
    const pinkyCurled = isFingerCurled(pinkyMcp, pinkyPip, pinkyDip, pinkyTip);
    
    const indexStraight = isFingerStraight(indexMcp, indexPip, indexDip, indexTip);
    const middleStraight = isFingerStraight(middleMcp, middlePip, middleDip, middleTip);
    const ringStraight = isFingerStraight(ringMcp, ringPip, ringDip, ringTip);
    const pinkyStraight = isFingerStraight(pinkyMcp, pinkyPip, pinkyDip, pinkyTip);
    
    // --- GESTURE DETECTION LOGIC ---
    
    // 1. FIRST Check for High Five (NEW GESTURE)
    // For high five, we need all fingers extended upward
    
    // Count straight fingers
    const straightFingers = [indexStraight, middleStraight, ringStraight, pinkyStraight].filter(Boolean).length;
    
    // Check if fingers are pointing upward (y-value of fingertip is less than MCP)
    const indexPointingUp = indexTip.y < indexMcp.y;
    const middlePointingUp = middleTip.y < middleMcp.y;
    const ringPointingUp = ringTip.y < ringMcp.y;
    const pinkyPointingUp = pinkyTip.y < pinkyMcp.y;
    
    // Check if thumb is extended sideways
    const thumbSidewaysExtension = Math.abs(thumbTip.x - thumbMcp.x) > Math.abs(thumbTip.y - thumbMcp.y);
    
    // For high five: All fingers straight, pointing up, and thumb extended to the side
    if (straightFingers >= 3 && 
        indexPointingUp && middlePointingUp && 
        (ringPointingUp || pinkyStraight) && 
        (pinkyPointingUp || pinkyStraight) && 
        thumbSidewaysExtension) {
        
        // Palm orientation check - palm facing the camera
        // In "high five", the palm faces the camera, so z-values of palm landmarks are similar
        const mcpZValues = [indexMcp.z, middleMcp.z, ringMcp.z, pinkyMcp.z];
        const maxZ = Math.max(...mcpZValues);
        const minZ = Math.min(...mcpZValues);
        
        // Palm flatness in z-plane
        const palmFacing = (maxZ - minZ) < 0.05;
        
        // Check if fingers are somewhat separated
        const fingersSpread = 
            areFingersSeparated(indexTip, middleTip, distance3D(indexMcp, middleMcp)) ||
            areFingersSeparated(middleTip, ringTip, distance3D(middleMcp, ringMcp)) ||
            areFingersSeparated(ringTip, pinkyTip, distance3D(ringMcp, pinkyMcp));
        
        if (palmFacing && fingersSpread) {
            return "High Five";
        }
    }
    
    // 2. Check for Thumbs Up (Mapped to "Easy")
    
    // Check if thumb is pointing upward (significantly higher than its MCP)
    const thumbUpwardExtension = thumbTip.y < thumbMcp.y - THUMB_UP_MIN_Y_DIFF;
    
    // Check if thumb is extended away from other fingers
    const thumbExtended = distance3D(thumbTip, thumbMcp) > 
                         (distance3D(indexTip, indexMcp) * 0.7);
    
    // Check if other fingers are curled
    const fingersGenerallyCurled = 
        (indexTip.y > indexPip.y - 0.02) && 
        (middleTip.y > middlePip.y - 0.02) && 
        (ringTip.y > ringPip.y - 0.02) && 
        (pinkyTip.y > pinkyPip.y - 0.02);
    
    // Check if thumb tip is more upward than sideways
    const thumbVerticalDominant = Math.abs(thumbTip.y - thumbMcp.y) > 
                                Math.abs(thumbTip.x - thumbMcp.x) * 0.8;
    
    // Additional check: Thumb should be higher than fingers
    const thumbHigherThanFingers = thumbTip.y < Math.min(indexTip.y, middleTip.y, ringTip.y, pinkyTip.y);
    
    // Check specifically for thumbs up - RELAXED CONDITIONS
    if ((thumbUpwardExtension && thumbVerticalDominant) && 
        (fingersGenerallyCurled || thumbHigherThanFingers)) {
        
        return "Thumbs Up";
    }
    
    // 3. Check for Open Palm (Mapped to "Wrong")
    // Check finger separation for palm
    const indexMiddleSeparated = areFingersSeparated(indexTip, middleTip, distance3D(indexMcp, middleMcp));
    const middleRingSeparated = areFingersSeparated(middleTip, ringTip, distance3D(middleMcp, ringMcp));
    const ringPinkySeparated = areFingersSeparated(ringTip, pinkyTip, distance3D(ringMcp, pinkyMcp));
    
    const fingersSeparated = indexMiddleSeparated && middleRingSeparated && ringPinkySeparated;
    
    // Check palm flatness - all finger MCPs should be roughly on the same plane
    const mcpHeights = [indexMcp.y, middleMcp.y, ringMcp.y, pinkyMcp.y];
    const maxMcpHeight = Math.max(...mcpHeights);
    const minMcpHeight = Math.min(...mcpHeights);
    const palmIsFlat = (maxMcpHeight - minMcpHeight) < PALM_FLATNESS_THRESHOLD;
    
    if (straightFingers >= 3 && palmIsFlat && fingersSeparated) {
        // Ensure thumb is not tucked in and somewhat extended
        const thumbIsOut = distance3D(thumbTip, indexMcp) > distance3D(thumbMcp, indexMcp);
        if (thumbIsOut) {
            return "Open Palm";
        }
    }
    
    // 4. Check for Fist (Mapped to "Hard")
    const allFingersCurled = indexCurled && middleCurled && ringCurled && pinkyCurled;
    
    // For a fist, the thumb should NOT be pointing up significantly
    const thumbNotPointingUp = thumbTip.y > thumbMcp.y - 0.05;
    
    // For a fist, thumb should be either alongside the fingers or tucked in
    const thumbTuckedIn = thumbTip.x > indexMcp.x - 0.01 && thumbTip.x < pinkyMcp.x + 0.03;
    
    // Check if fingertips are close to the palm
    const fingersCloseToWrist = 
        distance3D(indexTip, wrist) < distance3D(indexMcp, wrist) &&
        distance3D(middleTip, wrist) < distance3D(middleMcp, wrist) &&
        distance3D(ringTip, wrist) < distance3D(ringMcp, wrist) &&
        distance3D(pinkyTip, wrist) < distance3D(pinkyMcp, wrist);
    
    // Only recognize as fist if thumb is not extending upward significantly
    if (allFingersCurled && (thumbTuckedIn || fingersCloseToWrist) && thumbNotPointingUp) {
        return "Fist";
    }
    
    // --- Default: No recognized gesture ---
    return "None";
}

// --- Initial Setup ---
function initialize() {
    console.log("DOM Loaded. Initializing...");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("getUserMedia not supported.");
        if(difficultyInput) difficultyInput.value = "Error!";
        if(gestureDisplay) gestureDisplay.textContent = "Camera access not supported.";
        return;
    }
    if (typeof Hands === 'undefined' || typeof Camera === 'undefined') {
        console.error("MediaPipe libraries not loaded.");
        if(difficultyInput) difficultyInput.value = "Lib Error!";
        if(gestureDisplay) gestureDisplay.textContent = "Error loading libraries.";
        return;
    }

    // Reset fields
    if(difficultyInput) {
        difficultyInput.value = "";
        difficultyInput.placeholder = "Show gesture...";
    }
    if(gestureDisplay) {
        gestureDisplay.textContent = "Detected Gesture: Initializing camera...";
    }

    // Check elements and start camera
    if (videoElement && canvasElement && difficultyInput && gestureDisplay) {
        console.log("Elements found. Setting up camera...");
        setupCamera();
    } else {
        console.error("Initialization failed: Missing HTML elements.");
        if(difficultyInput) {
            difficultyInput.value = "Setup Error!";
            difficultyInput.placeholder = "Setup Error!";
        }
        if(gestureDisplay) gestureDisplay.textContent = "Error finding page elements.";
    }
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', initialize);