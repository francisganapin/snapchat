import { bootstrapCameraKit } from '@snap/camera-kit';

const loading = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const switchButton = document.getElementById('switchButton');

function showError(message) {
  loading.style.display = 'none';
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

(async function () {
  try {
    const cameraKit = await bootstrapCameraKit({
      apiToken: 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzYxOTgwNTMwLCJzdWIiOiIwY2QzYjExMy1jZTY5LTRhNDUtYTFmNS05M2U3NGZhMWRiZjd-U1RBR0lOR34wNzNiZDk3MC1lNDFmLTQyYzAtYjE5My0zMTJjMWM0Mzk5YWEifQ.TRY-ETQcYlAwMAvdzDpqPFlfbM0clMCTaxRNc3Hc73E',
    });

    const liveRenderTarget = document.getElementById('canvas');

    // Make canvas full screen with proper resolution
    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      liveRenderTarget.width = window.innerWidth * dpr;
      liveRenderTarget.height = window.innerHeight * dpr;
    }

    // Initial resize
    resizeCanvas();

    // Resize on window change and orientation change
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', () => {
      setTimeout(resizeCanvas, 100);
    });

    // Create Camera Kit session
    const session = await cameraKit.createSession({ liveRenderTarget });

    // Mobile-friendly camera constraints
    const constraints = {
      video: {
        facingMode: 'user', // Use front camera by default
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    // Get webcam stream with error handling
    let mediaStream;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      // Fallback to basic constraints if ideal ones fail
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
    }

    await session.setSource(mediaStream);
    await session.play();

    // Array of all lenses in the same group
    const lensIds = [

      /////////////////////////////////////
      '41e6b7e5-07d6-4884-a2dc-918125900634',
      'ec0e0545-4e45-401a-9428-16c702186bff',
      /////////////////////////////////////

      'ab4c72ff-f48c-49c4-911f-4db8aed071d5',
      'dc27ba72-bd5a-4c6a-a845-ac00e6fcbac3',
      '0fc1854c-4364-46f7-bb0d-0d250224ce02',
      '935805bc-ae90-4787-a1c0-1418981b8fa1'
    ];
    const groupId = '731d446c-7719-4ac6-a665-659a1de089aa';

    let currentLensIndex = 0;

    // Function to load and apply a lens by index
    async function applyLensByIndex(index) {
      const lens = await cameraKit.lensRepository.loadLens(
        lensIds[index],
        groupId
      );
      await session.applyLens(lens);
      console.log(`Applied lens ${index + 1} of ${lensIds.length}`);
    }

    // Apply first lens
    await applyLensByIndex(currentLensIndex);
    
    // Hide loading message
    loading.style.display = 'none';

    // Button click to switch lens
    switchButton.addEventListener('click', async () => {
      switchButton.disabled = true;
      switchButton.textContent = 'Loading...';
      
      currentLensIndex = (currentLensIndex + 1) % lensIds.length;
      await applyLensByIndex(currentLensIndex);
      
      switchButton.disabled = false;
      switchButton.textContent = 'Switch Lens';
    });

  } catch (error) {
    console.error('Camera Kit Error:', error);
    showError(`Error: ${error.message || 'Failed to initialize camera'}`);
  }
})();