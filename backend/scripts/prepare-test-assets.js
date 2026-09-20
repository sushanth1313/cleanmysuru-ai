const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { spawnSync } = require('child_process');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

async function prepare() {
  const targetDir = path.join(__dirname, '..', 'test-assets');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const srcDump = 'C:\\Users\\Sushanth upadhya K.N\\.gemini\\antigravity-ide\\brain\\15a0d3ab-1a6a-4b6d-b25d-9f020eb9fa56\\waste_dump_1789824817646.jpg';
  const srcClean = 'C:\\Users\\Sushanth upadhya K.N\\.gemini\\antigravity-ide\\brain\\15a0d3ab-1a6a-4b6d-b25d-9f020eb9fa56\\waste_cleaned_1789824842531.jpg';
  const srcCd = 'C:\\Users\\Sushanth upadhya K.N\\.gemini\\antigravity-ide\\brain\\15a0d3ab-1a6a-4b6d-b25d-9f020eb9fa56\\waste_cd_debris_1789824871058.jpg';

  const destDump = path.join(targetDir, 'waste_dump.jpg');
  const destClean = path.join(targetDir, 'waste_cleaned.jpg');
  const destCd = path.join(targetDir, 'waste_cd.jpg');

  fs.copyFileSync(srcDump, destDump);
  fs.copyFileSync(srcClean, destClean);
  fs.copyFileSync(srcCd, destCd);
  console.log('Copied primary real waste images.');

  // Generate blur test image
  const destBlur = path.join(targetDir, 'waste_blur.jpg');
  await sharp(destDump).blur(25).toFile(destBlur);
  console.log('Created blurry waste image: waste_blur.jpg');

  // Generate dark test image
  const destDark = path.join(targetDir, 'waste_dark.jpg');
  await sharp(destDump).linear(0.08, 0).toFile(destDark);
  console.log('Created dark waste image: waste_dark.jpg');

  // Generate overexposed test image
  const destOver = path.join(targetDir, 'waste_overexposed.jpg');
  await sharp(destDump).linear(3.0, 50).toFile(destOver);
  console.log('Created overexposed waste image: waste_overexposed.jpg');

  // Generate real civic waste MP4 video (3 seconds, 24fps) from waste_dump.jpg using ffmpeg
  const destMp4 = path.join(targetDir, 'waste_dump_video.mp4');
  const ffmpegArgs = [
    '-loop', '1',
    '-i', destDump,
    '-c:v', 'libx264',
    '-t', '3',
    '-pix_fmt', 'yuv420p',
    '-vf', 'scale=1280:720',
    '-y',
    destMp4
  ];
  console.log('Creating civic waste MP4 video using FFmpeg...');
  const res = spawnSync(ffmpegPath, ffmpegArgs, { stdio: 'inherit' });
  if (res.status === 0) {
    console.log('Created civic waste MP4 video: waste_dump_video.mp4');
  } else {
    console.error('FFmpeg failed to create video', res.error);
  }

  console.log('All test assets successfully prepared in:', targetDir);
}

prepare().catch(console.error);
