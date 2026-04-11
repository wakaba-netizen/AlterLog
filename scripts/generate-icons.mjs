// scripts/generate-icons.mjs
import sharp from 'sharp'
import { writeFileSync } from 'fs'

const SIZES = [192, 512]

// SVG icon: dark gradient background + white waveform bars
function makeSvg(size) {
  const s = size
  const r = Math.round(s * 0.14) // corner radius
  const bw = Math.round(s * 0.055) // bar width
  const gap = Math.round(s * 0.028)
  const bars = 7
  const totalW = bars * bw + (bars - 1) * gap
  const startX = Math.round((s - totalW) / 2)
  const centerY = Math.round(s / 2)
  const heights = [0.28, 0.46, 0.64, 0.82, 0.64, 0.46, 0.28]

  const barSvgs = heights.map((h, i) => {
    const bh = Math.round(h * s * 0.55)
    const x = startX + i * (bw + gap)
    const y = centerY - Math.round(bh / 2)
    const rx = Math.round(bw / 2)
    return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="${rx}" fill="#c4b5fd" opacity="${0.4 + i * 0.1 + (bars - 1 - i) * 0.1}"/>`
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${s}" y2="${s}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="${s}" height="${s}" fill="url(#bg)" rx="${r}"/>
  ${barSvgs.join('\n  ')}
</svg>`
}

for (const size of SIZES) {
  const svg = Buffer.from(makeSvg(size))
  const png = await sharp(svg).png().toBuffer()
  writeFileSync(`public/icon-${size}.png`, png)
  console.log(`✓ public/icon-${size}.png`)
}

console.log('Icons generated successfully.')
