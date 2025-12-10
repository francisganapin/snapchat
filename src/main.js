import { bootstrapCameraKit } from '@snap/camera-kit';

const loading = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const carouselContainer = document.getElementById('carouselContainer');
const carousel = document.getElementById('carousel');
const carouselWrapper = document.getElementById('carouselWrapper');
const indicators = document.getElementById('indicators');
const prevArrow = document.getElementById('prevArrow');
const nextArrow = document.getElementById('nextArrow');

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

    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      liveRenderTarget.width = window.innerWidth * dpr;
      liveRenderTarget.height = window.innerHeight * dpr;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', () => {
      setTimeout(resizeCanvas, 100);
    });

    const session = await cameraKit.createSession({ liveRenderTarget });

    const constraints = {
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    let mediaStream;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
    }

    await session.setSource(mediaStream);
    await session.play();

    // Array of lens objects with ID and thumbnail image
    const lenses = [
      {
        id: '41e6b7e5-07d6-4884-a2dc-918125900634',
        thumbnail: '/picture/cute.png' // Replace with your image path
      },
      {
        id: 'ec0e0545-4e45-401a-9428-16c702186bff',
        thumbnail: '/picture/halfcute.png'
      },
      {
        id: 'd5b91469-fc3d-461e-a881-bcb4239ce82a',
        thumbnail: 'picture/mangada.png'
      },
      {
        id: '398b9c9e-9deb-4816-b1c5-73ca12110137',
        thumbnail: '/picture/blue.png'
      },
      {
        id: '067640ae-9e9b-41c4-a013-8d3577f3e919',
        thumbnail: '/picture/damit_basic.png'
      },
    ];
    const groupId = '731d446c-7719-4ac6-a665-659a1de089aa';

    let currentLensIndex = 0;

    // Create carousel items with images
    lenses.forEach((lens, index) => {
      const item = document.createElement('div');
      item.className = 'lens-item';
      item.dataset.index = index;
      
      // Create image element
      const img = document.createElement('img');
      img.src = lens.thumbnail;
      img.alt = `Filter ${index + 1}`;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '50%';
      
      item.appendChild(img);
      carousel.appendChild(item);

      // Create indicator
      const indicator = document.createElement('div');
      indicator.className = 'indicator';
      indicators.appendChild(indicator);
    });

    // Function to update active states
    function updateActiveStates(index) {
      document.querySelectorAll('.lens-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
      });
      document.querySelectorAll('.indicator').forEach((ind, i) => {
        ind.classList.toggle('active', i === index);
      });
    }

    // Function to scroll to item
    function scrollToItem(index) {
      const item = carousel.children[index];
      const itemLeft = item.offsetLeft;
      const itemWidth = item.offsetWidth;
      const wrapperWidth = carouselWrapper.offsetWidth;
      const scrollLeft = itemLeft - (wrapperWidth / 2) + (itemWidth / 2);
      carouselWrapper.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }

    async function applyLensByIndex(index) {
      const lens = await cameraKit.lensRepository.loadLens(
        lenses[index].id,
        groupId
      );
      await session.applyLens(lens);
      currentLensIndex = index;
      updateActiveStates(index);
      scrollToItem(index);
      console.log(`Applied lens ${index + 1} of ${lenses.length}`);
    }

    // Apply first lens
    await applyLensByIndex(0);
    loading.style.display = 'none';
    carouselContainer.style.display = 'block';

    // Click handler for carousel items
    carousel.addEventListener('click', async (e) => {
      const item = e.target.closest('.lens-item');
      if (item) {
        const index = parseInt(item.dataset.index);
        await applyLensByIndex(index);
      }
    });

    // Arrow navigation
    prevArrow.addEventListener('click', async () => {
      const newIndex = (currentLensIndex - 1 + lenses.length) % lenses.length;
      await applyLensByIndex(newIndex);
    });

    nextArrow.addEventListener('click', async () => {
      const newIndex = (currentLensIndex + 1) % lenses.length;
      await applyLensByIndex(newIndex);
    });

    // Swipe gesture support
    let touchStartX = 0;
    let touchEndX = 0;

    canvas.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    });

    canvas.addEventListener('touchend', async (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchStartX - touchEndX;
      
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          // Swipe left - next lens
          const newIndex = (currentLensIndex + 1) % lensIds.length;
          await applyLensByIndex(newIndex);
        } else {
          // Swipe right - previous lens
          const newIndex = (currentLensIndex - 1 + lensIds.length) % lensIds.length;
          await applyLensByIndex(newIndex);
        }
      }
    });

  } catch (error) {
    console.error('Camera Kit Error:', error);
    showError(`Error: ${error.message || 'Failed to initialize camera'}`);
  }
})();