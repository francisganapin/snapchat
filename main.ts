import { bootstrapCameraKit } from '@snap/camera-kit';

(async function () {
  const cameraKit = await bootstrapCameraKit({
    apiToken: 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzYxOTgwNTMwLCJzdWIiOiIwY2QzYjExMy1jZTY5LTRhNDUtYTFmNS05M2U3NGZhMWRiZjd-UFJPRFVDVElPTn41ZjJlNjAxNy0xMjE4LTRlYjMtOGUzMC1iNjdjMmI1Yjk5ZGMifQ.xda5xFDff46_Su3i4_1yziVUyLKlAIWxuVo1Wye2pZY',
  });
  const liveRenderTarget = document.getElementById(
    'canvas'
  ) as HTMLCanvasElement;
  const session = await cameraKit.createSession({ liveRenderTarget });
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    video: true,
  });

  await session.setSource(mediaStream);
  await session.play();

  const lens = await cameraKit.lensRepository.loadLens(
    'f44533b2-634a-41d1-a6a8-8d57e1d1012b',
    'bd64af86-68af-4b57-ac31-d9f5abb89040'
  );

  await session.applyLens(lens);
})();